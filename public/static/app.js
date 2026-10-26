// Shared by every page: shows times in the viewer's own time zone, and wires up copy-link buttons.
(() => {
  const full = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const rel = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  for (const el of document.querySelectorAll('time[datetime]')) {
    const date = new Date(el.dateTime);
    if (Number.isNaN(date.getTime())) continue;
    el.title = date.toLocaleString();
    const minutes = Math.round((date.getTime() - Date.now()) / 60000);
    el.textContent = el.hasAttribute('data-relative') && Math.abs(minutes) < 60 * 24
      ? (Math.abs(minutes) < 60 ? rel.format(minutes, 'minute') : rel.format(Math.round(minutes / 60), 'hour'))
      : full.format(date);
  }

  for (const button of document.querySelectorAll('[data-copy]')) {
    if (!navigator.clipboard) continue;
    const label = button.querySelector('span');
    button.hidden = false;
    button.addEventListener('click', async () => {
      await navigator.clipboard.writeText(new URL(button.dataset.copy, location.origin).href);
      label.textContent = 'Copied';
      setTimeout(() => (label.textContent = 'Copy link'), 1600);
    });
  }
})();
