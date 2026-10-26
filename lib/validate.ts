import type { Answer, Form } from './types.ts';

// Turns submitted FormData into a clean answers object, plus per-question errors.
export function validate(form: Form, data: FormData) {
  const answers: Record<string, Answer> = {};
  const errors: Record<string, string> = {};

  for (const q of form.questions) {
    const name = `q_${q.id}`;

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

    const value = String(data.get(name) ?? '').trim().slice(0, q.maxLength);
    answers[q.id] = value;
    if (q.required && !value) errors[q.id] = 'This field is required.';
  }

  return { answers, errors };
}
