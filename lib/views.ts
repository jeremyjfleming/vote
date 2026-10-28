import { formStatus, groups, isShown } from './forms.ts';
import { answerable, answerLabels } from './results.ts';
import type { ChoiceSummary, ScaleSummary, Summary, TextSummary, Winner } from './results.ts';
import type { CodeStatus, Draw } from './giveaway.ts';
import type { Answer, Form, FormGroup, Option, Question, ResponseRecord } from './types.ts';

export interface GiveawayInfo {
  entries: number;
  draw: Draw | null;
  claims: number;
}

const BRAND = 'Distra Voter';

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

const svg = (body: string, width = 2) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const icons = {
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 3),
  lock: svg('<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'),
  clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  user: svg('<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1.2-3.5 3.8-5 7-5s5.8 1.5 7 5"/>'),
  asterisk: svg('<path d="M12 5v14M5.9 8.5l12.2 7M5.9 15.5l12.2-7"/>'),
  chevron: svg('<path d="M9 6l6 6-6 6"/>'),
  external: svg('<path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>'),
  link: svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  download: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  refresh: svg('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>'),
  alert: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 8v5M12 16.2v.1"/>'),
  shield: svg('<path d="M12 3.5l7 2.8v5.2c0 4.4-3 7.9-7 9-4-1.1-7-4.6-7-9V6.3z"/><path d="M9 12l2 2 4-4"/>'),
  gift: svg('<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11M12 9c-1.5-3-5-4-5-1.5S10 9 12 9c2 0 5 .5 5-1.5S13.5 6 12 9"/>'),
  copy: svg('<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>'),
};

const mark = '<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9"/><path d="M9.5 16.5l4.5 4.5 8.5-9.5"/></svg>';
const wordmark = `<span class="wordmark"><b>Distra</b> Voter</span>`;

// ---------- Layout ----------

interface LayoutOptions {
  title: string;
  body: string;
  description?: string;
  /** public: group-branded pages. admin: the Distra Voter app. bare: login and error pages. */
  shell?: 'public' | 'admin' | 'bare';
  group?: FormGroup;
  width?: 'narrow' | 'default' | 'wide';
  scripts?: string[];
}

function avatar(g: FormGroup, size = ''): string {
  return `<span class="avatar${size ? ` avatar-${size}` : ''}" aria-hidden="true">${esc(g.initials)}</span>`;
}

function groupStyle(g?: FormGroup): string {
  if (!g?.accentColor) return '';
  // accentColor is validated as a hex color when forms load.
  return ` style="--group-accent:${g.accentColor};--group-accent-dark:color-mix(in oklab, ${g.accentColor} 55%, white)"`;
}

function topbar(shell: LayoutOptions['shell'], group?: FormGroup): string {
  if (shell === 'admin') {
    return `<header class="topbar">
  <div class="bar-inner wide">
    <a class="brand" href="/admin">${mark}${wordmark}</a>
    <nav class="topnav" aria-label="Main"><a href="/admin">Dashboard</a></nav>
    <form method="post" action="/admin/logout" class="bar-end"><button type="submit" class="btn btn-ghost btn-sm">Sign out</button></form>
  </div>
</header>`;
  }
  if (shell === 'public' && group) {
    return `<header class="topbar">
  <div class="bar-inner">
    <a class="org" href="/${group.id}">${avatar(group)}<span class="org-name">${esc(group.name)}</span></a>
  </div>
</header>`;
  }
  return `<header class="bare-brand">${mark}${wordmark}</header>`;
}

function footer(shell: LayoutOptions['shell']): string {
  if (shell === 'admin') return '';
  if (shell === 'public') return `<footer class="foot"><span class="powered">Powered by ${mark}${wordmark}</span></footer>`;
  return `<footer class="foot"><span class="muted small">© ${new Date().getFullYear()} ${BRAND}</span></footer>`;
}

