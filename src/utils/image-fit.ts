/**
 * Image placement helpers
 */

export interface Size {
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
