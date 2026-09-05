import assert from 'node:assert/strict';
import { CHECKERBOARD, FIELD_WIDTH, GOAL, launchKick, stepKick, classifyCrossing, nextDistance } from '../football/physics.js';
function simulate(distance, aim, power, wind = 0, dt = 1 / 120) {
  const ball = launchKick(distance, aim, power, wind), events = [];
  for (let i = 0; i < 2400; i++) {
    const result = stepKick(ball, dt);
    if (result.event) events.push(result.event);
    if (result.finished) return { ball, events };
  }
  throw new Error('Kick did not finish');
}
assert.deepEqual(simulate(20, 0, 60).events, ['good']);
assert.equal(simulate(20, 0, 0).ball.outcome, 'short');
assert.equal(simulate(40, 0, 40).ball.outcome, 'short');
assert.equal(simulate(20, -15, 60).ball.outcome, 'left');
assert.equal(simulate(20, 15, 60).ball.outcome, 'right');
for (const distance of [20, 30, 40, 50, 60]) assert.equal(simulate(distance, 0, 95).ball.outcome, 'good', `${distance} yards is makeable`);
assert.equal(classifyCrossing(GOAL.halfWidth, 5), 'post');
assert.equal(classifyCrossing(0, GOAL.crossbar), 'crossbar');
assert.equal(classifyCrossing(0, GOAL.crossbar + .5), 'good');
assert.equal(classifyCrossing(0, GOAL.crossbar - .5), 'short');
assert.equal(classifyCrossing(GOAL.halfWidth + .5, 5), 'right');
assert.equal(classifyCrossing(-GOAL.halfWidth - .5, 5), 'left');
const windy = simulate(60, 0, 95, 6), corrected = simulate(60, -1, 95, 6);
assert(windy.ball.crossing.x > 0, 'Wind bends ball in indicated direction');
assert(Math.abs(corrected.ball.crossing.x) < Math.abs(windy.ball.crossing.x), 'Aiming into wind compensates');
assert.equal(simulate(40, 0, 85, -4, 1 / 60).ball.outcome, simulate(40, 0, 85, -4, 1 / 120).ball.outcome);
assert.equal(nextDistance(20, true), 30); assert.equal(nextDistance(30, false), 30); assert.equal(nextDistance(60, true), 60);
assert.equal(CHECKERBOARD.rows * CHECKERBOARD.columns, 120);
assert(Math.abs(CHECKERBOARD.columns * CHECKERBOARD.square + 2 * CHECKERBOARD.border - FIELD_WIDTH) < .00001);
assert.equal(CHECKERBOARD.rows * CHECKERBOARD.square + 2 * CHECKERBOARD.border, 10);
console.log('Passed: makes, misses, crossbar and upright checks, every distance, wind compensation, frame steps, progression, and Neyland checkerboard dimensions.');
