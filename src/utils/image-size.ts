/**
 * Image size reader
 *
 * Reads pixel dimensions straight from the file header — no dependencies, in the
 * same spirit as the PNG-only reader this replaces. The formats covered mirror
 * what `IMAGE_MIME` can embed: PNG, JPEG, GIF, WebP, BMP and SVG.
 *
 * Getting this wrong is not cosmetic: the renderer derives a missing dimension
 * from the source aspect ratio, so a size that cannot be read makes the image
 * render stretched.
 */

export interface ImageSize {
  width: number;
  height: number;
}

/** Both dimensions must be usable; anything else is treated as "unknown". */
function positive(width: number, height: number): ImageSize | null {
  if (!(width > 0 && height > 0)) return null;
  return { width, height };
}

function pngSize(data: Buffer): ImageSize | null {
  if (data.length < 24) return null;
  if (data.readUInt32BE(0) !== 0x89504e47) return null;
  // IHDR is always the first chunk: width/height are big-endian at 16/20
  return positive(data.readUInt32BE(16), data.readUInt32BE(20));
}

/** Start-of-frame markers carry the dimensions; DHT/JPG/DAC share the range. */
function isFrameMarker(marker: number): boolean {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    marker !== 0xc4 && // DHT
    marker !== 0xc8 && // JPG
    marker !== 0xcc // DAC
  );
}

function jpegSize(data: Buffer): ImageSize | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 3 < data.length) {
    if (data[offset] !== 0xff) {
      // Not at a marker boundary — resync rather than give up on the file
      offset++;
      continue;
    }

    // Fill bytes (FF FF ...) are legal between segments
    let marker = data[offset + 1];
    while (marker === 0xff && offset + 2 < data.length) {
      offset++;
      marker = data[offset + 1];
    }
    offset += 2;

    // Standalone markers carry no payload
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    // A scan means no frame header was found before the pixel data
    if (marker === 0xda || marker === 0xd9) return null;

    if (offset + 2 > data.length) return null;
    const length = data.readUInt16BE(offset);
    if (length < 2) return null;

    if (isFrameMarker(marker)) {
      // length(2) + precision(1), then height, then width
      if (offset + 7 > data.length) return null;
      return positive(data.readUInt16BE(offset + 5), data.readUInt16BE(offset + 3));
    }

    offset += length;
  }
  return null;
}

function gifSize(data: Buffer): ImageSize | null {
  if (data.length < 10) return null;
  const signature = data.toString('latin1', 0, 6);
  if (signature !== 'GIF87a' && signature !== 'GIF89a') return null;
  // Logical screen descriptor: little-endian, right after the signature
  return positive(data.readUInt16LE(6), data.readUInt16LE(8));
}

function webpSize(data: Buffer): ImageSize | null {
  if (data.length < 30) return null;
  if (data.toString('latin1', 0, 4) !== 'RIFF') return null;
  if (data.toString('latin1', 8, 12) !== 'WEBP') return null;

  const chunk = data.toString('latin1', 12, 16);

  if (chunk === 'VP8X') {
    // Extended format: 24-bit little-endian canvas dimensions, stored minus one
    return positive(data.readUIntLE(24, 3) + 1, data.readUIntLE(27, 3) + 1);
  }

  if (chunk === 'VP8 ') {
    // Lossy: 14-bit dimensions after the keyframe start code
    if (data[23] !== 0x9d || data[24] !== 0x01 || data[25] !== 0x2a) return null;
    return positive(data.readUInt16LE(26) & 0x3fff, data.readUInt16LE(28) & 0x3fff);
  }

  if (chunk === 'VP8L') {
    // Lossless: 0x2f signature, then two 14-bit values packed into 32 bits
    if (data[20] !== 0x2f) return null;
    const bits = data.readUInt32LE(21);
    return positive((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
  }

  return null;
}

function bmpSize(data: Buffer): ImageSize | null {
  if (data.length < 26) return null;
  if (data[0] !== 0x42 || data[1] !== 0x4d) return null; // 'BM'

  const headerSize = data.readUInt32LE(14);
  if (headerSize === 12) {
    // BITMAPCOREHEADER: 16-bit dimensions
    return positive(data.readUInt16LE(18), data.readUInt16LE(20));
  }
  if (headerSize >= 40) {
    // BITMAPINFOHEADER and later: signed 32-bit. A negative height only means
    // the rows are stored top-down, so the magnitude is the height.
    return positive(Math.abs(data.readInt32LE(18)), Math.abs(data.readInt32LE(22)));
  }
  return null;
}

/** Absolute length units an SVG attribute can carry, expressed in px. */
const SVG_UNITS: Record<string, number> = {
  px: 1,
  pt: 96 / 72,
  pc: 16,
  mm: 96 / 25.4,
  cm: 96 / 2.54,
  in: 96,
  q: 96 / 101.6,
};

/** Parse an SVG length into px. Percentages have no absolute meaning here. */
function parseSvgLength(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.match(/^([\d.]+)\s*([a-z%]*)$/i);
  if (!match) return undefined;
  const n = parseFloat(match[1]);
  if (!(n > 0)) return undefined;
  const unit = match[2].toLowerCase();
  if (unit === '%') return undefined;
  const scale = SVG_UNITS[unit || 'px'];
  return scale === undefined ? undefined : n * scale;
}

/** The SVG root tag, or null when the buffer is not SVG markup. */
function findSvgRoot(data: Buffer): RegExpMatchArray | null {
  // SVG is text and the root tag is at the front; a prefix is enough
  const head = data.toString('utf8', 0, Math.min(data.length, 4096));
  return head.match(/<svg\b[^>]*>/i);
}

/**
 * True when the buffer is SVG markup.
 *
 * Sniffed from the bytes rather than a file extension: remote URLs and `data:`
 * URIs carry SVG under all sorts of names, and the extension a caller happened
 * to derive says nothing about what is actually inside.
 */
export function isSvgImage(data: Buffer): boolean {
  return findSvgRoot(data) !== null;
}

function svgSize(data: Buffer): ImageSize | null {
  const root = findSvgRoot(data);
  if (!root) return null;

  const attribute = (name: string): string | undefined => {
    const match = root[0].match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
    return match?.[1]?.trim();
  };

  // viewBox is unitless and therefore the most reliable aspect ratio source
  const viewBox = attribute('viewBox');
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }

  const width = parseSvgLength(attribute('width'));
  const height = parseSvgLength(attribute('height'));
  if (width === undefined || height === undefined) return null;
  return positive(width, height);
}

/**
 * Read pixel dimensions from an image buffer.
 * Returns null when the format is unsupported or the header is unusable.
 */
export function getImageSize(data: Buffer): ImageSize | null {
  if (data.length < 10) return null;
  return (
    pngSize(data) ??
    jpegSize(data) ??
    gifSize(data) ??
    webpSize(data) ??
    bmpSize(data) ??
    svgSize(data)
  );
}
