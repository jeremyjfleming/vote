// ---------- Form definitions (what you write in forms/*.ts) ----------

export interface OptionConfig {
  id: string;
  label: string;
  description?: string;
}

export interface GroupConfig {
  id: string;
  label: string;
  description?: string;
  options: OptionConfig[];
}

interface BaseQuestionConfig {
  /** Lowercase letters, numbers and dashes. Used as the storage key, so don't rename after responses come in. */
  id: string;
  label: string;
  help?: string;
  required?: boolean;
  /** Heading on the results page (defaults to label). */
  resultsTitle?: string;
  /** Show a summary card on the results page. Default true. */
  summary?: boolean;
}

export interface TextQuestionConfig extends BaseQuestionConfig {
  type: 'text' | 'textarea';
  placeholder?: string;
  autocomplete?: string;
  maxLength?: number;
  rows?: number;
}

export interface ChoiceQuestionConfig extends BaseQuestionConfig {
  type: 'choice';
  /** Checkboxes instead of radio buttons. */
  multiple?: boolean;
  min?: number;
  max?: number;
  /** Use either a flat options list or groups of options. */
  options?: OptionConfig[];
  groups?: GroupConfig[];
  /** How many winners to highlight on the results page. */
  winners?: number;
  /** "one-per-group" guarantees the leader of each group a winning spot. */
  winnerRule?: 'top' | 'one-per-group';
}

export type QuestionConfig = TextQuestionConfig | ChoiceQuestionConfig;

export interface FormGroupConfig {
  /** Appears in the URL: /<id>. Can't be "admin" or "static". */
  id: string;
  name: string;
  description?: string;
  /** Brand color for this group's pages, as a hex color like "#1f6feb". Defaults to the Distra Voter color. */
  accentColor?: string;
  /** Up to 3 characters shown in the group's badge. Defaults to the initials of the name. */
  initials?: string;
  forms: FormConfig[];
}

export interface FormConfig {
  /** Appears in the URL: /<group-id>/<id>. Unique within its group. */
  id: string;
  title: string;
  eyebrow?: string;
  description?: string;
  submitLabel?: string;
  thankYou?: { title?: string; message?: string };
  /** Show on the group page. Default true. */
  listed?: boolean;
  /** Allow the same browser to submit more than once. Default false. */
  allowMultiple?: boolean;
  closed?: boolean;
  /** ISO date-times, e.g. "2026-11-07T19:00:00-05:00". */
  opensAt?: string;
  closesAt?: string;
  questions: QuestionConfig[];
}

// ---------- Normalized forms (used by the app) ----------

export interface Option extends OptionConfig {
  group: string;
  groupLabel: string;
  groupIndex: number;
  index: number;
}

export interface Group extends GroupConfig {
  index: number;
}

interface NormalizedBase {
  required: boolean;
  help: string;
  summary: boolean;
}

export interface TextQuestion extends Omit<TextQuestionConfig, keyof NormalizedBase>, NormalizedBase {
  maxLength: number;
}

type ChoiceDefaults = 'options' | 'groups' | 'multiple' | 'min' | 'max' | 'winners' | 'winnerRule' | keyof NormalizedBase;

export interface ChoiceQuestion extends Omit<ChoiceQuestionConfig, ChoiceDefaults>, NormalizedBase {
  multiple: boolean;
  min: number;
  max: number;
  groups: Group[];
  options: Option[];
  optionMap: Map<string, Option>;
  winners: number;
  winnerRule: 'top' | 'one-per-group';
}

export type Question = TextQuestion | ChoiceQuestion;

export interface Form extends Omit<FormConfig, 'questions'> {
  listed: boolean;
  allowMultiple: boolean;
  thankYou: { title?: string; message?: string };
  questions: Question[];
  groupId: string;
  groupName: string;
  /** Public URL path, e.g. "/cru/theology-night". */
  path: string;
  /** Storage key for responses, e.g. "cru/theology-night". */
  key: string;
}

export interface FormGroup extends Omit<FormGroupConfig, 'forms'> {
  initials: string;
  forms: Map<string, Form>;
}

// ---------- Responses ----------

export type Answer = string | string[] | null;

export interface ResponseRecord {
  id: string;
  submittedAt: string;
  answers: Record<string, Answer>;
}

/** formKey is Form.key, e.g. "cru/theology-night". */
export interface ResponseStore {
  add(formKey: string, record: ResponseRecord): Promise<void>;
  all(formKey: string): Promise<ResponseRecord[]>;
}