function layout({ title, body, description, shell = 'public', group, width = 'default', scripts = [] }: LayoutOptions): string {
  const allScripts = [...new Set(['/static/app.js', ...scripts])];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${description ? `<meta name="description" content="${esc(description)}">` : ''}
<meta property="og:site_name" content="${BRAND}">
<meta property="og:title" content="${esc(title)}">
${description ? `<meta property="og:description" content="${esc(description)}">` : ''}
<meta name="theme-color" content="#2f2963">
<link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/static/styles.css">
</head>
<body class="shell-${shell}"${groupStyle(group)}>
${topbar(shell, group)}
<main class="page page-${width}">
${body}
</main>
${footer(shell)}
${allScripts.map((s) => `<script src="${s}" defer></script>`).join('\n')}
</body>
</html>`;
}

// Times are rendered in the viewer's time zone by app.js. Date-only values
// (from anonymous forms) have no time zone and are shown as-is.
function time(iso: string, mode: 'datetime' | 'relative' = 'datetime'): string {
  if (iso.length === 10) return `<time datetime="${esc(iso)}" data-date-only>${esc(iso)}</time>`;
  return `<time datetime="${esc(iso)}"${mode === 'relative' ? ' data-relative' : ''}>${esc(iso)}</time>`;
}

function statusPill(f: Form): string {
  const s = formStatus(f);
  if (s.state === 'scheduled') return `<span class="pill scheduled"><i></i>Opens ${time(s.at!)}</span>`;
  if (s.state === 'closed') return '<span class="pill closed"><i></i>Closed</span>';
  return `<span class="pill open"><i></i>${s.at ? `Open until ${time(s.at)}` : 'Open'}</span>`;
}

interface MessageOptions {
  title: string;
  text?: string;
  html?: string;
  icon?: keyof typeof icons;
  tone?: 'success' | 'neutral';
  shell?: LayoutOptions['shell'];
  group?: FormGroup;
}

function message({ title, text, html = '', icon = 'check', tone = 'neutral', shell = 'bare', group }: MessageOptions): string {
  return layout({
    title: group ? `${title} · ${group.name}` : `${title} · ${BRAND}`,
    shell,
    group,
    width: 'narrow',
    body: `<section class="card message">
  <div class="seal seal-${tone}">${icons[icon]}</div>
  <h1>${esc(title)}</h1>
  ${text ? `<p class="muted">${esc(text)}</p>` : ''}
  ${html}
</section>`,
  });
}

// ---------- Public pages ----------

export function group(g: FormGroup): string {
  const listed = [...g.forms.values()].filter((f) => f.listed);
  const rows = listed
    .map(
      (f) => `<a class="list-row" href="${f.path}">
      <span class="row-main">
        ${f.eyebrow ? `<span class="row-eyebrow">${esc(f.eyebrow)}</span>` : ''}
        <span class="row-title">${esc(f.title)}</span>
      </span>
      ${statusPill(f)}
      <span class="row-chevron">${icons.chevron}</span>
    </a>`
    )
    .join('');
  return layout({
    title: `${g.name} · ${BRAND}`,
    description: g.description,
    group: g,
    body: `<section class="org-hero">
  ${avatar(g, 'lg')}
  <div>
    <h1>${esc(g.name)}</h1>
    ${g.description ? `<p class="lede">${esc(g.description)}</p>` : ''}
  </div>
</section>
<section class="card list">
  <div class="list-caption">Forms <span class="count">${listed.length}</span></div>
  ${rows || '<p class="empty">No forms yet.</p>'}
</section>`,
  });
}

function questionHtml(q: Question, value: Answer | undefined, error: string | undefined, shown: boolean): string {
  const marker = q.required ? '<span class="req" aria-label="required">*</span>' : '';
  const help = q.help ? `<p class="q-help">${esc(q.help)}</p>` : '';
  const err = error ? `<p class="q-error" role="alert">${icons.alert}${esc(error)}</p>` : '';
  const cls = `q card${error ? ' has-error' : ''}`;
  // form.js shows and hides these as the controlling answer changes.
  const cond = q.showIf
    ? ` data-show-if="${esc(q.showIf.question)}" data-show-values="${esc([q.showIf.equals].flat().join(' '))}"${shown ? '' : ' hidden'}`
    : '';

  if (q.type === 'section') {
    return `<div class="form-section" id="q-${q.id}"${cond}>
    <h2>${esc(q.label)}</h2>
    ${q.help ? `<p>${esc(q.help)}</p>` : ''}
  </div>`;
  }

  if (q.type === 'scale') {
    const values = Array.from({ length: q.max - q.min + 1 }, (_, i) => q.min + i);
    return `<fieldset class="${cls}" id="q-${q.id}"${cond}>
    <legend class="q-label">${esc(q.label)} ${marker}</legend>
    ${help}${err}
    <div class="scale" style="--steps:${values.length}">
      ${values
        .map(
          (n) => `<label class="scale-opt">
        <input type="radio" name="q_${q.id}" value="${n}"${value === n ? ' checked' : ''}>
        <span>${n}</span>
      </label>`
        )
        .join('')}
    </div>
    ${q.minLabel || q.maxLabel ? `<div class="scale-labels"><span>${esc(q.minLabel)}</span><span>${esc(q.maxLabel)}</span></div>` : ''}
  </fieldset>`;
  }

  if (q.type === 'choice') {
    const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
    const type = q.multiple ? 'checkbox' : 'radio';
    const limited = q.multiple && (q.max < q.options.length || q.groups.some((g) => g.min));
    const groups = q.groups
      .map(
        (g) => `<div class="group g${g.index % 2}"${g.min ? ` data-group-min="${g.min}" data-group-label="${esc(g.label)}"` : ''}>
      ${
        g.label
          ? `<div class="group-head">
        <div class="group-title"><h3>${esc(g.label)}</h3>${g.min ? `<span class="group-req">${icons.check}At least ${g.min}</span>` : ''}</div>
        ${g.description ? `<p>${esc(g.description)}</p>` : ''}
      </div>`
          : ''
      }
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
    return `<fieldset class="${cls}" id="q-${q.id}" data-choice${limited ? ` data-max="${q.max}"` : ''}${cond}>
    <legend class="q-label">${esc(q.label)} ${marker}</legend>
    ${help}${err}${groups}
  </fieldset>`;
  }

  const attrs = `name="q_${q.id}" id="i-${q.id}" maxlength="${q.maxLength}"${q.placeholder ? ` placeholder="${esc(q.placeholder)}"` : ''}${q.required ? ' required' : ''}`;
  const input =
    q.type === 'textarea'
      ? `<textarea ${attrs} rows="${q.rows || 4}">${esc(value)}</textarea>`
      : `<input type="text" ${attrs} value="${esc(value)}"${q.autocomplete ? ` autocomplete="${esc(q.autocomplete)}"` : ''}>`;
  return `<div class="${cls}" id="q-${q.id}"${cond}>
    <label class="q-label" for="i-${q.id}">${esc(q.label)} ${marker}</label>
    ${help}${err}${input}
  </div>`;
}

