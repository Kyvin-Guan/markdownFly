import { describe, it, expect } from 'vitest';
import { inflateSync } from 'node:zlib';
import { createLinearGradientPng, hexToRgb, encodePngRgb } from '../src/utils/gradient.js';
import { getPngSize } from '../src/utils/png-size.js';

/** Decode a raw pixel from the PNG's IDAT scanlines (filter byte 0 stripped). */
function readRgb(png: Buffer, x: number, y: number, width: number): number[] {
  let offset = 8;
  let idat = Buffer.alloc(0);
  while (offset < png.length) {
    const len = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString();
    if (type === 'IDAT') idat = Buffer.concat([idat, png.subarray(offset + 8, offset + 8 + len)]);
    offset += 12 + len;
  }
  const raw = inflateSync(idat);
  const at = y * (1 + width * 3) + 1 + x * 3;
  return [...raw.subarray(at, at + 3)];
}

describe('Gradient PNG generator', () => {
  it('encodes a valid PNG with the requested dimensions', () => {
    const png = createLinearGradientPng('FFFFFF', '000000', 135);
    expect(getPngSize(png)).toEqual({ width: 192, height: 108 });
    // PNG signature
    expect([...png.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it('matches the from/to colors at the gradient endpoints (top→bottom, 180deg)', () => {
    const png = createLinearGradientPng('FF0000', '0000FF', 180, { width: 64, height: 64 });
    expect(readRgb(png, 0, 0, 64)).toEqual([0xff, 0x00, 0x00]);
    expect(readRgb(png, 63, 63, 64)).toEqual([0x00, 0x00, 0xff]);
  });

  it('parses hex colors in 3/4/6 digit forms', () => {
    expect(hexToRgb('#A0F')).toEqual([0xaa, 0x00, 0xff]);
    expect(hexToRgb('00ff00')).toEqual([0x00, 0xff, 0x00]);
    expect(hexToRgb('#112233')).toEqual([0x11, 0x22, 0x33]);
    expect(() => hexToRgb('not-a-color')).toThrow();
  });

  it('produces deterministic output for the same input', () => {
    const a = createLinearGradientPng('06091C', '101A3A', 135);
    const b = createLinearGradientPng('06091C', '101A3A', 135);
    expect(a.equals(b)).toBe(true);
  });

  it('can encode a single-color image', () => {
    const png = encodePngRgb(2, 2, () => [18, 52, 86]);
    expect(getPngSize(png)).toEqual({ width: 2, height: 2 });
  });
});
