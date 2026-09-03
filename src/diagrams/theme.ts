/**
 * Diagram theme helpers
 * Shared between mermaid/dot renderers so diagrams follow the presentation theme
 */

import type { Theme } from '../models/theme.js';

/**
 * True when the theme background is dark (perceived luminance below 50%)
 */
export function isDarkColor(hex: string): boolean {
  const clean = hex.replace(/^#/, '');
  if (clean.length < 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return false;
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

export function isDarkTheme(theme?: Theme): boolean {
  return theme ? isDarkColor(theme.colors.background) : false;
}

/**
 * Font stack for diagram text: prefers the theme's CJK font so Chinese labels
 * do not fall back to a Latin-only face, e.g. `"微软雅黑", "Segoe UI", sans-serif`
 */
export function diagramFontFamily(theme?: Theme): string {
  if (!theme) return '"trebuchet ms", sans-serif';
  return `"${theme.fonts.cjk}", "${theme.fonts.body}", sans-serif`;
}
