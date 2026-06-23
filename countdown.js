function updateCountdowns() {
  document.querySelectorAll('[data-kickoff]').forEach((card) => {
    const kickoff = new Date(card.dataset.kickoff).getTime();
    const remaining = kickoff - Date.now();
    const grid = card.querySelector('.countdown-grid');

    if (remaining <= 0) {
      grid.innerHTML = '<strong>It is game time!</strong>';
      return;
    }

    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    card.querySelector('[data-countdown-days]').textContent = days;
    card.querySelector('[data-countdown-hours]').textContent = hours;
    card.querySelector('[data-countdown-minutes]').textContent = minutes;
    card.querySelector('[data-countdown-seconds]').textContent = seconds;
  });
}

updateCountdowns();
setInterval(updateCountdowns, 1000);
