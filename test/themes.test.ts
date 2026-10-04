import { describe, it, expect } from 'vitest';
import { highlightBackgroundFor } from '../src/renderer/code-highlighter.js';
import {
  getTheme,
  themeNames,
  hasTheme,
  DEFAULT_SCHEME_NAME,
  DEFAULT_THEME_NAME,
  listColorSchemes,
  createThemeFromScheme,
} from '../src/themes/index.js';
import { isDarkColor } from '../src/utils/color-mix.js';

const HEX = /^[0-9A-Fa-f]{6}$/;

describe('Theme System (user-facing theme name)', () => {
  it('lists presets first, then color-only schemes', () => {
    expect(DEFAULT_THEME_NAME).toBe('blue');
    expect(themeNames()).toContain('blue');
    expect(themeNames()).toContain('ocean');
    expect(themeNames()).toContain('ocean-dark');
    expect(themeNames()[0]).toBe('blue');
    expect(themeNames()).not.toContain('clean');
    expect(hasTheme('blue')).toBe(true);
    expect(hasTheme('ocean')).toBe(true);
    expect(hasTheme('clean')).toBe(false);
  });

  it('resolves every registered scheme to a Theme with valid hex colors', () => {
    for (const scheme of listColorSchemes()) {
      const theme = createThemeFromScheme(scheme);
      expect(theme.name).toBe(scheme.name);
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

  it('getTheme resolves color scheme names case-insensitively', () => {
    expect(getTheme('ocean').name).toBe('ocean');
    expect(getTheme('ocean').presetSet).toBeUndefined();
    expect(getTheme('Ocean').name).toBe('ocean');
    expect(getTheme('OCEAN-DARK').name).toBe('ocean-dark');
  });

  it('default theme is blue when theme is omitted or empty', () => {
    for (const name of [undefined, '', '  '] as const) {
      const theme = getTheme(name as string | undefined);
      expect(theme.presetSet).toBe('blue');
      expect(theme.name).toBe('ocean');
      expect(theme.textSet).toBe('academic');
      expect(theme.layoutSet).toBe('legacy');
    }
  });

  it('falls back to default theme blue when theme is unknown', () => {
    const theme = getTheme('non-existent-theme');
    expect(theme.presetSet).toBe('blue');
    expect(DEFAULT_SCHEME_NAME).toBe('ocean');
  });

  it('throws on non-string theme values (CLI contract)', () => {
    expect(() => getTheme(['clean'] as unknown as string)).toThrow(/Invalid theme value/);
  });

  it('pairs light/dark schemes with a matching shiki theme', () => {
    expect(getTheme('ocean').shikiTheme).toBe('github-light');
    expect(getTheme('ocean-dark').shikiTheme).toBe('github-dark');
  });

  it('maps paper→background and ink→text without swapping roles', () => {
    const light = getTheme('ocean');
    const dark = getTheme('ocean-dark');
    expect(light.colors.background).toBe('F0F8FF');
    expect(light.colors.text).toBe('1E4A6F');
    expect(dark.colors.background).toBe('0B1C2E');
    expect(dark.colors.text).toBe('D6E7F5');
    expect(isDarkColor(light.colors.background)).toBe(false);
    expect(isDarkColor(dark.colors.background)).toBe(true);
  });

  it('keeps cover title text readable against the cover background', () => {
    for (const scheme of listColorSchemes()) {
      const theme = createThemeFromScheme(scheme);
      const text = theme.colors.titleText ?? theme.colors.text;
      const bg = theme.colors.titleBackground ?? theme.colors.background;
      const lum = (hex: string): number => {
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;
        return 0.299 * r + 0.587 * g + 0.114 * b;
      };
      expect(Math.abs(lum(bg) - lum(text))).toBeGreaterThan(0.2);
    }
  });
});

describe('code highlight colour on scheme themes', () => {
  const isDark = (hex: string): boolean => {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return 0.299 * r + 0.587 * g + 0.114 * b < 128;
  };

  it('derives a readable highlight band for every scheme theme', () => {
    for (const scheme of listColorSchemes()) {
      const theme = createThemeFromScheme(scheme);
      const band = highlightBackgroundFor(theme).replace(/^#/, '');
      expect(HEX.test(band), `${scheme.name}: band #${band}`).toBe(true);
      const darkDeck =
        (theme.shikiTheme ?? '').includes('dark') || isDarkColor(theme.colors.codeBackground);
      if (darkDeck) {
        expect(isDark(band), `${scheme.name}: highlight band #${band} is too light`).toBe(true);
      }
    }
  });
});
