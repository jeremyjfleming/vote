// Enforces the "choose up to N" limit as you click, and shows the count in the submit bar.
(() => {
  const form = document.querySelector('[data-form]');
  if (!form) return;
  const counter = form.querySelector('[data-count]');
  const limited = [...form.querySelectorAll('[data-choice][data-max]')];

  limited.forEach((fieldset, i) => {
    const max = Number(fieldset.dataset.max);
    const boxes = [...fieldset.querySelectorAll('input[type="checkbox"]')];

    const update = () => {
      const n = boxes.filter((b) => b.checked).length;
      for (const b of boxes) if (!b.checked) b.disabled = n >= max;
      // The submit bar tracks the first limited question on the page.
      if (i === 0 && counter) {
        counter.hidden = false;
        counter.innerHTML = `<strong>${n} of ${max}</strong> chosen`;
        counter.classList.toggle('is-full', n >= max);
      }
    };
    boxes.forEach((b) => b.addEventListener('change', update));
    update();
  });

  form.addEventListener('submit', () => {
    form.querySelectorAll('input:disabled').forEach((el) => (el.disabled = false));
    const button = form.querySelector('button[type="submit"]');
    setTimeout(() => (button.disabled = true));
  });

  form.querySelector('.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
})();
