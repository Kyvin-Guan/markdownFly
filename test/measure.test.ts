import { describe, it, expect } from 'vitest';
import {
  codeBlockHeight,
  codeLineCount,
  estimateTextLines,
  fitCodeBlock,
} from '../src/renderer/layouts/measure.js';

describe('codeLineCount', () => {
  it('counts one rendered line per short source line', () => {
    const content = ['npx -y markdownfly@0.3 deck.md', '', 'echo done'].join('\n');
    // 6in at 14pt fits ~51 monospace units — every line above is well under.
    expect(codeLineCount(content, 6, 14)).toBe(3);
  });

  it('counts the wraps a long command produces (the slide-7 regression)', () => {
    const long = 'npx --registry=https://registry.npmmirror.com -y markdownfly@0.3 deck.md';
    const content = ['# 国内镜像极速编译', long].join('\n');
    // The 73-char command wraps to 2 rendered lines in a ~5.6in column.
    expect(codeLineCount(content, 5.6, 14)).toBe(3);
  });

  it('counts CJK code text double-width', () => {
    const cjk = '编译'.repeat(20); // 40 chars = 80 width units — 1.5 lines at 14pt in 6in
    expect(codeLineCount(cjk, 6, 14)).toBe(2);
  });
});

describe('codeBlockHeight / fitCodeBlock', () => {
  it('height grows with rendered lines and never drops below one inch', () => {
    expect(codeBlockHeight(0, 14)).toBe(1.0);
    expect(codeBlockHeight(5, 14)).toBeGreaterThan(codeBlockHeight(4, 14));
  });

  it('keeps the base font size when the block already fits', () => {
    const fit = fitCodeBlock('short', 6, 4, 14);
    expect(fit.fontSize).toBe(14);
    expect(fit.height).toBeLessThanOrEqual(4);
  });

  it('shrinks the font for an oversized block instead of overflowing', () => {
    const content = Array.from({ length: 40 }, (_, i) => `line ${i} of a very long block`).join('\n');
    const fit = fitCodeBlock(content, 6, 3, 14);
    expect(fit.fontSize).toBeLessThan(14);
    expect(fit.height).toBeLessThanOrEqual(3);
  });

  it('bottoms out at the minimum font size and clamps to maxH', () => {
    const content = Array.from({ length: 200 }, (_, i) => `line ${i}`).join('\n');
    const fit = fitCodeBlock(content, 6, 2, 14);
    expect(fit.fontSize).toBe(10);
    expect(fit.height).toBeLessThanOrEqual(2);
  });
});

describe('estimateTextLines', () => {
  it('CJK characters take two width units, so long Chinese bullets wrap', () => {
    // A typical slide-2 style bullet: 25 CJK chars = 50 width units, while a
    // 5.6in column of 18pt text fits ~44 units — it must estimate 2 lines.
    const bullet = '排版损耗：对齐、调色、字号反复调整，大幅消耗创造力';
    expect(estimateTextLines(bullet, 5.6, 18)).toBe(2);
    expect(estimateTextLines('x'.repeat(200), 5.6, 18)).toBeGreaterThan(2);
  });
});