export function form(f: Form, { values = {}, errors = {} }: { values?: Record<string, Answer>; errors?: Record<string, string> } = {}): string {
  const g = groups.get(f.groupId)!;
  const errorCount = Object.keys(errors).length;
  const status = formStatus(f);
  const meta = [
    f.anonymous ? `<li class="meta-strong">${icons.shield}Anonymous</li>` : '',
    f.giveaway ? `<li class="meta-strong">${icons.gift}Giveaway</li>` : '',
    status.at ? `<li>${icons.clock}Closes ${time(status.at)}</li>` : '',
    f.allowMultiple ? '' : `<li>${icons.user}One response per person</li>`,
    f.questions.some((q) => q.required) ? `<li>${icons.asterisk}Required</li>` : '',
  ].join('');

  // Questions are shown based on the answers before them, so walk in order.
  const shownSoFar: Record<string, Answer> = {};
  const firstEntryQuestion = f.giveaway && f.questions.find((q) => f.giveaway!.questions.includes(q.id));
  const questions = f.questions
    .map((q) => {
      const shown = isShown(q, shownSoFar);
      if (shown) shownSoFar[q.id] = values[q.id] ?? null;
      const callout = q === firstEntryQuestion ? giveawayCallout(f) : '';
      return callout + questionHtml(q, values[q.id], errors[q.id], shown);
    })
    .join('\n');

  return layout({
    title: `${f.title} · ${g.name}`,
    description: f.description,
    group: g,
    scripts: ['/static/form.js'],
    body: `<header class="card form-header">
  ${f.eyebrow ? `<p class="eyebrow">${esc(f.eyebrow)}</p>` : ''}
  <h1>${esc(f.title)}</h1>
  ${f.description ? `<p class="lede">${esc(f.description)}</p>` : ''}
  ${meta ? `<ul class="meta">${meta}</ul>` : ''}
</header>
<form method="post" action="${f.path}" class="form" data-form novalidate>
  ${errorCount ? `<div class="alert" role="alert">${icons.alert}Please check the highlighted ${errorCount === 1 ? 'question' : 'questions'}.</div>` : ''}
  ${questions}
  <div class="submit-bar">
    <span class="submit-count" data-count hidden></span>
    <button type="submit" class="btn btn-primary btn-lg">${esc(f.submitLabel || 'Submit')}</button>
  </div>
</form>`,
  });
}

