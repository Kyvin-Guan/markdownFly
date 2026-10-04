import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import {
  listTextSchemes,
  textSchemes,
  systemTextScheme,
  academicTextScheme,
  kaiTextScheme,
  sourceHanSerifTextScheme,
} from '../src/themes/text-schemes/text-index.js';
import { TEXT_SCHEME_POSITION_KEYS } from '../src/models/text-set.js';
import { sharedCode } from '../src/themes/text-entries.js';

const schemesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/themes/text-schemes',
);

function schemeFiles(): string[] {
  return readdirSync(schemesDir)
    .filter((f) => f.endsWith('.ts') && f !== 'text-index.ts' && f !== 'index.ts')
    .map((f) => basename(f, '.ts'));
}

describe('text-schemes folder ↔ registry consistency', () => {
  it('every scheme file has a registered entry named after the file', () => {
    const files = schemeFiles();
    expect(files.length).toBeGreaterThan(0);
    for (const id of files) {
      expect(
        textSchemes[id],
        `text-schemes/${id}.ts exists but textSchemes["${id}"] is missing — add it to builtInTextSchemes`,
      ).toBeDefined();
      expect(textSchemes[id].name.toLowerCase()).toBe(id);
    }
  });

  it('every registered built-in has a corresponding file', () => {
    const files = new Set(schemeFiles());
    for (const scheme of listTextSchemes()) {
      if (scheme.name.startsWith('test-')) continue;
      expect(
        files.has(scheme.name.toLowerCase()),
        `registered text scheme "${scheme.name}" has no text-schemes/${scheme.name.toLowerCase()}.ts file`,
      ).toBe(true);
    }
  });

  it('each scheme file looks like a TextScheme data module', () => {
    for (const id of schemeFiles()) {
      const src = readFileSync(join(schemesDir, `${id}.ts`), 'utf-8');
      expect(src, `${id}.ts should define/export a TextScheme`).toMatch(
        /export const \w+TextScheme/,
      );
    }
  });
});

describe('TextScheme shape (uniform face policy)', () => {
  it('every scheme supplies exactly the six fixed position keys', () => {
    for (const scheme of listTextSchemes()) {
      const keys = Object.keys(scheme.positions).sort();
      expect(keys, `${scheme.name} positions`).toEqual([...TEXT_SCHEME_POSITION_KEYS].sort());
    }
  });

  it('entries have face + size, no color / no id', () => {
    for (const scheme of listTextSchemes()) {
      for (const key of TEXT_SCHEME_POSITION_KEYS) {
        const entry = scheme.positions[key];
        expect(typeof entry.face, `${scheme.name}.${key}.face`).toBe('string');
        expect(entry.face.length).toBeGreaterThan(0);
        expect(typeof entry.size, `${scheme.name}.${key}.size`).toBe('number');
        expect(entry.size).toBeGreaterThan(0);
        expect(entry).not.toHaveProperty('color');
        expect(entry).not.toHaveProperty('id');
      }
    }
  });

  it('text positions share one typeface per scheme (except code)', () => {
    for (const scheme of listTextSchemes()) {
      const faces = [
        scheme.positions.coverTitle.face,
        scheme.positions.slideTitle.face,
        scheme.positions.body.face,
        scheme.positions.quote.face,
        scheme.positions.small.face,
      ];
      const unique = new Set(faces);
      expect(unique.size, `${scheme.name} should use one face for text positions`).toBe(1);
    }
  });

  it('built-in schemes share the same code entry object', () => {
    for (const scheme of [
      systemTextScheme,
      academicTextScheme,
      kaiTextScheme,
      sourceHanSerifTextScheme,
    ]) {
      expect(scheme.positions.code, `${scheme.name}.code`).toBe(sharedCode);
    }
  });

  it('uniform faces: system=微软雅黑, academic=宋体, kai=KaiTi, source-han-serif=思源宋体', () => {
    expect(systemTextScheme.positions.body.face).toBe('微软雅黑');
    expect(academicTextScheme.positions.body.face).toBe('宋体');
    expect(kaiTextScheme.positions.body.face).toBe('KaiTi');
    expect(sourceHanSerifTextScheme.positions.body.face).toBe('思源宋体');
  });
});
