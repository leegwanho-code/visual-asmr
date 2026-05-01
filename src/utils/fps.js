/**
 * fps.js — FPS 모니터 + 델타타임 관리
 */
export class FpsMonitor {
  constructor(sampleSize = 60) {
    this._sampleSize = sampleSize;
    this._times = [];
    this.fps = 0;
  }

  /**
   * 매 프레임 호출 — FPS 업데이트
   * @param {number} now - performance.now() 값
   */
  tick(now) {
    this._times.push(now);
    if (this._times.length > this._sampleSize) this._times.shift();
    if (this._times.length >= 2) {
      const span = this._times[this._times.length - 1] - this._times[0];
      this.fps = Math.round((this._times.length - 1) / span * 1000);
    }
  }

  /** 성능 경고 여부 (30fps 미만) */
  get isLow() { return this.fps > 0 && this.fps < 30; }
}

/**
 * requestAnimationFrame 루프 래퍼
 * 델타타임을 clamp하여 스파이크 방지
 */
export class AnimLoop {
  constructor(callback, maxDt = 100) {
    this._cb = callback;
    this._maxDt = maxDt;
    this._rafId = null;
    this._lastTime = 0;
    this.fps = new FpsMonitor();
  }

  start() {
    const tick = (now) => {
      this._rafId = requestAnimationFrame(tick);
      const dt = this._lastTime === 0 ? 16.67 : Math.min(now - this._lastTime, this._maxDt);
      this._lastTime = now;
      this.fps.tick(now);
      this._cb(dt, now);
    };
    this._rafId = requestAnimationFrame(tick);
  }

  stop() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
      this._lastTime = 0;
    }
  }
}
