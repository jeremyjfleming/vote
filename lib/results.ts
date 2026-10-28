import type { Answer, ChoiceQuestion, Form, Option, Question, ResponseRecord, ScaleQuestion, TextQuestion } from './types.ts';

export interface RankedOption extends Option {
  count: number;
  /** Share of voters on this question who chose it. */
  pct: number;
}

export interface Winner extends RankedOption {
  /** Group this pick was reserved for, or null if it won on overall count. */
  scope: string | null;
  /** Non-winners with the same count that could have taken this spot. */
  tiedWith: RankedOption[];
}

export interface ChoiceSummary {
  kind: 'choice';
  q: ChoiceQuestion;
  answered: number;
  ranked: RankedOption[];
  maxCount: number;
  winners: Winner[];
}

export interface TextSummary {
  kind: 'text';
  q: TextQuestion;
  answered: number;
  answers: string[];
}

export interface ScaleSummary {
  kind: 'scale';
  q: ScaleQuestion;
  answered: number;
  average: number | null;
  /** One entry per value from q.min to q.max. */
  counts: { value: number; count: number }[];
  maxCount: number;
  /** Averages per answer to the form's compareBy question. */
  segments: { label: string; answered: number; average: number | null }[];
}

export type Summary = ChoiceSummary | TextSummary | ScaleSummary;

function asList(answer: Answer | undefined): string[] {
  if (Array.isArray(answer)) return answer;
  return typeof answer === 'string' && answer ? [answer] : [];
}

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

// Picks q.winners options. With winnerRule "one-per-group", the leader of each
// group is guaranteed a spot and the remaining spots go to the highest counts.
function pickWinners(q: ChoiceQuestion, ranked: RankedOption[]): Winner[] {
  if (!q.winners) return [];
  const pool = ranked.filter((o) => o.count > 0);
  const picks: Omit<Winner, 'tiedWith'>[] = [];

  if (q.winnerRule === 'one-per-group') {
    for (const g of q.groups) {
      if (picks.length >= q.winners) break;
      const leader = pool.find((o) => o.group === g.id);
      if (leader) picks.push({ ...leader, scope: g.id });
    }
  }
  for (const o of pool) {
    if (picks.length >= q.winners) break;
    if (!picks.some((p) => p.id === o.id)) picks.push({ ...o, scope: null });
  }

  const chosen = new Set(picks.map((p) => p.id));
  return picks
    .map((p) => ({
      ...p,
      tiedWith: pool.filter((o) => !chosen.has(o.id) && o.count === p.count && (!p.scope || o.group === p.scope)),
    }))
    .sort((a, b) => b.count - a.count || a.index - b.index);
}

function tallyChoice(q: ChoiceQuestion, responses: ResponseRecord[]): ChoiceSummary {
  const counts = new Map(q.options.map((o) => [o.id, 0]));
  let answered = 0;
  for (const r of responses) {
    const values = asList(r.answers?.[q.id]).filter((v) => counts.has(v));
    if (values.length) answered++;
    for (const v of values) counts.set(v, counts.get(v)! + 1);
  }
  const ranked = q.options
    .map((o) => {
      const count = counts.get(o.id)!;
      return { ...o, count, pct: answered ? Math.round((count / answered) * 100) : 0 };
    })
    .sort((a, b) => b.count - a.count || a.index - b.index);

  return { kind: 'choice', q, answered, ranked, maxCount: ranked[0]?.count || 0, winners: pickWinners(q, ranked) };
}

function tallyText(q: TextQuestion, responses: ResponseRecord[]): TextSummary {
  const answers = responses.map((r) => r.answers?.[q.id]).filter((v): v is string => typeof v === 'string' && v !== '');
  return { kind: 'text', q, answered: answers.length, answers };
}

function tallyScale(q: ScaleQuestion, responses: ResponseRecord[], compareBy?: ChoiceQuestion): ScaleSummary {
  const scored = responses
    .map((r) => ({ r, n: r.answers?.[q.id] }))
    .filter((x): x is { r: ResponseRecord; n: number } => typeof x.n === 'number');
  const values = scored.map((x) => x.n);
  const counts = Array.from({ length: q.max - q.min + 1 }, (_, i) => ({ value: q.min + i, count: values.filter((v) => v === q.min + i).length }));
  const segments = compareBy
    ? compareBy.options.map((o) => {
        const segment = scored.filter((x) => x.r.answers?.[compareBy.id] === o.id).map((x) => x.n);
        return { label: o.label, answered: segment.length, average: mean(segment) };
      })
    : [];
  return {
    kind: 'scale',
    q,
    answered: values.length,
    average: mean(values),
    counts,
    maxCount: Math.max(0, ...counts.map((c) => c.count)),
    segments,
  };
}

export function tally(form: Form, responses: ResponseRecord[]): Summary[] {
  const compareBy = form.questions.find((q): q is ChoiceQuestion => q.type === 'choice' && q.id === form.compareBy);
  return form.questions
    .filter((q) => q.summary && q.type !== 'section')
    .map((q) => {
      if (q.type === 'choice') return tallyChoice(q, responses);
      if (q.type === 'scale') return tallyScale(q, responses, compareBy);
      return tallyText(q as TextQuestion, responses);
    });
}

/** Questions that collect answers (everything but section headings). */
export function answerable(form: Form): Question[] {
  return form.questions.filter((q) => q.type !== 'section');
}

// Human-readable answer for tables and CSV.
export function answerLabels(q: Question, answer: Answer | undefined): string[] {
  if (typeof answer === 'number') return [String(answer)];
  if (q.type !== 'choice') return typeof answer === 'string' && answer ? [answer] : [];
  return asList(answer).map((v) => q.optionMap.get(v)?.label ?? v);
}
