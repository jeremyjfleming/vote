// Form behavior: choice limits and per-list minimums, conditional questions, and giveaway progress.
(() => {
  const form = document.querySelector('[data-form]');
  if (!form) return;
  const counter = form.querySelector('[data-count]');
  const limited = [...form.querySelectorAll('[data-choice][data-max]')];

  limited.forEach((fieldset, i) => {
    const max = Number(fieldset.dataset.max);
    const boxes = [...fieldset.querySelectorAll('input[type="checkbox"]')];
    const groups = [...fieldset.querySelectorAll('[data-group-min]')].map((el) => ({
      el,
      min: Number(el.dataset.groupMin),
      label: el.dataset.groupLabel,
      boxes: [...el.querySelectorAll('input[type="checkbox"]')],
    }));

    const update = () => {
      const n = boxes.filter((b) => b.checked).length;
      const unmet = [];
      let needed = 0;
      for (const g of groups) {
        const short = g.min - g.boxes.filter((b) => b.checked).length;
        g.met = short <= 0;
        g.el.classList.toggle('is-met', g.met);
        if (!g.met) {
          needed += short;
          unmet.push(`${short} from ${g.label}`);
        }
      }
      // When the remaining picks are all needed for lists that are still short,
      // only those lists stay selectable.
      const reserved = max - n <= needed;
      for (const b of boxes) {
        if (b.checked) continue;
        const g = groups.find((g) => g.boxes.includes(b));
        b.disabled = n >= max || (reserved && (!g || g.met));
      }

      // The submit bar tracks the first limited question on the page.
      if (i === 0 && counter) {
        counter.hidden = false;
        const allUnmet = groups.length > 1 && unmet.length === groups.length && groups.every((g) => g.min === groups[0].min);
        const need = allUnmet ? `${groups[0].min} from each list` : unmet.join(' and ');
        counter.innerHTML = `<strong>${n} of ${max}</strong> chosen${unmet.length ? ` · need ${need}` : ''}`;
        counter.classList.toggle('is-full', n >= max);
      }
    };
    boxes.forEach((b) => b.addEventListener('change', update));
    update();
  });

  // Questions with showIf appear only when an earlier choice has one of the listed answers.
  const conditional = [...form.querySelectorAll('[data-show-if]')];
  const updateConditional = () => {
    for (const el of conditional) {
      const wanted = el.dataset.showValues.split(' ');
      const picked = [...form.querySelectorAll(`[name="q_${el.dataset.showIf}"]:checked`)].map((i) => i.value);
      el.hidden = !picked.some((v) => wanted.includes(v));
    }
  };
  if (conditional.length) {
    form.addEventListener('change', updateConditional);
    updateConditional();
  }

  // Giveaway callout: live count of the questions you need to answer to be entered.
  const callout = form.querySelector('[data-giveaway]');
  if (callout) {
    const fields = callout.dataset.giveaway.split(' ').map((id) => form.querySelector(`[name="q_${id}"]`)).filter(Boolean);
    const progress = callout.querySelector('[data-giveaway-progress]');
    const update = () => {
      const done = fields.filter((f) => f.value.trim()).length;
      const complete = done === fields.length;
      callout.classList.toggle('is-complete', complete);
      progress.textContent = complete ? "You're in! Submit to get your giveaway code." : `${done} of ${fields.length} answered`;
    };
    fields.forEach((f) => f.addEventListener('input', update));
    update();
  }

  form.addEventListener('submit', () => {
    // Re-enable choices locked by limits; hidden questions are dropped by the server anyway.
    form.querySelectorAll('input:disabled').forEach((el) => (el.disabled = false));
    const button = form.querySelector('button[type="submit"]');
    setTimeout(() => (button.disabled = true));
  });

  form.querySelector('.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
})();
