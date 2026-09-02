import { describe, it, expect } from 'vitest';
import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { convert } from '../src/index.js';

describe('E2E Conversion', () => {
  const outputPath = resolve('test/fixtures/output-test.pptx');

  it('should convert basic.md to a valid .pptx file', async () => {
    if (existsSync(outputPath)) {
      unlinkSync(outputPath);
    }

    const result = await convert('test/fixtures/basic.md', {
      output: outputPath,
      theme: 'default',
    });

    expect(result).toBe(outputPath);
    expect(existsSync(outputPath)).toBe(true);
  });
});
