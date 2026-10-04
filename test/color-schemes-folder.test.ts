import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { colorSchemes, listColorSchemes } from '../src/themes/color-schemes/index.js';

const schemesDir = join(dirname(fileURLToPath(import.meta.url)), '../src/themes/color-schemes');

/** Scheme data files only (no registry / loader) */
function schemeFiles(): string[] {
  return readdirSync(schemesDir)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts' && f !== 'load.ts')
    .map((f) => basename(f, '.ts'));
}

describe('color-schemes folder ↔ registry consistency', () => {
  it('every scheme file has a registered entry named after the file', () => {
    const files = schemeFiles();
    expect(files.length).toBeGreaterThan(0);
    for (const id of files) {
      expect(
        colorSchemes[id],
        `color-schemes/${id}.ts exists but colorSchemes["${id}"] is missing — add it to builtInSchemes in index.ts`,
      ).toBeDefined();
      expect(colorSchemes[id].name.toLowerCase()).toBe(id);
    }
  });

  it('every registered built-in has a corresponding file', () => {
    const files = new Set(schemeFiles());
    for (const scheme of listColorSchemes()) {
      // runtime-registered customs may not have files; only enforce built-ins from disk
      if (scheme.name.startsWith('test-')) continue;
      expect(
        files.has(scheme.name.toLowerCase()),
        `registered scheme "${scheme.name}" has no color-schemes/${scheme.name.toLowerCase()}.ts file`,
      ).toBe(true);
    }
  });

  it('each scheme file looks like a ColorScheme data module', () => {
    for (const id of schemeFiles()) {
      const src = readFileSync(join(schemesDir, `${id}.ts`), 'utf-8');
      expect(src, `${id}.ts should export a ColorScheme`).toMatch(/export const \w+Scheme: ColorScheme/);
      expect(src, `${id}.ts should not contain resolve/render logic`).not.toMatch(
        /resolveColorScheme|createThemeFromScheme/,
      );
    }
  });
});
