import { challenge } from './challenge.js';
const endpoint = '/.netlify/functions/leaderboard';
const labels = { vols: 'Tennessee', gators: 'Florida', tide: 'Alabama', texas: 'Texas' };
export function leaderboard(game, team) {
  const panel = document.getElementById('leaderboard');
  const status = panel.querySelector('[data-board-status]');
  const list = panel.querySelector('tbody');
  const form = panel.querySelector('form');
  const submit = form.querySelector('button');
  const name = form.querySelector('input');
  let player = crypto.randomUUID(), token = null, attempts = [], completed = false, generation = 0;
  let current = null;
  const message = error => ['TypeError', 'TimeoutError', 'AbortError'].includes(error.name) ? 'Shared scores could not connect. You can still practice; try again shortly.' : error.message;
  try {
    const saved = localStorage.getItem('rtv-arcade-player');
    if (saved && /^[0-9a-f-]{36}$/.test(saved)) player = saved;
    localStorage.setItem('rtv-arcade-player', player);
    name.value = localStorage.getItem('rtv-arcade-nickname') || '';
  } catch { /* Play and submissions still work for this visit. */ }
  async function api(body) {
    const response = await fetch(body ? endpoint : `${endpoint}?game=${game}`, {
      method: body ? 'POST' : 'GET',
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(10000)
    });
    if (response.status === 429) throw new Error('Please wait a minute before trying again.');
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Shared scores are available on the hosted website. Practice here, then play online to post.');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not connect. Try again shortly.');
    return data;
  }
  function render(rows) {
    list.replaceChildren();
    rows.forEach((row, index) => {
      const tr = document.createElement('tr');
      const values = [index + 1, row.name, labels[row.team], game === 'football' ? `${row.score} pts · ${row.longest} yd` : `${row.score} pts`];
      for (const value of values) { const td = document.createElement('td'); td.textContent = value; tr.append(td); }
      list.append(tr);
    });
    panel.querySelector('[data-board-empty]').hidden = rows.length > 0;
  }
  async function refresh() {
    const button = panel.querySelector('[data-board-refresh]');
    button.disabled = true;
    try { const data = await api(); render(data.rows); status.textContent = 'Top 20 · All teams · Best posted round per player on this device.'; }
    catch (error) { status.textContent = message(error); }
    finally { button.disabled = false; }
  }
  panel.querySelector('[data-board-refresh]').addEventListener('click', refresh);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!completed || !token || submit.disabled) return;
    submit.disabled = true;
    const active = generation;
    try {
      const data = await api({ action: 'submit', token, attempts, name: name.value });
      if (active !== generation) return;
      render(data.rows); completed = false;
      status.textContent = data.ranked ? 'Score posted! Your best round is on the board.' : 'Round checked! Keep practicing to reach the top 20.';
      try { localStorage.setItem('rtv-arcade-nickname', name.value); } catch {}
    } catch (error) {
      if (active === generation) { status.textContent = message(error); submit.disabled = false; }
    }
  });
  refresh();
  return {
    async start() {
      const active = ++generation;
      token = null; attempts = []; completed = false; current = null; form.hidden = true; submit.disabled = true;
      try {
        const data = await api({ action: 'start', game, team, player });
        if (active !== generation) return null;
        token = data.token; current = challenge(game, data.seed);
        status.textContent = 'Play a full round, then post your score with a public nickname.';
      } catch (error) {
        if (active !== generation) return null;
        current = challenge(game, crypto.getRandomValues(new Uint32Array(1))[0]);
        status.textContent = message(error);
      }
      return current;
    },
    record(aim, power) { attempts.push({ aim, power }); },
    finish() {
      completed = true;
      if (token) { form.hidden = false; submit.disabled = false; status.textContent = 'Round complete! Post your score below. Your nickname will be public.'; }
      else status.textContent = 'Practice round complete. Start a new round online to join the leaderboard.';
    }
  };
}
