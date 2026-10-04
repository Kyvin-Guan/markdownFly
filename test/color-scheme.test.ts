import { describe, it, expect } from 'vitest';
import type { ColorScheme } from '../src/models/color-scheme.js';
import {
  CHROMATIC_SLOTS,
  resolveSchemeMode,
} from '../src/models/color-scheme.js';
import { resolveColorScheme } from '../src/themes/resolve-scheme.js';
import { createThemeFromScheme } from '../src/themes/from-scheme.js';
import {
  colorSchemes,
  getColorScheme,
  listColorSchemes,
  registerColorScheme,
  oceanScheme,
} from '../src/themes/color-schemes/index.js';
import {
  mixHex,
  parseHex,
  toHex,
  isDarkColor,
  relativeLuminance,
} from '../src/utils/color-mix.js';

const lightScheme: ColorScheme = {
  name: 'test-light',
  mode: 'light',
  ink: '1F2937',
  paper: 'FFFFFF',
  primary: '2563EB',
  secondary: '64748B',
};

// Dark surface: paper is the dark page, ink is the light text (roles never swap)
const darkScheme: ColorScheme = {
  name: 'test-dark',
  mode: 'dark',
  ink: 'F8FAFC',
  paper: '0F172A',
  primary: '38BDF8',
  secondary: '8FA3C9',
};

describe('color-mix utils', () => {
  it('parses and formats hex without #', () => {
    expect(parseHex('2563EB')).toEqual([0x25, 0x63, 0xeb]);
    expect(toHex(0x25, 0x63, 0xeb)).toBe('2563EB');
  });

  it('mixes endpoints correctly', () => {
    expect(mixHex('000000', 'FFFFFF', 0)).toBe('000000');
    expect(mixHex('000000', 'FFFFFF', 1)).toBe('FFFFFF');
    expect(mixHex('000000', 'FFFFFF', 0.5)).toBe('808080');
  });

  it('rejects invalid hex', () => {
    expect(() => parseHex('XYZ')).toThrow();
  });

  it('luminance: white high, black low', () => {
    expect(relativeLuminance('FFFFFF')).toBeGreaterThan(0.9);
    expect(relativeLuminance('000000')).toBeLessThan(0.01);
    expect(isDarkColor('0F172A')).toBe(true);
    expect(isDarkColor('FFFFFF')).toBe(false);
  });
});

describe('ColorScheme shape', () => {
  it('chromatic slots are only primary + secondary', () => {
    expect(CHROMATIC_SLOTS).toEqual(['primary', 'secondary']);
  });

  it('infers mode from paper luminance (ink/paper roles never swap)', () => {
    expect(resolveSchemeMode({ ...lightScheme, mode: undefined })).toBe('light');
    expect(resolveSchemeMode({ ...darkScheme, mode: undefined })).toBe('dark');
  });
});

describe('resolveColorScheme', () => {
  it('always maps paper→background and ink→text', () => {
    const l = resolveColorScheme(lightScheme);
    expect(l.background).toBe('FFFFFF');
    expect(l.text).toBe('1F2937');
    expect(l.primary).toBe('2563EB');

    const d = resolveColorScheme(darkScheme);
    expect(d.background).toBe('0F172A');
    expect(d.text).toBe('F8FAFC');
  });

  it('always emits background without # for isDarkTheme compatibility', () => {
    for (const s of [lightScheme, darkScheme]) {
      expect(resolveColorScheme(s).background).toMatch(/^[0-9A-F]{6}$/);
    }
  });

  it('derives legacy accent from primary (no accent slot on scheme)', () => {
    const c = resolveColorScheme(lightScheme);
    expect(c.accent).toMatch(/^[0-9A-F]{6}$/);
    expect(c.accent).not.toBe(c.primary);
    // accent is not a scheme field
    expect('accent' in lightScheme).toBe(false);
  });

  it('accents[] has exactly the two chromatic slots', () => {
    const c = resolveColorScheme(lightScheme);
    expect(c.accents).toEqual(['2563EB', '64748B']);
  });

  it('light scheme uses a fixed white code panel', () => {
    const c = resolveColorScheme(lightScheme);
    expect(c.codeBackground).toBe('FFFFFF');
    expect(isDarkColor(c.codeBackground!)).toBe(false);
  });

  it('every produced hex is valid RRGGBB', () => {
    const c = resolveColorScheme(darkScheme);
    for (const v of Object.values(c)) {
      if (typeof v === 'string') expect(v).toMatch(/^[0-9A-F]{6}$/);
      if (Array.isArray(v)) v.forEach((x) => expect(x).toMatch(/^[0-9A-F]{6}$/));
    }
  });
});

describe('createThemeFromScheme', () => {
  it('builds a complete Theme with default fonts/sizes', () => {
    const theme = createThemeFromScheme(lightScheme);
    expect(theme.name).toBe('test-light');
    // default text scheme `system` → uniform 微软雅黑 (code stays Consolas)
    expect(theme.textSet).toBe('system');
    expect(theme.fonts.heading).toBe('微软雅黑');
    expect(theme.fonts.body).toBe('微软雅黑');
    expect(theme.fonts.cjk).toBe('微软雅黑');
    expect(theme.fonts.code).toBe('Consolas');
    expect(theme.fontSize.title).toBe(36);
    expect(theme.colors.background).toBe('FFFFFF');
    expect(theme.shikiTheme).toBe('github-light');
  });

  it('dark scheme picks a dark shiki theme by default', () => {
    const theme = createThemeFromScheme(darkScheme);
    expect(theme.shikiTheme).toBe('github-dark');
  });

  it('accepts font overrides', () => {
    const theme = createThemeFromScheme(lightScheme, {
      fonts: { heading: 'Georgia', body: 'Segoe UI', code: 'Consolas', cjk: '微软雅黑' },
    });
    expect(theme.fonts.heading).toBe('Georgia');
  });
});

describe('built-in ocean scheme', () => {
  it('is registered and resolves to the author slots', () => {
    const s = getColorScheme('ocean');
    expect(s).toBeDefined();
    expect(s!.ink).toBe('1E4A6F');
    expect(s!.paper).toBe('F0F8FF');
    expect(s!.primary).toBe('4F9FD9');
    expect(s!.secondary).toBe('2D6A9F');
    const colors = resolveColorScheme(s!);
    expect(colors.background).toBe('F0F8FF');
    expect(colors.text).toBe('1E4A6F');
    expect(colors.primary).toBe('4F9FD9');
  });

  it('appears in listColorSchemes', () => {
    expect(listColorSchemes().some((x) => x.name === 'ocean')).toBe(true);
  });
});

describe('color-schemes registry', () => {
  it('supports register/lookup of customs alongside presets', () => {
    registerColorScheme(lightScheme);
    expect(getColorScheme('TEST-LIGHT')?.name).toBe('test-light');
    expect(getColorScheme('nope')).toBeUndefined();
    delete colorSchemes['test-light'];
    expect(getColorScheme('test-light')).toBeUndefined();
    // preset still there
    expect(oceanScheme.name).toBe('ocean');
  });
});
