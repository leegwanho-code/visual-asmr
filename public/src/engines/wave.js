export function createWaveGrid(cols, rows) {
  return { current: new Float32Array(cols * rows), prev: new Float32Array(cols * rows), cols, rows };
}

export const gridIndex = (col, row, cols) => row * cols + col;

export function addWave(grid, col, row, amplitude = 1, radius = 2) {
  const { cols, rows, current } = grid;
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const r = row + dr, c = col + dc;
      if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
      const d = Math.sqrt(dr * dr + dc * dc);
      if (d <= radius) current[gridIndex(c, r, cols)] += amplitude * (1 - d / radius);
    }
  }
}

export function stepWave(grid, damping = 0.97, speed = 0.15) {
  const { current, prev, cols, rows } = grid;
  const next = new Float32Array(cols * rows);
  const c2 = Math.min(speed, 0.24);
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const i = gridIndex(c, r, cols);
      const lap =
        current[gridIndex(c + 1, r, cols)] + current[gridIndex(c - 1, r, cols)] +
        current[gridIndex(c, r + 1, cols)] + current[gridIndex(c, r - 1, cols)] - 4 * current[i];
      next[i] = (2 * current[i] - prev[i] + c2 * lap) * damping;
    }
  }
  grid.prev.set(grid.current);
  grid.current.set(next);
}

export function gridMaxEnergy(data) {
  let max = 0;
  for (let i = 0; i < data.length; i++) { const v = Math.abs(data[i]); if (v > max) max = v; }
  return max;
}

export function gridTotalEnergy(data) {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += Math.abs(data[i]);
  return sum;
}
