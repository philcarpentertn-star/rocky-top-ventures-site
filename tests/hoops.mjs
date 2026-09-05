import assert from 'node:assert/strict';
import { launch, stepShot, STARTS, HOOP, pointsForMake } from '../basketball/physics.js';
function simulate(x, aim, power, dt = 1 / 120) {
  const ball = launch(x, aim, power), events = [];
  for (let i = 0; i < 1000; i++) {
    const result = stepShot(ball, dt);
    if (result.event) events.push(result.event);
    if (result.finished) return { ball, events };
  }
  throw new Error('Shot never finished');
}
assert.deepEqual(simulate(300, 0, 72).events, ['make'], 'Centered shot scores once');
assert.equal(simulate(300, 0, 0).ball.made, false, 'Underpowered shot misses');
assert.equal(simulate(300, 30, 72).ball.made, false, 'Wide shot misses');
assert.deepEqual(simulate(300, 6, 72).events, ['rim'], 'Rim contact bounces without scoring');
for (const x of STARTS) {
  const aim = Math.round((HOOP.x - x) / 6);
  assert.equal(simulate(x, aim, 72).ball.made, true, `Shot at ${x} is makeable`);
}
assert.equal(simulate(220, 13, 72, 1 / 60).ball.made, simulate(220, 13, 72, 1 / 120).ball.made, 'Scoring is stable across frame steps');
assert.deepEqual([1, 2, 3, 4].map(pointsForMake), [2, 2, 3, 3]);
assert.equal(Array.from({ length: 10 }, (_, i) => pointsForMake(i + 1)).reduce((a, b) => a + b), 28);
console.log('Passed: makes, misses, rim bounce, all 10 positions, frame-step stability, streak bonus, maximum round score.');
const swish = launch(300, 0, 72);
while (swish.phase === 'flight') stepShot(swish, 1 / 120);
assert.equal(swish.phase, 'net');
const entryY = swish.y;
for (let i = 0; i < 30; i++) {
  assert.equal(stepShot(swish, 1 / 120).event, null, 'Score waits until ball clears net');
}
assert.equal(swish.phase, 'net', 'Ball remains visible inside net for at least a quarter second');
assert(swish.y > entryY && swish.y < HOOP.y + 76);
console.log('Passed: visible net transit and scoring after ball exits net.');