function giveawayCallout(f: Form): string {
  const g = f.giveaway!;
  const n = g.questions.length;
  return `<aside class="callout" data-giveaway="${esc(g.questions.join(' '))}">
    <span class="callout-icon">${icons.gift}</span>
    <div>
      <p class="callout-title">Giveaway: ${esc(g.prize)}</p>
      <p>Answer ${n === 1 ? 'the question' : `all ${n} questions`} below to be entered. ${plural(g.winners, 'winner')} will be drawn after the form closes${f.anonymous ? ', and your entry is not linked to your answers' : ''}.</p>
      <p class="callout-progress" data-giveaway-progress aria-live="polite"></p>
    </div>
  </aside>`;
}

function codeBox(code: string): string {
  return `<div class="code-box">
    <span class="code" data-code>${esc(code)}</span>
    <button type="button" class="btn btn-sm" data-copy-text="${esc(code)}" hidden>${icons.copy}<span>Copy</span></button>
  </div>`;
}

function drawTiming(f: Form): string {
  const s = formStatus(f);
  if (s.state === 'closed') return 'Winners have been drawn';
  return s.at ? `Winners are drawn after the form closes ${time(s.at)}` : 'Winners are drawn after the form closes';
}

export function thanks(f: Form, { already = false, ticket }: { already?: boolean; ticket?: string } = {}): string {
  let giveawayHtml = '';
  if (f.giveaway && ticket === 'none') {
    giveawayHtml = `<div class="ticket ticket-muted">
      <p>You weren't entered in the giveaway, because some of the feedback questions were left blank.</p>
    </div>`;
  } else if (f.giveaway && ticket) {
    giveawayHtml = `<div class="ticket">
      <p class="ticket-title">${icons.gift}You're entered to win ${esc(f.giveaway.prize.replace(/^A /, 'a '))}</p>
      <p class="muted small">Your giveaway code</p>
      ${codeBox(ticket)}
      <p class="small"><strong>Screenshot this or write it down.</strong> The code isn't linked to your answers, so it's the only way to claim a prize.</p>
      <p class="small muted">${drawTiming(f)}. This device will remember your code.</p>
      <a class="btn" href="${f.path}/giveaway">Check the giveaway</a>
    </div>`;
  }
  return message({
    title: already ? "You've already responded" : f.thankYou.title || 'Response recorded',
    text: already ? 'Thanks, your response is already in.' : f.thankYou.message || 'Thanks for filling this out.',
    html: giveawayHtml,
    tone: 'success',
    shell: 'public',
    group: groups.get(f.groupId),
  });
}

