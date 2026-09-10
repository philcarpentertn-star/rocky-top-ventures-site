import { challenge } from './challenge.js';
import { STARTS, launch, stepShot, pointsForMake } from '../basketball/physics.js';
import { KICK_SPOTS, launchKick, stepKick, nextDistance } from '../football/physics.js';

// Accept shot inputs, never a score supplied by the browser.
export function replay(game, seed, attempts) {
  const count = game === 'basketball' ? 10 : game === 'football' ? 5 : 0;
  if (!count || !Array.isArray(attempts) || attempts.length !== count) throw new Error('Complete a full round first.');
  const winds = challenge(game, seed);
  let score = 0, made = 0, streak = 0, distance = 20, longest = 0, duration = 0;
  for (let i = 0; i < count; i++) {
    const input = attempts[i];
    const limit = game === 'basketball' ? 40 : 25;
    if (!input || !Number.isFinite(input.aim) || Math.abs(input.aim) > limit || !Number.isFinite(input.power) || input.power < 0 || input.power > 100) throw new Error('Invalid shot.');
    const ball = game === 'basketball' ? launch(STARTS[i], input.aim, input.power, winds[i]) : launchKick(distance, input.aim, input.power, winds[i], KICK_SPOTS[i]);
    let finished = false;
    for (let step = 0; step < 1200; step++) {
      const result = game === 'basketball' ? stepShot(ball, 1 / 120) : stepKick(ball, 1 / 120);
      duration += 1 / 120;
      if (result.finished) { finished = true; break; }
    }
    if (!finished) throw new Error('Shot did not finish.');
    const good = game === 'basketball' ? ball.made : ball.outcome === 'good';
    if (good) {
      made++; streak++;
      score += game === 'basketball' ? pointsForMake(streak) : 3;
      if (game === 'football') longest = Math.max(longest, distance);
    } else streak = 0;
    if (game === 'football') distance = nextDistance(distance, good);
  }
  return { score, made, longest, duration };
}
