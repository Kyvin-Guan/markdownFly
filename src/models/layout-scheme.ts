/**
 * LayoutScheme — named package of layout parameters (placement only).
 *
 * Parallel to ColorScheme / TextScheme: registry → scheme → Theme.
 * Does not carry fonts or colors; those stay in text-schemes / color-schemes.
 */

import type { ThemeLayouts, ThemeStyles } from './theme.js';

export interface LayoutScheme {
  /** Stable id, e.g. 'default' */
  name: string;
  /** Per-page-type placement parameters */
  layouts: ThemeLayouts;
  /** Decoration knobs shared across pages */
  styles?: ThemeStyles;
  /** Documentation only */
  note?: string;
}

export const DEFAULT_LAYOUT_SCHEME_NAME = 'folio';
