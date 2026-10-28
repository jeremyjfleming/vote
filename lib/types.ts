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
  /** Multiple-choice only: each response must pick at least this many options from this group. */
  min?: number;
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
  /** A few words for the responses table's column heading (defaults to resultsTitle, then label). */
  shortLabel?: string;
  /** Show a summary card on the results page. Default true. */
  summary?: boolean;
  /** Only show (and accept) this question when an earlier choice question has one of these answers. */
  showIf?: ShowIf;
}

export interface ShowIf {
  /** Id of an earlier choice question. */
  question: string;
  /** Option id, or ids, that make this question appear. */
  equals: string | string[];
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

export interface ScaleQuestionConfig extends BaseQuestionConfig {
  type: 'scale';
  /** Lowest and highest values. Default 1 to 10. */
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
}

/** A heading that splits the form into parts. Collects no answer. */
export interface SectionConfig extends Omit<BaseQuestionConfig, 'required' | 'summary'> {
  type: 'section';
}

export type QuestionConfig = TextQuestionConfig | ChoiceQuestionConfig | ScaleQuestionConfig | SectionConfig;

export interface GiveawayConfig {
  /** What winners get, e.g. "A free scoop at Mitchell's Ice Cream". */
  prize: string;
  /** How many winners to draw when the form closes. */
  winners: number;
  /** Ids of text questions that must all be answered to be entered. */
  questions: string[];
}

export interface FormGroupConfig {
  /** Appears in the URL: /<id>. Can't be "admin" or "static". */
  id: string;
  name: string;
  description?: string;
  /** Brand color for this group's pages, as a hex color like "#1f6feb". Defaults to the Distra Voter color. */
  accentColor?: string;
  /** Up to 3 characters shown in the group's badge. Defaults to the initials of the name. */
  initials?: string;
  /** IANA time zone, e.g. "America/New_York". Anonymous forms record the date in this zone. Default "UTC". */
  timeZone?: string;
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
  /**
   * Don't collect anything that identifies respondents: submission times are
   * stored as the date only, and responses are listed in random order.
   */
  anonymous?: boolean;
  /** Raffle among respondents. Entries are anonymous codes that can't be linked to answers. */
  giveaway?: GiveawayConfig;
  /** Id of a single-choice question; rating results are also averaged per answer to it. */
  compareBy?: string;
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

export interface ScaleQuestion extends Omit<ScaleQuestionConfig, keyof NormalizedBase | 'min' | 'max'>, NormalizedBase {
  min: number;
  max: number;
}

export interface SectionQuestion extends Omit<SectionConfig, 'help'>, NormalizedBase {}

export type Question = TextQuestion | ChoiceQuestion | ScaleQuestion | SectionQuestion;

export interface Form extends Omit<FormConfig, 'questions'> {
  listed: boolean;
  allowMultiple: boolean;
  anonymous: boolean;
  thankYou: { title?: string; message?: string };
  questions: Question[];
  groupId: string;
  groupName: string;
  timeZone: string;
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

export type Answer = string | string[] | number | null;

export interface ResponseRecord {
  id: string;
  submittedAt: string;
  answers: Record<string, Answer>;
}

/** A JSON key-value store (Netlify Blobs in production, files locally). */
export interface Store {
  get<T>(key: string): Promise<T | null>;
  /** With onlyIfNew, returns false and writes nothing when the key already exists. */
  set(key: string, value: unknown, options?: { onlyIfNew?: boolean }): Promise<boolean>;
  /** All keys starting with prefix. */
  list(prefix: string): Promise<string[]>;
}

export interface Stores {
  responses: Store;
  giveaway: Store;
}
