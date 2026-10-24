import { isOpen } from './forms.ts';
import { answerLabels } from './results.ts';
import type { ChoiceSummary, Summary, TextSummary, Winner } from './results.ts';
import type { Answer, Form, FormGroup, Option, Question, ResponseRecord } from './types.ts';

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const icons = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
};

interface LayoutOptions {
  title: string;
  body: string;
  wide?: boolean;
  narrow?: boolean;
  scripts?: string[];
}

function layout({ title, body, wide = false, narrow = false, scripts = [] }: LayoutOptions): string {
  const wrapClass = ['wrap', wide && 'wide', narrow && 'narrow'].filter(Boolean).join(' ');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/static/styles.css">
</head>
<body>
<main class="${wrapClass}">
${body}
</main>
${scripts.map((s) => `<script src="${s}" defer></script>`).join('\n')}
</body>
</html>`;
}

function message({ title, text, icon = 'check', action = '' }: { title: string; text?: string; icon?: keyof typeof icons; action?: string }): string {
  return layout({
    title,
    narrow: true,
    body: `<section class="card center message">
  <div class="seal">${icons[icon]}</div>
  <h1>${esc(title)}</h1>
  ${text ? `<p class="muted">${esc(text)}</p>` : ''}
  ${action}
</section>`,
  });
}

// ---------- Public pages ----------

function linkCard(href: string, { eyebrow, title, meta = '' }: { eyebrow?: string; title: string; meta?: string }): string {
  return `<a class="card form-link" href="${href}">
      <span>
        ${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ''}
        <span class="form-link-title">${esc(title)}</span>
        ${meta}
      </span>
      <span class="form-link-arrow">${icons.arrow}</span>
    </a>`;
}

export function group(g: FormGroup): string {
  const items = [...g.forms.values()]
    .filter((f) => f.listed)
    .map((f) => linkCard(f.path, { eyebrow: f.eyebrow, title: f.title, meta: isOpen(f) ? '' : '<span class="chip muted-chip">Closed</span>' }))
    .join('');
  return layout({
    title: g.name,
    body: `<header class="hero">
  <h1>${esc(g.name)}</h1>
  ${g.description ? `<p class="lede">${esc(g.description)}</p>` : ''}
</header>
<div class="stack">${items || '<p class="empty">No forms yet.</p>'}</div>`,
  });
}

function questionHtml(q: Question, value: Answer | undefined, error: string | undefined): string {
  const marker = q.required ? '<span class="req" aria-hidden="true">*</span>' : '<span class="opt">Optional</span>';
  const help = q.help ? `<p class="q-help">${esc(q.help)}</p>` : '';
  const err = error ? `<p class="q-error" role="alert">${esc(error)}</p>` : '';
  const cls = `q card${error ? ' has-error' : ''}`;

  if (q.type === 'choice') {
    const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
    const type = q.multiple ? 'checkbox' : 'radio';
    const limited = q.multiple && q.max < q.options.length;
    const groups = q.groups
      .map(
        (g) => `<div class="group g${g.index % 2}">
      ${g.label ? `<div class="group-head"><h3>${esc(g.label)}</h3>${g.description ? `<p>${esc(g.description)}</p>` : ''}</div>` : ''}
      <div class="options">
        ${g.options
          .map(
            (o) => `<label class="option">
          <input type="${type}" name="q_${q.id}" value="${esc(o.id)}"${selected.has(o.id) ? ' checked' : ''}>
          <span class="option-mark" aria-hidden="true">${icons.check}</span>
          <span class="option-text">
            <span class="option-title">${esc(o.label)}</span>
            ${o.description ? `<span class="option-desc">${esc(o.description)}</span>` : ''}
          </span>
        </label>`
          )
          .join('')}
      </div>
    </div>`
      )
      .join('');
    return `<fieldset class="${cls}" id="q-${q.id}" data-choice${limited ? ` data-max="${q.max}"` : ''}>
    <legend class="q-label">${esc(q.label)} ${marker}</legend>
    ${help}${err}${groups}
  </fieldset>`;
  }

  const attrs = `name="q_${q.id}" id="i-${q.id}" maxlength="${q.maxLength}"${q.placeholder ? ` placeholder="${esc(q.placeholder)}"` : ''}${q.required ? ' required' : ''}`;
  const input =
    q.type === 'textarea'
      ? `<textarea ${attrs} rows="${q.rows || 4}">${esc(value)}</textarea>`
      : `<input type="text" ${attrs} value="${esc(value)}"${q.autocomplete ? ` autocomplete="${esc(q.autocomplete)}"` : ''}>`;
  return `<div class="${cls}" id="q-${q.id}">
    <label class="q-label" for="i-${q.id}">${esc(q.label)} ${marker}</label>
    ${help}${err}${input}
  </div>`;
}

export function form(f: Form, { values = {}, errors = {} }: { values?: Record<string, Answer>; errors?: Record<string, string> } = {}): string {
  const errorCount = Object.keys(errors).length;
  return layout({
    title: f.eyebrow ? `${f.title} · ${f.eyebrow}` : f.title,
    scripts: ['/static/form.js'],
    body: `<header class="hero">
  ${f.eyebrow ? `<p class="eyebrow">${esc(f.eyebrow)}</p>` : ''}
  <h1>${esc(f.title)}</h1>
  ${f.description ? `<p class="lede">${esc(f.description)}</p>` : ''}
</header>
<form method="post" action="${f.path}" class="form" data-form novalidate>
  ${errorCount ? `<div class="alert" role="alert">Please check the highlighted ${errorCount === 1 ? 'question' : 'questions'}.</div>` : ''}
  ${f.questions.map((q) => questionHtml(q, values[q.id], errors[q.id])).join('\n')}
  <div class="submit-bar">
    <span class="submit-count" data-count hidden></span>
    <button type="submit" class="btn btn-primary btn-lg">${esc(f.submitLabel || 'Submit')}</button>
  </div>
</form>`,
  });
}

export function thanks(f: Form, { already = false }: { already?: boolean } = {}): string {
  return message({
    title: already ? "You've already responded" : f.thankYou.title || 'Thank you!',
    text: already ? 'Thanks, your response is already in.' : f.thankYou.message || 'Your response has been recorded.',
  });
}

export function closed(f: Form): string {
  return message({ title: `${f.title} is closed`, text: 'This form is not accepting responses right now.', icon: 'clock' });
}

export function notFound(): string {
  return message({ title: 'Page not found', text: "We couldn't find what you were looking for.", icon: 'clock' });
}

export function error(): string {
  return message({ title: 'Something went wrong', text: 'Please try again in a moment.', icon: 'clock' });
}

// ---------- Admin pages ----------

export function login({ next = '', error = '', configured = true }: { next?: string; error?: string; configured?: boolean } = {}): string {
  const content = configured
    ? `${error ? `<p class="alert" role="alert">${esc(error)}</p>` : ''}
  <form method="post" action="/admin/login" class="login-form">
    <input type="hidden" name="next" value="${esc(next)}">
    <label class="sr-only" for="pw">Password</label>
    <input type="password" id="pw" name="password" placeholder="Password" autocomplete="current-password" autofocus required>
    <button type="submit" class="btn btn-primary btn-lg">Unlock results</button>
  </form>`
    : '<p class="alert">No admin password is configured. Set the <code>ADMIN_PASSWORD</code> environment variable and redeploy.</p>';
  return layout({
    title: 'Results login',
    narrow: true,
    body: `<section class="card center message">
  <div class="seal">${icons.lock}</div>
  <h1>Results</h1>
  <p class="muted">Enter the admin password to view responses.</p>
  ${content}
</section>`,
  });
}

const logoutButton = '<form method="post" action="/admin/logout"><button type="submit" class="btn btn-ghost">Log out</button></form>';

export function adminHome(list: { group: FormGroup; forms: { form: Form; count: number }[] }[]): string {
  const rows = list
    .map(
      ({ group: g, forms }) => `<section class="admin-group">
    <h2>${esc(g.name)} <span class="muted small">/${esc(g.id)}</span></h2>
    <div class="stack">
      ${forms
        .map(({ form: f, count }) =>
          linkCard(`/admin${f.path}`, {
            eyebrow: f.eyebrow,
            title: f.title,
            meta: `<span class="muted small">${plural(count, 'response')} · ${isOpen(f) ? 'Open' : 'Closed'}</span>`,
          })
        )
        .join('')}
    </div>
  </section>`
    )
    .join('');
  return layout({
    title: 'Results',
    wide: true,
    body: `<header class="admin-head">
  <div><p class="eyebrow">Admin</p><h1>Results</h1></div>
  <div class="actions">${logoutButton}</div>
</header>
<div class="stack">${rows || '<p class="empty">No forms yet.</p>'}</div>`,
  });
}

function tieNotes(winners: Winner[]): string {
  const ties = new Map<string, Set<string>>();
  for (const w of winners) {
    if (!w.tiedWith.length) continue;
    const key = `${w.count}|${w.scope || ''}`;
    const names = ties.get(key) || new Set<string>();
    for (const o of [w, ...w.tiedWith]) names.add(o.label);
    ties.set(key, names);
  }
  return [...ties.entries()]
    .map(([key, names]) => {
      const count = Number(key.split('|')[0]);
      return `<p class="note warn"><strong>Tie at ${plural(count, 'vote')}:</strong> ${[...names].map(esc).join(', ')}. Pick between them yourself.</p>`;
    })
    .join('');
}

function choiceResult({ q, answered, ranked, maxCount, winners }: ChoiceSummary): string {
  const winnerIds = new Set(winners.map((w) => w.id));
  const grouped = q.groups.length > 1;
  const chip = (o: Option) => (grouped ? `<span class="chip g${o.groupIndex % 2}">${esc(o.groupLabel)}</span>` : '');

  const winnersHtml = winners.length
    ? `<div class="winners">
      <p class="eyebrow">${winners.length === 1 ? 'The winner' : `The ${winners.length} winners`}</p>
      <ol class="winner-list">
        ${winners
          .map(
            (w, i) => `<li>
          <span class="rank">${i + 1}</span>
          <span class="w-text"><strong>${esc(w.label)}</strong>${chip(w)}</span>
          <span class="w-votes">${plural(w.count, 'vote')}</span>
        </li>`
          )
          .join('')}
      </ol>
      ${tieNotes(winners)}
      ${q.winnerRule === 'one-per-group' && grouped ? '<p class="note">Includes the top choice from each list, then the next highest overall.</p>' : ''}
    </div>`
    : '';

  const bars = ranked
    .map(
      (o) => `<li class="bar${winnerIds.has(o.id) ? ' is-winner' : ''}">
      <div class="bar-meta">
        <span class="bar-label">${esc(o.label)}${chip(o)}</span>
        <span class="bar-count">${o.count}<span class="muted"> · ${o.pct}%</span></span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${maxCount ? (o.count / maxCount) * 100 : 0}%"></div></div>
    </li>`
    )
    .join('');

  return `<section class="card result">
  <div class="result-head"><h2>${esc(q.resultsTitle || q.label)}</h2><span class="muted small">${plural(answered, 'voter')}</span></div>
  ${answered ? `${winnersHtml}<ol class="bars">${bars}</ol>` : '<p class="empty">No votes yet.</p>'}
</section>`;
}

function textResult({ q, answers }: TextSummary): string {
  return `<section class="card result">
  <div class="result-head"><h2>${esc(q.resultsTitle || q.label)}</h2><span class="muted small">${plural(answers.length, 'answer')}</span></div>
  ${answers.length ? `<ul class="text-answers">${answers.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : '<p class="empty">No answers yet.</p>'}
</section>`;
}

function responsesTable(f: Form, responses: ResponseRecord[]): string {
  if (!responses.length) return '';
  const rows = [...responses]
    .reverse()
    .map(
      (r) => `<tr>
      <td class="nowrap"><time datetime="${esc(r.submittedAt)}">${esc(r.submittedAt)}</time></td>
      ${f.questions
        .map((q) => {
          const labels = answerLabels(q, r.answers?.[q.id]);
          if (!labels.length) return '<td class="muted">—</td>';
          return q.type === 'choice'
            ? `<td>${labels.map((l) => `<span class="chip plain">${esc(l)}</span>`).join('')}</td>`
            : `<td>${esc(labels[0])}</td>`;
        })
        .join('')}
    </tr>`
    )
    .join('');
  return `<section class="card result">
  <div class="result-head"><h2>All responses</h2><span class="muted small">Newest first</span></div>
  <div class="table-wrap"><table>
    <thead><tr><th>Submitted</th>${f.questions.map((q) => `<th>${esc(q.resultsTitle || q.label)}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
</section>`;
}

export function results(f: Form, summary: Summary[], responses: ResponseRecord[]): string {
  const latest = responses.at(-1);
  return layout({
    title: `Results · ${f.title}`,
    wide: true,
    scripts: ['/static/admin.js'],
    body: `<header class="admin-head">
  <div>
    <a class="back" href="/admin">← All forms</a>
    <p class="eyebrow">${esc(f.groupName)}${f.eyebrow ? ` · ${esc(f.eyebrow)}` : ''}</p>
    <h1>${esc(f.title)}</h1>
  </div>
  <div class="actions">
    <a class="btn" href="/admin${f.path}">Refresh</a>
    <a class="btn" href="/admin${f.path}/export.csv">Export CSV</a>
    <a class="btn" href="${f.path}" target="_blank" rel="noopener">Open form</a>
    ${logoutButton}
  </div>
</header>
<section class="stats">
  <div class="card stat"><span class="stat-num">${responses.length}</span><span class="stat-label">${responses.length === 1 ? 'Response' : 'Responses'}</span></div>
  <div class="card stat"><span class="stat-num small">${latest ? `<time datetime="${esc(latest.submittedAt)}" data-relative>${esc(latest.submittedAt)}</time>` : '—'}</span><span class="stat-label">Latest response</span></div>
  <div class="card stat"><span class="stat-num small"><span class="dot ${isOpen(f) ? 'open' : ''}"></span>${isOpen(f) ? 'Open' : 'Closed'}</span><span class="stat-label">Status</span></div>
</section>
<div class="stack">
  ${summary.map((s) => ('ranked' in s ? choiceResult(s) : textResult(s))).join('\n')}
  ${responsesTable(f, responses)}
</div>`,
  });
}
