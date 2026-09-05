function updateCountdowns() {
  const now = new Date();

  document.querySelectorAll('[data-tipoff], [data-opener-date]').forEach((card) => {
    const grid = card.querySelector('.countdown-grid');

    // Unannounced tipoff times use calendar days in the team's time zone.
    if (card.dataset.openerDate) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: card.dataset.timeZone,
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(now);
      const part = (type) => parts.find((item) => item.type === type).value;
      const today = `${part('year')}-${part('month')}-${part('day')}`;
      const days = Math.round((Date.parse(card.dataset.openerDate) - Date.parse(today)) / 86400000);

      if (days <= 0) {
        grid.innerHTML = days === 0
          ? '<strong>Opening day is here! Tipoff time TBA.</strong>'
          : '<strong>Basketball season is underway!</strong>';
      } else {
        card.querySelector('[data-countdown-days]').textContent = days;
      }
      return;
    }

    const remaining = new Date(card.dataset.tipoff).getTime() - now.getTime();
    if (remaining <= 0) {
      grid.innerHTML = '<strong>Basketball season is underway!</strong>';
      return;
    }

    card.querySelector('[data-countdown-days]').textContent = Math.floor(remaining / 86400000);
    card.querySelector('[data-countdown-hours]').textContent = Math.floor((remaining % 86400000) / 3600000);
    card.querySelector('[data-countdown-minutes]').textContent = Math.floor((remaining % 3600000) / 60000);
    card.querySelector('[data-countdown-seconds]').textContent = Math.floor((remaining % 60000) / 1000);
  });
}

updateCountdowns();
setInterval(updateCountdowns, 1000);
