/**
 * slime.js — 점탄성 스프링 메쉬 엔진 (Verlet integration)
 * Canvas 의존성 없음 — 단독 테스트 가능
 */

/**
 * 슬라임 메쉬 생성
 * @param {number} cols @param {number} rows
 * @param {number} originX @param {number} originY - 좌상단 좌표
 * @param {number} cellW @param {number} cellH - 셀 크기
 * @returns {SlimeMesh}
 */
export function createSlimeMesh(cols, rows, originX, originY, cellW, cellH) {
  const particles = [];
  for (let r = 0; r <= rows; r++) {
    particles[r] = [];
    for (let c = 0; c <= cols; c++) {
      const rx = originX + c * cellW;
      const ry = originY + r * cellH;
      particles[r][c] = {
        x: rx, y: ry,   // 현재 위치
        px: rx, py: ry, // 이전 위치 (Verlet)
        ox: rx, oy: ry, // 기준 위치 (스프링 목표)
        fx: 0, fy: 0,   // 누적 힘
      };
    }
  }
  return { particles, cols, rows, cellW, cellH, originX, originY };
}

/**
 * Verlet 적분으로 메쉬 업데이트
 * @param {SlimeMesh} mesh
 * @param {number} dt - 델타타임 (ms)
 * @param {number} stiffness - 스프링 강성 (0~1)
 * @param {number} damping - 감쇠 (0~1)
 */
export function stepSlime(mesh, dt, stiffness = 0.08, damping = 0.88) {
  const t = Math.min(dt, 50) / 16.67; // 정규화 타임스텝
  const { particles, rows, cols } = mesh;

  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const p = particles[r][c];

      // 기준 위치로 복원하는 스프링 힘
      const springFx = (p.ox - p.x) * stiffness;
      const springFy = (p.oy - p.y) * stiffness;

      // Verlet 적분
      const ax = p.fx + springFx;
      const ay = p.fy + springFy;
      const nx = p.x + (p.x - p.px) * damping + ax * t * t;
      const ny = p.y + (p.y - p.py) * damping + ay * t * t;

      p.px = p.x;
      p.py = p.y;
      p.x  = nx;
      p.y  = ny;
      p.fx = 0;
      p.fy = 0;
    }
  }
}

/**
 * 특정 위치 주변 파티클에 힘 적용 (드래그 상호작용)
 * @param {SlimeMesh} mesh
 * @param {number} wx @param {number} wy - 월드 좌표
 * @param {number} fx @param {number} fy - 힘 벡터
 * @param {number} radius - 영향 반경 (픽셀)
 */
export function applyForce(mesh, wx, wy, fx, fy, radius = 60) {
  const { particles, rows, cols } = mesh;
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const p = particles[r][c];
      const dx = p.x - wx;
      const dy = p.y - wy;
      const d2 = dx * dx + dy * dy;
      if (d2 < radius * radius) {
        const falloff = 1 - Math.sqrt(d2) / radius;
        p.fx += fx * falloff;
        p.fy += fy * falloff;
      }
    }
  }
}

/**
 * 메쉬 기준 위치 재설정 (Canvas 리사이즈 시)
 * @param {SlimeMesh} mesh
 * @param {number} originX @param {number} originY
 * @param {number} cellW @param {number} cellH
 */
export function resetMesh(mesh, originX, originY, cellW, cellH) {
  const { particles, rows, cols } = mesh;
  mesh.originX = originX;
  mesh.originY = originY;
  mesh.cellW   = cellW;
  mesh.cellH   = cellH;
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const rx = originX + c * cellW;
      const ry = originY + r * cellH;
      const p = particles[r][c];
      p.x = p.px = p.ox = rx;
      p.y = p.py = p.oy = ry;
    }
  }
}

/**
 * 메쉬의 최대 변형량 (복원 완료 판정용)
 * @param {SlimeMesh} mesh
 * @returns {number}
 */
export function meshMaxDisplacement(mesh) {
  const { particles, rows, cols } = mesh;
  let max = 0;
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const p = particles[r][c];
      const d2 = (p.x - p.ox) ** 2 + (p.y - p.oy) ** 2;
      if (d2 > max) max = d2;
    }
  }
  return Math.sqrt(max);
}
