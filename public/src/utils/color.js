export const MODE_PALETTES = {
  fracture: { startHue: 270, hueRange: 90,  saturation: 80, lightnessMin: 45, lightnessMax: 75 },
  slime:    { startHue: 150, hueRange: 40,  saturation: 85, lightnessMin: 40, lightnessMax: 65 },
  destroy:  { startHue: 20,  hueRange: 60,  saturation: 90, lightnessMin: 50, lightnessMax: 70 },
  ripple:   { startHue: 195, hueRange: 50,  saturation: 75, lightnessMin: 45, lightnessMax: 80 },
};

export function cellColor(depth, maxDepth, modeName = 'fracture') {
  const p = MODE_PALETTES[modeName] ?? MODE_PALETTES.fracture;
  const t = maxDepth > 0 ? Math.min(depth / maxDepth, 1) : 0;
  const hue = p.startHue + t * p.hueRange;
  const lightness = p.lightnessMin + t * (p.lightnessMax - p.lightnessMin);
  return `hsl(${hue.toFixed(1)}, ${p.saturation}%, ${lightness.toFixed(1)}%)`;
}

export function lerpHSL(c1, c2, t) {
  const h = c1.h + (c2.h - c1.h) * t;
  const s = c1.s + (c2.s - c1.s) * t;
  const l = c1.l + (c2.l - c1.l) * t;
  return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;
}

export function rippleGlow(energy) {
  const alpha = Math.min(1, energy * 1.5);
  const blue = Math.round(200 + energy * 55);
  return `rgba(64, ${blue}, 255, ${alpha.toFixed(2)})`;
}

export function fragmentColor(baseColor, life) {
  if (baseColor.startsWith('hsl(')) {
    return baseColor.replace('hsl(', 'hsla(').replace(')', `, ${life.toFixed(2)})`);
  }
  return baseColor;
}

export function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

export const rgba = (r, g, b, a = 1) => `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
