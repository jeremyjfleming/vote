import configs from '../forms/index.ts';
import type { ChoiceQuestion, Form, FormConfig, FormGroup, FormGroupConfig, Group, Option, Question, QuestionConfig } from './types.ts';

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
// Top-level paths the app itself uses.
const RESERVED_GROUP_IDS = new Set(['admin', 'static']);

function normalizeQuestion(q: QuestionConfig, formId: string): Question {
  const where = `[form ${formId}] question "${q.id}"`;
  if (!ID_RE.test(q.id)) throw new Error(`${where}: id must be lowercase letters, numbers and dashes`);
  const base = { required: false, help: '', summary: true };

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
  return {
    listed: true,
    allowMultiple: false,
    ...f,
    thankYou: f.thankYou || {},
    questions: f.questions.map((q) => normalizeQuestion(q, key)),
    groupId: group.id,
    groupName: group.name,
    path: `/${key}`,
    key,
  };
}

function normalizeGroup(g: FormGroupConfig): FormGroup {
  if (!ID_RE.test(g.id)) throw new Error(`group "${g.id}": id must be lowercase letters, numbers and dashes`);
  if (RESERVED_GROUP_IDS.has(g.id)) throw new Error(`group "${g.id}": that id is reserved`);
  const forms = new Map(g.forms.map((f) => [f.id, normalizeForm(f, g)]));
  if (forms.size !== g.forms.length) throw new Error(`group "${g.id}": form ids must be unique`);
  return { ...g, forms };
}

export const groups = new Map(configs.map((g) => [g.id, normalizeGroup(g)]));
if (groups.size !== configs.length) throw new Error('group ids must be unique');

export function findForm(groupId: string, formId: string): Form | undefined {
  return groups.get(groupId)?.forms.get(formId);
}

export function isOpen(form: Form): boolean {
  if (form.closed) return false;
  if (form.opensAt && Date.now() < Date.parse(form.opensAt)) return false;
  if (form.closesAt && Date.now() >= Date.parse(form.closesAt)) return false;
  return true;
}
