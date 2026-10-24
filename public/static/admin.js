// Shows timestamps in the viewer's own time zone.
(() => {
  const full = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const rel = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  for (const el of document.querySelectorAll('time[datetime]')) {
    const date = new Date(el.dateTime);
    if (Number.isNaN(date.getTime())) continue;
    el.title = date.toLocaleString();
    const minutes = Math.round((date.getTime() - Date.now()) / 60000);
    el.textContent = el.hasAttribute('data-relative') && minutes > -60 * 24
      ? (Math.abs(minutes) < 60 ? rel.format(minutes, 'minute') : rel.format(Math.round(minutes / 60), 'hour'))
      : full.format(date);
  }
})();
