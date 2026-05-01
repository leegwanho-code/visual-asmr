/**
 * destroy.js — 모드 3: 물리 파괴
 * 블록 쌓기 + 클릭으로 부수기
 */
import { createBody, integrateBody, detectAABB, resolveCollision, boundaryCollision, cullBodies } from '../engines/physics.js';
import { cellColor } from '../utils/color.js';
import { InputHandler } from '../utils/input.js';
import { randFloat, randInt } from '../utils/math.js';

const MAX_BODIES      = 200;
const BLOCK_W         = 50;
const BLOCK_H         = 28;
const GRAVITY         = 0.0005;
const COLLISION_ITERS = 4;
const COMBO_WINDOW    = 700;  // ms — 이 시간 안에 다음 충격이 없으면 콤보 종료
const COMBO_DEBOUNCE  = 80;   // ms — 연속 미세충돌 무시 간격

// 콤보 단계별 색상
const COMBO_COLORS = ['#ffffff', '#ffffff', '#ffe033', '#ff9933', '#ff4422', '#cc33ff'];

export class DestroyMode {
  constructor(canvas, ctx, synth) {
    this._canvas  = canvas;
    this._ctx     = ctx;
    this._synth   = synth;
    this._input   = null;
    this._bodies  = [];

    this._totalCreated = 0;
    this._eggFired     = false;
    this._shakeTimer   = 0;
    this._shakeX       = 0;
    this._shakeY       = 0;

    // 소리 쓰로틀
    this._soundCooldown   = 0;
    this._soundsThisFrame = 0;

    // 콤보 상태
    this._comboCount     = 0;
    this._comboTimer     = 0;   // 남은 윈도우 (ms)
    this._comboPulse     = 0;   // 펄스 애니메이션 (1.0→0)
    this._lastComboTime  = -Infinity;
    this._chainText      = '';  // 콤보 종료 시 잔상 ("5× CHAIN!")
    this._chainTextTimer = 0;
  }

  mount() {
    this._bodies = this._buildStack();
    this._input  = new InputHandler(this._canvas);

    this._input.on('pointerdown', (e) => {
      e.preventDefault();
      this._synth?.init();
      const pos = this._input.canvasPos(e);
      this._handleInteraction(pos.x, pos.y, true);
    });

    this._input.on('pointermove', (e) => {
      if (e.buttons === 0) return;
      e.preventDefault();
      const pos = this._input.canvasPos(e);
      this._handleInteraction(pos.x, pos.y, false);
    });
  }

  unmount() {
    this._input?.destroy();
    this._input = null;
    this._bodies = [];
  }

