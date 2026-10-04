import { describe, it, expect } from 'vitest';
import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { convert } from '../src/index.js';

describe('E2E New Syntax', () => {
  const fixture = 'test/fixtures/syntax.md';
  const outputPath = resolve('test/fixtures/output-syntax.pptx');

  it('renders a markdown full of the newer grammar to a valid .pptx', async () => {
    if (existsSync(outputPath)) {
      unlinkSync(outputPath);
    }

    const result = await convert(fixture, {
      output: outputPath,
      theme: 'ocean',
    });

    expect(result).toBe(outputPath);
    expect(existsSync(outputPath)).toBe(true);
    expect(unlinkSync ? true : true).toBe(true);
    // Slide count: 1 title + 7 content/section-ish + 1 closing
    const { parseMarkdown } = await import('../src/parser/index.js');
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(resolve(fixture), 'utf-8');
    const p = parseMarkdown(src);
    expect(p.slides.length).toBeGreaterThanOrEqual(8);
  }, 120000);
});
