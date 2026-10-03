import assert from 'node:assert/strict';
import { evaluate, hoopAt, motionAt, FLIGHT, levelFor, replayTiming, ROUND_SECONDS, SHOT_SECONDS, FIRE_INTERVAL, MAX_SHOTS, SHOOTERS } from '../basketball/timing.js';
import { challenge, flickInput } from '../arcade/challenge.js';
import { replay } from '../arcade/replay.js';
import { KICK_SPOTS, launchKick, stepKick } from '../football/physics.js';
export function solve(game, seed) {
  const phases = challenge(game, seed);
  if (game === 'basketball') {
    const attempts = []; let time = 0;
    while (time < ROUND_SECONDS) {
      const shooter = SHOOTERS.findIndex((_, i) => evaluate(time, phases[0], i).made);
      if (shooter !== -1) { attempts.push({time, shooter}); time += FIRE_INTERVAL; }
      else time += .01;
    }
    return attempts;
  }
  return phases.map((wind, index) => {
    for (let aim = -25; aim <= 25; aim += .5) {
      const ball = launchKick(20 + index * 10, aim, 95, wind, KICK_SPOTS[index]);
      for (let step = 0; step < 1200; step++) if (stepKick(ball, 1 / 120).finished) break;
      if (ball.outcome === 'good') return {aim, power:95};
    }
    throw new Error('Impossible football attempt');
  });
}
for (const game of ['basketball', 'football']) {
  assert.deepEqual(challenge(game, 42), challenge(game, 42));
  assert.notDeepEqual(challenge(game, 42), challenge(game, 84));
  for (const seed of [1,2,42,84,123456789,4294967295]) {
    const inputs = solve(game, seed), result = replay(game, seed, inputs);
    if (game === 'basketball') { assert(inputs.length > 10); assert.equal(result.score, inputs.length * 3 - 2); assert(result.duration >= 60); }
    else { assert.equal(result.score, 15); assert.equal(result.longest, 60); }
  }
  assert(flickInput(0,180,200,game).power > flickInput(0,180,900,game).power);
}
assert.equal(levelFor(0),1); assert.equal(levelFor(11.999),1); assert.equal(levelFor(12),2); assert.equal(levelFor(48),5); assert.equal(levelFor(60),5);
const phases = challenge('basketball',42);
assert.deepEqual(replayTiming(phases, []), {score:0,made:0,longest:0,duration:60});
for (const time of [-1,NaN,Infinity,60,61]) assert.throws(() => replayTiming(phases,[{time,shooter:0}]));
for (const shooter of [-1,4,1.5,undefined,NaN]) assert.throws(() => replayTiming(phases,[{time:0,shooter}]));
assert.doesNotThrow(() => replayTiming(phases, SHOOTERS.map((_,shooter)=>({time:1,shooter}))), 'Simultaneous shots from all four players');
assert.doesNotThrow(() => replayTiming(phases,[{time:1,shooter:0},{time:1+FIRE_INTERVAL,shooter:0}]), 'Same player shoots again before first ball lands');
assert.throws(() => replayTiming(phases,[{time:1,shooter:0},{time:1.01,shooter:0}]), 'Per-player reload enforced');
assert.throws(() => replayTiming(phases,[{time:4,shooter:0},{time:1,shooter:1}]), 'Out-of-order shots rejected');
assert.throws(() => replayTiming(phases,Array(MAX_SHOTS+1).fill({time:0,shooter:0})));
assert.equal(replayTiming(phases,[{time:59.999,shooter:0}]).duration, 59.999+SHOT_SECONDS, 'Buzzer beater finishes after zero');
assert.doesNotThrow(() => replayTiming(phases,[{time:0,shooter:0},{time:SHOT_SECONDS,shooter:1}]));
for (let shooter = 0; shooter < 4; shooter++) for (const time of [0,12,24,36,48]) {
  const phase = Math.asin((SHOOTERS[shooter]-300)/225) - motionAt(time + FLIGHT);
  const result = evaluate(time,phase,shooter);
  assert(result.made); assert(Math.abs(result.hoop.x-SHOOTERS[shooter]) < 1e-8);
  assert.notEqual(hoopAt(time,phase).x,result.hoop.x);
  assert(!evaluate(time,phase,(shooter+1)%4).made);
}
for (const boundary of [12,24,36,48]) assert(Math.abs(hoopAt(boundary-1e-6,0).x-hoopAt(boundary,0).x)<.001, 'Movement stays continuous at level changes');
console.log('Passed: 60-second rounds, timed levels, four moving-hoop shooting lanes, cooldowns, buzzer beaters, input bounds, deterministic scoring, and football replay.');
