export const vecAdd  = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const vecSub  = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const vecScale = (v, s) => ({ x: v.x * s, y: v.y * s });
export const vecDot  = (a, b) => a.x * b.x + a.y * b.y;
export const vecLen  = (v) => Math.sqrt(v.x * v.x + v.y * v.y);
export const vecNorm = (v) => { const l = vecLen(v); return l > 0 ? vecScale(v, 1 / l) : { x: 0, y: 0 }; };
export const vecPerp = (v) => ({ x: -v.y, y: v.x });

export function lineIntersect(p1, p2, p3, p4) {
  const d1 = vecSub(p2, p1);
  const d2 = vecSub(p4, p3);
  const cross = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(cross) < 1e-10) return null;
  const t = ((p3.x - p1.x) * d2.y - (p3.y - p1.y) * d2.x) / cross;
  return { x: p1.x + d1.x * t, y: p1.y + d1.y * t };
}

export function isInsideEdge(point, a, b) {
  return (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x) >= 0;
}

export function polygonArea(polygon) {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  return area / 2;
}

export function polygonCentroid(polygon) {
  const n = polygon.length;
  if (n === 0) return { x: 0, y: 0 };
  const sum = polygon.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / n, y: sum.y / n };
}

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

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutQuad = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
export const randFloat = (min, max) => min + Math.random() * (max - min);
export const randInt = (min, max) => Math.floor(randFloat(min, max + 1));
export const randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const angleToVec = (rad) => ({ x: Math.cos(rad), y: Math.sin(rad) });
export const dist = (a, b) => vecLen(vecSub(a, b));
