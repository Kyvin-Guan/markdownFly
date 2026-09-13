import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getImageSize } from '../src/utils/image-size.js';

// Headers are built by hand rather than committed as binaries: every branch of
// the reader (including the malformed ones) is then exercisable and the
// expectations are readable.

function u16be(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n);
  return b;
}

function png(width: number, height: number): Buffer {
  const b = Buffer.alloc(24);
  b.writeUInt32BE(0x89504e47, 0);
  b.writeUInt32BE(0x0d0a1a0a, 4);
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  return b;
}

/** Baseline JPEG: APP0 then SOF0, whose payload holds precision/height/width. */
function jpeg(width: number, height: number): Buffer {
  const app0 = Buffer.concat([Buffer.from([0xff, 0xe0]), u16be(16), Buffer.alloc(14)]);
  const frame = Buffer.concat([
    Buffer.from([8]), // sample precision
    u16be(height),
    u16be(width),
    Buffer.from([1, 0x11, 0, 0]), // component count + one component spec
  ]);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    app0,
    Buffer.from([0xff, 0xc0]),
    u16be(2 + frame.length),
    frame,
  ]);
}

function gif(width: number, height: number, version = 'GIF89a'): Buffer {
  const b = Buffer.alloc(10);
  b.write(version, 0, 'latin1');
  b.writeUInt16LE(width, 6);
  b.writeUInt16LE(height, 8);
  return b;
}

function riff(chunk: string): Buffer {
  const b = Buffer.alloc(30);
  b.write('RIFF', 0, 'latin1');
  b.writeUInt32LE(b.length - 8, 4);
  b.write('WEBP', 8, 'latin1');
  b.write(chunk, 12, 'latin1');
  return b;
}

/** Lossy WebP: the keyframe start code precedes two 14-bit dimensions. */
function webpLossy(width: number, height: number): Buffer {
  const b = riff('VP8 ');
  b[23] = 0x9d;
  b[24] = 0x01;
  b[25] = 0x2a;
  b.writeUInt16LE(width, 26);
  b.writeUInt16LE(height, 28);
  return b;
}

/** Lossless WebP: 0x2f, then both dimensions packed minus one. */
function webpLossless(width: number, height: number): Buffer {
  const b = riff('VP8L');
  b[20] = 0x2f;
  b.writeUInt32LE((width - 1) | ((height - 1) << 14), 21);
  return b;
}

/** Extended WebP: 24-bit canvas dimensions, stored minus one. */
function webpExtended(width: number, height: number): Buffer {
  const b = riff('VP8X');
  b.writeUIntLE(width - 1, 24, 3);
  b.writeUIntLE(height - 1, 27, 3);
  return b;
}

function bmp(width: number, height: number, headerSize = 40): Buffer {
  const b = Buffer.alloc(30);
  b.write('BM', 0, 'latin1');
  b.writeUInt32LE(headerSize, 14);
  if (headerSize === 12) {
    b.writeUInt16LE(width, 18);
    b.writeUInt16LE(height, 20);
  } else {
    b.writeInt32LE(width, 18);
    b.writeInt32LE(height, 22);
  }
  return b;
}

function svg(attributes: string): Buffer {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" ${attributes}></svg>`, 'utf8');
}

describe('getImageSize', () => {
  it('reads PNG', () => {
    expect(getImageSize(png(400, 300))).toEqual({ width: 400, height: 300 });
  });

  it('reads JPEG', () => {
    expect(getImageSize(jpeg(200, 400))).toEqual({ width: 200, height: 400 });
  });

  it('reads GIF (both versions) and GIF dimensions are little-endian', () => {
    expect(getImageSize(gif(200, 200))).toEqual({ width: 200, height: 200 });
    expect(getImageSize(gif(300, 100, 'GIF87a'))).toEqual({ width: 300, height: 100 });
  });

  it('reads all three WebP flavours', () => {
    expect(getImageSize(webpLossy(930, 328))).toEqual({ width: 930, height: 328 });
    expect(getImageSize(webpLossless(640, 480))).toEqual({ width: 640, height: 480 });
    expect(getImageSize(webpExtended(1920, 1080))).toEqual({ width: 1920, height: 1080 });
  });

  it('reads BMP, including top-down files with a negative height', () => {
    expect(getImageSize(bmp(120, 90))).toEqual({ width: 120, height: 90 });
    expect(getImageSize(bmp(120, -90))).toEqual({ width: 120, height: 90 });
    expect(getImageSize(bmp(64, 32, 12))).toEqual({ width: 64, height: 32 });
  });

  it('prefers an SVG viewBox over width/height', () => {
    expect(getImageSize(svg('viewBox="0 0 100 50" width="400" height="200"'))).toEqual({
      width: 100,
      height: 50,
    });
  });

  it('reads SVG width/height, normalising units to a shared scale', () => {
    expect(getImageSize(svg('width="120px" height="40mm"'))).toEqual({
      width: 120,
      height: (40 / 25.4) * 96,
    });
    expect(getImageSize(svg('width="2in" height="1in"'))).toEqual({ width: 192, height: 96 });
  });

  it('rejects an SVG that only states relative sizes', () => {
    // Percentages carry no absolute size and would be meaningless here.
    expect(getImageSize(svg('width="100%" height="100%"'))).toBeNull();
    expect(getImageSize(svg(''))).toBeNull();
  });

  it('returns null for malformed, truncated and unknown data', () => {
    expect(getImageSize(Buffer.alloc(0))).toBeNull();
    expect(getImageSize(Buffer.from('not an image at all'))).toBeNull();
    expect(getImageSize(Buffer.from([0xff, 0xd8, 0xff]))).toBeNull(); // JPEG stub
    expect(getImageSize(png(400, 300).subarray(0, 20))).toBeNull(); // truncated PNG
    expect(getImageSize(gif(0, 0))).toBeNull(); // zero dimensions
    // JPEG whose frame header was truncated away
    expect(getImageSize(jpeg(200, 400).subarray(0, 6))).toBeNull();
  });

  it('reads a real JPEG file', () => {
    const file = fileURLToPath(new URL('./fixtures/portrait-200x400.jpg', import.meta.url));
    expect(getImageSize(readFileSync(file))).toEqual({ width: 200, height: 400 });
  });
});
