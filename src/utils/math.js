/**
 * math.js — 벡터/기하학 순수 함수
 * Canvas 의존성 없음 — 단독 테스트 가능
 */

// ── 벡터 연산 ─────────────────────────────────────────────────────────────

/** @param {{x,y}} a @param {{x,y}} b @returns {{x,y}} */
export const vecAdd  = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const vecSub  = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const vecScale = (v, s) => ({ x: v.x * s, y: v.y * s });
export const vecDot  = (a, b) => a.x * b.x + a.y * b.y;
export const vecLen  = (v) => Math.sqrt(v.x * v.x + v.y * v.y);
export const vecNorm = (v) => {
  const l = vecLen(v);
  return l > 0 ? vecScale(v, 1 / l) : { x: 0, y: 0 };
};
export const vecPerp = (v) => ({ x: -v.y, y: v.x });

/**
 * 두 선분의 교차점 계산
 * @param {{x,y}} p1 @param {{x,y}} p2 - 선분 1
 * @param {{x,y}} p3 @param {{x,y}} p4 - 선분 2
 * @returns {{x,y}|null}
 */
export function lineIntersect(p1, p2, p3, p4) {
  const d1 = vecSub(p2, p1);
  const d2 = vecSub(p4, p3);
  const cross = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(cross) < 1e-10) return null; // 평행

  const t = ((p3.x - p1.x) * d2.y - (p3.y - p1.y) * d2.x) / cross;
  return { x: p1.x + d1.x * t, y: p1.y + d1.y * t };
}

/**
 * 점이 에지(a→b) 왼쪽에 있는지 판별 (Sutherland-Hodgman용)
 */
export function isInsideEdge(point, a, b) {
  return (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x) >= 0;
}

// ── 다각형 유틸 ───────────────────────────────────────────────────────────

/**
 * 다각형 넓이 (Shoelace Formula)
 * @param {Array<{x,y}>} polygon
 * @returns {number} 양수 = CCW, 음수 = CW
 */
export function polygonArea(polygon) {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  return area / 2;
}

/**
 * 다각형 무게중심
 * @param {Array<{x,y}>} polygon
 * @returns {{x,y}}
 */
export function polygonCentroid(polygon) {
  const n = polygon.length;
  if (n === 0) return { x: 0, y: 0 };
  const sum = polygon.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / n, y: sum.y / n };
}

/**
 * 점이 다각형 내부에 있는지 판별 (Ray casting)
 * @param {{x,y}} point
 * @param {Array<{x,y}>} polygon
 * @returns {boolean}
 */
export function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

// ── 보간 ─────────────────────────────────────────────────────────────────

/** 선형 보간 */
export const lerp = (a, b, t) => a + (b - a) * t;

/** 값을 [min, max] 범위로 클램프 */
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/** Ease out cubic */
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/** Ease in-out quad */
export const easeInOutQuad = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// ── 랜덤 유틸 ────────────────────────────────────────────────────────────

/** min 이상 max 미만 랜덤 실수 */
export const randFloat = (min, max) => min + Math.random() * (max - min);

/** min 이상 max 이하 랜덤 정수 */
export const randInt = (min, max) => Math.floor(randFloat(min, max + 1));

/** 배열에서 랜덤 요소 선택 */
export const randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** 주어진 각도 방향의 단위 벡터 */
export const angleToVec = (rad) => ({ x: Math.cos(rad), y: Math.sin(rad) });

/** 두 점 사이 거리 */
export const dist = (a, b) => vecLen(vecSub(a, b));
