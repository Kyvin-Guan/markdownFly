/**
 * Slide background resolver
 * Turns the theme's flat color (or linear gradient) into pptxgenjs background props.
 * Gradient PNGs are generated once and cached per gradient definition.
 */

import type { Theme } from '../models/theme.js';
import { createLinearGradientPng } from '../utils/gradient.js';

const cache = new Map<string, string>();

export interface SlideBackgroundProps {
  /** Flat fallback color; pptxgenjs ignores it when an image `data` is present */
  color: string;
  /** Base64 PNG stretched over the slide (gradient themes only) */
  data?: string;
}

export function slideBackground(theme: Theme): SlideBackgroundProps {
  const gradient = theme.colors.backgroundGradient;
  if (!gradient) return { color: theme.colors.background };

  const key = `${gradient.from}|${gradient.to}|${gradient.angle ?? 180}`;
  let data = cache.get(key);
  if (!data) {
    // 192×108 keeps 16:9 so angles look the same as the rendered slide
    const png = createLinearGradientPng(gradient.from, gradient.to, gradient.angle ?? 180, {
      width: 192,
      height: 108,
    });
    data = `image/png;base64,${png.toString('base64')}`;
    cache.set(key, data);
  }
  return { color: theme.colors.background, data };
}
