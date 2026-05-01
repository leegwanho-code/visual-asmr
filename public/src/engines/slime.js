export function createSlimeMesh(cols, rows, originX, originY, cellW, cellH) {
  const particles = [];
  for (let r = 0; r <= rows; r++) {
    particles[r] = [];
    for (let c = 0; c <= cols; c++) {
      const rx = originX + c * cellW, ry = originY + r * cellH;
      particles[r][c] = { x: rx, y: ry, px: rx, py: ry, ox: rx, oy: ry, fx: 0, fy: 0 };
    }
  }
  return { particles, cols, rows, cellW, cellH, originX, originY };
}

export function stepSlime(mesh, dt, stiffness = 0.08, damping = 0.88) {
  const t = Math.min(dt, 50) / 16.67;
  const { particles, rows, cols } = mesh;
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const p = particles[r][c];
      const springFx = (p.ox - p.x) * stiffness;
      const springFy = (p.oy - p.y) * stiffness;
      const ax = p.fx + springFx, ay = p.fy + springFy;
      const nx = p.x + (p.x - p.px) * damping + ax * t * t;
      const ny = p.y + (p.y - p.py) * damping + ay * t * t;
      p.px = p.x; p.py = p.y;
      p.x = nx;   p.y = ny;
      p.fx = 0;   p.fy = 0;
    }
  }
}

export function applyForce(mesh, wx, wy, fx, fy, radius = 60) {
  const { particles, rows, cols } = mesh;
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const p = particles[r][c];
      const dx = p.x - wx, dy = p.y - wy;
      const d2 = dx * dx + dy * dy;
      if (d2 < radius * radius) {
        const falloff = 1 - Math.sqrt(d2) / radius;
        p.fx += fx * falloff;
        p.fy += fy * falloff;
      }
    }
  }
}

export function resetMesh(mesh, originX, originY, cellW, cellH) {
  const { particles, rows, cols } = mesh;
  mesh.originX = originX; mesh.originY = originY;
  mesh.cellW = cellW;     mesh.cellH = cellH;
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const rx = originX + c * cellW, ry = originY + r * cellH;
      const p = particles[r][c];
      p.x = p.px = p.ox = rx;
      p.y = p.py = p.oy = ry;
    }
  }
}

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