export function giveawayPage(f: Form, { status, draw, fromDevice }: { status?: CodeStatus; draw: Draw | null; fromDevice: boolean }): string {
  const g = f.giveaway!;
  let result = '';
  if (status) {
    const code = 'code' in status ? `<span class="code code-sm">${esc(status.code)}</span>` : '';
    const source = fromDevice ? 'The code saved on this device' : 'That code';
    if (status.state === 'won') {
      result = `<div class="result-card won">
        <div class="seal seal-success">${icons.gift}</div>
        <h2>You won!</h2>
        <p>${esc(g.prize)} is yours.${status.claimedAt ? '' : ' Show this screen to a leader to claim it.'}</p>
        ${codeBox(status.code)}
        ${status.claimedAt ? `<p class="pill closed"><i></i>Claimed ${time(status.claimedAt)}</p>` : ''}
      </div>`;
    } else if (status.state === 'lost') {
      result = `<div class="result-card"><h2>Not this time</h2><p class="muted">${source} ${code} wasn't drawn. Thanks for the feedback!</p></div>`;
    } else if (status.state === 'pending') {
      result = `<div class="result-card"><h2>You're entered</h2><p class="muted">${source} ${code} is in the draw. Check back once the form closes.</p></div>`;
    } else if (status.state === 'unknown') {
      result = `<div class="result-card"><h2>Code not found</h2><p class="muted">Check for typos and try again.</p></div>`;
    } else {
      result = `<div class="result-card"><h2>That doesn't look like a code</h2><p class="muted">Codes look like K7QF-9MXA.</p></div>`;
    }
  }

  return layout({
    title: `Giveaway · ${f.title}`,
    group: groups.get(f.groupId),
    width: 'narrow',
    body: `<section class="card giveaway-page">
  <p class="eyebrow">${icons.gift}Giveaway</p>
  <h1>${esc(g.prize)}</h1>
  <p class="muted">${plural(g.winners, 'winner')} from everyone who answered all the feedback questions in ${esc(f.title)}. ${drawTiming(f)}${draw ? ` from ${plural(draw.entries, 'entry', 'entries')}` : ''}.</p>
  ${result}
  <form method="post" action="${f.path}/giveaway" class="login-form">
    <label class="field-label" for="code">${status ? 'Check another code' : 'Check your code'}</label>
    <input type="text" id="code" name="code" placeholder="K7QF-9MXA" autocomplete="off" autocapitalize="characters" spellcheck="false" required>
    <button type="submit" class="btn btn-primary btn-lg btn-block">Check</button>
  </form>
</section>`,
  });
}

export function closed(f: Form): string {
  const s = formStatus(f);
  return message({
    title: s.state === 'scheduled' ? "This form isn't open yet" : 'This form is closed',
    html: `<p class="muted">${s.state === 'scheduled' ? `${esc(f.title)} opens ${time(s.at!)}.` : `${esc(f.title)} is no longer accepting responses.`}</p>`,
    icon: 'clock',
    shell: 'public',
    group: groups.get(f.groupId),
  });
}

export function notFound(): string {
  return message({ title: 'Page not found', text: 'Check the link and try again.', icon: 'alert' });
}

export function error(): string {
  return message({ title: 'Something went wrong', text: 'Please try again in a moment.', icon: 'alert' });
}

// ---------- Admin pages ----------

