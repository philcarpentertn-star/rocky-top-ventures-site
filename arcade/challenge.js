// Shared by the browser and score verifier. Keep rules versioned with the board.
export const RULES_VERSION = 3;
export const rulesVersion = game => game === 'basketball' ? 4 : RULES_VERSION;
export const TEAMS = ['vols', 'gators', 'tide', 'texas'];
export function challenge(game, seed) {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  if (game === 'basketball') return Array.from({ length: 10 }, () => random() * Math.PI * 2);
  const strengths = game === 'basketball' ? [2, 3, 4, 4, 5, 5, 6, 6, 7, 7] : [6, 8, 10, 12, 14];
  let previous = 0;
  return strengths.map(strength => {
    let wind = (random() < .5 ? -1 : 1) * strength;
    if (wind === previous) wind *= -1;
    previous = wind;
    return wind;
  });
}
export function flickInput(dx, dy, elapsed, game) {
  const limit = game === 'basketball' ? 40 : 25;
  const duration = Math.max(100, elapsed);
  const length = Math.max(0, dy);
  const power = Math.round(Math.min(100, length / 2.5 * .65 + length / duration * 100 * .35));
  const aim = Math.round(Math.max(-limit, Math.min(limit, dx / Math.max(60, length) * limit * 1.7)) * 2) / 2;
  return { aim, power };
}
export const windLabel = wind => `Wind ${wind < 0 ? '←' : '→'} ${Math.abs(wind)} mph`;
