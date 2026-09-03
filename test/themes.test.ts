import { describe, it, expect } from 'vitest';
import {
  getTheme,
  themes,
  cleanTheme,
  academicTheme,
  darkTheme,
  businessTheme,
  warmTheme,
  auroraTheme,
  neonTheme,
  nordTheme,
  draculaTheme,
  beigeTheme,
  inkTheme,
} from '../src/themes/index.js';

const HEX = /^[0-9A-Fa-f]{6}$/;

describe('Theme System', () => {
  it('should export all preset themes', () => {
    for (const theme of [
      cleanTheme,
      academicTheme,
      darkTheme,
      businessTheme,
      warmTheme,
      auroraTheme,
      neonTheme,
      nordTheme,
      draculaTheme,
      beigeTheme,
      inkTheme,
    ]) {
      expect(themes[theme.name]).toBeDefined();
      expect(theme.name).toBe(theme.name.toLowerCase());
    }
    expect(cleanTheme.name).toBe('clean');
    expect(academicTheme.name).toBe('academic');
    expect(darkTheme.name).toBe('dark');
    expect(businessTheme.name).toBe('business');
    expect(warmTheme.name).toBe('warm');
  });

  it('should define valid hex colors on every theme', () => {
    for (const theme of Object.values(themes)) {
      const c = theme.colors;
      expect(HEX.test(c.primary)).toBe(true);
      expect(HEX.test(c.secondary)).toBe(true);
      expect(HEX.test(c.background)).toBe(true);
      expect(HEX.test(c.text)).toBe(true);
      expect(HEX.test(c.accent)).toBe(true);
      expect(HEX.test(c.codeBackground)).toBe(true);
      expect(HEX.test(c.codeText)).toBe(true);
    }
  });

  it('should retrieve each preset theme by name (case-insensitive)', () => {
    expect(getTheme('clean').name).toBe('clean');
    expect(getTheme('academic').name).toBe('academic');
    expect(getTheme('DARK').name).toBe('dark');
    expect(getTheme('Business').name).toBe('business');
    expect(getTheme('warm').name).toBe('warm');
    expect(getTheme('AURORA').name).toBe('aurora');
    expect(getTheme('Neon').name).toBe('neon');
    expect(getTheme('nord').name).toBe('nord');
    expect(getTheme('dracula').name).toBe('dracula');
    expect(getTheme('beige').name).toBe('beige');
    expect(getTheme('ink').name).toBe('ink');
  });

  it('should fallback to clean when theme is unknown or empty', () => {
    expect(getTheme(undefined).name).toBe('clean');
    expect(getTheme('').name).toBe('clean');
    expect(getTheme('non-existent-theme').name).toBe('clean');
  });

  it('should support default alias pointing to clean', () => {
    const theme = getTheme('default');
    expect(theme.colors.primary).toBe(cleanTheme.colors.primary);
    expect(theme.colors.background).toBe(cleanTheme.colors.background);
  });

  it('should expose a mix of themes with gradient backgrounds', () => {
    const gradientThemes = Object.values(themes).filter((t) => t.colors.backgroundGradient);
    expect(gradientThemes.map((t) => t.name).sort()).toEqual([
      'aurora',
      'beige',
      'dark',
      'ink',
      'warm',
    ]);
    // Gradient themes keep a flat fallback color and a documented angle
    for (const t of gradientThemes) {
      expect(HEX.test(t.colors.background)).toBe(true);
      expect(t.colors.backgroundGradient?.angle ?? 180).toBeGreaterThan(0);
    }
    // Gradient themes cover both light and dark looks
    const darkBgs = gradientThemes.filter((t) => isDark(t.colors.background)).map((t) => t.name);
    expect(darkBgs).toContain('aurora');
    expect(darkBgs).toContain('dark');
  });

  it('should pair new dark themes with a matching shiki theme', () => {
    expect(getTheme('nord').shikiTheme).toBe('nord');
    expect(getTheme('dracula').shikiTheme).toBe('dracula');
  });

  it('should keep cover title text readable against the cover background', () => {
    for (const theme of Object.values(themes)) {
      const lText = luminance(theme.colors.titleText ?? 'FFFFFF');
      // Cover background is the gradient (both endpoints) when one is defined,
      // otherwise the solid titleBackground / primary design.
      const backgrounds = theme.colors.backgroundGradient
        ? [theme.colors.backgroundGradient.from, theme.colors.backgroundGradient.to]
        : [theme.colors.titleBackground ?? theme.colors.primary];
      for (const bg of backgrounds) {
        expect(Math.abs(luminance(bg) - lText)).toBeGreaterThan(0.35);
      }
    }
  });
});

function luminance(hex: string): number {
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function isDark(hex: string): boolean {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}
