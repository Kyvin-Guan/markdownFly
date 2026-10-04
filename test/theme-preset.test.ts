import { describe, it, expect } from 'vitest';
import {
  getTheme,
  DEFAULT_THEME_NAME,
  DEFAULT_PRESET_NAME,
  getThemePreset,
  listThemePresets,
  bluePreset,
  emeraldPreset,
  goldPreset,
  slatePreset,
} from '../src/themes/index.js';

const HEX = /^[0-9A-Fa-f]{6}$/;

describe('ThemePreset as user-facing theme name', () => {
  it('registers blue + 3 presets; default theme name is blue', () => {
    expect(DEFAULT_THEME_NAME).toBe('blue');
    expect(DEFAULT_PRESET_NAME).toBe('blue');
    expect(listThemePresets().map((p) => p.name)).toEqual([
      'blue',
      'emerald',
      'gold',
      'slate',
    ]);
    expect(bluePreset.colorScheme).toBe('ocean');
    expect(bluePreset.textScheme).toBe('academic');
    expect(bluePreset.layoutScheme).toBe('legacy');
    expect(getThemePreset('blue')).toBeDefined();
  });

  it('presets pair schemes non-redundantly in order', () => {
    expect(emeraldPreset.colorScheme).toBe('forest');
    expect(emeraldPreset.textScheme).toBe('system');
    expect(emeraldPreset.layoutScheme).toBe('folio');

    expect(goldPreset.colorScheme).toBe('champagne');
    expect(goldPreset.textScheme).toBe('kai');
    expect(goldPreset.layoutScheme).toBe('golden');

    expect(slatePreset.colorScheme).toBe('graphite');
    expect(slatePreset.textScheme).toBe('source-han-serif');
    expect(slatePreset.layoutScheme).toBe('minimal');
    for (const p of listThemePresets()) {
      expect(getThemePreset(p.name)).toBeDefined();
    }
  });

  it('getTheme("blue") and default both select the blue package', () => {
    for (const name of ['blue', 'Blue', undefined, ''] as const) {
      const theme = getTheme(name as string | undefined);
      expect(theme.presetSet).toBe('blue');
      expect(theme.name).toBe('ocean');
      expect(theme.textSet).toBe('academic');
      expect(theme.layoutSet).toBe('legacy');
      expect(theme.layouts?.title?.titleAlign).toBe('center');
    }
  });

  it('color-only names keep production text/layout path', () => {
    const theme = getTheme('ocean');
    expect(theme.presetSet).toBeUndefined();
    expect(theme.layoutSet).toBeUndefined();
    expect(theme.textSet).toBe('system');
  });

  it('explicit textScheme/layoutScheme override blue slots', () => {
    const theme = getTheme('blue', {
      textScheme: 'system',
      layoutScheme: 'folio',
    });
    expect(theme.presetSet).toBe('blue');
    expect(theme.textSet).toBe('system');
    expect(theme.layoutSet).toBe('folio');
  });

  it('keeps red-line Theme fields after blue resolution', () => {
    const theme = getTheme('blue');
    expect(theme.colors.background).toMatch(HEX);
    expect(theme.fonts.cjk).toBeTruthy();
    expect(theme.fonts.body).toBeTruthy();
  });

  it('colorScheme override wins over the preset color slot', () => {
    const theme = getTheme('blue', { colorScheme: 'forest' });
    expect(theme.presetSet).toBe('blue');
    expect(theme.name).toBe('ocean'); // provenance: preset base name is kept
    expect(theme.colors.background).toBe('F0FFF5'); // forest paper
    expect(theme.colors.text).toBe('2A4A3F'); // forest ink
    // untouched slots still come from the blue preset
    expect(theme.textSet).toBe('academic');
    expect(theme.layoutSet).toBe('legacy');
  });

  it('free combination overrides all three slots', () => {
    const theme = getTheme('blue', {
      colorScheme: 'champagne',
      textScheme: 'system',
      layoutScheme: 'golden',
    });
    expect(theme.presetSet).toBe('blue');
    expect(theme.textSet).toBe('system');
    expect(theme.layoutSet).toBe('golden');
  });

  it('composition works without a preset base (default theme blue)', () => {
    const theme = getTheme(undefined, {
      colorScheme: 'forest',
      textScheme: 'academic',
      layoutScheme: 'minimal',
    });
    expect(theme.presetSet).toBe('blue'); // default base
    expect(theme.colors.background).toBe('F0FFF5');
    expect(theme.textSet).toBe('academic');
    expect(theme.layoutSet).toBe('minimal');
  });
});
