import { leaderboard } from '../arcade/leaderboard.js';
import { SHOOTERS, ROUND_SECONDS, SHOT_SECONDS, FIRE_INTERVAL, FLIGHT, RECOVERY, levelFor, hoopAt, evaluate } from './timing.js';
const $ = id => document.getElementById(id);
const canvas = $('court'), ctx = canvas.getContext('2d');
const teams = {
  vols: { name: 'VOL NATION', color: '#ff8200', light: '#ffb765', floor: '#d96608', back: 'Vol Nation', path: 'rockytop', chant: 'Rocky Top!' },
  gators: { name: 'GATOR NATION', color: '#fa8b36', light: '#ffc18e', floor: '#244874', back: 'Gator Nation', path: 'gators', chant: 'Go Gators!' },
  tide: { name: 'CRIMSON TIDE', color: '#9e1b32', light: '#ffc1ce', floor: '#8d1832', back: 'Crimson Tide', path: 'dixielanddelight', chant: 'Roll Tide!' },
  texas: { name: 'LONGHORN NATION', color: '#bf5700', light: '#ffbc85', floor: '#bf5700', back: 'Longhorn Nation', path: 'texas', chant: 'Hook ’em Horns!' }
};

let teamKey = new URLSearchParams(location.search).get('team');
if (!Object.hasOwn(teams, teamKey)) teamKey = 'vols';
const background = new Image(), playerAtlas = new Image();
background.src = './assets/street-court.png'; playerAtlas.src = './assets/team-players.png';
let selected = 1, transition = 0, running = false, ended = false, startedAt = 0, shownSecond = -1, currentLevel = 1;
const team = teams[teamKey], board = leaderboard('basketball', teamKey);
let score = 0, shots = 0, made = 0, streak = 0, best = 0, ready = false;
let nextShot = SHOOTERS.map(() => 0);
let phases = [], elapsed = 0, balls = [], feedback = '', storageAvailable = true;
try { best = Number(localStorage.getItem(`rtv-hoops-v7-best-${teamKey}`)) || 0; } catch { storageAvailable = false; }
function sync() {
  $('score').textContent = String(score).padStart(2, '0');
  $('shots').textContent = `${Math.ceil(Math.max(0, ROUND_SECONDS - elapsed))}s`;
  $('streak').textContent = streak;
  $('best').textContent = best;
  $('wind').textContent = `LEVEL ${levelFor(elapsed)} / 5`;
  $('shoot').disabled = !ready || !running || ended || elapsed >= ROUND_SECONDS;
  document.querySelectorAll('[data-shooter]').forEach(button => { button.disabled = $('shoot').disabled; button.setAttribute('aria-pressed', String(Number(button.dataset.shooter) === selected)); });
  $('save-note').textContent = storageAvailable ? 'Your best stays on this device. No account needed.' : 'Your best lasts for this visit.';
}
async function reset() {
  ready = false; running = false; ended = false; transition = 0; currentLevel = 1; shownSecond = -1; score = shots = made = streak = elapsed = 0; balls = []; feedback = '';
  nextShot = SHOOTERS.map(() => 0);
  $('intro').hidden = false; $('start-round').disabled = true;
  $('result').hidden = true; $('status').textContent = 'Getting the court ready…'; sync();
  const next = await board.start();
  if (!next) return;
  phases = next; ready = true; $('start-round').disabled = false;
  $('status').textContent = 'Ready for a one-minute round. Press Start when you are ready.'; sync();
}
function startRound() {
  if (!ready || running) return;
  running = true; startedAt = performance.now(); elapsed = 0;
  $('intro').hidden = true; $('status').textContent = '60 seconds! Lead the moving hoop and tap a player.';
  sync(); canvas.focus({ preventScroll: true });
}
function shoot(shooter = selected) {
  if (!ready || !running || ended) return;
  updateRound(performance.now());
  if (ended || elapsed >= ROUND_SECONDS) return;
  if (!Number.isInteger(shooter) || shooter < 0 || shooter >= SHOOTERS.length) return;
  if (elapsed < nextShot[shooter]) return;
  nextShot[shooter] = elapsed + FIRE_INTERVAL;
  selected = shooter;
  const time = elapsed;
  balls.push({ time, shooter, age: 0, ...evaluate(time, phases[0], shooter) });
  board.record({ time, shooter }); feedback = ''; $('status').textContent = 'Shot away…'; sync();
}
function finishRound() {
  if (ended) return;
  ended = true;
  $('result-title').textContent = 'Time’s up!';
  $('result-score').textContent = `${score} points · ${made} of ${shots} made\n${team.chant}`;
  $('result').hidden = false; board.finish(); sync();
  $('status').textContent = `Round complete: ${score} points. ${made} of ${shots} made.`;
  $('play-again').focus({ preventScroll: true });
}
function finishShot(ball) {
  if (ball.made) { made++; streak++; const points = streak >= 3 ? 3 : 2; score += points; feedback = `SWISH! +${points}`; }
  else { streak = 0; feedback = 'Just missed. Lead the moving hoop!'; }
  shots++;
  if (score > best) {
    best = score;
    try { localStorage.setItem(`rtv-hoops-v7-best-${teamKey}`, String(best)); } catch { storageAvailable = false; }
  }
  sync();
  $('status').textContent = `${feedback} ${Math.ceil(Math.max(0, ROUND_SECONDS - elapsed))} seconds left.`;
}
function updateRound(now) {
  if (!running || ended) return;
  // Use the real monotonic clock: frame drops and background tabs give no extra time.
  elapsed = Math.max(0, (now - startedAt) / 1000);
  const level = levelFor(elapsed);
  if (level !== currentLevel) { currentLevel = level; transition = elapsed + .9; }
  for (const ball of balls) ball.age = elapsed - ball.time;
  while (balls.length && balls[0].age >= SHOT_SECONDS) finishShot(balls.shift());
  if (elapsed >= ROUND_SECONDS && !balls.length) { finishRound(); return; }
  const second = Math.ceil(Math.max(0, ROUND_SECONDS - elapsed));
  if (second !== shownSecond) { shownSecond = second; sync(); }
}
function path(points, color, width = 2, close = false, fill = false) {
  ctx.beginPath(); ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  if (close) ctx.closePath();
  ctx.strokeStyle = color; ctx.lineWidth = width;
  if (fill) { ctx.fillStyle = color; ctx.fill(); } else ctx.stroke();
}
function ellipse(x, y, rx, ry, color, fill = false, width = 2) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.lineWidth = width; ctx.strokeStyle = color; ctx.fillStyle = color;
  if (fill) ctx.fill(); else ctx.stroke();
}
function drawBall(x, y, radius, rotation = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  const shade = ctx.createRadialGradient(-radius * .35, -radius * .4, 1, 0, 0, radius);
  shade.addColorStop(0, '#ffc26c'); shade.addColorStop(.65, '#e67b26'); shade.addColorStop(1, '#a94413');
  ellipse(0, 0, radius, radius, shade, true);
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, radius - 1, 0, Math.PI * 2); ctx.clip();
  path([[-radius, 0], [radius, 0]], '#70340e', 1.8);
  path([[0, -radius], [0, radius]], '#70340e', 1.8);
  ellipse(-radius * .95, 0, radius * .7, radius * 1.25, '#70340e', false, 1.7);
  ellipse(radius * .95, 0, radius * .7, radius * 1.25, '#70340e', false, 1.7);
  ctx.restore(); ctx.restore();
}

