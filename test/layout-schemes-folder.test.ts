import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { layoutSchemes, listLayoutSchemes } from '../src/themes/layout-schemes/index.js';

const schemesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/themes/layout-schemes',
);

/** Scheme folders only (each contains index.ts that exports a LayoutScheme) */
function schemeFolders(): string[] {
  return readdirSync(schemesDir).filter((name) => {
    if (name === 'index.ts' || name.endsWith('.ts')) return false;
    const p = join(schemesDir, name);
    return statSync(p).isDirectory() && statSync(join(p, 'index.ts')).isFile();
  });
}

describe('layout-schemes folders ↔ registry consistency', () => {
  it('every scheme folder has a registered entry named after the folder', () => {
    const folders = schemeFolders();
    expect(folders.length).toBeGreaterThan(0);
    for (const id of folders) {
      expect(
        layoutSchemes[id],
        `layout-schemes/${id}/ exists but layoutSchemes["${id}"] is missing — add it to builtInLayoutSchemes in index.ts`,
      ).toBeDefined();
      expect(layoutSchemes[id].name.toLowerCase()).toBe(id);
    }
  });

  it('every registered built-in has a corresponding folder', () => {
    const folders = new Set(schemeFolders());
    for (const scheme of listLayoutSchemes()) {
      if (scheme.name.startsWith('test-')) continue;
      expect(
        folders.has(scheme.name.toLowerCase()),
        `registered scheme "${scheme.name}" has no layout-schemes/${scheme.name.toLowerCase()}/ folder`,
      ).toBe(true);
    }
  });

  it('each scheme folder index looks like a LayoutScheme data module', () => {
    for (const id of schemeFolders()) {
      const src = readFileSync(join(schemesDir, id, 'index.ts'), 'utf-8');
      expect(src, `${id}/index.ts should export a LayoutScheme`).toMatch(
        /export const \w+LayoutScheme: LayoutScheme/,
      );
      expect(src, `${id}/index.ts should not contain resolve/render logic`).not.toMatch(
        /createThemeFromScheme|renderTitleSlide|renderSectionSlide/,
      );
    }
  });

  it('registers both folio and legacy; folio has new page types, legacy does not', () => {
    expect(layoutSchemes['folio']).toBeDefined();
    expect(layoutSchemes['legacy']).toBeDefined();
    expect(layoutSchemes['legacy'].layouts.closing).toBeUndefined();
    expect(layoutSchemes['folio'].layouts.closing).toBeDefined();
    expect(layoutSchemes['folio'].layouts.section?.extra?.doubleRules).toBe(true);
    expect(layoutSchemes['legacy'].layouts.section?.accentBar).toBe('left');
  });
});