  update(dt) {
    const ctx = this._ctx;
    const W   = this._canvas.width;
    const H   = this._canvas.height;

    // 화면 흔들기
    if (this._shakeTimer > 0) {
      this._shakeTimer -= dt;
      this._shakeX = (Math.random() - 0.5) * 5 * (this._shakeTimer / 800);
      this._shakeY = (Math.random() - 0.5) * 4 * (this._shakeTimer / 800);
    } else {
      this._shakeX = 0; this._shakeY = 0;
    }

    ctx.save();
    if (this._shakeX || this._shakeY) ctx.translate(this._shakeX, this._shakeY);

    ctx.fillStyle = '#1a0d00';
    ctx.fillRect(-10, -10, W + 20, H + 20);

    // 1. 적분
    for (const b of this._bodies) {
      integrateBody(b, dt, GRAVITY);
      boundaryCollision(b, W, H);
    }

    // 2. 충돌 해소 + 콤보 판정
    this._soundCooldown   -= dt;
    this._soundsThisFrame  = 0;
    const now = performance.now();

    for (let pass = 0; pass < COLLISION_ITERS; pass++) {
      for (let i = 0; i < this._bodies.length; i++) {
        for (let j = i + 1; j < this._bodies.length; j++) {
          const bi  = this._bodies[i];
          const bj  = this._bodies[j];
          const col = detectAABB(bi, bj);
          if (!col) continue;

          if (pass === 0) {
            const relVn = (bj.vx - bi.vx) * col.nx + (bj.vy - bi.vy) * col.ny;
            const isRealHit = relVn < -0.08;

            // 소리 (쓰로틀)
            if (isRealHit && this._soundsThisFrame < 2 && this._soundCooldown <= 0) {
              this._soundCooldown = 120;
              this._soundsThisFrame++;
              this._synth?.blockCollide(Math.max(bi.mass, bj.mass));
            }

            // 콤보 — 디바운스 80ms, 실제 속도 충돌에만 반응
            if (isRealHit && (now - this._lastComboTime) > COMBO_DEBOUNCE) {
              this._lastComboTime = now;
              this._comboCount++;
              this._comboTimer = COMBO_WINDOW;
              this._comboPulse = 1.0; // 펄스 시작

              // 3콤보 이상부터 음계 상승
              if (this._comboCount >= 3) {
                this._synth?.comboTick(Math.min(this._comboCount - 3, 7));
              }
            }
          }

          resolveCollision(bi, bj, col);
        }
      }
    }

    // 콤보 윈도우 타이머
    if (this._comboCount > 0) {
      this._comboTimer -= dt;
      if (this._comboTimer <= 0) {
        // 콤보 종료 — 5 이상이면 잔상 표시
        if (this._comboCount >= 5) {
          this._chainText      = `${this._comboCount}× CHAIN!`;
          this._chainTextTimer = 1400;
        }
        this._comboCount = 0;
        this._comboPulse = 0;
      }
    }

    // 펄스 감쇠
    this._comboPulse     = Math.max(0, this._comboPulse - dt * 0.006);
    this._chainTextTimer = Math.max(0, this._chainTextTimer - dt);

    // 3. 렌더
    this._drawGround(ctx, W, H);
    for (const b of this._bodies) {
      if (!b.isStatic) this._drawBody(ctx, b);
    }
    this._drawComboHUD(ctx, W, H);

    ctx.restore();

    // 컬링
    this._bodies = cullBodies(this._bodies, W, H, MAX_BODIES);

    // 이스터에그
    if (!this._eggFired && this._totalCreated >= 100) {
      this._eggFired   = true;
      this._shakeTimer = 1000;
      this._synth?.easterEggFanfare();
      this._spawnFireworks(W, H);
    }
  }

  // ── private ──────────────────────────────────────────────────────────────

  _buildStack() {
    const W     = this._canvas.width;
    const H     = this._canvas.height;
    const floor = H - 2;

    const ground = createBody({
      x: W / 2, y: floor + 6,
      width: W * 2, height: 12,
      isStatic: true,
    });

    const bodies = [ground];
    const cols   = Math.floor((W - 40) / (BLOCK_W + 6));
    const rows   = 4;
    const startX = (W - cols * (BLOCK_W + 6)) / 2 + BLOCK_W / 2;

    for (let r = 0; r < rows; r++) {
      const offsetX = (r % 2) * (BLOCK_W / 2 + 3);
      for (let c = 0; c < cols; c++) {
        const bx = startX + c * (BLOCK_W + 6) + offsetX;
        const by = floor - BLOCK_H / 2 - r * (BLOCK_H + 2);
        if (bx + BLOCK_W / 2 > W - 20) continue;

        bodies.push(createBody({
          x: bx, y: by,
          width: BLOCK_W, height: BLOCK_H,
          mass: 1.2, restitution: 0.25, friction: 0.97,
          color: cellColor(r, rows, 'destroy'),
        }));
        this._totalCreated++;
      }
    }
    return bodies;
  }

  _handleInteraction(cx, cy, isClick) {
    const H   = this._canvas.height;
    const hitR = isClick ? 70 : 40;
    const str  = isClick ? 1.0 : 0.4;
    let   hit  = 0;

    for (const b of this._bodies) {
      if (b.isStatic) continue;
      const dx = b.x - cx, dy = b.y - cy;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < hitR) {
        const f = (1 - d / hitR) * str;
        b.vx += (dx / (d || 1)) * f * 0.35;
        b.vy += (dy / (d || 1)) * f * 0.35 - f * 0.12;
        b.angularVelocity += randFloat(-0.004, 0.004) * f;
        hit++;
      }
    }