function basket(hoop, front = false) {
  ctx.save(); ctx.translate(hoop.x, hoop.y); ctx.scale(hoop.scale, hoop.scale);
  if (!front) {
    ctx.save(); ctx.shadowColor = '#1c322a77'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
    ctx.beginPath(); ctx.moveTo(-63, -12); ctx.lineTo(-63, -70); ctx.bezierCurveTo(-63, -133, 63, -133, 63, -70); ctx.lineTo(63, -12); ctx.closePath();
    const glass = ctx.createLinearGradient(-63, -116, 63, 0); glass.addColorStop(0, '#faf5df'); glass.addColorStop(1, '#b7c3bb');
    ctx.fillStyle = glass; ctx.fill(); ctx.strokeStyle = '#344c49'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    ctx.strokeStyle = '#814b53'; ctx.lineWidth = 4; ctx.strokeRect(-30, -59, 60, 43);
  }
  const ball = balls.findLast(ball => ball.made && ball.age >= FLIGHT);
  const stretch = ball?.made && ball.age >= FLIGHT ? Math.sin(Math.min(1, (ball.age - FLIGHT) / RECOVERY) * Math.PI) * 12 : 0;
  ctx.strokeStyle = front ? '#fff9eb' : '#a5b5b0'; ctx.lineWidth = front ? 1.8 : 1;
  for (let col = 0; col < 9; col++) for (const direction of [-1, 1]) {
    ctx.beginPath();
    for (let row = 0; row <= 4; row++) {
      const f = row / 4, half = 42 - 23 * f;
      const offset = Math.max(-1, Math.min(1, col / 4 - 1 + direction * (row % 2) / 8));
      const x = offset * half, y = 3 + f * (52 + stretch) + (front ? 7 : -5) * (1 - offset * offset);
      if (!row) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.beginPath(); ctx.ellipse(0, 0, 43, 13, 0, front ? 0 : Math.PI, front ? Math.PI : 2 * Math.PI);
  ctx.strokeStyle = '#ff8f43'; ctx.lineWidth = 5; ctx.stroke(); ctx.restore();
}
function player(x, index) {
  const ball = balls.findLast(ball => ball.shooter === index && ball.age < FIRE_INTERVAL);
  const active = !!ball || selected === index;
  const lift = active && ball ? Math.sin(Math.min(ball.age / .22, 1) * Math.PI) * 7 : 0;
  if (playerAtlas.complete && playerAtlas.naturalWidth) {
    const cellW = playerAtlas.naturalWidth / 2, cellH = playerAtlas.naturalHeight / 2;
    const tile = {vols:0, gators:1, tide:2, texas:3}[teamKey];
    ctx.drawImage(playerAtlas, (tile % 2) * cellW, Math.floor(tile / 2) * cellH, cellW, cellH, x - 67, 296 - lift, 134, 134);
    ctx.textAlign = 'center'; ctx.fillStyle = '#fffdf0'; ctx.font = 'bold 9px Arial';
    ctx.fillText({vols:'VOLS',gators:'GATORS',tide:'BAMA',texas:'TEXAS'}[teamKey], x, 367 - lift);
    ctx.font = 'bold 21px Arial'; ctx.fillText(String(index + 1).padStart(2, '0'), x, 394 - lift);
  } else {
    ctx.fillStyle = team.color; ctx.fillRect(x - 24, 347, 48, 78); ellipse(x, 328, 18, 24, '#825c3e', true);
  }
  if (!ball || ball.shooter !== index) drawBall(x, 307, 16);
  if (active) { ctx.fillStyle = '#fff66c'; ctx.fillRect(x - 24, 421, 48, 3); }
}
function draw() {
  const logicalHoop = hoopAt(elapsed, phases[0] || 0);
  const project = h => ({ ...h, x: h.x, y: 100 + (h.y - 145) * .48, scale: h.scale * .78 });
  const hoop = project(logicalHoop);
  ctx.fillStyle = '#78927c'; ctx.fillRect(0, 0, 600, 450);
  if (background.complete && background.naturalWidth) ctx.drawImage(background, 0, 0, 600, 450);
  basket(hoop);
  basket(hoop, true);
  SHOOTERS.forEach((x, i) => player(x, i));
  for (const ball of balls) {
    const destination = project(ball.hoop);
    const progress = Math.min(ball.age / FLIGHT, 1), drop = Math.max(0, ball.age - FLIGHT) / RECOVERY;
    const y = 304 + (destination.y - 304) * progress - Math.sin(progress * Math.PI) * 108 + drop * 100;
    const sourceX = SHOOTERS[ball.shooter];
    const x = ball.made ? sourceX + (destination.x - sourceX) * Math.min(1, drop * 3) : sourceX + drop * (destination.x > sourceX ? -55 : 55);
    drawBall(x, y, 19 - progress * (19 - 14 * hoop.scale), ball.age * 5);
    if (progress === 1 && ball.made) basket(hoop, true);
  }
  // Metallic HUD inspired by countertop arcade displays.
  const metal = ctx.createLinearGradient(0, 0, 0, 32); metal.addColorStop(0, '#ffffff'); metal.addColorStop(.4, '#ced8d6'); metal.addColorStop(.5, '#8faaa9'); metal.addColorStop(1, '#dce4dc');
  ctx.fillStyle = metal; ctx.fillRect(0, 0, 600, 32); path([[0, 32], [600, 32]], '#293e39', 3);
  ctx.textAlign = 'left'; ctx.fillStyle = '#14221d'; ctx.font = 'bold 12px Arial'; ctx.fillText(`LEVEL ${levelFor(elapsed)}`, 12, 21);
  drawBall(103, 16, 12); ctx.fillStyle = '#253d33'; ctx.fillRect(121, 3, 90, 26);
  ctx.fillStyle = '#eafb64'; ctx.font = 'bold 26px Courier New'; ctx.fillText(String(score).padStart(4, '0'), 126, 24);
  ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#263b30'; ctx.fillText('TIME LEFT', 290, 11);
  ctx.fillStyle = '#b51e15'; ctx.font = 'bold 19px Courier New'; ctx.fillText(Math.ceil(Math.max(0, ROUND_SECONDS - elapsed)) === 60 ? '1:00' : `0:${String(Math.ceil(Math.max(0, ROUND_SECONDS - elapsed))).padStart(2, '0')}`, 290, 28);
  ctx.fillStyle = '#24382c'; ctx.font = 'bold 9px Arial'; ctx.fillText('PERSONAL BEST', 403, 11); ctx.font = 'bold 17px Courier New'; ctx.fillText(String(best).padStart(4, '0'), 403, 28);
  ctx.font = 'bold 12px Arial'; ctx.fillStyle = '#182b23'; ctx.fillText(`${10 + levelFor(elapsed) * 5} FT`, 544, 21);
  if (running && !ended && elapsed < transition) {
    ctx.save(); ctx.textAlign = 'center'; ctx.font = 'italic 900 36px Arial'; ctx.strokeStyle = '#23362b'; ctx.lineWidth = 5; ctx.strokeText('BACK IT UP!', 300, 220); ctx.fillStyle = '#fff36c'; ctx.fillText('BACK IT UP!', 300, 220); ctx.font = 'bold 16px Arial'; ctx.fillText(`LEVEL ${levelFor(elapsed)}`, 300, 248); ctx.restore();
  }
  const ball = balls.findLast(ball => ball.age >= FLIGHT);
  if (ball) {
    ctx.save(); ctx.textAlign = 'center'; ctx.font = 'italic 900 32px Arial'; ctx.lineWidth = 5; ctx.strokeStyle = '#23362b';
    const message = ball.made ? (streak >= 2 ? 'LIGHTNING BONUS!' : 'SWISH!') : 'JUST WIDE!';
    ctx.strokeText(message, 300, 218); ctx.fillStyle = ball.made ? '#fff36c' : '#fff5e0'; ctx.fillText(message, 300, 218); ctx.restore();
  }
  ctx.fillStyle = '#173b32'; ctx.fillRect(0, 426, 600, 24); ctx.textAlign = 'center'; ctx.fillStyle = '#f2f4bb'; ctx.font = 'bold 11px Arial';
  ctx.fillText(!ready ? 'GETTING READY…' : !running ? 'ONE MINUTE • AS MANY BASKETS AS YOU CAN' : ended ? 'TIME’S UP!' : 'TAP A PLAYER  •  LINE UP THE HOOP  •  SHOOT', 300, 442);
}
function animate(time) {
  updateRound(time); draw(); requestAnimationFrame(animate);
}
canvas.addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault(); canvas.focus({ preventScroll: true });
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * 600 / rect.width;
  shoot(SHOOTERS.reduce((best, position, i) => Math.abs(position - x) < Math.abs(SHOOTERS[best] - x) ? i : best, 0));
});
canvas.addEventListener('keydown', event => {
  if (/^[1-4]$/.test(event.key)) { event.preventDefault(); if (!event.repeat) shoot(Number(event.key) - 1); }
  if (['Space', 'Enter'].includes(event.code)) { event.preventDefault(); if (!event.repeat) shoot(); }
});
$('start-round').addEventListener('click', startRound);
$('shoot').addEventListener('click', () => shoot());
document.querySelectorAll('[data-shooter]').forEach(button => button.addEventListener('click', () => shoot(Number(button.dataset.shooter))));
$('restart').addEventListener('click', reset);
$('play-again').addEventListener('click', () => { reset(); canvas.focus({ preventScroll: true }); });
$('team-stamp').textContent = { vols: 'TENNESSEE', gators: 'FLORIDA', tide: 'ALABAMA', texas: 'TEXAS' }[teamKey];
for (const [key, value] of Object.entries({ accent: team.color, 'accent-light': team.light, 'team-floor': team.floor, 'button-ink': ['tide', 'texas'].includes(teamKey) ? '#fff' : '#141914' })) document.documentElement.style.setProperty(`--${key}`, value);
$('team-name').textContent = team.name; $('back-link').href = `../${team.path}/`; $('back-link').textContent = `← Back to ${team.back}`;
reset(); requestAnimationFrame(animate);
