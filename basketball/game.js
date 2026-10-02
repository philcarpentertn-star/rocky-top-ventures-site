import { leaderboard } from '../arcade/leaderboard.js';
import { SHOTS, FLIGHT, RECOVERY, levelFor, hoopAt, evaluate } from './timing.js';
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
const team = teams[teamKey], board = leaderboard('basketball', teamKey);
let score = 0, shots = 0, made = 0, streak = 0, best = 0, ready = false;
let phases = [], elapsed = 0, ball = null, lastFrame = 0, feedback = '', storageAvailable = true;
try { best = Number(localStorage.getItem(`rtv-hoops-v4-best-${teamKey}`)) || 0; } catch { storageAvailable = false; }
function sync() {
  $('score').textContent = String(score).padStart(2, '0');
  $('shots').textContent = SHOTS - shots;
  $('streak').textContent = streak;
  $('best').textContent = best;
  $('wind').textContent = `LEVEL ${levelFor(Math.min(shots, 9))} / 5`;
  $('shoot').disabled = !ready || !!ball || shots === SHOTS;
  $('save-note').textContent = storageAvailable ? 'Your best stays on this device. No account needed.' : 'Your best lasts for this visit.';
}
async function reset() {
  ready = false; score = shots = made = streak = elapsed = 0; ball = null; feedback = '';
  $('result').hidden = true; $('status').textContent = 'Getting the court ready…'; sync();
  const next = await board.start();
  if (!next) return;
  phases = next; ready = true;
  $('status').textContent = 'Tap to shoot. Lead the hoop—it keeps moving while the ball flies.'; sync();
}
function shoot() {
  if (!ready || ball || shots >= SHOTS) return;
  const time = Math.min(elapsed, 120);
  ball = { time, age: 0, ...evaluate(shots, phases[shots], time) };
  board.record({ time }); feedback = ''; $('status').textContent = 'Shot away…'; sync();
}
function finishShot() {
  if (ball.made) { made++; streak++; const points = streak >= 3 ? 3 : 2; score += points; feedback = `SWISH! +${points}`; }
  else { streak = 0; feedback = 'Just missed. Lead the hoop!'; }
  shots++; ball = null; elapsed = 0;
  if (score > best) {
    best = score;
    try { localStorage.setItem(`rtv-hoops-v4-best-${teamKey}`, String(best)); } catch { storageAvailable = false; }
  }
  sync();
  if (shots === SHOTS) {
    $('result-title').textContent = made >= 8 ? 'Lights out.' : made >= 4 ? 'Finding your rhythm.' : 'Keep shooting.';
    $('result-score').textContent = `${score} points · ${made} of 10 made\n${team.chant}`;
    $('result').hidden = false; board.finish();
    $('status').textContent = `Round complete: ${score} points. ${made} of 10 made.`;
    $('play-again').focus({ preventScroll: true });
  } else $('status').textContent = `${feedback} Level ${levelFor(shots)}. ${SHOTS - shots} shots left.`;
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
    path([[0, -20], [0, 155]], '#829a9d', 9);
    ctx.fillStyle = '#e7f1f5dd'; ctx.fillRect(-100, -116, 200, 105);
    ctx.strokeStyle = team.color; ctx.lineWidth = 7; ctx.strokeRect(-100, -116, 200, 105);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.strokeRect(-30, -62, 60, 43);
  }
  for (let i = -4; i <= 4; i++) {
    path([[i * 10, 2], [i * 6, 49]], front ? '#fff9eb' : '#83969a', front ? 1.7 : 1);
  }
  for (let y = 12; y <= 48; y += 12) ellipse(0, y, 40 - y / 3, 6, '#f5eddb', false, 1);
  ctx.beginPath(); ctx.ellipse(0, 0, 43, 13, 0, front ? 0 : Math.PI, front ? Math.PI : 2 * Math.PI);
  ctx.strokeStyle = '#ff8f43'; ctx.lineWidth = 5; ctx.stroke(); ctx.restore();
}
function draw() {
  const index = Math.min(shots, 9);
  const t = ball ? ball.time + Math.min(ball.age, FLIGHT) : elapsed;
  const hoop = hoopAt(index, phases[index] || 0, t);
  const sky = ctx.createLinearGradient(0, 0, 0, 340);
  sky.addColorStop(0, '#163c56'); sky.addColorStop(1, '#93b9c5');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 600, 660);
  // A school-colored arena, with simple stands and a perspective hardwood court.
  ctx.fillStyle = '#15272b'; ctx.fillRect(0, 240, 600, 95);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 30; col++) {
    ctx.fillStyle = (col + row) % 3 ? team.color : '#e7dfc9'; ctx.fillRect(col * 21, 251 + row * 19, 13, 8);
  }
  const floor = ctx.createLinearGradient(0, 330, 0, 660);
  floor.addColorStop(0, '#ad8558'); floor.addColorStop(1, '#e8bd80'); ctx.fillStyle = floor; ctx.fillRect(0, 330, 600, 330);
  for (let x = -600; x < 1200; x += 90) path([[300 + (x - 300) * .3, 330], [x, 660]], '#6c49252a', 1);
  for (let y = 350; y < 660; y += 40) path([[0, y], [600, y]], '#6c492522', 1);
  path([[255, 335], [345, 335], [410, 580], [190, 580]], team.floor, 1, true, true);
  path([[255, 335], [190, 580], [410, 580], [345, 335]], '#fff8e2', 3);
  ellipse(300, 580, 110, 33, '#fff8e2');
  ctx.save(); ctx.translate(300, 465); ctx.scale(1, .65); ctx.textAlign = 'center'; ctx.fillStyle = '#fff8e2'; ctx.font = 'bold 27px Arial'; ctx.fillText(team.name, 0, 0); ctx.restore();
  // Center line makes the fixed shooting lane legible.
  ctx.setLineDash([5, 9]); path([[300, 535], [300, 310]], '#ffffff80', 2); ctx.setLineDash([]);
  basket(hoop);
  if (ball) {
    const progress = Math.min(ball.age / FLIGHT, 1);
    const drop = Math.max(0, ball.age - FLIGHT) / RECOVERY;
    const y = 578 + (ball.hoop.y - 578) * progress - Math.sin(progress * Math.PI) * 185 + drop * 135;
    const x = ball.made ? 300 : 300 + drop * (ball.hoop.x > 300 ? -70 : 70);
    drawBall(x, y, 29 - progress * (29 - 14 * hoop.scale), ball.age * 5);
    if (progress === 1 && ball.made) basket(hoop, true);
  } else if (shots < SHOTS) {
    ellipse(300, 612, 34, 7, '#3f2a2555', true); drawBall(300, 578, 29);
  }
  ctx.fillStyle = '#10241be8'; ctx.fillRect(155, 20, 290, 44);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff8e2'; ctx.font = 'bold 19px Arial';
  ctx.fillText(`LEVEL ${levelFor(index)}  ·  ${10 + levelFor(index) * 5} FT`, 300, 48);
  ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#172b24';
  ctx.fillText(!ready ? 'GETTING READY…' : ball ? (ball.age >= FLIGHT ? (ball.made ? 'NOTHING BUT NET!' : 'JUST WIDE!') : 'SHOT AWAY') : 'TAP ANYWHERE TO SHOOT', 300, 640);
}
function animate(time) {
  const dt = lastFrame ? Math.min((time - lastFrame) / 1000, .05) : 0; lastFrame = time;
  if (ready && shots < SHOTS && !document.hidden) {
    if (ball) { ball.age += dt; if (ball.age >= FLIGHT + RECOVERY) finishShot(); }
    else { elapsed = Math.min(120, elapsed + dt); if (elapsed === 120) shoot(); }
  }
  draw(); requestAnimationFrame(animate);
}
canvas.addEventListener('pointerdown', event => {
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
  event.preventDefault(); canvas.focus({ preventScroll: true }); shoot();
});
canvas.addEventListener('keydown', event => {
  if (['Space', 'Enter'].includes(event.code)) { event.preventDefault(); if (!event.repeat) shoot(); }
});
$('shoot').addEventListener('click', shoot);
$('restart').addEventListener('click', reset);
$('play-again').addEventListener('click', () => { reset(); canvas.focus({ preventScroll: true }); });
$('team-stamp').textContent = { vols: 'TENNESSEE', gators: 'FLORIDA', tide: 'ALABAMA', texas: 'TEXAS' }[teamKey];
for (const [key, value] of Object.entries({ accent: team.color, 'accent-light': team.light, 'team-floor': team.floor, 'button-ink': ['tide', 'texas'].includes(teamKey) ? '#fff' : '#141914' })) document.documentElement.style.setProperty(`--${key}`, value);
$('team-name').textContent = team.name; $('back-link').href = `../${team.path}/`; $('back-link').textContent = `← Back to ${team.back}`;
reset(); requestAnimationFrame(animate);