    if (isClick && hit === 0 && cy > 50 && cy < H - 30) {
      const body = createBody({
        x: cx, y: cy,
        vx: randFloat(-0.04, 0.04), vy: randFloat(-0.18, -0.06),
        width:  BLOCK_W + randFloat(-8, 16),
        height: BLOCK_H + randFloat(-4, 8),
        mass: 1 + Math.random() * 0.5,
        restitution: 0.3,
        color: cellColor(randInt(0, 3), 4, 'destroy'),
      });
      body.angularVelocity = randFloat(-0.003, 0.003);
      this._bodies.push(body);
      this._totalCreated++;
      this._synth?.blockCollide(body.mass);
    }
  }

  _spawnFireworks(W, H) {
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const speed = randFloat(0.12, 0.28);
      this._bodies.push(createBody({
        x: W / 2, y: H * 0.4,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 0.15,
        width: 14, height: 14,
        mass: 0.4, restitution: 0.5,
        color: cellColor(randInt(0, 4), 4, 'destroy'),
      }));
      this._totalCreated++;
    }
  }

  _drawGround(ctx, W, H) {
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(0, H - 8, W, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, H - 8, W, 2);
  }

  _drawBody(ctx, b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rotation);
    const hw = b.width / 2, hh = b.height / 2;
    const color = b.color ?? cellColor(0, 4, 'destroy');

    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(-hw, -hh, b.width, b.height, 3); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.roundRect(-hw + 2, -hh + 2, b.width - 4, hh - 2, 2); ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(-hw, -hh, b.width, b.height, 3); ctx.stroke();
    ctx.restore();
  }

  _drawComboHUD(ctx, W, H) {
    // ── 활성 콤보 ─────────────────────────────────────────────────────────
    if (this._comboCount >= 2) {
      const level   = Math.min(this._comboCount - 1, COMBO_COLORS.length - 1);
      const color   = COMBO_COLORS[level];
      const pulse   = 1 + this._comboPulse * 0.45;   // 최대 1.45×
      const alpha   = 0.55 + Math.min(this._comboTimer / COMBO_WINDOW, 1) * 0.45;
      const baseSize = Math.min(28 + this._comboCount * 3, 72);
      const size    = baseSize * pulse;

      ctx.save();
      ctx.globalAlpha  = alpha;
      ctx.fillStyle    = color;
      ctx.font         = `900 ${size.toFixed(0)}px sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';

      // 글로우 효과 (콤보 높을수록 강하게)
      if (this._comboCount >= 5) {
        ctx.shadowColor = color;
        ctx.shadowBlur  = 18 + this._comboCount * 2;
      }

      ctx.fillText(`${this._comboCount}×`, W / 2, H * 0.38);

      // 콤보 바 (윈도우 잔여 시간 시각화)
      const barW  = Math.min(160, W * 0.4);
      const barH  = 4;
      const barX  = W / 2 - barW / 2;
      const barY  = H * 0.38 + size * 0.6;
      const fill  = Math.max(0, this._comboTimer / COMBO_WINDOW);

      ctx.shadowBlur  = 0;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle   = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 2); ctx.fill();

      ctx.globalAlpha = alpha;
      ctx.fillStyle   = color;
      ctx.beginPath(); ctx.roundRect(barX, barY, barW * fill, barH, 2); ctx.fill();

      ctx.restore();
    }

    // ── 종료 잔상 ─────────────────────────────────────────────────────────
    if (this._chainTextTimer > 0 && this._chainText) {
      const t     = this._chainTextTimer / 1400;
      const scale = 1 + (1 - t) * 0.3;   // 점점 커지며 사라짐
      ctx.save();
      ctx.globalAlpha  = t * t;
      ctx.fillStyle    = COMBO_COLORS[COMBO_COLORS.length - 1];
      ctx.font         = `900 ${(32 * scale).toFixed(0)}px sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor  = COMBO_COLORS[COMBO_COLORS.length - 1];
      ctx.shadowBlur   = 24;
      ctx.fillText(this._chainText, W / 2, H * 0.38 - 20 * (1 - t));
      ctx.restore();
    }
  }
}