export function login({ next = '', error = '', configured = true }: { next?: string; error?: string; configured?: boolean } = {}): string {
  const content = configured
    ? `${error ? `<p class="alert" role="alert">${icons.alert}${esc(error)}</p>` : ''}
  <form method="post" action="/admin/login" class="login-form">
    <input type="hidden" name="next" value="${esc(next)}">
    <label class="field-label" for="pw">Admin password</label>
    <input type="password" id="pw" name="password" autocomplete="current-password" autofocus required>
    <button type="submit" class="btn btn-primary btn-lg btn-block">Sign in</button>
  </form>`
    : `<p class="alert">${icons.alert}<span>No admin password is configured. Set the <code>ADMIN_PASSWORD</code> environment variable and redeploy.</span></p>`;
  return layout({
    title: `Sign in · ${BRAND}`,
    shell: 'bare',
    width: 'narrow',
    body: `<section class="card auth">
  <h1>Sign in</h1>
  <p class="muted">View responses and results for your forms.</p>
  ${content}
</section>`,
  });
}

interface DashboardGroup {
  group: FormGroup;
  forms: { form: Form; count: number }[];
}

export function adminHome(list: DashboardGroup[]): string {
  const formCount = list.reduce((n, g) => n + g.forms.length, 0);
  const responseCount = list.reduce((n, g) => n + g.forms.reduce((m, f) => m + f.count, 0), 0);
  const openCount = list.reduce((n, g) => n + g.forms.filter(({ form }) => formStatus(form).state === 'open').length, 0);

  const panels = list
    .map(
      ({ group: g, forms }) => `<section class="card list">
    <div class="panel-head">
      ${avatar(g)}
      <div>
        <h2>${esc(g.name)}</h2>
        <a class="muted small link-quiet" href="/${g.id}" target="_blank" rel="noopener">/${esc(g.id)} ${icons.external}</a>
      </div>
    </div>
    <div class="list-head"><span>Form</span><span>Status</span><span class="num">Responses</span><span></span></div>
    ${forms
      .map(
        ({ form: f, count }) => `<a class="list-row cols" href="/admin${f.path}">
      <span class="row-main">
        ${f.eyebrow ? `<span class="row-eyebrow">${esc(f.eyebrow)}</span>` : ''}
        <span class="row-title">${esc(f.title)}</span>
      </span>
      <span>${statusPill(f)}</span>
      <span class="num row-count">${count}</span>
      <span class="row-chevron">${icons.chevron}</span>
    </a>`
      )
      .join('') || '<p class="empty">No forms yet.</p>'}
  </section>`
    )
    .join('');

  return layout({
    title: `Dashboard · ${BRAND}`,
    shell: 'admin',
    width: 'wide',
    body: `<div class="page-head">
  <div><h1>Dashboard</h1><p class="muted">Forms and responses across your groups.</p></div>
</div>
<section class="stats">
  <div class="card stat"><span class="stat-label">Groups</span><span class="stat-num">${list.length}</span></div>
  <div class="card stat"><span class="stat-label">Open forms</span><span class="stat-num">${openCount}<span class="stat-of"> / ${formCount}</span></span></div>
  <div class="card stat"><span class="stat-label">Responses</span><span class="stat-num">${responseCount}</span></div>
</section>
<div class="stack">${panels || '<p class="empty">No groups yet.</p>'}</div>`,
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
      return `<p class="note warn">${icons.alert}<span><strong>Tie at ${plural(count, 'vote')}:</strong> ${[...names].map(esc).join(', ')}. You'll need to break it.</span></p>`;
    })
    .join('');
}

function choiceResult({ q, answered, ranked, maxCount, winners }: ChoiceSummary): string {
  const winnerIds = new Set(winners.map((w) => w.id));
  const grouped = q.groups.length > 1;
  const chip = (o: Option) => (grouped ? `<span class="chip g${o.groupIndex % 2}">${esc(o.groupLabel)}</span>` : '');

  const winnersHtml = winners.length
    ? `<div class="winners">
      <p class="section-label">${winners.length === 1 ? 'Leading' : `Top ${winners.length}`}</p>
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
  ${answered ? `${winnersHtml}<p class="section-label">All options</p><ol class="bars">${bars}</ol>` : '<p class="empty">No votes yet.</p>'}
</section>`;
}

