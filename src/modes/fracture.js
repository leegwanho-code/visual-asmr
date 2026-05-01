/**
 * fracture.js — 모드 1: 다각형 분열
 * 클릭 → 보로노이 분열 → 물리적으로 퍼져나감 (무한 분열)
 * 길게 누르기(700ms) → 전체 초기화
 */
import { fracturePolygon }                    from '../engines/voronoi.js';
import { createBody, integrateBody, cullBodies } from '../engines/physics.js';
import { cellColor }                           from '../utils/color.js';
import { polygonCentroid, polygonArea, randFloat } from '../utils/math.js';
import { InputHandler }                        from '../utils/input.js';

// 분열 가능 최소 면적 (픽셀²) — 이보다 작으면 더 이상 깨지지 않음
const MIN_FRACTURE_AREA = 180;
const MAX_CELLS   = 500;
const COLOR_CYCLE = 10; // 색상 주기 (depth mod 10으로 팔레트 순환)

export class FractureMode {
  constructor(canvas, ctx, synth) {
    this._canvas = canvas;
    this._ctx    = ctx;
    this._synth  = synth;
    this._input  = null;

    this._fragments    = [];
    this._clickCount   = 0;
    this._eggActivated = false;
    this._rainbowTimer = 0;

    // 전체 초기화용 페이드
    this._clearing    = false;
    this._clearAlpha  = 1.0; // 1 = opaque black, 0 = transparent

    // 길게 누르기 감지
    this._holdTimer   = 0;
    this._holdActive  = false;
    this._holdPos     = null;
  }

  mount() {
    this._fragments = this._buildInitialGrid();
    this._input = new InputHandler(this._canvas);

    this._input.on('pointerdown', (e) => {
      e.preventDefault();
      this._synth?.init();
      const pos = this._input.canvasPos(e);
      this._holdTimer  = 0;
      this._holdActive = true;
      this._holdPos    = pos;
    });

    this._input.on('pointermove', (e) => {
      if (!this._holdActive || !this._holdPos) return;
      const pos = this._input.canvasPos(e);
      const dx = pos.x - this._holdPos.x;
      const dy = pos.y - this._holdPos.y;
      // 10px 이상 이동 시 길게 누르기 취소
      if (dx * dx + dy * dy > 100) {
        this._holdActive = false;
        this._holdTimer  = 0;
      }
    });

    this._input.on('pointerup', (e) => {
      if (this._holdActive && this._holdTimer < 700 && !this._clearing) {
        // 일반 클릭: 분열
        const pos = this._holdPos;
        if (pos) this._handleClick(pos.x, pos.y);
      }
      this._holdActive = false;
      this._holdTimer  = 0;
      this._holdPos    = null;
    });

    this._input.on('pointercancel', () => {
      this._holdActive = false;
      this._holdTimer  = 0;
      this._holdPos    = null;
    });
  }

  unmount() {
    this._input?.destroy();
    this._input = null;
    this._fragments = [];
  }

  update(dt) {
    const ctx = this._ctx;
    const W   = this._canvas.width;
    const H   = this._canvas.height;

    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, W, H);

    // 이스터에그: 무지개 오버레이
    if (this._rainbowTimer > 0) {
      this._rainbowTimer -= dt;
      this._drawRainbow(W, H);
    }

    // 길게 누르기 타이머
    if (this._holdActive && !this._clearing) {
      this._holdTimer += dt;
      if (this._holdTimer >= 700) {
        this._holdActive = false;
        this._startClear();
      } else {
        // 진행률 링 표시 (압력 피드백)
        this._drawHoldRing(ctx, this._holdTimer / 700);
      }
    }

    // 초기화 애니메이션
    if (this._clearing) {
      this._clearAlpha = Math.max(0, this._clearAlpha - dt * 0.005); // ~200ms
      if (this._clearAlpha <= 0) {
        this._fragments   = this._buildInitialGrid();
        this._clearing    = false;
        this._clearAlpha  = 1.0;
        this._clickCount  = 0;
        this._eggActivated = false;
      }
    }

    // 물리 업데이트 + 렌더
    for (const frag of this._fragments) {
      if (!frag.sleeping) {
        integrateBody(frag.body, dt, 0.00015);
        this._checkSleep(frag);
      }

      // 초기화 중: 알파 페이드
      if (this._clearing) {
        ctx.save();
        ctx.globalAlpha = this._clearAlpha;
        this._drawFragment(ctx, frag);
        ctx.restore();
      } else {
        this._drawFragment(ctx, frag);
      }
    }

