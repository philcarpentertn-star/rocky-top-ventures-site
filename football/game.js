import { WINDS, clamp, launchKick, stepKick, nextDistance } from './physics.js';
import { createRenderer, BALL_ORIGIN } from './renderer.js';
const $ = id => document.getElementById(id);
const canvas = $('field');
const renderer = createRenderer(canvas);
const teams = {
  vols: { key: 'vols', stamp: 'TENNESSEE', name: 'VOL NATION', accent: '#ff8200', light: '#ffb765', paint: '#ff8200', back: 'Vol Nation', path: 'rockytop', banner: 'ROCKY TOP · TENNESSEE', chant: 'Rocky Top!' },
  gators: { key: 'gators', stamp: 'FLORIDA', name: 'GATOR NATION', accent: '#fa8b36', light: '#ffc18e', paint: '#184ca0', endzone: 'GATORS', back: 'Gator Nation', path: 'gators', banner: 'WELCOME TO THE SWAMP', chant: 'Go Gators!' },
  tide: { key: 'tide', stamp: 'ALABAMA', name: 'CRIMSON TIDE', accent: '#9e1b32', light: '#ffc1ce', paint: '#981b32', endzone: 'ALABAMA', back: 'Crimson Tide', path: 'dixielanddelight', banner: 'ROLL TIDE · ALABAMA', chant: 'Roll Tide!' }
};
const key = new URLSearchParams(location.search).get('team');
const team = Object.hasOwn(teams, key) ? teams[key] : teams.vols;
let distance = 20, kicks = 0, score = 0, made = 0, longest = 0, best = 0, ball = null, drag = null;
let result = null, trail = [], lastFrame = 0, accumulator = 0, storageAvailable = true;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const storageKey = `rtv-field-goal-best-${team.key}`;
try { const stored = Number(localStorage.getItem(storageKey)); best = [20,30,40,50,60].includes(stored) ? stored : 0; }
catch { storageAvailable = false; }
const wind = () => WINDS[Math.min(kicks, 4)];
const windText = n => n === 0 ? 'Wind: calm' : `Wind: ${n < 0 ? '←' : '→'} ${Math.abs(n)} mph`;
function controls() {
  const value = Number($('aim').value);
  $('aim-value').textContent = value === 0 ? 'Center' : `${Math.abs(value)}° ${value < 0 ? 'left' : 'right'}`;
  $('power-value').textContent = `${$('power').value}%`;
}
function sync() {
  $('score').textContent = String(score).padStart(2, '0'); $('kicks').textContent = 5 - kicks;
  $('distance').textContent = distance; $('best').textContent = best || '—';
  const locked = Boolean(ball) || kicks >= 5;
  for (const id of ['kick','aim','power']) $(id).disabled = locked;
  $('wind').textContent = windText(ball ? ball.wind : wind());
  $('distance-note').textContent = `${distance}-yard kick. ${windText(ball ? ball.wind : wind()).replace('Wind: ', '')}.`;
  $('save-note').textContent = storageAvailable ? 'Your longest kick stays on this device. No account needed.' : 'Storage is unavailable. Your longest kick lasts for this visit.';
}
function saveBest() {
  if (longest <= best) return;
  best = longest;
  try { localStorage.setItem(storageKey, String(best)); } catch { storageAvailable = false; }
}
function reset() {
  distance = 20; kicks = 0; score = 0; made = 0; longest = 0; ball = null; drag = null; result = null; trail = [];
  $('aim').value = 0; $('power').value = 60; $('result').hidden = true; $('kick-call').hidden = true;
  $('status').textContent = 'Swipe up from the football to kick.'; controls(); sync();
}
function kick() {
  if (ball || kicks >= 5) return;
  ball = launchKick(distance, Number($('aim').value), Number($('power').value), wind());
  kicks++; result = null; trail = []; drag = null; $('kick-call').hidden = true;
  $('status').textContent = `${distance}-yard kick is away…`; sync();
}
const calls = { good: 'IT’S GOOD!', left: 'WIDE LEFT', right: 'WIDE RIGHT', short: 'SHORT', post: 'OFF THE UPRIGHT', crossbar: 'OFF THE CROSSBAR' };
function resolve(outcome) {
  result = outcome;
  if (outcome === 'good') { score += 3; made++; longest = Math.max(longest, distance); saveBest(); }
  $('kick-call').hidden = false; $('kick-call').dataset.outcome = outcome;
  $('call-title').textContent = calls[outcome];
  $('call-detail').textContent = outcome === 'good' ? `${distance} YARDS · +3 POINTS` : outcome === 'short' ? 'Add more power on the next kick.' : outcome === 'left' ? 'Aim a little farther right.' : outcome === 'right' ? 'Aim a little farther left.' : 'So close. Adjust your aim and power.';
  $('status').textContent = `${calls[outcome]} ${outcome === 'good' ? `${distance} yards, three points.` : $('call-detail').textContent}`;
  sync();
}
function finish() {
  const outcome = ball.outcome;
  ball = null; trail = [];
  if (kicks >= 5) {
    $('result-title').textContent = made === 5 ? 'Perfect from five.' : made >= 3 ? 'What a leg.' : 'Keep kicking.';
    $('result-score').textContent = `${score} points · ${made} of 5 made\nLongest this round: ${longest ? `${longest} yards` : '—'}\n${team.chant}`;
    $('result').hidden = false; $('kick-call').hidden = true;
    $('status').textContent = `Round complete: ${score} points. ${made} of 5 made. Longest kick: ${longest} yards.`;
    $('play-again').focus({ preventScroll: true });
  } else {
    distance = nextDistance(distance, outcome === 'good');
    $('aim').value = 0; controls();
    $('status').textContent = `${calls[outcome]} Next: ${distance} yards. ${windText(wind())}.`;
    $('kick-call').hidden = true; result = null;
  }
  sync();
}
function animate(time) {
  accumulator += lastFrame ? Math.min((time - lastFrame) / 1000, .05) : 0; lastFrame = time;
  while (accumulator >= 1 / 120) {
    accumulator -= 1 / 120;
    if (!ball) continue;
    const outcome = stepKick(ball, 1 / 120);
    if (Math.floor(ball.age * 120) % 4 === 0) { trail.push({ x: ball.x, z: ball.z, h: ball.h }); if (trail.length > 16) trail.shift(); }
    if (outcome.event) resolve(outcome.event);
    if (outcome.finished) finish();
  }
  renderer.draw({ distance, team, ball, trail: reducedMotion ? [] : trail, drag, aim: Number($('aim').value), result, complete: kicks >= 5 && !ball });
  requestAnimationFrame(animate);
}
function point(event) {
  const rect = canvas.getBoundingClientRect(); const scale = Math.min(rect.width / 600, rect.height / 660);
  return { x: (event.clientX - rect.left - (rect.width - 600 * scale) / 2) / scale, y: (event.clientY - rect.top - (rect.height - 660 * scale) / 2) / scale };
}
function swipe(p) {
  $('aim').value = Math.round(clamp((p.x - drag.x) / 5, -15, 15));
  $('power').value = Math.round(clamp((drag.y - p.y) / 2.4, 0, 100)); controls();
}
canvas.addEventListener('pointerdown', event => {
  if (ball || kicks >= 5 || drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const p = point(event);
  if (Math.hypot(p.x - BALL_ORIGIN.x, p.y - BALL_ORIGIN.y) > 60) return;
  drag = { ...p, id: event.pointerId }; canvas.setPointerCapture(event.pointerId); canvas.focus({ preventScroll: true });
});
canvas.addEventListener('pointermove', event => { if (drag && event.pointerId === drag.id) swipe(point(event)); });
canvas.addEventListener('pointerup', event => {
  if (!drag || event.pointerId !== drag.id) return;
  const p = point(event); const dy = drag.y - p.y; swipe(p); drag = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  if (dy >= 25) kick(); else $('status').textContent = 'Swipe upward from the football. A longer swipe adds power.';
});
canvas.addEventListener('pointercancel', () => { drag = null; });
canvas.addEventListener('lostpointercapture', () => { drag = null; });
canvas.addEventListener('keydown', event => { if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); if (!event.repeat) kick(); } });
$('kick').addEventListener('click', kick); $('restart').addEventListener('click', reset);
$('play-again').addEventListener('click', () => { reset(); canvas.focus({ preventScroll: true }); });
$('aim').addEventListener('input', controls); $('power').addEventListener('input', controls);
document.documentElement.style.setProperty('--accent', team.accent); document.documentElement.style.setProperty('--accent-light', team.light);
document.documentElement.style.setProperty('--button-ink', team.key === 'tide' ? '#fff' : '#141914');
$('team-stamp').textContent = team.stamp; $('team-name').textContent = team.name;
$('back-link').href = `../${team.path}/`; $('back-link').textContent = `← Back to ${team.back}`;
reset(); requestAnimationFrame(animate);
