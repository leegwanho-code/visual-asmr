/**
 * color.js — 색상 팔레트 및 보간 유틸
 * Canvas 의존성 없음 — 단독 테스트 가능
 */

/** 모드별 색상 팔레트 */
export const MODE_PALETTES = {
  fracture: { startHue: 270, hueRange: 90,  saturation: 80, lightnessMin: 45, lightnessMax: 75 },
  slime:    { startHue: 150, hueRange: 40,  saturation: 85, lightnessMin: 40, lightnessMax: 65 },
  destroy:  { startHue: 20,  hueRange: 60,  saturation: 90, lightnessMin: 50, lightnessMax: 70 },
  ripple:   { startHue: 195, hueRange: 50,  saturation: 75, lightnessMin: 45, lightnessMax: 80 },
};

/**
 * 분열 깊이에 따른 셀 색상 반환
 * @param {number} depth - 현재 깊이 (0 이상)
 * @param {number} maxDepth - 최대 깊이
 * @param {string} modeName - 모드명
 * @returns {string} CSS 색상 문자열
 */
export function cellColor(depth, maxDepth, modeName = 'fracture') {
  const p = MODE_PALETTES[modeName] ?? MODE_PALETTES.fracture;
  const t = maxDepth > 0 ? Math.min(depth / maxDepth, 1) : 0;
  const hue = p.startHue + t * p.hueRange;
  const lightness = p.lightnessMin + t * (p.lightnessMax - p.lightnessMin);
  return `hsl(${hue.toFixed(1)}, ${p.saturation}%, ${lightness.toFixed(1)}%)`;
}

/**
 * 두 HSL 색상 선형 보간
 * @param {{h,s,l}} c1 @param {{h,s,l}} c2 @param {number} t - 0~1
 * @returns {string} CSS hsl() 문자열
 */
export function lerpHSL(c1, c2, t) {
  const h = c1.h + (c2.h - c1.h) * t;
  const s = c1.s + (c2.s - c1.s) * t;
  const l = c1.l + (c2.l - c1.l) * t;
  return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;
}

/**
 * 파동 에너지에 따른 글로우 색상 (ripple 모드)
 * @param {number} energy - 0~1
 * @returns {string} rgba() 문자열
 */
export function rippleGlow(energy) {
  const alpha = Math.min(1, energy * 1.5);
  const blue = Math.round(200 + energy * 55);
  return `rgba(64, ${blue}, 255, ${alpha.toFixed(2)})`;
}

/**
 * 파편 색상 (destroy 모드 — 파편이 날아갈수록 페이드아웃)
 * @param {string} baseColor - 기본 색상 (hsl)
 * @param {number} life - 남은 수명 (0~1, 0에 가까울수록 소멸)
 * @returns {string} hsla() 문자열
 */
export function fragmentColor(baseColor, life) {
  // hsl(...) → hsla(...)
  if (baseColor.startsWith('hsl(')) {
    return baseColor.replace('hsl(', 'hsla(').replace(')', `, ${life.toFixed(2)})`);
  }
  return baseColor;
}

/**
 * 16진수 색상 → {r, g, b}
 * @param {string} hex - '#rrggbb'
 * @returns {{r:number, g:number, b:number}}
 */
export function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

/**
 * rgba 문자열 생성
 * @param {number} r @param {number} g @param {number} b @param {number} a
 * @returns {string}
 */
export const rgba = (r, g, b, a = 1) =>
  `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
