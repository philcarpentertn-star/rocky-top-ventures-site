import { evaluate, hoopAt } from '../basketball/timing.js';
import assert from 'node:assert/strict';
import { challenge, flickInput } from '../arcade/challenge.js';
import { replay } from '../arcade/replay.js';
import { STARTS, launch, stepShot } from '../basketball/physics.js';
import { KICK_SPOTS, launchKick, stepKick } from '../football/physics.js';
export function solve(game, seed) {
  const winds = challenge(game, seed);
  if (game === 'basketball') return winds.map((phase, index) => {
    for (let time = 0; time < 10; time += .01) if (evaluate(index, phase, time).made) return { time };
    throw new Error('No scoring window');
  });
  return winds.map((wind, index) => {
    for (let aim = game === 'basketball' ? -40 : -25; aim <= (game === 'basketball' ? 40 : 25); aim += .5) {
      const ball = game === 'basketball' ? launch(STARTS[index], aim, 72, wind) : launchKick(20 + index * 10, aim, 95, wind, KICK_SPOTS[index]);
      for (let step = 0; step < 1200; step++) {
        if ((game === 'basketball' ? stepShot(ball, 1 / 120) : stepKick(ball, 1 / 120)).finished) break;
      }
      if (game === 'basketball' ? ball.made : ball.outcome === 'good') return { aim, power: game === 'basketball' ? 72 : 95 };
    }
    throw new Error(`Impossible ${game} attempt ${index}, wind ${wind}`);
  });
}
for (const game of ['basketball', 'football']) {
  assert.deepEqual(challenge(game, 42), challenge(game, 42));
  assert.notDeepEqual(challenge(game, 42), challenge(game, 84));
  for (const seed of [1, 2, 42, 84, 123456789, 4294967295]) {
    const result = replay(game, seed, solve(game, seed));
    assert.equal(result.score, game === 'basketball' ? 28 : 15);
    if (game === 'football') assert.equal(result.longest, 60);
  }
  const inputs = solve(game, 42);
  assert.throws(() => replay(game, 42, inputs.slice(1)));
  assert.throws(() => replay(game, 42, [{ aim: NaN, power: 80 }, ...inputs.slice(1)]));
  assert.throws(() => replay(game, 42, [{ aim: 0, power: 101 }, ...inputs.slice(1)]));
  if (game === 'football') assert.equal(replay(game, 42, inputs.map(() => ({ aim: 0, power: 0 }))).score, 0);
  else {
    const misses = challenge(game, 42).map((phase, index) => {
      for (let time = 0; time < 10; time += .01) if (!evaluate(index, phase, time).made) return { time };
    });
    assert.equal(replay(game, 42, misses).score, 0);
    for (const time of [-1, NaN, Infinity, 121]) assert.throws(() => replay(game, 42, [{ time }, ...inputs.slice(1)]));
    assert(hoopAt(8, 0, 0).scale < hoopAt(0, 0, 0).scale);
    assert(hoopAt(8, 0, 0).y < hoopAt(0, 0, 0).y);
    const result = replay(game, 42, inputs);
    assert(Math.abs(result.duration - inputs.reduce((sum, input) => sum + input.time + 1.4, 0)) < .0001);
  }
  assert(flickInput(0, 180, 200, game).power > flickInput(0, 180, 900, game).power);
  assert(flickInput(-50, 180, 200, game).aim < 0);
  assert.equal(flickInput(500, 500, 0, game).power, 100);
}
const calm = launch(300, 0, 72), windy = launch(300, 0, 72, 7);
for (let i = 0; i < 60; i++) { stepShot(calm, 1 / 120); stepShot(windy, 1 / 120); }
assert(windy.x > calm.x + 10);
console.log('Passed: changing seeded wind, solvable attempts for both games, replay scoring, input bounds, and flick speed.');
