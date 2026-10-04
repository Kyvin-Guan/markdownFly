/**
 * ThemePreset — named package selecting one ColorScheme × TextScheme × LayoutScheme.
 *
 * User-facing theme names resolve via `theme` / `-t`:
 *   ThemePreset first, then ColorScheme (legacy color-only path).
 */

export interface ThemePreset {
  /** Stable id used as the user-facing theme name, e.g. 'blue' */
  name: string;
  /** Registered ColorScheme name */
  colorScheme: string;
  /** Registered TextScheme name */
  textScheme: string;
  /** Registered LayoutScheme name */
  layoutScheme: string;
  /** Reserved for step 4 background-set — not consumed yet */
  backgroundScheme?: string;
  /** Documentation only */
  note?: string;
}

/** Default theme when `-t` / frontmatter `theme` is omitted. */
export const DEFAULT_THEME_NAME = 'blue';

/** @deprecated Use DEFAULT_THEME_NAME; kept as alias for older imports. */
export const DEFAULT_PRESET_NAME = DEFAULT_THEME_NAME;
