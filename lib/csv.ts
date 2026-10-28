import { answerable, answerLabels } from './results.ts';
import type { Form, ResponseRecord } from './types.ts';

function cell(value: string): string {
  let s = value;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // keep spreadsheets from running it as a formula
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(form: Form, responses: ResponseRecord[]): string {
  const questions = answerable(form);
  const header = ['Submitted at', ...questions.map((q) => q.label)];
  const rows = responses.map((r) => [
    r.submittedAt,
    ...questions.map((q) => answerLabels(q, r.answers?.[q.id]).join('; ')),
  ]);
  return '﻿' + [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
