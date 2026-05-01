/**
 * easter-egg.js — 이스터에그 트리거 로직 순수 함수
 * Canvas 의존성 없음 (이펙트 실행은 모드 클래스에서 담당)
 */

/**
 * 이스터에그 트리거 정의
 * @type {Record<string, { threshold: number, key: string, description: string }>}
 */
export const EASTER_EGG_TRIGGERS = {
  FRACTURE_FRENZY: {
    key:         'fracture_frenzy',
    threshold:   50,
    description: 'Fracture 50회 달성 → 무지개 폭발',
  },
  SLIME_EYES: {
    key:         'slime_eyes',
    threshold:   1,   // 슬라임 면적이 화면의 80% 이상 차지 시
    description: '슬라임에 눈(👀) 등장',
  },
  TOWER_OF_DOOM: {
    key:         'tower_of_doom',
    threshold:   100,
    description: 'Destroy 블록 100개 누적 생성 → 불꽃놀이',
  },
  RIPPLE_AURORA: {
    key:         'ripple_aurora',
    threshold:   8,
    description: '동시 파동 8개 이상 → 오로라 전환',
  },
};

/**
 * 카운터 기반 이스터에그 트리거 체크
 * @param {string} triggerName - EASTER_EGG_TRIGGERS 키
 * @param {number} currentCount - 현재 카운터 값
 * @param {Set<string>} activated - 이미 발동된 이스터에그 키 집합
 * @returns {boolean} 지금 발동해야 하면 true
 */
export function checkEasterEgg(triggerName, currentCount, activated) {
  const trigger = EASTER_EGG_TRIGGERS[triggerName];
  if (!trigger) return false;
  if (activated.has(trigger.key)) return false;
  return currentCount >= trigger.threshold;
}

/**
 * 재방문 시 이스터에그 발동 임계값 단축 (이미 한 번 발동된 적 있음)
 * @param {string} triggerName
 * @param {boolean} hasSeenBefore
 * @returns {number} 실제 임계값
 */
export function getThreshold(triggerName, hasSeenBefore = false) {
  const trigger = EASTER_EGG_TRIGGERS[triggerName];
  if (!trigger) return Infinity;
  return hasSeenBefore ? Math.ceil(trigger.threshold * 0.5) : trigger.threshold;
}

/**
 * 이스터에그 이펙트 강도 계산 (발동 횟수 기반)
 * 여러 번 발동할수록 더 화려하게
 * @param {number} activationCount - 이 이스터에그 발동 누적 횟수
 * @returns {number} 강도 배수 (1.0 ~ 2.0)
 */
export function easterEggIntensity(activationCount) {
  return Math.min(1.0 + activationCount * 0.25, 2.0);
}
