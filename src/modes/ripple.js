/**
 * ripple.js — 모드 4: 파동 연못
 * 이산 파동 방정식 기반 리플 + 간섭 패턴
 */
import { createWaveGrid, addWave, stepWave, gridMaxEnergy, gridIndex } from '../engines/wave.js';
import { rippleGlow } from '../utils/color.js';
import { InputHandler } from '../utils/input.js';

const CELL_SIZE   = 8;  // 픽셀당 격자 크기
const DAMPING     = 0.97;
const WAVE_SPEED  = 0.15;
const MAX_WAVES   = 8;

export class RippleMode {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../audio/synth.js').SoundSynth} synth
   */
  constructor(canvas, ctx, synth) {
    this._canvas  = canvas;
    this._ctx     = ctx;
    this._synth   = synth;
    this._input   = null;
    this._grid    = null;
    this._cols    = 0;
    this._rows    = 0;

    this._activeWaves = 0;    // 동시 파동 추적
    this._auroraActive = false;
    this._auroraTimer  = 0;
    this._hueOffset    = 0;
    this._stepAccum    = 0;   // 파동 업데이트 누산기
  }

  mount() {
    this._buildGrid();
    this._input = new InputHandler(this._canvas);

    this._input.on('pointerdown', (e) => {
      e.preventDefault();
      this._synth?.init();
      const pos = this._input.canvasPos(e);
      this._emitWave(pos.x, pos.y, 1.0);
      this._synth?.ripple(pos.x, this._canvas.width);
    });

    this._input.on('pointermove', (e) => {
      if (e.buttons === 0) return;
      e.preventDefault();
      const pos = this._input.canvasPos(e);
      this._emitWave(pos.x, pos.y, 0.35);
    });
  }

  unmount() {
    this._input?.destroy();
    this._input = null;
    this._grid  = null;
  }

  update(dt) {
    const ctx = this._ctx;
    const W   = this._canvas.width;
    const H   = this._canvas.height;

    // 파동 방정식 업데이트 (16ms마다 1스텝)
    this._stepAccum += dt;
    while (this._stepAccum >= 16) {
      stepWave(this._grid, DAMPING, WAVE_SPEED);
      this._stepAccum -= 16;
    }

    this._hueOffset = (this._hueOffset + dt * 0.02) % 360;

    // 배경
    const maxE  = gridMaxEnergy(this._grid.current);
    const bgHue = this._auroraActive ? this._hueOffset : 200;
    ctx.fillStyle = `hsl(${bgHue.toFixed(0)}, 40%, ${8 + maxE * 12}%)`;
    ctx.fillRect(0, 0, W, H);

    // 파동 격자 렌더링
    this._renderGrid(ctx, W, H, maxE);

    // 오로라 이스터에그 오버레이
    if (this._auroraTimer > 0) {
      this._auroraTimer -= dt;
      this._drawAurora(ctx, W, H);
    }

    // 파동 소멸 추적 (근사)
    if (maxE < 0.01) this._activeWaves = 0;
  }

  // ── private ──────────────────────────────────────────────────────────────

  _buildGrid() {
    const W = this._canvas.width;
    const H = this._canvas.height;
    this._cols = Math.ceil(W / CELL_SIZE);
    this._rows = Math.ceil(H / CELL_SIZE);
    this._grid = createWaveGrid(this._cols, this._rows);
  }

  _emitWave(wx, wy, amplitude) {
    const col = Math.floor(wx / CELL_SIZE);
    const row = Math.floor(wy / CELL_SIZE);
    if (col < 0 || col >= this._cols || row < 0 || row >= this._rows) return;

    addWave(this._grid, col, row, amplitude, 3);
    this._activeWaves++;

    // 이스터에그: 동시 파동 8개 이상
    if (!this._auroraActive && this._activeWaves >= MAX_WAVES) {
      this._auroraActive = true;
      this._auroraTimer  = 5000;
      this._synth?.easterEggFanfare();
    }
  }

  _renderGrid(ctx, W, H, maxEnergy) {
    if (maxEnergy < 0.001) return;
    const { current, cols, rows } = this._grid;
    const norm = maxEnergy > 0 ? 1 / maxEnergy : 0;

    const imageData = ctx.createImageData(W, H);
    const data = imageData.data;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val     = current[gridIndex(c, r, cols)] * norm;
        const abv     = Math.abs(val);
        if (abv < 0.02) continue;

        const hue     = this._auroraActive
          ? (this._hueOffset + c * 2 + r * 1.5) % 360
          : 195 + val * 40;
        const lig     = 40 + abv * 40;
        const alpha   = Math.min(255, abv * 280);

        // 간단한 HSL → RGB 변환
        const [rr, gg, bb] = hslToRgb(hue / 360, 0.8, lig / 100);

        const x0 = c * CELL_SIZE;
        const y0 = r * CELL_SIZE;
        const x1 = Math.min(x0 + CELL_SIZE, W);
        const y1 = Math.min(y0 + CELL_SIZE, H);

        for (let py = y0; py < y1; py++) {
          for (let px = x0; px < x1; px++) {
            const i = (py * W + px) * 4;
            data[i]     = rr;
            data[i + 1] = gg;
            data[i + 2] = bb;
            data[i + 3] = alpha;
          }
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  _drawAurora(ctx, W, H) {
    const fade = Math.min(1, this._auroraTimer / 800);
    for (let i = 0; i < 5; i++) {
      const hue = (this._hueOffset + i * 72) % 360;
      ctx.save();
      ctx.globalAlpha = 0.06 * fade;
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0,   `hsl(${hue}, 90%, 60%)`);
      grad.addColorStop(0.5, `hsl(${(hue + 60) % 360}, 90%, 70%)`);
      grad.addColorStop(1,   `hsl(${(hue + 120) % 360}, 90%, 60%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }
}

/** HSL → [R, G, B] (0~255) */
function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
