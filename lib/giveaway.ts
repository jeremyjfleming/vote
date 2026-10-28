// Anonymous giveaways.
//
// An eligible respondent gets a random code on the thank-you page. The store
// keeps only a hash of each code, under a key made from that hash, with no
// timestamp and nothing pointing at the response. So no one, including admins,
// can tell which answers belong to which code, or which code belongs to whom.
// When the form closes, the first request that needs the result draws winners
// at random and saves the draw once; everyone sees that same draw afterwards.

import crypto from 'node:crypto';
import { formStatus } from './forms.ts';
import type { Answer, Form, Store } from './types.ts';

// No 0/O or 1/I/L, so codes are easy to read aloud and type.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

export interface Draw {
  drawnAt: string;
  entries: number;
  /** Hashes of the winning codes. */
  winners: string[];
}

export type CodeStatus =
  | { state: 'invalid' }
  | { state: 'unknown' }
  | { state: 'pending'; code: string }
  | { state: 'lost'; code: string }
  | { state: 'won'; code: string; claimedAt?: string; justClaimed?: boolean };

const ticketPrefix = (form: Form) => `${form.key}/tickets/`;
const drawKey = (form: Form) => `${form.key}/draw`;
const claimKey = (form: Form, hash: string) => `${form.key}/claims/${hash}`;
const hashCode = (form: Form, code: string) => crypto.createHash('sha256').update(`${form.key}:${code}`).digest('hex');

/** Normalizes user input like "k7qf 9mxa" to "K7QF-9MXA", or null if it can't be a code. */
export function formatCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length !== CODE_LENGTH || [...s].some((c) => !ALPHABET.includes(c))) return null;
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

function newCode(): string {
  let s = '';
  for (let i = 0; i < CODE_LENGTH; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return formatCode(s)!;
}

export function isEligible(form: Form, answers: Record<string, Answer>): boolean {
  return Boolean(form.giveaway?.questions.every((id) => typeof answers[id] === 'string' && answers[id] !== ''));
}

/** Creates an entry and returns its code. */
export async function enter(store: Store, form: Form): Promise<string> {
  for (;;) {
    const code = newCode();
    if (await store.set(ticketPrefix(form) + hashCode(form, code), true, { onlyIfNew: true })) return code;
  }
}

export async function countEntries(store: Store, form: Form): Promise<number> {
  return (await store.list(ticketPrefix(form))).length;
}

export async function countClaims(store: Store, form: Form): Promise<number> {
  return (await store.list(`${form.key}/claims/`)).length;
}

/** The draw, if there is one. Runs it first when the form has closed and it hasn't happened yet. */
export async function getDraw(store: Store, form: Form): Promise<Draw | null> {
  const existing = await store.get<Draw>(drawKey(form));
  if (existing || !form.giveaway || formStatus(form).state !== 'closed') return existing;

  const hashes = (await store.list(ticketPrefix(form))).map((k) => k.slice(ticketPrefix(form).length));
  const n = Math.min(form.giveaway.winners, hashes.length);
  // Partial Fisher-Yates shuffle with a cryptographic random source.
  for (let i = 0; i < n; i++) {
    const j = i + crypto.randomInt(hashes.length - i);
    [hashes[i], hashes[j]] = [hashes[j], hashes[i]];
  }
  const draw: Draw = { drawnAt: new Date().toISOString(), entries: hashes.length, winners: hashes.slice(0, n) };
  // If two requests race to draw, the first write wins and both use it.
  if (await store.set(drawKey(form), draw, { onlyIfNew: true })) return draw;
  return store.get<Draw>(drawKey(form));
}

export async function checkCode(store: Store, form: Form, input: string): Promise<CodeStatus> {
  const code = formatCode(input);
  if (!code) return { state: 'invalid' };
  const hash = hashCode(form, code);
  if (!(await store.get(ticketPrefix(form) + hash))) return { state: 'unknown' };
  const draw = await getDraw(store, form);
  if (!draw) return { state: 'pending', code };
  if (!draw.winners.includes(hash)) return { state: 'lost', code };
  const claim = await store.get<{ claimedAt: string }>(claimKey(form, hash));
  return { state: 'won', code, claimedAt: claim?.claimedAt };
}

/** Marks a winning code as claimed. Each code can be claimed once. */
export async function claim(store: Store, form: Form, input: string): Promise<CodeStatus> {
  const status = await checkCode(store, form, input);
  if (status.state !== 'won' || status.claimedAt) return status;
  const claimedAt = new Date().toISOString();
  if (!(await store.set(claimKey(form, hashCode(form, status.code)), { claimedAt }, { onlyIfNew: true }))) {
    return checkCode(store, form, input);
  }
  return { ...status, claimedAt, justClaimed: true };
}
