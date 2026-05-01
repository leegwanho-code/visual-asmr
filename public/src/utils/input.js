export class InputHandler {
  constructor(canvas) {
    this._canvas = canvas;
    this._listeners = [];
    this.pointers = new Map();
  }

  on(event, handler, options = { passive: false }) {
    this._canvas.addEventListener(event, handler, options);
    this._listeners.push([event, handler, options]);
    return this;
  }

  canvasPos(e) {
    const rect = this._canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this._canvas.width  / rect.width),
      y: (e.clientY - rect.top)  * (this._canvas.height / rect.height),
    };
  }

  trackPointers() {
    this.on('pointerdown', (e) => {
      const pos = this.canvasPos(e);
      this.pointers.set(e.pointerId, { x: pos.x, y: pos.y, pressure: e.pressure ?? 1 });
    });
    this.on('pointermove', (e) => {
      if (this.pointers.has(e.pointerId)) {
        const pos = this.canvasPos(e);
        this.pointers.set(e.pointerId, { x: pos.x, y: pos.y, pressure: e.pressure ?? 1 });
      }
    });
    this.on('pointerup',     (e) => this.pointers.delete(e.pointerId));
    this.on('pointercancel', (e) => this.pointers.delete(e.pointerId));
    return this;
  }

  destroy() {
    for (const [event, handler, options] of this._listeners) {
      this._canvas.removeEventListener(event, handler, options);
    }
    this._listeners = [];
    this.pointers.clear();
  }
}
