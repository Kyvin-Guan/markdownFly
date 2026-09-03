/**
 * Theme type definitions
 */

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
