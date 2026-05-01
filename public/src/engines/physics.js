import { vecSub } from '../utils/math.js';

export function createBody(overrides = {}) {
  return {
    x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0,
    rotation: 0, angularVelocity: 0,
    mass: 1, restitution: 0.4, friction: 0.985,
    width: 30, height: 30,
    isStatic: false, active: true, createdAt: Date.now(),
    ...overrides,
  };
}

export function integrateBody(body, dt, gravity = 0.0005) {
  if (body.isStatic) return;
  const t = Math.min(dt, 50);
  body.ay = gravity;
  body.vx += body.ax * t;
  body.vy += body.ay * t;
  const frictionFactor = Math.pow(body.friction, t / 16.67);
  body.vx *= frictionFactor;
  body.x += body.vx * t;
  body.y += body.vy * t;
  body.rotation += body.angularVelocity * t;
  body.angularVelocity *= 0.99;
}

export function detectAABB(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const overlapX = (a.width + b.width) / 2 - Math.abs(dx);
  const overlapY = (a.height + b.height) / 2 - Math.abs(dy);
  if (overlapX <= 0 || overlapY <= 0) return null;
  if (overlapX < overlapY) return { colliding: true, nx: Math.sign(dx), ny: 0, depth: overlapX };
  return { colliding: true, nx: 0, ny: Math.sign(dy), depth: overlapY };
}

export function resolveCollision(a, b, col) {
  const { nx, ny, depth } = col;
  const aStatic = a.isStatic;
  const bStatic = b.isStatic;
  if (!aStatic && !bStatic) {
    a.x -= nx * depth * 0.5; a.y -= ny * depth * 0.5;
    b.x += nx * depth * 0.5; b.y += ny * depth * 0.5;
  } else if (!aStatic) {
    a.x -= nx * depth; a.y -= ny * depth;
  } else if (!bStatic) {
    b.x += nx * depth; b.y += ny * depth;
  }
  const relVx = b.vx - a.vx;
  const relVy = b.vy - a.vy;
  const dot = relVx * nx + relVy * ny;
  if (dot > 0) return;
  const restitution = Math.min(a.restitution, b.restitution);
  const totalInvMass = (aStatic ? 0 : 1 / a.mass) + (bStatic ? 0 : 1 / b.mass);
  if (totalInvMass === 0) return;
  const impulse = -(1 + restitution) * dot / totalInvMass;
  if (!aStatic) { a.vx -= impulse / a.mass * nx; a.vy -= impulse / a.mass * ny; }
  if (!bStatic) { b.vx += impulse / b.mass * nx; b.vy += impulse / b.mass * ny; }
}

export function boundaryCollision(body, width, height) {
  const hw = body.width / 2;
  const hh = body.height / 2;
  if (body.y + hh > height) {
    body.y = height - hh;
    body.vy = -Math.abs(body.vy) * body.restitution;
    body.vx *= body.friction;
    body.angularVelocity *= 0.8;
  }
  if (body.x - hw < 0) { body.x = hw; body.vx = Math.abs(body.vx) * body.restitution; }
  if (body.x + hw > width) { body.x = width - hw; body.vx = -Math.abs(body.vx) * body.restitution; }
}

export function cullBodies(bodies, width, height, maxCount = 200) {
  const inBounds = bodies.filter(b =>
    b.isStatic || (b.y < height + 200 && b.x > -200 && b.x < width + 200)
  );
  if (inBounds.length <= maxCount) return inBounds;
  const statics  = inBounds.filter(b => b.isStatic);
  const dynamics = inBounds.filter(b => !b.isStatic)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(inBounds.length - maxCount);
  return [...statics, ...dynamics];
}
