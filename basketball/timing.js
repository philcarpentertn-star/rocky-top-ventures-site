// Shared timing rules for animation and server verification. Seconds are round-relative.
export const SHOTS = 10;
export const FLIGHT = .8;
export const RECOVERY = .6;
export function levelFor(index) { return Math.floor(index / 2) + 1; }
export function hoopAt(index, phase, time) {
  const level = levelFor(index);
  return { x: 300 + (105 + level * 12) * Math.sin(phase + time * (.95 + level * .19)),
    y: 250 - level * 21, scale: 1.08 - level * .105, level };
}
export function evaluate(index, phase, time) {
  const hoop = hoopAt(index, phase, time + FLIGHT);
  return { made: Math.abs(hoop.x - 300) <= 27 * hoop.scale, hoop };
}
export function replayTiming(phases, attempts) {
  if (!Array.isArray(attempts) || attempts.length !== SHOTS) throw new Error('Complete a full round first.');
  let score = 0, made = 0, streak = 0, duration = 0;
  attempts.forEach((input, index) => {
    if (!input || !Number.isFinite(input.time) || input.time < 0 || input.time > 120) throw new Error('Invalid shot timing.');
    const good = evaluate(index, phases[index], input.time).made;
    if (good) { made++; streak++; score += streak >= 3 ? 3 : 2; } else streak = 0;
    duration += input.time + FLIGHT + RECOVERY;
  });
  return { score, made, longest: 0, duration };
}
