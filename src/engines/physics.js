/**
 * physics.js — 강체 물리 엔진 순수 함수
 * Canvas 의존성 없음
 */
import { vecSub } from '../utils/math.js';

/**
 * 물리 오브젝트 기본 생성
 * @param {Partial<PhysicsBody>} overrides
 * @returns {PhysicsBody}
 */
export function createBody(overrides = {}) {
  return {
    x: 0, y: 0,
    vx: 0, vy: 0,
    ax: 0, ay: 0,
    rotation: 0,
    angularVelocity: 0,
    mass: 1,
    restitution: 0.4,
    friction: 0.985,
    width: 30,
    height: 30,
    isStatic: false,
    active: true,
    createdAt: Date.now(),
    ...overrides,
  };
}

/**
 * 반암시적 오일러 적분
 * @param {PhysicsBody} body
 * @param {number} dt - 델타타임 (ms)
 * @param {number} gravity - 중력 (px/ms²)
 */
export function integrateBody(body, dt, gravity = 0.0005) {
  if (body.isStatic) return;
  const t = Math.min(dt, 50); // 최대 50ms 클램프

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

/**
 * AABB 충돌 감지
 * @param {PhysicsBody} a
 * @param {PhysicsBody} b
 * @returns {{colliding:boolean, nx:number, ny:number, depth:number}|null}
 */
export function detectAABB(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const overlapX = (a.width + b.width) / 2 - Math.abs(dx);
  const overlapY = (a.height + b.height) / 2 - Math.abs(dy);

  if (overlapX <= 0 || overlapY <= 0) return null;

  if (overlapX < overlapY) {
    return { colliding: true, nx: Math.sign(dx), ny: 0, depth: overlapX };
  }
  return { colliding: true, nx: 0, ny: Math.sign(dy), depth: overlapY };
}

/**
 * 충돌 해소 (impulse-based)
 * @param {PhysicsBody} a
 * @param {PhysicsBody} b
 * @param {{nx:number, ny:number, depth:number}} col
 */
export function resolveCollision(a, b, col) {
  const { nx, ny, depth } = col;

  // 위치 보정 — static 쪽은 움직이지 않으므로 dynamic 쪽이 전량 보정
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

  // 충돌 임펄스
  const relVx = b.vx - a.vx;
  const relVy = b.vy - a.vy;
  const dot = relVx * nx + relVy * ny;
  if (dot > 0) return;

  const restitution = Math.min(a.restitution, b.restitution);
  const totalInvMass = (a.isStatic ? 0 : 1 / a.mass) + (b.isStatic ? 0 : 1 / b.mass);
  if (totalInvMass === 0) return;

  const impulse = -(1 + restitution) * dot / totalInvMass;
  if (!a.isStatic) { a.vx -= impulse / a.mass * nx; a.vy -= impulse / a.mass * ny; }
  if (!b.isStatic) { b.vx += impulse / b.mass * nx; b.vy += impulse / b.mass * ny; }
}

/**
 * 화면 경계 충돌 처리
 * @param {PhysicsBody} body
 * @param {number} width @param {number} height - Canvas 크기
 */
export function boundaryCollision(body, width, height) {
  const hw = body.width / 2;
  const hh = body.height / 2;

  if (body.y + hh > height) {
    body.y = height - hh;
    body.vy = -Math.abs(body.vy) * body.restitution;
    body.vx *= body.friction;
    body.angularVelocity *= 0.8;
  }
  if (body.x - hw < 0) {
    body.x = hw;
    body.vx = Math.abs(body.vx) * body.restitution;
  }
  if (body.x + hw > width) {
    body.x = width - hw;
    body.vx = -Math.abs(body.vx) * body.restitution;
  }
}

/**
 * 오브젝트 배열에서 화면 밖 제거 + 최대 개수 초과분 제거
 * @param {PhysicsBody[]} bodies
 * @param {number} width @param {number} height
 * @param {number} maxCount
 * @returns {PhysicsBody[]}
 */
export function cullBodies(bodies, width, height, maxCount = 200) {
  const inBounds = bodies.filter(b =>
    b.isStatic || (b.y < height + 200 && b.x > -200 && b.x < width + 200)
  );
  if (inBounds.length <= maxCount) return inBounds;

  // 초과 시 비정적 오브젝트 중 가장 오래된 것 제거
  const statics = inBounds.filter(b => b.isStatic);
  const dynamics = inBounds
    .filter(b => !b.isStatic)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(inBounds.length - maxCount);
  return [...statics, ...dynamics];
}
