import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { themePresets, listThemePresets } from '../src/themes/presets/index.js';
import { colorSchemes } from '../src/themes/color-schemes/index.js';
import { textSchemes } from '../src/themes/text-schemes/text-index.js';
import { layoutSchemes } from '../src/themes/layout-schemes/index.js';

const presetsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/themes/presets',
);

function presetFiles(): string[] {
  return readdirSync(presetsDir)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .map((n) => n.replace(/\.ts$/, ''));
}

describe('theme-presets folder ↔ registry consistency', () => {
  it('every preset file has a registered entry named after the file', () => {
    const files = presetFiles();
    expect(files.length).toBeGreaterThan(0);
    for (const id of files) {
      expect(
        themePresets[id],
        `presets/${id}.ts exists but themePresets["${id}"] is missing`,
      ).toBeDefined();
      expect(themePresets[id].name.toLowerCase()).toBe(id);
    }
  });

  it('every registered built-in has a corresponding file', () => {
    const files = new Set(presetFiles());
    for (const preset of listThemePresets()) {
      if (preset.name.startsWith('test-')) continue;
      expect(files.has(preset.name.toLowerCase())).toBe(true);
    }
  });

  it('each preset file looks like a ThemePreset data module', () => {
    for (const id of presetFiles()) {
      const src = readFileSync(join(presetsDir, `${id}.ts`), 'utf-8');
      expect(src, `${id}.ts should export a ThemePreset`).toMatch(
        /export const \w+Preset: ThemePreset/,
      );
    }
  });

  it('preset names do not collide with ColorScheme names', () => {
    for (const preset of listThemePresets()) {
      expect(
        colorSchemes[preset.name.toLowerCase()],
        `preset "${preset.name}" collides with a ColorScheme name`,
      ).toBeUndefined();
    }
  });

  it('every preset references registered color / text / layout schemes', () => {
    for (const preset of listThemePresets()) {
      expect(
        colorSchemes[preset.colorScheme.toLowerCase()],
        `preset "${preset.name}" → unknown colorScheme "${preset.colorScheme}"`,
      ).toBeDefined();
      expect(
        textSchemes[preset.textScheme.toLowerCase()],
        `preset "${preset.name}" → unknown textScheme "${preset.textScheme}"`,
      ).toBeDefined();
      expect(
        layoutSchemes[preset.layoutScheme.toLowerCase()],
        `preset "${preset.name}" → unknown layoutScheme "${preset.layoutScheme}"`,
      ).toBeDefined();
    }
  });

  it('ships the four user-specified presets', () => {
    expect(listThemePresets().map((p) => p.name)).toEqual([
      'blue',
      'emerald',
      'gold',
      'slate',
    ]);
    expect(themePresets.blue.colorScheme).toBe('ocean');
    expect(themePresets.blue.textScheme).toBe('academic');
    expect(themePresets.blue.layoutScheme).toBe('legacy');
    expect(themePresets.emerald.colorScheme).toBe('forest');
    expect(themePresets.emerald.textScheme).toBe('system');
    expect(themePresets.emerald.layoutScheme).toBe('folio');
    expect(themePresets.gold.colorScheme).toBe('champagne');
    expect(themePresets.gold.textScheme).toBe('kai');
    expect(themePresets.gold.layoutScheme).toBe('golden');
    expect(themePresets.slate.colorScheme).toBe('graphite');
    expect(themePresets.slate.textScheme).toBe('source-han-serif');
    expect(themePresets.slate.layoutScheme).toBe('minimal');
  });
});