    // 컬링 (최대 500개 — 초과 시 가장 작은 조각부터 제거)
    if (this._fragments.length > MAX_CELLS) {
      this._fragments.sort((a, b) =>
        Math.abs(polygonArea(b.polygon)) - Math.abs(polygonArea(a.polygon))
      );
      this._fragments = this._fragments.slice(0, MAX_CELLS);
    }
    // 화면 밖 제거
    this._fragments = this._fragments.filter(f => {
      const b = f.body;
      return b.y < H + 300 && b.x > -300 && b.x < W + 300;
    });
  }

  // ── private ──────────────────────────────────────────────────────────────

  _buildInitialGrid() {
    const W = this._canvas.width;
    const H = this._canvas.height;
    const cols = 6, rows = 5;
    const cw = W / cols, ch = H / rows;
    const frags = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cw, y = r * ch;
        frags.push(this._makeFragment([
          { x, y }, { x: x + cw, y }, { x: x + cw, y: y + ch }, { x, y: y + ch },
        ], 0));
      }
    }
    return frags;
  }

  _makeFragment(polygon, depth) {
    const centroid = polygonCentroid(polygon);
    const body = createBody({
      x: centroid.x, y: centroid.y,
      vx: 0, vy: 0,
      restitution: 0.35,
      friction: 0.99,
      width: 10, height: 10,
    });
    // 깊이에 따라 색상 주기적으로 순환 — 무한히 아름다운 색 변화
    const colorDepth = depth % COLOR_CYCLE;
    return {
      polygon,
      body,
      color:    cellColor(colorDepth, COLOR_CYCLE, 'fracture'),
      depth,
      sleeping: false,
      _sleepMs: 0,
    };
  }

  _checkSleep(frag) {
    const b = frag.body;
    const speed = Math.abs(b.vx) + Math.abs(b.vy) + Math.abs(b.angularVelocity);
    if (speed < 0.003) {
      frag._sleepMs += 16; // 근사 타이머
      if (frag._sleepMs > 600) frag.sleeping = true;
    } else {
      frag._sleepMs = 0;
    }
  }

  _handleClick(cx, cy) {
    if (this._clearing) return;

    // 클릭된 프래그먼트 찾기 (맨 위 레이어부터)
    let target = null;
    for (let i = this._fragments.length - 1; i >= 0; i--) {
      if (this._pointInFragment(cx, cy, this._fragments[i])) {
        target = i;
        break;
      }
    }
    if (target === null) return;

    const frag = this._fragments[target];
    const area = Math.abs(polygonArea(frag.polygon));

    // 면적이 너무 작으면 분열 불가 (깊이 제한 없음 — 무한 분열 가능)
    if (area < MIN_FRACTURE_AREA) {
      // 작은 조각은 튕겨냄 (분열 대신 충격)
      const centroid = polygonCentroid(frag.polygon);
      const dx = centroid.x - cx || 1;
      const dy = centroid.y - cy || 0;
      const d  = Math.sqrt(dx * dx + dy * dy) || 1;
      frag.body.vx += (dx / d) * 0.15;
      frag.body.vy += (dy / d) * 0.15 - 0.05;
      frag.sleeping = false;
      frag._sleepMs = 0;
      this._synth?.fracture(1, frag.depth);
      return;
    }

    // 분열
    const shardCount = this._shardCount(area);
    const newPolygons = fracturePolygon(frag.polygon, cx, cy, shardCount);
    if (newPolygons.length === 0) return;

    this._fragments.splice(target, 1);

    for (const poly of newPolygons) {
      const newFrag = this._makeFragment(poly, frag.depth + 1);
      const centroid = polygonCentroid(poly);
      const dx = centroid.x - cx;
      const dy = centroid.y - cy;
      const d  = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = randFloat(0.04, 0.14);
      newFrag.body.vx = (dx / d) * speed;
      newFrag.body.vy = (dy / d) * speed - randFloat(0.02, 0.07);
      newFrag.body.angularVelocity = randFloat(-0.003, 0.003);
      this._fragments.push(newFrag);
    }

    this._synth?.fracture(newPolygons.length, frag.depth);

    this._clickCount++;
    if (!this._eggActivated && this._clickCount >= 50) {
      this._eggActivated = true;
      this._rainbowTimer = 3000;
      this._synth?.easterEggFanfare();
    }
  }

  /** 면적에 비례한 분열 조각 수 (큰 조각 → 더 많이) */
  _shardCount(area) {
    if (area > 20000) return 6;
    if (area > 5000)  return 5;
    if (area > 1000)  return 4;
    return 3;
  }

  _startClear() {
    this._clearing   = true;
    this._clearAlpha = 1.0;
  }

  _pointInFragment(px, py, frag) {
    const poly = this._getWorldPoly(frag);
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      if (((yi > py) !== (yj > py)) &&
          (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  _getWorldPoly(frag) {
    const { body, polygon } = frag;
    const cx0 = polygonCentroid(polygon);
    const cos  = Math.cos(body.rotation);
    const sin  = Math.sin(body.rotation);
    const offX = body.x - cx0.x;
    const offY = body.y - cx0.y;
    return polygon.map(p => {
      const rx = p.x - cx0.x;
      const ry = p.y - cx0.y;
      return {
        x: cos * rx - sin * ry + cx0.x + offX,
        y: sin * rx + cos * ry + cx0.y + offY,
      };
    });
  }

  _drawFragment(ctx, frag) {
    const poly = this._getWorldPoly(frag);
    if (poly.length < 3) return;

    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fillStyle = frag.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  _drawRainbow(W, H) {
    const ctx = this._ctx;
    for (let i = 0; i < 7; i++) {
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = `hsl(${(i / 7) * 360}, 100%, 60%)`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  /** 길게 누르기 진행률 링 (클릭 위치에 원형 진행 표시) */
  _drawHoldRing(ctx, progress) {
    if (!this._holdPos) return;
    const { x, y } = this._holdPos;
    const r = 22;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
    ctx.restore();
  }
}
