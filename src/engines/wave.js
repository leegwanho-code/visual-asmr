/**
 * wave.js — 파동 시뮬레이션 엔진
 * 2D 격자 기반 파동 방정식 근사
 * Canvas 의존성 없음
 */

/**
 * 파동 격자 생성
 * @param {number} cols @param {number} rows
 * @returns {{ current: Float32Array, prev: Float32Array, cols: number, rows: number }}
 */
export function createWaveGrid(cols, rows) {
  return {
    current: new Float32Array(cols * rows),
    prev:    new Float32Array(cols * rows),
    cols,
    rows,
  };
}

/**
 * 격자 인덱스 계산
 * @param {number} col @param {number} row @param {number} cols
 */
export const gridIndex = (col, row, cols) => row * cols + col;

/**
 * 특정 위치에 파동 발생
 * @param {{ current: Float32Array }} grid
 * @param {number} col @param {number} row
 * @param {number} amplitude - 진폭 (0~1)
 * @param {number} radius - 발생 반경 (격자 셀 단위)
 */
export function addWave(grid, col, row, amplitude = 1, radius = 2) {
  const { cols, rows, current } = grid;
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
      const d = Math.sqrt(dr * dr + dc * dc);
      if (d <= radius) {
        current[gridIndex(c, r, cols)] += amplitude * (1 - d / radius);
      }
    }
  }
}

/**
 * 파동 격자 한 스텝 업데이트 (이산 파동 방정식)
 * @param {{ current: Float32Array, prev: Float32Array, cols: number, rows: number }} grid
 * @param {number} damping - 감쇠 계수 (0.96 ~ 0.99)
 * @param {number} speed - 파동 속도 계수 (0.1 ~ 0.5)
 */
export function stepWave(grid, damping = 0.97, speed = 0.15) {
  const { current, prev, cols, rows } = grid;
  const next = new Float32Array(cols * rows);
  // 안정 조건: speed < 0.25 (CFL condition in 2D, 4-neighbor)
  const c2 = Math.min(speed, 0.24);

  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const i = gridIndex(c, r, cols);
      const lap =
        current[gridIndex(c + 1, r, cols)] +
        current[gridIndex(c - 1, r, cols)] +
        current[gridIndex(c, r + 1, cols)] +
        current[gridIndex(c, r - 1, cols)] -
        4 * current[i];
      next[i] = (2 * current[i] - prev[i] + c2 * lap) * damping;
    }
  }

  grid.prev.set(grid.current);
  grid.current.set(next);
}

/**
 * 격자 값의 최대 에너지 (렌더링 정규화용)
 * @param {Float32Array} data
 * @returns {number}
 */
export function gridMaxEnergy(data) {
  let max = 0;
  for (let i = 0; i < data.length; i++) {
    const v = Math.abs(data[i]);
    if (v > max) max = v;
  }
  return max;
}

/**
 * 격자 전체 에너지 합산 (소멸 판정용)
 * @param {Float32Array} data
 * @returns {number}
 */
export function gridTotalEnergy(data) {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += Math.abs(data[i]);
  return sum;
}
