/**
 * Colour contrast helpers (WCAG 2.x). Used to keep white text readable on the
 * colourful gradients without changing their hue.
 */

function channels(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = channels(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
  const hue = (p: number, q: number, t: number) => {
    const x = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const rgb = s === 0 ? [l, l, l] : [hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3)];
  return `#${rgb.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** WCAG AA for normal-sized text, with a little safety margin. */
export const MIN_TEXT_CONTRAST = 4.6;

/**
 * Darkens a colour (same hue and saturation) just enough for white text on top of it
 * to reach `minRatio`. Colours that are dark enough already are returned unchanged.
 */
export function readableWithWhite(hex: string, minRatio = MIN_TEXT_CONTRAST): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex) || contrastRatio('#FFFFFF', hex) >= minRatio) return hex;
  const [h, s, start] = toHsl(hex);
  for (let l = start; l > 0; l -= 0.005) {
    const candidate = fromHsl(h, s, l);
    if (contrastRatio('#FFFFFF', candidate) >= minRatio) return candidate;
  }
  return '#000000';
}

/** Mixes `color` over `background` with the given opacity (0–1), like a translucent fill. */
export function blend(color: string, background: string, opacity: number): string {
  const top = channels(color);
  const bottom = channels(background);
  return `#${top
    .map((c, i) => Math.round((c * opacity + bottom[i]! * (1 - opacity)) * 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

/**
 * Lightens a colour (same hue) just enough to reach `minRatio` against a dark background.
 * Colours that are readable already are returned unchanged.
 */
export function readableOnDark(hex: string, background: string, minRatio = MIN_TEXT_CONTRAST): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex) || contrastRatio(hex, background) >= minRatio) return hex;
  const [h, s, start] = toHsl(hex);
  for (let l = start; l < 1; l += 0.005) {
    const candidate = fromHsl(h, s, l);
    if (contrastRatio(candidate, background) >= minRatio) return candidate;
  }
  return '#FFFFFF';
}
