import configs from '../forms/index.ts';
import type { Answer, ChoiceQuestion, Form, FormConfig, FormGroup, FormGroupConfig, Group, Option, Question, QuestionConfig } from './types.ts';

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
// Top-level paths the app itself uses.
const RESERVED_GROUP_IDS = new Set(['admin', 'static']);

function normalizeQuestion(q: QuestionConfig, formId: string): Question {
  const where = `[form ${formId}] question "${q.id}"`;
  if (!ID_RE.test(q.id)) throw new Error(`${where}: id must be lowercase letters, numbers and dashes`);
  const base = { required: false, help: '', summary: true };

  if (q.type === 'section') return { ...base, ...q, required: false, summary: false };
  if (q.type === 'scale') {
    const min = q.min ?? 1;
    const max = q.max ?? 10;
    if (!Number.isInteger(min) || !Number.isInteger(max) || max <= min || max - min > 20) throw new Error(`${where}: min and max must be whole numbers, at most 20 apart`);
    return { ...base, ...q, required: Boolean(q.required), min, max };
  }
  if (q.type !== 'choice') {
    return { ...base, ...q, maxLength: q.maxLength || (q.type === 'text' ? 120 : 2000) };
  }

  const groups: Group[] = (q.groups || [{ id: '_all', label: '', options: q.options || [] }]).map((g, index) => ({ ...g, index }));
  const options: Option[] = groups
    .flatMap((g) => g.options.map((o) => ({ ...o, group: g.id, groupLabel: g.label, groupIndex: g.index })))
    .map((o, index) => ({ ...o, index }));
  if (!options.length) throw new Error(`${where}: needs options`);
  if (new Set(options.map((o) => o.id)).size !== options.length) throw new Error(`${where}: option ids must be unique`);

  const multiple = Boolean(q.multiple);
  const required = Boolean(q.required);
  const groupMins = groups.reduce((n, g) => n + (g.min || 0), 0);
  if (groupMins && !multiple) throw new Error(`${where}: group minimums need multiple: true`);
  if (groupMins > (q.max ?? options.length)) throw new Error(`${where}: group minimums add up to more than max`);
  const question: ChoiceQuestion = {
    ...base,
    ...q,
    required,
    multiple,
    max: multiple ? Math.min(q.max ?? options.length, options.length) : 1,
    min: multiple ? (q.min ?? (required ? 1 : 0)) : required ? 1 : 0,
    groups,
    options,
    optionMap: new Map(options.map((o) => [o.id, o])),
    winners: q.winners || 0,
    winnerRule: q.winnerRule || 'top',
  };
  return question;
}

function normalizeForm(f: FormConfig, group: FormGroupConfig): Form {
  const key = `${group.id}/${f.id}`;
  if (!ID_RE.test(f.id)) throw new Error(`form "${key}": id must be lowercase letters, numbers and dashes`);
  const questions = f.questions.map((q) => normalizeQuestion(q, key));
  if (new Set(questions.map((q) => q.id)).size !== questions.length) throw new Error(`form "${key}": question ids must be unique`);

  questions.forEach((q, i) => {
    if (!q.showIf) return;
    const target = questions.slice(0, i).find((t) => t.id === q.showIf!.question);
    if (target?.type !== 'choice') throw new Error(`form "${key}": "${q.id}" showIf must point to an earlier choice question`);
  });
  const byId = new Map(questions.map((q) => [q.id, q]));
  if (f.compareBy && (byId.get(f.compareBy) as ChoiceQuestion | undefined)?.multiple !== false) {
    throw new Error(`form "${key}": compareBy must be a single-choice question`);
  }
  if (f.giveaway) {
    if (f.allowMultiple) throw new Error(`form "${key}": a giveaway needs allowMultiple off, or people could enter many times`);
    for (const id of f.giveaway.questions) {
      const t = byId.get(id)?.type;
      if (t !== 'text' && t !== 'textarea') throw new Error(`form "${key}": giveaway question "${id}" must be a text question`);
    }
  }

  return {
    listed: true,
    allowMultiple: false,
    anonymous: false,
    ...f,
    thankYou: f.thankYou || {},
    questions,
    groupId: group.id,
    groupName: group.name,
    timeZone: group.timeZone || 'UTC',
    path: `/${key}`,
    key,
  };
}

/** Whether q applies, given the answers so far. Questions without showIf always apply. */
export function isShown(q: Question, answers: Record<string, Answer>): boolean {
  if (!q.showIf) return true;
  const value = answers[q.showIf.question];
  const wanted = Array.isArray(q.showIf.equals) ? q.showIf.equals : [q.showIf.equals];
  return (Array.isArray(value) ? value : [value]).some((v) => typeof v === 'string' && wanted.includes(v));
}

function normalizeGroup(g: FormGroupConfig): FormGroup {
  if (!ID_RE.test(g.id)) throw new Error(`group "${g.id}": id must be lowercase letters, numbers and dashes`);
  if (RESERVED_GROUP_IDS.has(g.id)) throw new Error(`group "${g.id}": that id is reserved`);
  if (g.accentColor && !/^#[0-9a-f]{6}$/i.test(g.accentColor)) throw new Error(`group "${g.id}": accentColor must look like "#1f6feb"`);
  try {
    new Intl.DateTimeFormat('en', { timeZone: g.timeZone || 'UTC' });
  } catch {
    throw new Error(`group "${g.id}": unknown timeZone "${g.timeZone}"`);
  }
  const forms = new Map(g.forms.map((f) => [f.id, normalizeForm(f, g)]));
  if (forms.size !== g.forms.length) throw new Error(`group "${g.id}": form ids must be unique`);
  const initials = (g.initials || g.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('')).slice(0, 3).toUpperCase();
  return { ...g, initials, forms };
}

export const groups = new Map(configs.map((g) => [g.id, normalizeGroup(g)]));
if (groups.size !== configs.length) throw new Error('group ids must be unique');

export function findForm(groupId: string, formId: string): Form | undefined {
  return groups.get(groupId)?.forms.get(formId);
}

export interface FormStatus {
  state: 'open' | 'scheduled' | 'closed';
  /** When it opens (scheduled) or closes (open), if set. */
  at?: string;
}

export function formStatus(form: Form): FormStatus {
  if (form.closed) return { state: 'closed' };
  if (form.opensAt && Date.now() < Date.parse(form.opensAt)) return { state: 'scheduled', at: form.opensAt };
  if (form.closesAt && Date.now() >= Date.parse(form.closesAt)) return { state: 'closed' };
  return { state: 'open', at: form.closesAt };
}

export function isOpen(form: Form): boolean {
  return formStatus(form).state === 'open';
}
