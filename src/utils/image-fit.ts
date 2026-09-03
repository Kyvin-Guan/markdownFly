/**
 * Image placement helpers
 */

export interface Size {
  width: number;
  height: number;
}

export interface FitOptions {
  /** Normalized size, e.g. '6in' or '60%' (percent is relative to the box width) */
  width?: string;
  /** Normalized size, e.g. '4in' or '70%' (percent is relative to the box height) */
  height?: string;
  align?: 'left' | 'center' | 'right';
}

export interface PlacedImage {
  /** Horizontal offset inside the box, per `align` */
  x: number;
  width: number;
  height: number;
}

/**
 * Scale an image to fit inside a max-width/max-height box while preserving
 * its aspect ratio. Returns the largest size that fits the box.
 */
export function fitInBox(img: Size, maxWidth: number, maxHeight: number): Size {
  if (!(img.width > 0 && img.height > 0) || !(maxWidth > 0 && maxHeight > 0)) {
    return { width: maxWidth, height: maxHeight };
  }
  const ar = img.height / img.width;
  let width = maxWidth;
  let height = width * ar;
  if (height > maxHeight) {
    height = maxHeight;
    width = height / ar;
  }
  return { width, height };
}

/** Convert a normalized size ('6in' / '60%') to inches; `of` is the reference for percentages. */
export function resolveImageSize(value: string | undefined, of: number): number | undefined {
  if (!value) return undefined;
  if (value.endsWith('%')) {
    const pct = parseFloat(value);
    if (Number.isNaN(pct) || pct <= 0) return undefined;
    return (of * pct) / 100;
  }
  const n = parseFloat(value);
  if (Number.isNaN(n) || n <= 0) return undefined;
  return n;
}

/**
 * Resolve the requested width/height (either may be undefined, meaning
 * "derive from the other side / the image ratio"). Returns concrete numbers.
 */
function resolveSizes(img: Size, box: Size, widthStr?: string, heightStr?: string): Size {
  const width = resolveImageSize(widthStr, box.width);
  const height = resolveImageSize(heightStr, box.height);
  const ar = img.height > 0 && img.width > 0 ? img.height / img.width : 0.5;

  if (width === undefined && height === undefined) {
    return fitInBox(
      { width: img.width > 0 ? img.width : 6, height: img.height > 0 ? img.height : 3 },
      box.width,
      box.height,
    );
  }
  if (height === undefined) {
    // width is defined here: the both-undefined branch above was skipped
    return { width: width!, height: width! * ar };
  }
  if (width === undefined) {
    return { width: height! / ar, height: height! };
  }
  return { width, height };
}

/**
 * Place an image inside a box honoring `![alt](src){w=...,h=...,align=...}`:
 * - only one size given → aspect ratio preserved, the other side derived
 * - both sizes given → explicit (aspect not preserved)
 * - the result is always shrunk back into the box
 * `img` is the source pixel size (or the renderer's fallback when unknown).
 */
export function fitImageWithOptions(img: Size, box: Size, options: FitOptions = {}): PlacedImage {
  let { width, height } = resolveSizes(img, box, options.width, options.height);

  // Never overflow the box (explicit sizes are clamped by proportional shrink)
  if (width > box.width || height > box.height) {
    const fitted = fitInBox({ width, height }, box.width, box.height);
    width = fitted.width;
    height = fitted.height;
  }

  const align = options.align ?? 'center';
  const x = align === 'left' ? 0 : align === 'right' ? box.width - width : (box.width - width) / 2;
  return { x, width, height };
}
