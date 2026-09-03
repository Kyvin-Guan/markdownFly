/**
 * PNG gradient generator
 * PptxGenJS slide backgrounds only support solid colors or images, so linear
 * gradient backgrounds are rendered here to a small PNG that gets stretched
 * over the whole slide (pptxgenjs emits <a:stretch><a:fillRect/></a:stretch>).
 *
 * Pure Node implementation (zlib + hand-rolled PNG chunks) — no dependencies.
 */

import { deflateSync } from 'node:zlib';

export type RgbTuple = readonly [number, number, number];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const payload = Buffer.concat([Buffer.from(type, 'latin1'), Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(payload));
  return Buffer.concat([length, payload, crc]);
}

/** Encode a width×height truecolor (RGB, no alpha) PNG. */
export function encodePngRgb(
  width: number,
  height: number,
  pixelAt: (x: number, y: number) => RgbTuple,
): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  // bytes 10-12 (compression/filter/interlace) stay 0

  // Scanlines: filter byte 0 (none) + width * RGB
  const raw = Buffer.alloc(height * (1 + width * 3));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelAt(x, y);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
    }
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', new Uint8Array(idat)),
    pngChunk('IEND', new Uint8Array(0)),
  ]);
}

/** Parse '#RRGGBB' / 'RRGGBB' / '#RGB' / 'RGB' into an RGB tuple. */
export function hexToRgb(hex: string): RgbTuple {
  let s = hex.replace(/^#/, '');
  if (s.length === 3) s = s.split('').map((ch) => ch + ch).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) throw new Error(`Invalid hex color: ${hex}`);
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

export interface GradientOptions {
  width?: number;
  height?: number;
}

/**
 * Create a linear-gradient PNG.
 * Angle follows the CSS convention (0° = to top, 90° = to right, 135° = to
 * bottom-right, 180° = to bottom). The default canvas matches the 16:9 slide,
 * so the visual angle survives stretching.
 */
export function createLinearGradientPng(
  from: string,
  to: string,
  angleDeg = 180,
  options: GradientOptions = {},
): Buffer {
  const width = options.width ?? 192;
  const height = options.height ?? 108;
  const angle = (angleDeg * Math.PI) / 180;
  // CSS gradient-line direction in screen coords (y grows downward)
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  // Half the L1 extent of the unit square: keeps the gradient spans 0..1
  // across the full diagonal no matter which angle is given.
  const extent = (Math.abs(dx) + Math.abs(dy)) / 2;

  const c1 = hexToRgb(from);
  const c2 = hexToRgb(to);

  return encodePngRgb(width, height, (x, y) => {
    const px = x / (width - 1) - 0.5;
    const py = y / (height - 1) - 0.5;
    let t = 0.5 + (px * dx + py * dy) / (2 * extent);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * t),
      Math.round(c1[1] + (c2[1] - c1[1]) * t),
      Math.round(c1[2] + (c2[2] - c1[2]) * t),
    ];
  });
}
