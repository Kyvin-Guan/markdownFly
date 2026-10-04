/**
 * ColorScheme — minimal user-facing palette for the PPT design system.
 *
 * A scheme is exactly four slots:
 *   ink      — text (titles, body)
 *   paper    — page background
 *   primary  — main decoration bars / large color blocks
 *   secondary— auxiliary elements / secondary info
 *
 * Emphasis is expressed by weight, size, rules, and whitespace — not by an
 * extra chromatic slot. `ThemeColors.accent` is still produced for legacy
 * renderers, derived from primary (deeper mix toward ink).
 *
 * Built-in presets and user customs share this exact shape.
 */

import { isDarkColor } from '../utils/color-mix.js';

export type ColorSchemeMode = 'light' | 'dark';

export interface ColorScheme {
  /** Stable id, e.g. 'ocean' */
  name: string;
  /**
   * Surface polarity hint (drives shiki default). Optional — inferred from
   * paper luminance when omitted. Does NOT swap ink/paper: ink is always
   * text, paper is always background.
   */
  mode?: ColorSchemeMode;
  /** Text color: titles + body */
  ink: string;
  /** Page background */
  paper: string;
  /** Primary: main decoration bars, large color blocks */
  primary: string;
  /** Secondary: auxiliary elements, secondary information */
  secondary: string;
}

/** Chromatic slots exposed on ThemeColors.accents[] (emphasis is non-chromatic) */
export const CHROMATIC_SLOTS = ['primary', 'secondary'] as const;

export type ChromaticSlot = (typeof CHROMATIC_SLOTS)[number];

/** light/dark from paper luminance (explicit mode wins); ink/paper are never swapped */
export function resolveSchemeMode(scheme: ColorScheme): ColorSchemeMode {
  if (scheme.mode) return scheme.mode;
  return isDarkColor(scheme.paper) ? 'dark' : 'light';
}
