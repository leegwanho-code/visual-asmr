/**
 * slime-mode.js — 모드 2: 슬라임 드래그
 * Verlet 스프링 메쉬로 점탄성 변형 구현
 */
import { createSlimeMesh, stepSlime, applyForce, resetMesh } from '../engines/slime.js';
import { InputHandler } from '../utils/input.js';

const COLS = 24;
const ROWS = 18;

export class SlimeMode {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../audio/synth.js').SoundSynth} synth
   */
  constructor(canvas, ctx, synth) {
    this._canvas = canvas;
    this._ctx    = ctx;
    this._synth  = synth;
    this._input  = null;
    this._mesh   = null;

    this._dragging      = false;
    this._lastDragPos   = null;
    this._dragFrames    = 0;
    this._soundThrottle = 0;
  }

  mount() {
    this._buildMesh();
    this._input = new InputHandler(this._canvas);

    this._input.on('pointerdown', (e) => {
      e.preventDefault();
      this._synth?.init();
      this._dragging = true;
      this._lastDragPos = this._input.canvasPos(e);
    });

    this._input.on('pointermove', (e) => {
      if (!this._dragging) return;
      e.preventDefault();
      const pos = this._input.canvasPos(e);
      this._applyDrag(pos);
      this._lastDragPos = pos;
    });

    this._input.on('pointerup', (e) => {
      if (this._dragging) {
        this._dragging = false;
        this._lastDragPos = null;
        this._dragFrames = 0;
        this._synth?.slimeRelease();
      }
    });

    this._input.on('pointercancel', () => {
      this._dragging = false;
      this._lastDragPos = null;
    });
  }

  unmount() {
    this._input?.destroy();
    this._input = null;
    this._mesh  = null;
  }

  update(dt) {
    const ctx = this._ctx;
    const W   = this._canvas.width;
    const H   = this._canvas.height;

    // 배경
    ctx.fillStyle = '#0a1a0a';
    ctx.fillRect(0, 0, W, H);

    if (!this._mesh) return;

    stepSlime(this._mesh, dt, 0.06, 0.90);

    this._drawSlime(ctx, W, H);

    if (this._dragging && this._lastDragPos) {
      this._dragFrames++;
      this._soundThrottle -= dt;
      if (this._soundThrottle <= 0) {
        this._soundThrottle = 120;
        this._synth?.slimeDrag(0.5);
      }
    }
  }

  // ── private ──────────────────────────────────────────────────────────────

  _buildMesh() {
    const W = this._canvas.width;
    const H = this._canvas.height;
    const pad = 20;
    this._mesh = createSlimeMesh(
      COLS, ROWS,
      pad, pad,
      (W - pad * 2) / COLS,
      (H - pad * 2) / ROWS,
    );
  }

  _applyDrag(pos) {
    if (!this._lastDragPos || !this._mesh) return;
    const fx = (pos.x - this._lastDragPos.x) * 0.6;
    const fy = (pos.y - this._lastDragPos.y) * 0.6;
    applyForce(this._mesh, pos.x, pos.y, fx, fy, 80);
  }

  _drawSlime(ctx, W, H) {
    const { particles, cols, rows } = this._mesh;
    const hueShift = (Date.now() / 40) % 360;

    // 각 셀을 사각형으로 렌더링
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tl = particles[r][c];
        const tr = particles[r][c + 1];
        const bl = particles[r + 1][c];
        const br = particles[r + 1][c + 1];

        // 변형량 기반 색상
        const dx = tl.x - tl.ox;
        const dy = tl.y - tl.oy;
        const deform = Math.min(1, Math.sqrt(dx * dx + dy * dy) / 60);
        const hue = (150 + hueShift * 0.1 + deform * 40) % 360;
        const sat = 75 + deform * 15;
        const lig = 42 + deform * 18;

        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y);
        ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.closePath();
        ctx.fillStyle = `hsl(${hue.toFixed(0)}, ${sat.toFixed(0)}%, ${lig.toFixed(0)}%)`;
        ctx.fill();

        // 그리드 선 (가볍게)
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

  }
}
