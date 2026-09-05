// World coordinates are yards: x across the field, z toward the goal, h above turf.
export const FIELD_WIDTH = 160 / 3;
export const GOAL = { halfWidth: 18.5 / 6, crossbar: 10 / 3, top: 13.33, ballRadius: 0.14 };
export const CHECKERBOARD = { rows: 4, columns: 30, square: 5 / 3, border: 5 / 3 };
export const GRAVITY = 9.81 / 0.9144;
export const WINDS = [0, 3, -4, 5, -6];
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const nextDistance = (distance, made) => made ? Math.min(distance + 10, 60) : distance;

export function launchKick(distance, aim, power, wind) {
  const speed = 9 + clamp(power, 0, 100) * 0.25;
  const direction = clamp(aim, -15, 15) * Math.PI / 180;
  const elevation = 37 * Math.PI / 180;
  return { x: 0, z: 0, h: 0.35, vx: Math.sin(direction) * Math.cos(elevation) * speed,
    vz: Math.cos(direction) * Math.cos(elevation) * speed, vh: Math.sin(elevation) * speed,
    wind, distance, age: 0, resolved: false, outcome: null, afterResult: 0 };
}

export function classifyCrossing(x, height) {
  const radius = GOAL.ballRadius;
  if (Math.abs(Math.abs(x) - GOAL.halfWidth) <= radius && height >= GOAL.crossbar - radius && height <= GOAL.top + radius) return 'post';
  if (Math.abs(x) <= GOAL.halfWidth + radius && Math.abs(height - GOAL.crossbar) <= radius) return 'crossbar';
  if (height < GOAL.crossbar + radius) return 'short';
  if (x < -GOAL.halfWidth + radius) return 'left';
  if (x > GOAL.halfWidth - radius) return 'right';
  return 'good';
}

export function stepKick(ball, dt) {
  const previous = { x: ball.x, z: ball.z, h: ball.h };
  const acceleration = ball.wind * 0.2;
  ball.age += dt;
  ball.x += ball.vx * dt + 0.5 * acceleration * dt * dt;
  ball.vx += acceleration * dt;
  ball.z += ball.vz * dt;
  ball.h += ball.vh * dt - 0.5 * GRAVITY * dt * dt;
  ball.vh -= GRAVITY * dt;
  let event = null;
  if (!ball.resolved && previous.z < ball.distance && ball.z >= ball.distance) {
    const t = (ball.distance - previous.z) / (ball.z - previous.z);
    const x = previous.x + (ball.x - previous.x) * t;
    const height = previous.h + (ball.h - previous.h) * t;
    ball.outcome = classifyCrossing(x, height);
    ball.crossing = { x, h: height, z: ball.distance };
    ball.resolved = true;
    event = ball.outcome;
    if (event === 'post' || event === 'crossbar') {
      ball.vx = (Math.sign(x) || 1) * 3; ball.vz *= -0.35; ball.vh *= 0.4;
      ball.x = x; ball.z = ball.distance; ball.h = Math.max(height, 0);
    }
  }
  if (ball.h <= 0) {
    ball.h = 0;
    if (!ball.resolved) { ball.outcome = 'short'; ball.resolved = true; event = 'short'; }
    ball.vh = Math.abs(ball.vh) > 1 ? Math.abs(ball.vh) * .25 : 0;
    ball.vz *= .94; ball.vx *= .94;
  }
  if (ball.resolved) ball.afterResult += dt;
  return { event, finished: ball.afterResult >= 1.3 || ball.age > 9 };
}
