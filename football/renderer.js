import { FIELD_WIDTH, CHECKERBOARD, GOAL, clamp } from './physics.js';

const WIDTH = 600, HEIGHT = 660;
export const BALL_ORIGIN = { x: 300, y: 566 };

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const turf = document.createElement('canvas'); turf.width = 128; turf.height = 128;
  const texture = turf.getContext('2d');
  let seed = 27183;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 2500; i++) {
    const x = random() * 128, y = random() * 128;
    texture.fillStyle = i % 2 ? '#deecbc18' : '#051e121c';
    texture.fillRect(x, y, 1, 2);
  }
  const grass = ctx.createPattern(turf, 'repeat');
  let camera = { follow: 0, horizon: 180 };
  const project = (x, z, h = 0) => {
    const depth = Math.max(z + 5 - camera.follow, 1.5);
    const scale = 390 / depth;
    return { x: 300 + x * scale, y: camera.horizon + (5.3 - h) * scale, scale };
  };
  function path(points, color, width = 1, fill = false) {
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
    if (fill) { ctx.closePath(); ctx.fillStyle = color; ctx.fill(); }
    else { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  }
  function groundRect(x, z, width, depth, color) {
    path([project(x, z), project(x + width, z), project(x + width, z + depth), project(x, z + depth)], color, 1, true);
  }
  function oval(x, y, rx, ry, color) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
  }
  function football(x, y, size, spin = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-.22 + spin);
    ctx.beginPath(); ctx.moveTo(0, -size * 1.5);
    ctx.bezierCurveTo(size * 1.28, -size * .55, size * 1.28, size * .55, 0, size * 1.5);
    ctx.bezierCurveTo(-size * 1.28, size * .55, -size * 1.28, -size * .55, 0, -size * 1.5); ctx.closePath();
    const leather = ctx.createLinearGradient(-size, 0, size, 0);
    leather.addColorStop(0, '#442517'); leather.addColorStop(.4, '#a76637'); leather.addColorStop(.65, '#88502b'); leather.addColorStop(1, '#331c13');
    ctx.fillStyle = leather; ctx.shadowColor = '#0007'; ctx.shadowBlur = 3; ctx.fill(); ctx.shadowBlur = 0;
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#f4e8ce'; ctx.fillRect(-size * 1.2, -size * .99, size * 2.4, size * .14); ctx.fillRect(-size * 1.2, size * .85, size * 2.4, size * .14);
    ctx.strokeStyle = '#d4b18a55'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(0, -size * 1.4); ctx.bezierCurveTo(-size * .3, 0, -size * .3, 0, 0, size * 1.4); ctx.stroke();
    for (let i = 0; i < 45; i++) {
      const px = Math.sin(i * 2.4) * size * .8, py = Math.cos(i * 1.7) * size * 1.3;
      ctx.fillStyle = '#170b072d'; ctx.fillRect(px, py, Math.max(.6, size * .045), Math.max(.6, size * .045));
    }
    ctx.strokeStyle = '#ffefd3'; ctx.lineWidth = Math.max(1, size * .065);
    ctx.beginPath(); ctx.moveTo(size * .17, -size * .5); ctx.lineTo(size * .17, size * .5); ctx.stroke();
    for (let i = -3; i <= 3; i++) path([{ x: -size * .01, y: i * size * .14 }, { x: size * .35, y: i * size * .14 }], '#fff4dd', Math.max(1, size * .07));
    ctx.restore(); ctx.restore();
  }
  function stadium(distance, team) {
    const back = project(0, distance + 13), top = project(0, distance + 20, 20);
    const sky = ctx.createLinearGradient(0, 0, 0, back.y);
    sky.addColorStop(0, '#0e2636'); sky.addColorStop(1, '#6a8990');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    path([{ x: 0, y: top.y + 42 }, { x: 300, y: top.y + 10 }, { x: 600, y: top.y + 42 }, { x: 600, y: back.y }, { x: 0, y: back.y }], '#243037', 1, true);
    const startY = Math.max(56, top.y + 44);
    const crowdBottom = back.y - 18;
    for (let row = 0; row < 16; row++) {
      const t = row / 16, y = startY + (crowdBottom - startY) * t;
      path([{ x: 0, y }, { x: 300, y: y - 10 * (1 - t) }, { x: 600, y }], '#7e8b893c', 1);
      for (let col = 0; col < 94; col++) {
        const x = col * 6.5 + (row % 2) * 3;
        const hue = (row * 19 + col * 7) % 13;
        ctx.fillStyle = hue < 5 ? team.accent : hue < 9 ? '#e6ddca' : '#162634';
        ctx.globalAlpha = .65 + (hue % 3) * .1;
        ctx.fillRect(x, y - 3 - Math.sin(x / 600 * Math.PI) * 10 * (1 - t), 2.8, 3.5);
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#17271f'; ctx.fillRect(0, back.y - 19, 600, project(0, distance + 6).y - back.y + 20);
    ctx.fillStyle = '#fff0d1'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
    ctx.fillText(team.banner, 300, back.y - 5);
  }
  function field(distance, team) {
    const half = FIELD_WIDTH / 2, goalLine = distance - 10;
    groundRect(-120, -2 + camera.follow, 240, distance + 8 - camera.follow, '#284e2b');
    // Five-yard mowing stripes and regulation field markings.
    for (let z = goalLine; z > camera.follow - 4; z -= 5) {
      groundRect(-half, z - 5, FIELD_WIDTH, 5, Math.round((goalLine - z) / 5) % 2 ? '#3d7439' : '#346833');
    }
    groundRect(-half, goalLine, FIELD_WIDTH, 10, '#346833');
    if (team.key === 'vols') {
      // Neyland: four rows of thirty 5-foot squares, with 5 feet of green on all sides.
      for (let row = 0; row < CHECKERBOARD.rows; row++) {
        for (let col = 0; col < CHECKERBOARD.columns; col++) {
          groundRect(-half + CHECKERBOARD.border + col * CHECKERBOARD.square,
            goalLine + CHECKERBOARD.border + row * CHECKERBOARD.square,
            CHECKERBOARD.square, CHECKERBOARD.square,
            (row + col) % 2 === 0 ? '#ff8200' : '#fff8e7');
        }
      }
    } else {
      groundRect(-half + .6, goalLine + .6, FIELD_WIDTH - 1.2, 8.8, team.paint);
      const center = project(0, goalLine + 5), left = project(-22, goalLine + 5), right = project(22, goalLine + 5);
      ctx.save(); ctx.translate(center.x, center.y); ctx.scale(1, .35);
      ctx.font = `bold ${Math.min(68, (right.x - left.x) / 7.5)}px Arial`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff7ea';
      ctx.fillText(team.endzone, 0, 15); ctx.restore();
    }
    // Texture overlays preserve the painted-on-grass appearance of the checks.
    ctx.save();
    const edge = [project(-half, Math.max(-1, camera.follow - 1)), project(half, Math.max(-1, camera.follow - 1)), project(half, distance), project(-half, distance)];
    ctx.beginPath(); ctx.moveTo(edge[0].x, edge[0].y); edge.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath(); ctx.clip();
    ctx.fillStyle = grass; ctx.fillRect(0, 0, 600, 660); ctx.restore();
    const white = '#f4f3dcdf';
    for (const x of [-half, half]) path([project(x, Math.max(-1, camera.follow)), project(x, distance)], white, 2);
    for (const z of [goalLine, distance]) path([project(-half, z), project(half, z)], white, 2.4);
    for (let yards = 5; yards < distance; yards += 5) {
      const z = goalLine - yards;
      if (z < camera.follow - 1) continue;
      path([project(-half, z), project(half, z)], '#fffce5bd', 1.4);
      if (yards % 10 === 0) {
        for (const x of [-18, 18]) {
          const p = project(x, z);
          ctx.save(); ctx.translate(p.x, p.y - 6); ctx.scale(1, .58); ctx.fillStyle = '#fff8e5d9';
          ctx.font = `bold ${Math.min(49, p.scale * 2)}px Arial`; ctx.textAlign = 'center'; ctx.fillText(String(yards), 0, 0); ctx.restore();
        }
      }
    }
    for (let yards = 1; yards < distance; yards++) {
      const z = goalLine - yards;
      if (z < camera.follow) continue;
      for (const x of [-6.67, 6.67, -half + 1, half - 2]) path([project(x, z), project(x + .65, z)], '#eaf2d5b0', 1);
    }
    for (const x of [-half + .25, half - .25]) {
      for (const z of [goalLine, distance]) {
        const p = project(x, z); const top = project(x, z, .6);
        path([p, top], '#ff6926', Math.max(3, p.scale * .2));
      }
    }
  }
  function posts(distance, glow) {
    const base = project(0, distance + 2.4), neck = project(0, distance + 2.4, 2.4), cross = project(0, distance, GOAL.crossbar);
    path([base, neck, cross], '#927814', 10);
    path([base, neck, cross], '#ffdc3d', 6);
    const left = project(-GOAL.halfWidth, distance, GOAL.crossbar), right = project(GOAL.halfWidth, distance, GOAL.crossbar);
    const topLeft = project(-GOAL.halfWidth, distance, GOAL.top), topRight = project(GOAL.halfWidth, distance, GOAL.top);
    if (glow) { ctx.shadowColor = '#caff8c'; ctx.shadowBlur = 15; }
    const width = Math.max(3, cross.scale * .16);
    path([topLeft, left, right, topRight], '#8e771d', width + 3);
    path([topLeft, left, right, topRight], '#ffdc3d', width + 1);
    path([{ x: topLeft.x - .8, y: topLeft.y }, { x: left.x - .8, y: left.y }, { x: right.x - .8, y: right.y }, { x: topRight.x - .8, y: topRight.y }], '#fff3a0', 1);
    ctx.shadowBlur = 0;
    const padded = project(0, distance + 2.4, 1.6);
    path([base, padded], '#263126', Math.max(7, base.scale * .55));
  }
  function airborne(ball, trail) {
    trail.forEach((point, index) => {
      const p = project(point.x, point.z, point.h);
      const alpha = (index / trail.length) * .28;
      ctx.globalAlpha = alpha; oval(p.x, p.y, 2.5, 2.5, '#ffefae');
    });
    ctx.globalAlpha = 1;
    const p = project(ball.x, ball.z, ball.h), shadow = project(ball.x, ball.z);
    oval(shadow.x, shadow.y, 7, 2.5, '#061c1540');
    // A small minimum display size keeps the ball legible on phones at the uprights.
    const size = clamp(p.scale * .32, 5, 23);
    football(p.x, p.y, size, ball.age * 6.5);
  }
  function draw(state) {
    const { distance, team, ball, trail, drag, aim, result } = state;
    camera.follow = ball ? Math.min(ball.z * .35, distance - 18) : 0;
    camera.horizon = 180;
    if (ball) {
      const rawY = project(ball.x, ball.z, ball.h).y;
      camera.horizon += clamp(125 - rawY, 0, 330);
    }
    stadium(distance, team); field(distance, team);
    if (ball && ball.z >= distance) airborne(ball, trail);
    posts(distance, result === 'good');
    if (ball && ball.z < distance) airborne(ball, trail);
    if (!ball && !state.complete) {
      oval(BALL_ORIGIN.x + 4, 601, 31, 8, '#10200f70');
      path([{ x: 288, y: 593 }, { x: 307, y: 593 }, { x: 310, y: 601 }, { x: 285, y: 601 }], '#252720', 1, true);
      ctx.setLineDash([3, 8]);
      path([{ x: 300, y: 511 }, { x: 300 + aim * 3, y: 438 }], '#fff5ca9c', 2); ctx.setLineDash([]);
      football(BALL_ORIGIN.x, BALL_ORIGIN.y, 23);
      ctx.fillStyle = '#f3f1d8'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
      ctx.fillText(drag ? 'RELEASE TO KICK' : 'SWIPE UP TO KICK', 300, 633);
    }
  }
  return { draw };
}
