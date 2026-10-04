/**
 * Small hex color helpers (no '#' prefix — project convention).
 * Used to derive ThemeColors roles from a compact ColorScheme.
 */

export type Rgb = [number, number, number];

const HEX6 = /^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/;

export function parseHex(hex: string): Rgb {
  const raw = hex.startsWith('#') ? hex.slice(1) : hex;
  const m = HEX6.exec(raw);
  if (!m) {
    throw new Error(`Invalid hex color (expected RRGGBB): ${hex}`);
  }
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

export function toHex(r: number, g: number, b: number): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `${c(r)}${c(g)}${c(b)}`;
}

/**
 * Linear mix in sRGB. t=0 → a, t=1 → b.
 */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const k = Math.max(0, Math.min(1, t));
  return toHex(ar + (br - ar) * k, ag + (bg - ag) * k, ab + (bb - ab) * k);
}

/** Relative luminance (WCAG), 0..1 */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isDarkColor(hex: string): boolean {
  return relativeLuminance(hex) < 0.4;
}
