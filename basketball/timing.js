// Absolute seconds since the player starts the one-minute round.
export const SHOOTERS = [90, 230, 370, 510];
export const ROUND_SECONDS = 60;
export const FLIGHT = .8;
export const RECOVERY = .6;
export const SHOT_SECONDS = FLIGHT + RECOVERY;
export const FIRE_INTERVAL = .15; // Independent reload for each player.
export const MAX_SHOTS = SHOOTERS.length * Math.ceil(ROUND_SECONDS / FIRE_INTERVAL);
export function levelFor(time) { return Math.min(5, Math.max(1, Math.floor(time / 12) + 1)); }
export function motionAt(time) {
  const completed = Math.min(4, Math.floor(time / 12));
  return 12 * (completed * .85 + .13 * completed * (completed + 1) / 2) + (time - completed * 12) * (.85 + (completed + 1) * .13);
}
export function hoopAt(time, phase) {
  const level = levelFor(time);
  return { x: 300 + 225 * Math.sin(phase + motionAt(time)),
    y: 250 - level * 21, scale: 1.08 - level * .105, level };
}
export function evaluate(time, phase, shooter = 1) {
  const hoop = hoopAt(time + FLIGHT, phase);
  return { made: Math.abs(hoop.x - SHOOTERS[shooter]) <= 22 * hoop.scale, hoop };
}
export function replayTiming(phases, attempts) {
  if (!Array.isArray(attempts) || attempts.length > MAX_SHOTS) throw new Error('Invalid round.');
  let score = 0, made = 0, streak = 0, previous = 0, finish = 0;
  const nextShot = SHOOTERS.map(() => 0);
  attempts.forEach(input => {
    if (!input || !Number.isFinite(input.time) || input.time < previous || input.time >= ROUND_SECONDS || !Number.isInteger(input.shooter) || input.shooter < 0 || input.shooter >= SHOOTERS.length) throw new Error('Invalid shot timing.');
    if (input.time < nextShot[input.shooter] - 1e-9) throw new Error('Player is reloading.');
    const good = evaluate(input.time, phases[0], input.shooter).made;
    if (good) { made++; streak++; score += streak >= 3 ? 3 : 2; } else streak = 0;
    previous = input.time;
    nextShot[input.shooter] = input.time + FIRE_INTERVAL;
    finish = input.time + SHOT_SECONDS;
  });
  // A ball released before the buzzer is allowed to finish after zero.
  return { score, made, longest: 0, duration: Math.max(ROUND_SECONDS, finish) };
}
