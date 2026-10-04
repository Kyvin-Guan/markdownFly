import { describe, it, expect } from 'vitest';
import { getTheme, createThemeFromScheme, getColorScheme } from '../src/themes/index.js';
import { DEFAULT_UNIFORM_SIZES, defineUniformTextScheme } from '../src/models/text-set.js';
import { academicTextScheme } from '../src/themes/text-schemes/academic.js';
import { sharedCode } from '../src/themes/text-entries.js';

describe('text-set bridging (font-sets removed)', () => {
  it('default getTheme uses system scheme: 微软雅黑 body/cjk/heading + Consolas code', () => {
    const theme = getTheme('ocean');
    expect(theme.textSet).toBe('system');
    expect(theme.fonts.body).toBe('微软雅黑');
    expect(theme.fonts.cjk).toBe('微软雅黑');
    expect(theme.fonts.heading).toBe('微软雅黑');
    expect(theme.fonts.code).toBe('Consolas');
    expect(theme.fontSize).toEqual({
      title: DEFAULT_UNIFORM_SIZES.coverTitle,
      heading: DEFAULT_UNIFORM_SIZES.slideTitle,
      body: DEFAULT_UNIFORM_SIZES.body,
      code: DEFAULT_UNIFORM_SIZES.code,
      small: DEFAULT_UNIFORM_SIZES.small,
    });
    expect(theme.colors.background).toBeTruthy();
  });

  it('explicit options.fonts / options.fontSize still win over text-set bridging', () => {
    const scheme = getColorScheme('ocean')!;
    const theme = createThemeFromScheme(scheme, {
      textScheme: 'academic',
      fonts: { heading: 'Georgia', body: 'Georgia', code: 'Consolas', cjk: 'Georgia' },
      fontSize: { title: 40, heading: 30, body: 20, code: 15, small: 12 },
    });
    expect(theme.fonts.body).toBe('Georgia');
    expect(theme.fonts.cjk).toBe('Georgia');
    expect(theme.fontSize.title).toBe(40);
    expect(theme.textSet).toBe('academic');
  });

  it('academic bridges uniform 宋体 for body/cjk/heading; code stays Consolas', () => {
    const theme = getTheme('ocean', { textScheme: 'academic' });
    expect(theme.textSet).toBe('academic');
    expect(theme.fonts.body).toBe('宋体');
    expect(theme.fonts.cjk).toBe('宋体');
    expect(theme.fonts.heading).toBe('宋体');
    expect(theme.fonts.code).toBe('Consolas');
    // Titles sized up for blue package (academic scheme)
    expect(theme.fontSize.title).toBe(42);
    expect(theme.fontSize.heading).toBe(32);
    expect(theme.fontSize.body).toBe(18);
  });

  it('textStyles carries all six positions as entry references', () => {
    const theme = getTheme('ocean', { textScheme: 'academic' });
    expect(theme.textStyles?.body).toBe(academicTextScheme.positions.body);
    expect(theme.textStyles?.code).toBe(academicTextScheme.positions.code);
  });

  it('kai and source-han-serif bridge their uniform faces', () => {
    const kai = getTheme('ocean', { textScheme: 'kai' });
    expect(kai.fonts.body).toBe('KaiTi');
    expect(kai.fonts.cjk).toBe('KaiTi');

    const shs = getTheme('ocean', { textScheme: 'source-han-serif' });
    expect(shs.fonts.body).toBe('思源宋体');
    expect(shs.fonts.cjk).toBe('思源宋体');
  });

  it('unknown text scheme name falls back to system', () => {
    const theme = getTheme('ocean', { textScheme: 'no-such-text-scheme' });
    expect(theme.textSet).toBe('system');
    expect(theme.fonts.body).toBe('微软雅黑');
  });

  it('defineUniformTextScheme builds six positions with one face + shared code', () => {
    const custom = defineUniformTextScheme({
      name: 'test-custom',
      face: '等线',
      codeEntry: sharedCode,
    });
    expect(custom.positions.body.face).toBe('等线');
    expect(custom.positions.coverTitle.bold).toBe(true);
    expect(custom.positions.quote.italic).toBe(true);
    expect(custom.positions.code).toBe(sharedCode);
    expect(custom.positions.coverTitle.size).toBe(36);
  });

  it('legacy theme.typography remains independent and compiles', () => {
    const scheme = getColorScheme('ocean')!;
    const theme = createThemeFromScheme(scheme, {
      textScheme: 'academic',
      typography: { body: { face: 'Georgia', size: 16 } },
    });
    expect(theme.typography?.body?.face).toBe('Georgia');
    expect(theme.fonts.body).toBe('宋体');
  });

  it('red-line fields always present on every scheme theme', () => {
    for (const name of ['system', 'academic', 'kai', 'source-han-serif'] as const) {
      const theme = getTheme('ocean', { textScheme: name });
      expect(theme.fonts.cjk, name).toBeTruthy();
      expect(theme.fonts.body, name).toBeTruthy();
      expect(theme.colors.background, name).toBeTruthy();
    }
  });
});
