const teams = { vols: ['Tennessee', 'rockytop'], gators: ['Florida', 'gators'], tide: ['Alabama', 'dixielanddelight'], texas: ['Texas', 'texas'] };
const team = new URLSearchParams(location.search).get('team');
if (Object.hasOwn(teams, team)) {
  const back = document.getElementById('back-link');
  back.href = `../${teams[team][1]}/`;
  back.textContent = `← Back to ${teams[team][0]}`;
  document.querySelectorAll('[data-play]').forEach(link => { link.href += `?team=${team}`; });
}
for (const panel of document.querySelectorAll('[data-game]')) {
  const game = panel.dataset.game;
  const button = panel.querySelector('button');
  const status = panel.querySelector('[data-status]');
  async function refresh() {
    button.disabled = true;
    status.textContent = 'Loading shared scores…';
    try {
      const response = await fetch(`/.netlify/functions/leaderboard?game=${game}`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('unavailable');
      const { rows } = await response.json();
      const entries = rows.map((row, index) => {
        const tr = document.createElement('tr');
        for (const value of [index + 1, row.name, teams[row.team]?.[0] || row.team, game === 'football' ? `${row.score} pts · ${row.longest} yd` : `${row.score} pts`]) {
          const td = document.createElement('td'); td.textContent = value; tr.append(td);
        }
        return tr;
      });
      panel.querySelector('tbody').replaceChildren(...entries);
      panel.querySelector('[data-empty]').hidden = rows.length > 0;
      status.textContent = 'Top 20 · All schools · Best posted round per player on this device.';
    } catch {
      status.textContent = 'Could not load current scores. Please try Refresh scores shortly.';
    } finally { button.disabled = false; }
  }
  button.addEventListener('click', refresh);
  refresh();
}
