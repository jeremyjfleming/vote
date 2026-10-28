// Shared by every page: shows times in the viewer's own time zone, and wires up copy buttons.
(() => {
  const full = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  // Date-only values (anonymous forms) are calendar dates, so format them without shifting time zones.
  const dateOnly = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const rel = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  for (const el of document.querySelectorAll('time[datetime]')) {
    const date = new Date(el.dateTime);
    if (Number.isNaN(date.getTime())) continue;
    if (el.hasAttribute('data-date-only')) {
      el.textContent = dateOnly.format(date);
      continue;
    }
    el.title = date.toLocaleString();
    const minutes = Math.round((date.getTime() - Date.now()) / 60000);
    el.textContent = el.hasAttribute('data-relative') && Math.abs(minutes) < 60 * 24
      ? (Math.abs(minutes) < 60 ? rel.format(minutes, 'minute') : rel.format(Math.round(minutes / 60), 'hour'))
      : full.format(date);
  }

  // data-copy copies a link (relative to this site); data-copy-text copies the text as-is.
  for (const button of document.querySelectorAll('[data-copy], [data-copy-text]')) {
    if (!navigator.clipboard) continue;
    const label = button.querySelector('span');
    const original = label.textContent;
    button.hidden = false;
    button.addEventListener('click', async () => {
      const text = button.dataset.copyText ?? new URL(button.dataset.copy, location.origin).href;
      await navigator.clipboard.writeText(text);
      label.textContent = 'Copied';
      setTimeout(() => (label.textContent = original), 1600);
    });
  }
})();
