/**
 * ad-timer.js — 광고 노출 타이밍 제어
 * 체류 시간 기반 광고 최적화
 * DOM 의존성 없음 — 단독 테스트 가능
 */

/**
 * 인터스티셜 광고 쿨다운 타이머
 * 모드 전환 시 광고 노출 여부를 결정한다.
 */
export class AdTimer {
  /**
   * @param {number} cooldownMs - 광고 간 최소 간격 (기본 15초)
   * @param {() => number} nowFn - 현재 시각 함수 (테스트용 주입)
   */
  constructor(cooldownMs = 15_000, nowFn = Date.now.bind(Date)) {
    this._cooldown = cooldownMs;
    this._now = nowFn;
    this._lastShown = -cooldownMs; // 초기값: 즉시 노출 가능
    this._sessionStart = this._now();
    this._showCount = 0;
  }

  /**
   * 광고를 노출할 수 있는지 확인
   * @returns {boolean}
   */
  canShow() {
    return (this._now() - this._lastShown) >= this._cooldown;
  }

  /**
   * 광고 노출 기록
   */
  markShown() {
    this._lastShown = this._now();
    this._showCount++;
  }

  /**
   * 다음 광고까지 남은 시간 (ms)
   * @returns {number} 0이면 즉시 노출 가능
   */
  msUntilNext() {
    const elapsed = this._now() - this._lastShown;
    return Math.max(0, this._cooldown - elapsed);
  }

  /**
   * 세션 시작부터 경과 시간 (ms)
   * @returns {number}
   */
  sessionDuration() {
    return this._now() - this._sessionStart;
  }

  /**
   * 세션 내 광고 노출 횟수
   * @returns {number}
   */
  get showCount() {
    return this._showCount;
  }

  /**
   * 5분 이상 체류 시 사이드 광고 추가 노출 허용 여부
   * @returns {boolean}
   */
  canShowBonus() {
    return this.sessionDuration() >= 5 * 60 * 1000;
  }
}

/**
 * 음향 설정 저장/로드 (localStorage 래퍼)
 * 보안: boolean 값만 저장, DOM 삽입 없음
 */
export const SoundPreference = {
  /** @returns {boolean} */
  load() {
    try {
      return localStorage.getItem('va_sound') !== 'false';
    } catch {
      return true; // localStorage 접근 불가 시 기본값 ON
    }
  },
  /** @param {boolean} enabled */
  save(enabled) {
    try {
      localStorage.setItem('va_sound', String(enabled));
    } catch {
      // 무시 (private mode 등)
    }
  },
};

/**
 * 이스터에그 발동 기록 저장/로드
 */
export const EasterEggStore = {
  /** @returns {Set<string>} */
  load() {
    try {
      const raw = localStorage.getItem('va_eggs');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  },
  /** @param {string} key - 이스터에그 식별자 */
  mark(key) {
    try {
      const eggs = this.load();
      eggs.add(key);
      localStorage.setItem('va_eggs', JSON.stringify([...eggs]));
    } catch { /* 무시 */ }
  },
  /** @param {string} key @returns {boolean} */
  has(key) {
    return this.load().has(key);
  },
};
