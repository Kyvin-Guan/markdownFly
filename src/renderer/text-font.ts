/**
 * Text-set font helpers for layout consumption.
 *
 * Layouts write a single `fontFace` per draw call. Schemes are uniform
 * (one typeface per scheme); helpers read `theme.textStyles` with full
 * fallback to legacy `theme.fonts` / `theme.fontSize`.
 */

import type { Theme } from '../models/theme.js';
import type { FontStyleEntry, TextSchemePositionKey } from '../models/text-set.js';

/** Position entry from theme.textStyles, if the text-set layer is filled. */
export function textStyleFor(
  theme: Theme,
  position: TextSchemePositionKey,
): FontStyleEntry | undefined {
  return theme.textStyles?.[position];
}

/** Single face for addText (uniform schemes: always entry.face). */
export function fontFaceFor(_text: string, entry: FontStyleEntry): string {
  return entry.face;
}

/** face for a layout position with legacy fallback. */
export function faceFor(
  theme: Theme,
  position: TextSchemePositionKey,
  fallback: string,
): string {
  return textStyleFor(theme, position)?.face ?? fallback;
}

/** size for a layout position with legacy fallback. */
export function sizeFor(
  theme: Theme,
  position: TextSchemePositionKey,
  fallback: number,
): number {
  return textStyleFor(theme, position)?.size ?? fallback;
}