function textResult({ q, answers }: TextSummary): string {
  return `<section class="card result">
  <div class="result-head"><h2>${esc(q.resultsTitle || q.label)}</h2><span class="muted small">${plural(answers.length, 'answer')}</span></div>
  ${answers.length ? `<ul class="text-answers">${answers.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : '<p class="empty">No answers yet.</p>'}
</section>`;
}

function scaleResult({ q, answered, average, counts, maxCount, segments }: ScaleSummary): string {
  const fmt = (n: number | null) => (n === null ? '—' : n.toFixed(1));
  const columns = counts
    .map(
      (c) => `<div class="hist-col" title="${plural(c.count, 'response')} chose ${c.value}">
      <span class="hist-count">${c.count || ''}</span>
      <div class="hist-bar" style="height:${maxCount ? Math.max((c.count / maxCount) * 100, c.count ? 4 : 0) : 0}%"></div>
      <span class="hist-value">${c.value}</span>
    </div>`
    )
    .join('');
  return `<section class="card result">
  <div class="result-head"><h2>${esc(q.resultsTitle || q.label)}</h2><span class="muted small">${plural(answered, 'answer')}</span></div>
  ${
    answered
      ? `<div class="scale-result">
    <div class="scale-avgs">
      <div class="scale-avg"><span class="stat-num">${fmt(average)}</span><span class="muted small">average, ${q.min} to ${q.max}</span></div>
      ${segments
        .filter((s) => s.answered)
        .map((s) => `<div class="scale-avg seg"><span class="seg-num">${fmt(s.average)}</span><span class="muted small">${esc(s.label)} · ${s.answered}</span></div>`)
        .join('')}
    </div>
    <div class="histogram" style="--steps:${counts.length}">${columns}</div>
  </div>
  ${q.minLabel || q.maxLabel ? `<div class="scale-labels"><span>${q.min} = ${esc(q.minLabel)}</span><span>${q.max} = ${esc(q.maxLabel)}</span></div>` : ''}`
      : '<p class="empty">No answers yet.</p>'
  }
</section>`;
}

function giveawayPanel(f: Form, info: GiveawayInfo, claimed?: CodeStatus): string {
  const g = f.giveaway!;
  const { entries, draw, claims } = info;
  let message = '';
  if (claimed) {
    const tone = claimed.state === 'won' && claimed.justClaimed ? 'ok' : claimed.state === 'won' ? 'warn' : 'bad';
    const text =
      claimed.state === 'won'
        ? claimed.justClaimed
          ? `<strong>${esc(claimed.code)} is a winner.</strong> Marked as claimed. Hand over the prize!`
          : `<strong>${esc(claimed.code)} already claimed</strong> ${time(claimed.claimedAt!)}. Don't give a second prize.`
        : claimed.state === 'lost'
          ? `<strong>${esc(claimed.code)} is not a winning code.</strong>`
          : claimed.state === 'pending'
            ? `<strong>${esc(claimed.code)} is entered</strong>, but winners haven't been drawn yet.`
            : claimed.state === 'unknown'
              ? "<strong>That code isn't in this giveaway.</strong>"
              : "<strong>That doesn't look like a code.</strong> Codes look like K7QF-9MXA.";
    message = `<p class="redeem-msg ${tone}" role="status">${text}</p>`;
  }
  return `<section class="card result" id="giveaway">
  <div class="result-head"><h2>${icons.gift} Giveaway</h2><a class="muted small link-quiet" href="${f.path}/giveaway" target="_blank" rel="noopener">Public page ${icons.external}</a></div>
  <div class="giveaway-stats">
    <div><span class="seg-num">${entries}</span><span class="muted small">${entries === 1 ? 'entry' : 'entries'}</span></div>
    <div><span class="seg-num">${draw ? draw.winners.length : g.winners}</span><span class="muted small">${draw ? 'winners drawn' : 'winners to draw'}</span></div>
    <div><span class="seg-num">${claims}</span><span class="muted small">claimed</span></div>
  </div>
  <p class="muted small">${esc(g.prize)}. ${draw ? `Drawn ${time(draw.drawnAt)} from ${plural(draw.entries, 'entry', 'entries')}.` : `${drawTiming(f)}.`} Entries are anonymous codes, so winners come to you: enter the code from their screen to check it and mark it claimed.</p>
  ${message}
  <form method="post" action="/admin${f.path}/claim#giveaway" class="redeem-form">
    <label class="sr-only" for="claim-code">Winner's code</label>
    <input type="text" id="claim-code" name="code" placeholder="K7QF-9MXA" autocomplete="off" autocapitalize="characters" spellcheck="false" required>
    <button type="submit" class="btn btn-primary">Check &amp; claim</button>
  </form>
</section>`;
}

