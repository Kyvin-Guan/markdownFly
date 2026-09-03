import { describe, it, expect } from 'vitest';
import { fitImageWithOptions, resolveImageSize, fitInBox } from '../src/utils/image-fit.js';

describe('resolveImageSize', () => {
  it('converts inches and percentages', () => {
    expect(resolveImageSize('6in', 10)).toBe(6);
    expect(resolveImageSize('60%', 10)).toBe(6);
  });

  it('rejects invalid values', () => {
    expect(resolveImageSize(undefined, 10)).toBeUndefined();
    expect(resolveImageSize('abc', 10)).toBeUndefined();
    expect(resolveImageSize('0in', 10)).toBeUndefined();
    expect(resolveImageSize('-2in', 10)).toBeUndefined();
    expect(resolveImageSize('0%', 10)).toBeUndefined();
  });
});

describe('fitImageWithOptions', () => {
  // 800×450 source, 4:3 box, fallback aspect 0.5625
  const img = { width: 800, height: 450 };

  it('defaults to fitInBox behavior, centered', () => {
    const placed = fitImageWithOptions(img, { width: 8, height: 5 });
    expect(placed.width).toBeCloseTo(8, 5);
    expect(placed.height).toBeCloseTo(4.5, 5);
    expect(placed.x).toBeCloseTo(0, 5);
  });

  it('applies explicit width inches, preserves ratio', () => {
    const placed = fitImageWithOptions(img, { width: 8, height: 5 }, { width: '6in' });
    expect(placed.width).toBeCloseTo(6, 5);
    expect(placed.height).toBeCloseTo(3.375, 5);
    expect(placed.x).toBeCloseTo(1, 5); // centered
  });

  it('applies percentage width relative to the box', () => {
    const placed = fitImageWithOptions(img, { width: 8, height: 5 }, { width: '60%' });
    expect(placed.width).toBeCloseTo(4.8, 5);
    expect(placed.height).toBeCloseTo(2.7, 5);
  });

  it('honors left/right alignment offsets', () => {
    const left = fitImageWithOptions(img, { width: 8, height: 5 }, { width: '6in', align: 'left' });
    const right = fitImageWithOptions(img, { width: 8, height: 5 }, { width: '6in', align: 'right' });
    expect(left.x).toBeCloseTo(0, 5);
    expect(right.x).toBeCloseTo(2, 5);
  });

  it('uses both sizes explicitly (aspect not preserved)', () => {
    const placed = fitImageWithOptions(img, { width: 8, height: 5 }, { width: '5in', height: '2in' });
    expect(placed.width).toBeCloseTo(5, 5);
    expect(placed.height).toBeCloseTo(2, 5);
  });

  it('shrinks oversized explicit sizes back into the box', () => {
    const wide = fitImageWithOptions(img, { width: 8, height: 5 }, { width: '10in' });
    expect(wide.width).toBeCloseTo(8, 5);
    expect(wide.height).toBeCloseTo(4.5, 5);

    // h=6in would need 10.67in of width > 8in — shrink proportionally to 8×4.5
    const tall = fitImageWithOptions(img, { width: 8, height: 5 }, { height: '6in' });
    expect(tall.height).toBeCloseTo(4.5, 5);
    expect(tall.width).toBeCloseTo(8, 5);
  });

  it('falls back when the source size is unknown', () => {
    const placed = fitImageWithOptions({ width: 0, height: 0 }, { width: 8, height: 5 });
    expect(placed.width).toBeCloseTo(8, 5); // 6×3 fallback inside an 8×5 box
    expect(placed.height).toBeCloseTo(4, 5); // fallback ratio 3:6 → 8×4
  });

  it('keeps fitInBox behavior intact for legacy callers', () => {
    const fitted = fitInBox({ width: 800, height: 450 }, 8, 5);
    expect(fitted).toEqual({ width: 8, height: 4.5 });
  });
});
