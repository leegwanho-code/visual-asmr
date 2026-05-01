/**
 * synth.js — Web Audio API 음향 합성기
 * 반드시 사용자 첫 제스처 후 init() 호출
 */
export class SoundSynth {
  constructor() {
    this._ctx = null;
    this._masterGain = null;
    this._enabled = false; // 기본 OFF (자동재생 정책)
    this._activeOscs = []; // 동시 최대 8개 제한
  }

  /** 첫 사용자 제스처에서 호출 */
  init() {
    if (this._ctx) return;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    this._masterGain = this._ctx.createGain();
    this._masterGain.gain.value = 0.4;
    this._masterGain.connect(this._ctx.destination);
    // suspended 상태 해제 시도
    if (this._ctx.state === 'suspended') this._ctx.resume();
  }

  toggle() {
    this._enabled = !this._enabled;
    return this._enabled;
  }

  get enabled() { return this._enabled; }

  _ready() {
    return this._ctx && this._enabled && this._ctx.state !== 'closed';
  }

  /** 동시 오실레이터 제한 (8개 초과 시 가장 오래된 것 종료) */
  _registerOsc(osc) {
    this._activeOscs.push(osc);
    osc.onended = () => {
      this._activeOscs = this._activeOscs.filter(o => o !== osc);
    };
    if (this._activeOscs.length > 8) {
      try { this._activeOscs.shift().stop(); } catch (_) { /* 이미 종료됨 */ }
    }
  }

  /** 간단한 오실레이터 노드 생성 헬퍼 */
  _makeOsc(freq, type = 'sine') {
    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(this._masterGain);
    return { osc, gain };
  }

  // ── 모드 1: Fracture ──────────────────────────────────────────────────────

  /**
   * 분열음 — 유리/세라믹 파삭함
   * @param {number} shardCount - 분열 조각 수
   * @param {number} depth - 분열 깊이
   */
  fracture(shardCount, depth = 0) {
    if (!this._ready()) return;
    const now = this._ctx.currentTime;
    const baseFreq = 1000 / Math.pow(1.3, depth);
    const count = Math.min(shardCount, 6);
    for (let i = 0; i < count; i++) {
      const { osc, gain } = this._makeOsc(baseFreq * (0.8 + Math.random() * 0.4), 'sawtooth');
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.start(now);
      osc.stop(now + 0.09);
      this._registerOsc(osc);
    }
    // 저주파 잔향
    const { osc: low, gain: lowG } = this._makeOsc(120, 'sine');
    lowG.gain.setValueAtTime(0.15, now);
    lowG.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    low.start(now + 0.05);
    low.stop(now + 0.22);
    this._registerOsc(low);
  }

  // ── 모드 2: Slime ─────────────────────────────────────────────────────────

  /** 드래그 중 젤리 소리 */
  slimeDrag(speed) { // speed: 0~1
    if (!this._ready()) return;
    const now  = this._ctx.currentTime;
    const freq = 100 - speed * 40;
    const { osc, gain } = this._makeOsc(freq, 'sine');

    // LFO 진폭 떨림
    const lfo = this._ctx.createOscillator();
    const lfoGain = this._ctx.createGain();
    lfo.frequency.value = 6;
    lfoGain.gain.value  = 0.05;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.18);
    lfo.start(now);
    lfo.stop(now + 0.18);
    osc.start(now);
    osc.stop(now + 0.18);
    this._registerOsc(osc);
  }

  /** 손 떼는 순간 "뽀잉" */
  slimeRelease() {
    if (!this._ready()) return;
    const now = this._ctx.currentTime;
    const { osc, gain } = this._makeOsc(200, 'sine');
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.35);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
    this._registerOsc(osc);

    // 뽀글 노이즈
    this._shortNoise(0.04, now + 0.1);
  }

  /** 화이트 노이즈 버스트 */
  _shortNoise(duration, when = 0) {
    if (!this._ready()) return;
    const bufSize = Math.ceil(this._ctx.sampleRate * duration);
    const buf  = this._ctx.createBuffer(1, bufSize, this._ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    const src  = this._ctx.createBufferSource();
    const gain = this._ctx.createGain();
    src.buffer = buf;
    gain.gain.setValueAtTime(0.18, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
    src.connect(gain);
    gain.connect(this._masterGain);
    src.start(when);
  }

  // ── 모드 3: Destroy ───────────────────────────────────────────────────────

  /**
   * 블록 충돌음
   * @param {number} mass - 블록 질량 (충돌 강도 비례)
   */
  blockCollide(mass = 1) {
    if (!this._ready()) return;
    const now  = this._ctx.currentTime;
    const freq = mass > 3 ? 80 : 500;
    const dur  = mass > 3 ? 0.18 : 0.06;
    this._shortNoise(dur, now);
    const { osc, gain } = this._makeOsc(freq, 'sine');
    gain.gain.setValueAtTime(0.2 * Math.min(mass, 5) / 5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur * 1.5);
    osc.start(now);
    osc.stop(now + dur * 1.5);
    this._registerOsc(osc);
  }

  /** 연속 콤보 피치 상승 (도레미파…) */
  comboTick(step) { // step: 0~7
    if (!this._ready()) return;
    const notes = [261, 294, 330, 349, 392, 440, 494, 523];
    const freq  = notes[Math.min(step, notes.length - 1)];
    const now   = this._ctx.currentTime;
    const { osc, gain } = this._makeOsc(freq, 'triangle');
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.12);
    this._registerOsc(osc);
  }

  // ── 모드 4: Ripple ────────────────────────────────────────────────────────

  /**
   * 파동 발생음 — 맑고 공간감 있는 울림
   * @param {number} x - 클릭 X 좌표
   * @param {number} canvasWidth
   */
  ripple(x, canvasWidth) {
    if (!this._ready()) return;
    const now = this._ctx.currentTime;
    const pan = (x / canvasWidth) * 2 - 1;

    for (const freq of [220, 440]) {
      const { osc, gain } = this._makeOsc(freq, 'sine');
      const panner = this._ctx.createStereoPanner();
      panner.pan.value = pan;
      osc.disconnect();
      osc.connect(gain);
      gain.disconnect();
      gain.connect(panner);
      panner.connect(this._masterGain);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
      osc.start(now);
      osc.stop(now + 1.3);
      this._registerOsc(osc);
    }

    // 딜레이 합산 리버브 효과
    this._delayVerb(220, pan, now);
  }

  _delayVerb(freq, pan, when) {
    const { osc, gain } = this._makeOsc(freq * 0.98, 'sine');
    const panner = this._ctx.createStereoPanner();
    panner.pan.value = -pan * 0.5;
    osc.disconnect();
    osc.connect(gain);
    gain.disconnect();
    gain.connect(panner);
    panner.connect(this._masterGain);
    gain.gain.setValueAtTime(0.07, when + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 1.6);
    osc.start(when + 0.12);
    osc.stop(when + 1.6);
    this._registerOsc(osc);
  }

  // ── 이스터에그 ────────────────────────────────────────────────────────────

  /** 이스터에그 발동 팡파레 (C5 E5 G5 C6) */
  easterEggFanfare() {
    if (!this._ready()) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const t = this._ctx.currentTime + i * 0.15;
      const { osc, gain } = this._makeOsc(freq, 'sine');
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
      this._registerOsc(osc);
    });
  }
}