function responsesTable(f: Form, responses: ResponseRecord[]): string {
  if (!responses.length) return '';
  const questions = answerable(f);
  const rows = [...responses]
    .reverse()
    .map(
      (r) => `<tr>
      <td class="nowrap muted">${time(r.submittedAt)}</td>
      ${questions
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
  <div class="result-head"><h2>Responses</h2><span class="muted small">${f.anonymous ? 'Newest day first; random order within a day' : 'Newest first'}</span></div>
  <div class="table-wrap"><table class="data">
    <thead><tr><th>${f.anonymous ? 'Date' : 'Submitted'}</th>${questions.map((q) => `<th title="${esc(q.label)}">${esc(q.shortLabel || q.resultsTitle || q.label)}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
</section>`;
}

export function results(f: Form, summary: Summary[], responses: ResponseRecord[], giveaway?: GiveawayInfo, claimed?: CodeStatus): string {
  const latest = responses.at(-1);
  const status = formStatus(f);
  const statusDetail =
    status.state === 'open' ? (status.at ? `Closes ${time(status.at)}` : 'No close date') : status.state === 'scheduled' ? `Opens ${time(status.at!)}` : 'Not accepting responses';

  return layout({
    title: `${f.title} · Results · ${BRAND}`,
    shell: 'admin',
    width: 'wide',
    body: `<nav class="crumbs" aria-label="Breadcrumb">
  <a href="/admin">Dashboard</a>${icons.chevron}<span>${esc(f.groupName)}</span>${icons.chevron}<span aria-current="page">${esc(f.eyebrow || f.title)}</span>
</nav>
<div class="page-head">
  <div>
    <div class="title-row"><h1>${esc(f.title)}</h1>${statusPill(f)}</div>
    <p class="muted">${esc(f.groupName)}${f.eyebrow ? ` · ${esc(f.eyebrow)}` : ''}${f.anonymous ? ` · <span class="inline-icon">${icons.shield}Anonymous</span>` : ''}</p>
  </div>
  <div class="actions">
    <a class="btn" href="/admin${f.path}">${icons.refresh}Refresh</a>
    <button type="button" class="btn" data-copy="${f.path}" hidden>${icons.link}<span>Copy link</span></button>
    <a class="btn" href="/admin${f.path}/export.csv">${icons.download}Export CSV</a>
    <a class="btn btn-primary" href="${f.path}" target="_blank" rel="noopener">View form${icons.external}</a>
  </div>
</div>
<section class="stats">
  <div class="card stat"><span class="stat-label">Responses</span><span class="stat-num">${responses.length}</span></div>
  <div class="card stat"><span class="stat-label">Latest response</span><span class="stat-num stat-text">${latest ? time(latest.submittedAt, 'relative') : '—'}</span></div>
  <div class="card stat"><span class="stat-label">Schedule</span><span class="stat-num stat-text">${statusDetail}</span></div>
</section>
<div class="stack">
  ${giveaway ? giveawayPanel(f, giveaway, claimed) : ''}
  ${summary.map((s) => (s.kind === 'choice' ? choiceResult(s) : s.kind === 'scale' ? scaleResult(s) : textResult(s))).join('\n')}
  ${responsesTable(f, responses)}
</div>`,
  });
}
