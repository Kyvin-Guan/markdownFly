/**
 * Theme type definitions
 */

export interface ThemeGradient {
  /** Gradient start color (hex, without '#') */
  from: string;
  /** Gradient end color (hex, without '#') */
  to: string;
  /** CSS-style angle: 0 = to top, 90 = to right, 180 = to bottom, 135 = to bottom-right */
  angle?: number;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
  codeBackground: string;
  codeText: string;
  titleBackground?: string;
  titleText?: string;
  /** Background color used to mark @(highlight=...) lines in code blocks */
  highlightBackground?: string;
  /**
   * Optional linear gradient stretched over the whole slide.
   * When set it wins over `background` (and over `titleBackground` on cover slides);
   * `background` stays as the flat fallback and drives dark/light detection for diagrams.
   */
  backgroundGradient?: ThemeGradient;
}

export interface ThemeFonts {
  heading: string;
  body: string;
  code: string;
  cjk: string;
}

export interface ThemeFontSizes {
  title: number;
  heading: number;
  body: number;
  code: number;
  small: number;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  fontSize: ThemeFontSizes;
  shikiTheme?: string;
}
