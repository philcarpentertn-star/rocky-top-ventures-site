export const GRAVITY = 1600;
export const HOOP = { x: 300, y: 210, halfWidth: 44 };
export const START_Y = 570;
export const STARTS = [300, 220, 380, 170, 430, 250, 350, 200, 400, 300];
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function launch(x, aim, power) {
  return { x, y: START_Y, vx: clamp(aim, -30, 30) * 6,
    vy: -(800 + clamp(power, 0, 100) * 5), resolved: false, made: false, age: 0, phase: 'flight', phaseAge: 0 };
}

// Fixed simulation steps make touch, mouse and keyboard shots behave identically.
export function stepShot(ball, dt) {
  ball.age += dt;
  if (ball.phase === 'net') {
    ball.phaseAge += dt;
    const progress = clamp(ball.phaseAge / 0.58, 0, 1);
    // Net resistance slows the ball; guide it through the taper of the mesh.
    ball.x = ball.entryX + (HOOP.x - ball.entryX) * progress * 0.65;
    ball.y = HOOP.y + 76 * progress;
    if (progress === 1) {
      ball.phase = 'drop'; ball.phaseAge = 0; ball.vy = 110; ball.vx = 24;
      return { event: 'make', finished: false };
    }
    return { event: null, finished: false };
  }
  if (ball.phase === 'drop') {
    ball.phaseAge += dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt + 200 * dt * dt;
    ball.vy += 400 * dt;
    if (ball.y >= 365 && ball.vy > 0) { ball.y = 365; ball.vy *= -0.52; }
    return { event: null, finished: ball.phaseAge > 1.15 };
  }
  const previous = { x: ball.x, y: ball.y };
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt + 0.5 * GRAVITY * dt * dt;
  ball.vy += GRAVITY * dt;
  let event = null;
  if (!ball.resolved && ball.vy > 0 && previous.y <= HOOP.y && ball.y >= HOOP.y) {
    const fraction = (HOOP.y - previous.y) / (ball.y - previous.y);
    const crossingX = previous.x + (ball.x - previous.x) * fraction;
    const offset = crossingX - HOOP.x;
    ball.resolved = true;
    ball.made = Math.abs(offset) < HOOP.halfWidth - 14;
    event = ball.made ? null : 'miss';
    if (ball.made) {
      ball.phase = 'net'; ball.phaseAge = 0; ball.entryX = crossingX;
      ball.x = crossingX; ball.y = HOOP.y;
    }
    if (!ball.made && Math.abs(Math.abs(offset) - HOOP.halfWidth) < 19) {
      ball.vy = -Math.abs(ball.vy) * 0.45;
      ball.vx = Math.sign(offset) * 150;
      event = 'rim';
    }
  }
  const finished = ball.y > 740 || ball.x < -80 || ball.x > 680 || ball.age > 3;
  return { event, finished };
}

export function pointsForMake(streak) { return streak >= 3 ? 3 : 2; }
