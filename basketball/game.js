import { HOOP, START_Y, STARTS, clamp, launch, stepShot, pointsForMake } from './physics.js';

const $ = (id) => document.getElementById(id);
const canvas = $('court');
const ctx = canvas.getContext('2d');
const teams = {
  vols: { name: 'VOL NATION', color: '#ff8200', light: '#ffb765', floor: '#d96608', back: 'Vol Nation', path: 'rockytop', chant: 'Rocky Top!' },
  gators: { name: 'GATOR NATION', color: '#fa8b36', light: '#ffc18e', floor: '#244874', back: 'Gator Nation', path: 'gators', chant: 'Go Gators!' },
  tide: { name: 'CRIMSON TIDE', color: '#9e1b32', light: '#ffc1ce', floor: '#8d1832', back: 'Crimson Tide', path: 'dixielanddelight', chant: 'Roll Tide!' }
};
let teamKey = new URLSearchParams(location.search).get('team');
if (!Object.hasOwn(teams, teamKey)) teamKey = 'vols';
let team = teams[teamKey];
let score = 0, shots = 0, streak = 0, made = 0, best = 0;
let ball = null, drag = null, feedback = '', flash = 0, frame = 0, accumulator = 0;
let storageAvailable = true;

function loadBest() {
  try {
    const stored = Number(localStorage.getItem(`rtv-hoops-best-${teamKey}`));
    best = Number.isInteger(stored) && stored >= 0 && stored <= 28 ? stored : 0;
  } catch { storageAvailable = false; best = 0; }
}
function saveBest() {
  if (score <= best) return;
  best = score;
  try { localStorage.setItem(`rtv-hoops-best-${teamKey}`, String(best)); }
  catch { storageAvailable = false; }
}
function sync() {
  $('score').textContent = String(score).padStart(2, '0');
  $('shots').textContent = 10 - shots;
  $('streak').textContent = streak;
  $('best').textContent = String(best).padStart(2, '0');
  const locked = Boolean(ball) || shots >= 10;
  for (const id of ['shoot', 'aim', 'power']) $(id).disabled = locked;
  $('save-note').textContent = storageAvailable ? 'Your best stays on this device. No account needed.' : 'Storage is unavailable. Your best lasts for this visit.';
}
function updateControls() {
  const aim = Number($('aim').value);
  $('aim-value').textContent = aim === 0 ? 'Center' : `${Math.abs(aim)} ${aim < 0 ? 'left' : 'right'}`;
  $('power-value').textContent = `${$('power').value}%`;
}
function reset() {
  score = 0; shots = 0; streak = 0; made = 0; ball = null; drag = null; feedback = ''; flash = 0;
  $('result').hidden = true;
  $('aim').value = 0; $('power').value = 72;
  $('status').textContent = 'Swipe up from the ball, or set your shot below.';
  updateControls(); sync();
}
function applyTeam() {
  team = teams[teamKey];
  $('team-stamp').textContent = teamKey === 'vols' ? 'TENNESSEE' : teamKey === 'gators' ? 'FLORIDA' : 'ALABAMA';
  document.documentElement.style.setProperty('--accent', team.color);
  document.documentElement.style.setProperty('--accent-light', team.light);
  document.documentElement.style.setProperty('--team-floor', team.floor);
  document.documentElement.style.setProperty('--button-ink', teamKey === 'tide' ? '#ffffff' : '#141914');
  $('team-name').textContent = team.name;
  $('back-link').href = `../${team.path}/`;
  $('back-link').textContent = `← Back to ${team.back}`;
  loadBest(); reset();
}
function shoot() {
  if (ball || shots >= 10) return;
  ball = launch(STARTS[shots], Number($('aim').value), Number($('power').value));
  shots++; feedback = ''; drag = null;
  $('status').textContent = 'Shot away…';
  sync();
}
function finishShot() {
  if (!ball.made) {
    streak = 0;
    feedback = feedback || (Number($('power').value) < 58 ? 'A little more power.' : 'Adjust your aim and try again.');
  }
  ball = null;
  saveBest(); sync();
  if (shots === 10) {
    $('result-title').textContent = made >= 8 ? 'Lights out.' : made >= 4 ? 'Finding your rhythm.' : 'Keep shooting.';
    $('result-score').textContent = `${score} points · ${made} of 10 made\n${team.chant}`;
    $('result').hidden = false;
    $('status').textContent = `Round complete: ${score} points, ${made} of 10 made. Personal best: ${best}.`;
    $('play-again').focus({ preventScroll: true });
  } else {
    $('status').textContent = `${feedback} ${10 - shots} shots left.`;
    $('aim').value = 0; updateControls();
  }
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
function drawNet(front) {
  const inNet = ball && ball.phase === 'net';
  const progress = inNet ? clamp(ball.phaseAge / .58, 0, 1) : 0;
  const stretch = inNet ? Math.sin(progress * Math.PI) * 16 : flash * 5 * Math.sin(flash * 20);
  const sway = inNet ? (ball.x - HOOP.x) * .25 : Math.sin(flash * 14) * flash * 3;
  ctx.strokeStyle = front ? '#f7f3e6df' : '#a4b4b88a';
  ctx.lineWidth = front ? 1.45 : 1;
  // Crossing strands form real diamond-shaped openings; the front mesh covers the ball.
  for (let col = 0; col <= 8; col++) {
    for (const direction of [-1, 1]) {
      ctx.beginPath();
      for (let row = 0; row <= 4; row++) {
        const t = row / 4;
        const half = 44 - 19 * t;
        const offset = clamp(col / 8 * 2 - 1 + direction * (row % 2) / 8, -1, 1);
        const x = 300 + sway * t + offset * half;
        const y = 212 + t * (52 + stretch) + (front ? 7 : -4) * (1 - offset * offset);
        if (row === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ellipse(300 + sway, 264 + stretch, 25, 4, front ? '#fff7e3bb' : '#a4b4b866', false, 1.3);
}
function drawRim(front) {
  ctx.beginPath(); ctx.ellipse(300, 210, 44, 12, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
  ctx.strokeStyle = '#773016'; ctx.lineWidth = 8; ctx.stroke();
  ctx.strokeStyle = '#f77828'; ctx.lineWidth = 5; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(300, 208.5, 44, 12, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
  ctx.strokeStyle = '#ffc184'; ctx.lineWidth = 1.5; ctx.stroke();
}
function draw() {
  ctx.clearRect(0, 0, 600, 660);
  const wall = ctx.createLinearGradient(0, 0, 0, 300);
  wall.addColorStop(0, '#111923'); wall.addColorStop(1, '#34404a');
  ctx.fillStyle = wall; ctx.fillRect(0, 0, 600, 660);
  const spotlight = ctx.createRadialGradient(300, 120, 30, 300, 120, 330);
  spotlight.addColorStop(0, '#e4ebed18'); spotlight.addColorStop(1, '#ffffff00');
  ctx.fillStyle = spotlight; ctx.fillRect(0, 0, 600, 300);
  for (let x = 0; x < 600; x += 60) {
    ctx.fillStyle = '#101820'; ctx.fillRect(x + 2, 245, 56, 47);
    path([[x + 5, 247], [x + 54, 247]], '#65758155', 1);
  }
  const wood = ctx.createLinearGradient(0, 290, 0, 660);
  wood.addColorStop(0, '#ad7c47'); wood.addColorStop(.5, '#cba16a'); wood.addColorStop(1, '#dfbb80');
  ctx.fillStyle = wood; ctx.fillRect(0, 292, 600, 368);
  // Hardwood planks converge toward the basket to establish court depth.
  ctx.save(); ctx.beginPath(); ctx.rect(0, 292, 600, 368); ctx.clip();
  for (let i = -14; i < 22; i++) {
    const topX = i * 23;
    const bottomX = 300 + (topX - 300) * 2.8;
    path([[topX, 292], [topX + 23, 292], [bottomX + 64.4, 660], [bottomX, 660]], i % 3 === 0 ? '#673c1814' : '#fff0c20c', 1, true, true);
    path([[topX, 292], [bottomX, 660]], '#63351235', .7);
    for (let j = 0; j < 4; j++) {
      const y = 330 + j * 97 + (i % 3) * 21;
      const t = (y - 292) / 368;
      const x = topX + (bottomX - topX) * t;
      path([[x, y], [x + 23 + t * 41.4, y]], '#70411b35', .6);
    }
    for (let grain = 1; grain < 4; grain++) {
      path([[topX + grain * 5, 292], [bottomX + grain * 14, 660]], '#70431c12', .5);
    }
  }
  ctx.restore();
  path([[223, 299], [377, 299], [453, 486], [147, 486]], team.floor, 1, true, true);
  const paint = '#fff8e5cf';
  path([[70, 300], [530, 300], [684, 650], [-84, 650]], paint, 2.5, true);
  path([[223, 300], [147, 486], [453, 486], [377, 300]], paint, 2.5);
  ellipse(300, 486, 153, 57, paint, false, 2.5);
  ctx.beginPath(); ctx.ellipse(300, 304, 248, 298, 0, 0, Math.PI); ctx.strokeStyle = paint; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.save(); ctx.translate(300, 425); ctx.scale(1, .6); ctx.fillStyle = '#fff6dfab'; ctx.font = 'bold 33px Arial'; ctx.textAlign = 'center'; ctx.fillText(team.name, 0, 0); ctx.restore();
  const floorLight = ctx.createRadialGradient(300, 335, 10, 300, 390, 330);
  floorLight.addColorStop(0, '#ffffff19'); floorLight.addColorStop(1, '#ffffff00'); ctx.fillStyle = floorLight; ctx.fillRect(0, 292, 600, 368);
  ellipse(303, 316, 60, 12, '#261c1844', true);
  path([[300, 111], [300, 305]], '#101720', 15);
  path([[304, 116], [304, 300]], '#78838c', 2);
  ctx.fillStyle = team.floor; ctx.fillRect(282, 270, 36, 40);
  // Glass backboard with a metal frame, transparent reflection and rim bracket.
  ctx.shadowColor = '#00000066'; ctx.shadowBlur = 13; ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#cde2eb28'; ctx.fillRect(187, 75, 226, 126);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = '#8d9aa2'; ctx.lineWidth = 7; ctx.strokeRect(187, 75, 226, 126);
  ctx.strokeStyle = '#e0e8e8'; ctx.lineWidth = 2; ctx.strokeRect(187, 75, 226, 126);
  path([[191, 79], [270, 79], [198, 195], [191, 195]], '#edf8ff12', 1, true, true);
  path([[306, 79], [328, 79], [254, 197], [232, 197]], '#edf8ff0a', 1, true, true);
  ctx.strokeStyle = '#f5f5ec'; ctx.lineWidth = 3.5; ctx.strokeRect(264, 140, 72, 55);
  ctx.fillStyle = '#c95620'; ctx.fillRect(291, 191, 18, 18);
  path([[286, 198], [275, 210]], '#94411e', 4); path([[314, 198], [325, 210]], '#94411e', 4);
  drawNet(false); drawRim(false);
  const start = STARTS[Math.min(shots, 9)];
  if (ball) {
    const radius = ball.phase === 'flight' ? 15 + 14 * Math.max(0, 1 - ball.age / .65) : 15;
    const depth = ball.phase === 'flight' ? clamp(ball.age / 1.05, 0, 1) : 1;
    ellipse(ball.x, 607 - 225 * depth, radius * 1.1, 5, '#30231344', true);
    drawBall(ball.x, ball.y, radius, ball.age * 3.8);
  } else if (shots < 10) {
    ellipse(start, 608, 35, 8, '#30231355', true);
    const preview = launch(start, Number($('aim').value), Number($('power').value));
    for (let i = 0; i < 12; i++) {
      stepShot(preview, .022);
      if (i > 2) ellipse(preview.x, preview.y, 2.5, 2.5, '#fff7dfb0', true);
    }
    ellipse(start, START_Y, 39, 39, '#fffcde80');
    drawBall(start, START_Y, 29);
    ctx.font = 'bold 10px Arial'; ctx.fillStyle = '#46311e'; ctx.textAlign = 'center'; ctx.fillText(drag ? 'RELEASE TO SHOOT' : 'SWIPE UP TO SHOOT', start, 637);
  }
  // Occlusion makes a made shot visibly pass inside the rim and behind the net.
  if (!ball || ball.phase !== 'flight' || ball.y > 238 || ball.vy > 0) {
    drawNet(true); drawRim(true);
  } else {
    drawRim(true);
  }
  if (flash > 0) {
    ctx.save(); ctx.globalAlpha = Math.min(flash * 2, 1); ctx.textAlign = 'center';
    ctx.fillStyle = '#152019d9'; ctx.fillRect(177, 95, 246, 42);
    ctx.fillStyle = '#fff3d7'; ctx.font = 'bold 25px Arial'; ctx.fillText(feedback, 300, 124); ctx.restore();
  }
}
function animate(time) {
  const dt = frame ? Math.min((time - frame) / 1000, .05) : 0;
  frame = time; accumulator += dt; flash = Math.max(0, flash - dt);
  while (accumulator >= 1 / 120) {
    accumulator -= 1 / 120;
    if (!ball) continue;
    const outcome = stepShot(ball, 1 / 120);
    if (outcome.event === 'make') {
      streak++; made++;
      const points = pointsForMake(streak); score += points;
      feedback = points === 3 ? 'ON FIRE! +3' : 'BUCKET! +2'; flash = 1;
      $('status').textContent = feedback; sync();
    } else if (outcome.event) {
      feedback = outcome.event === 'rim' ? 'Off the rim. So close!' : 'Just wide. Adjust your aim.';
    }
    if (outcome.finished) finishShot();
  }
  draw(); requestAnimationFrame(animate);
}
function courtPoint(event) {
  const box = canvas.getBoundingClientRect();
  const scale = Math.min(box.width / 600, box.height / 660);
  return { x: (event.clientX - box.left - (box.width - 600 * scale) / 2) / scale,
    y: (event.clientY - box.top - (box.height - 660 * scale) / 2) / scale };
}
canvas.addEventListener('pointerdown', (event) => {
  if (ball || shots >= 10 || drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const p = courtPoint(event);
  if (Math.hypot(p.x - STARTS[shots], p.y - START_Y) > 60) return;
  drag = { ...p, id: event.pointerId };
  canvas.setPointerCapture(event.pointerId); canvas.focus({ preventScroll: true });
});
canvas.addEventListener('pointermove', (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  const p = courtPoint(event);
  $('aim').value = Math.round(clamp((p.x - drag.x) / 3, -30, 30));
  $('power').value = Math.round(clamp((drag.y - p.y) / 2.5, 0, 100));
  updateControls();
});
canvas.addEventListener('pointerup', (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  const p = courtPoint(event), distance = drag.y - p.y;
  drag = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  if (distance >= 25) shoot();
  else $('status').textContent = 'Swipe upward from the ball to shoot. Longer swipes add power.';
});
canvas.addEventListener('pointercancel', () => { drag = null; });
canvas.addEventListener('lostpointercapture', () => { drag = null; });
canvas.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); if (!event.repeat) shoot(); }
});
$('shoot').addEventListener('click', shoot);
$('restart').addEventListener('click', reset);
$('play-again').addEventListener('click', () => { reset(); canvas.focus({ preventScroll: true }); });
$('aim').addEventListener('input', updateControls);
$('power').addEventListener('input', updateControls);
applyTeam(); requestAnimationFrame(animate);
