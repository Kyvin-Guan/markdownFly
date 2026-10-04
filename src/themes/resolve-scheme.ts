/**
 * Resolve a compact ColorScheme (ink/paper/primary/secondary) into ThemeColors.
 *
 * Compatibility: output uses only current ThemeColors fields. Renderer and
 * diagrams/theme.ts (isDarkTheme → colors.background) keep working unchanged.
 * background is always a bare hex without '#'.
 *
 * Role contract (author-facing, never swapped):
 *   paper → colors.background
 *   ink   → colors.text
 *
 * `accent` is required on ThemeColors but is NOT a ColorScheme slot — it is
 * derived (primary mixed toward ink) so existing accent consumers keep working
 * while the authored palette stays at four colors.
 */

import type { ColorScheme } from '../models/color-scheme.js';
import { resolveSchemeMode } from '../models/color-scheme.js';
import type { ThemeColors } from '../models/theme.js';
import { mixHex } from '../utils/color-mix.js';

export function resolveColorScheme(scheme: ColorScheme): ThemeColors {
  const { primary, secondary, ink, paper } = scheme;
  // paper is always the page surface; dark only tunes derived surfaces
  const dark = resolveSchemeMode(scheme) === 'dark';

  const background = paper;
  const text = ink;

  // Emphasis stand-in for legacy accent consumers: deeper primary
  const accent = mixHex(primary, ink, 0.45);

  // Code block: light decks use a fixed white panel (matches github-light
  // shiki); dark decks keep a lifted dark panel so tokens stay readable.
  const codeBackground = dark ? mixHex(paper, ink, 0.35) : 'FFFFFF';
  const codeText = dark ? mixHex(ink, paper, 0.15) : ink;

  // Cover: primary-tinted surface + ink text
  const titleBackground = mixHex(paper, primary, 0.12);
  const titleText = ink;

  // Marked lines in code: lift from codeBackground toward primary
  const highlightBackground = mixHex(codeBackground, primary, 0.28);

  // Secondary body text: secondary mixed with reading ink
  const secondaryText = mixHex(secondary, ink, 0.25);

  return {
    primary,
    secondary: secondaryText,
    background,
    text,
    accent,
    codeBackground,
    codeText,
    titleBackground,
    titleText,
    highlightBackground,
    accents: [primary, secondary],
    subtitle: secondaryText,
    divider: mixHex(ink, paper, 0.45),
    muted: mixHex(ink, paper, 0.35),
    tableHeader: mixHex(paper, primary, 0.12),
    tableZebra: mixHex(paper, ink, 0.04),
  };
}
