/**
 * voronoi.js — 보로노이 분열 엔진 순수 함수
 * 클릭 기반 반복 분열 구현 (Fortune's Algorithm 근사)
 */
import { isInsideEdge, lineIntersect, polygonCentroid, polygonArea, randFloat } from '../utils/math.js';

/**
 * 클릭 지점 주변 씨앗 점 생성
 */
export function generateSeeds(cx, cy, radius, count) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + randFloat(-0.4, 0.4);
    const r = radius * randFloat(0.3, 1.0);
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });
}

/**
 * 단방향 하프플레인 클리핑 (Sutherland-Hodgman 단일 엣지)
 * 에지 a→b의 왼쪽(isInsideEdge=true)만 유지
 */
export function clipByHalfPlane(polygon, a, b) {
  if (polygon.length === 0) return [];
  const output = [];
  for (let j = 0; j < polygon.length; j++) {
    const p = polygon[j];
    const q = polygon[(j + 1) % polygon.length];
    const pIn = isInsideEdge(p, a, b);
    const qIn = isInsideEdge(q, a, b);
    if (pIn) output.push(p);
    if (pIn !== qIn) {
      const inter = lineIntersect(p, q, a, b);
      if (inter) output.push(inter);
    }
  }
  return output;
}

/**
 * Sutherland-Hodgman 다각형 클리핑 (테스트용 — 완전한 폴리곤 경계)
 */
export function clipPolygon(subject, clip) {
  if (subject.length === 0 || clip.length < 3) return [...subject];
  let output = [...subject];
  for (let i = 0; i < clip.length; i++) {
    if (output.length === 0) return [];
    output = clipByHalfPlane(output, clip[i], clip[(i + 1) % clip.length]);
  }
  return output;
}

/**
 * 씨앗 s에 대한 보로노이 셀 다각형
 * 각 다른 씨앗에 대해 수직이등분선으로 반복 하프플레인 클리핑
 */
export function voronoiCell(seed, allSeeds, bounds) {
  let cell = [...bounds];

  for (const other of allSeeds) {
    if (other === seed || (Math.abs(other.x - seed.x) < 1e-10 && Math.abs(other.y - seed.y) < 1e-10)) continue;
    if (cell.length === 0) return [];

    // 수직이등분선 위의 두 점
    const mx = (seed.x + other.x) / 2;
    const my = (seed.y + other.y) / 2;
    const dx = other.x - seed.x;
    const dy = other.y - seed.y;

    const perpA = { x: mx - dy * 2000, y: my + dx * 2000 };
    const perpB = { x: mx + dy * 2000, y: my - dx * 2000 };

    // seed가 perpA→perpB의 왼쪽에 있는지 확인하여 방향 결정
    const seedInside = isInsideEdge(seed, perpA, perpB);
    const [edgeA, edgeB] = seedInside ? [perpA, perpB] : [perpB, perpA];

    cell = clipByHalfPlane(cell, edgeA, edgeB);
  }

  return cell;
}

/**
 * 다각형을 보로노이 씨앗 기반으로 분열
 */
export function fracturePolygon(polygon, cx, cy, shardCount = 5) {
  if (polygon.length < 3) return [];
  const approxRadius = Math.sqrt(Math.abs(polygonArea(polygon))) * 0.7;
  const seeds = generateSeeds(cx, cy, Math.max(approxRadius, 20), shardCount);

  return seeds
    .map(seed => voronoiCell(seed, seeds, polygon))
    .filter(cell => cell.length >= 3 && Math.abs(polygonArea(cell)) > 0.5);
}
