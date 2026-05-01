import { isInsideEdge, lineIntersect, polygonCentroid, polygonArea, randFloat } from '../utils/math.js';

export function generateSeeds(cx, cy, radius, count) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + randFloat(-0.4, 0.4);
    const r = radius * randFloat(0.3, 1.0);
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });
}

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

export function clipPolygon(subject, clip) {
  if (subject.length === 0 || clip.length < 3) return [...subject];
  let output = [...subject];
  for (let i = 0; i < clip.length; i++) {
    if (output.length === 0) return [];
    output = clipByHalfPlane(output, clip[i], clip[(i + 1) % clip.length]);
  }
  return output;
}

export function voronoiCell(seed, allSeeds, bounds) {
  let cell = [...bounds];
  for (const other of allSeeds) {
    if (other === seed || (Math.abs(other.x - seed.x) < 1e-10 && Math.abs(other.y - seed.y) < 1e-10)) continue;
    if (cell.length === 0) return [];
    const mx = (seed.x + other.x) / 2;
    const my = (seed.y + other.y) / 2;
    const dx = other.x - seed.x;
    const dy = other.y - seed.y;
    const perpA = { x: mx - dy * 2000, y: my + dx * 2000 };
    const perpB = { x: mx + dy * 2000, y: my - dx * 2000 };
    const seedInside = isInsideEdge(seed, perpA, perpB);
    const [edgeA, edgeB] = seedInside ? [perpA, perpB] : [perpB, perpA];
    cell = clipByHalfPlane(cell, edgeA, edgeB);
  }
  return cell;
}

export function fracturePolygon(polygon, cx, cy, shardCount = 5) {
  if (polygon.length < 3) return [];
  const approxRadius = Math.sqrt(Math.abs(polygonArea(polygon))) * 0.7;
  const seeds = generateSeeds(cx, cy, Math.max(approxRadius, 20), shardCount);
  return seeds
    .map(seed => voronoiCell(seed, seeds, polygon))
    .filter(cell => cell.length >= 3 && Math.abs(polygonArea(cell)) > 0.5);
}
