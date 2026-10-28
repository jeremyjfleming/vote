import { isShown } from './forms.ts';
import type { Answer, Form } from './types.ts';

// Turns submitted FormData into a clean answers object, plus per-question errors.
// Questions hidden by showIf are stored as null, whatever the browser sent.
export function validate(form: Form, data: FormData) {
  const answers: Record<string, Answer> = {};
  const errors: Record<string, string> = {};

  for (const q of form.questions) {
    if (q.type === 'section') continue;
    const name = `q_${q.id}`;
    if (!isShown(q, answers)) {
      answers[q.id] = null;
      continue;
    }

    if (q.type === 'choice') {
      const values = [...new Set(data.getAll(name).map(String))].filter((v) => q.optionMap.has(v));
      if (q.multiple) {
        answers[q.id] = values;
        if (values.length < q.min) errors[q.id] = q.min === 1 ? 'Please choose at least one.' : `Please choose at least ${q.min}.`;
        else if (values.length > q.max) errors[q.id] = `Please choose no more than ${q.max}.`;
        else if (q.required || values.length) {
          const short = q.groups.find((g) => g.min && values.filter((v) => q.optionMap.get(v)!.group === g.id).length < g.min);
          if (short) errors[q.id] = `Please choose at least ${short.min} from ${short.label}.`;
        }
      } else {
        answers[q.id] = values[0] ?? null;
        if (q.required && !values.length) errors[q.id] = 'Please choose one.';
      }
      continue;
    }

    if (q.type === 'scale') {
      const n = Number(data.get(name));
      const valid = data.get(name) !== null && Number.isInteger(n) && n >= q.min && n <= q.max;
      answers[q.id] = valid ? n : null;
      if (q.required && !valid) errors[q.id] = 'Please choose a rating.';
      continue;
    }

    const value = String(data.get(name) ?? '').trim().slice(0, q.maxLength);
    answers[q.id] = value;
    if (q.required && !value) errors[q.id] = 'This field is required.';
  }

  return { answers, errors };
}
