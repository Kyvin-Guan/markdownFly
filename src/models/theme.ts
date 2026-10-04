/**
 * Theme type definitions
 *
 * Compatibility: existing fields are never renamed, retyped, or removed.
 * New capabilities are added as optional fields only; consumers fall back
 * with `?? legacyField`. Deprecated fields keep a `@deprecated` JSDoc tag.
 */

import type {
  FontStyleEntry,
  TextScheme,
  TextSchemePositionKey,
} from './text-set.js';

export type {
  FontStyleEntry,
  TextScheme,
  TextSchemePositionKey,
} from './text-set.js';

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

  // --- Optional extensions (all fall back to legacy fields) ---

  /** Accent color group; prefer `accents[0]` over the legacy `accent` when both are set */
  accents?: string[];
  /** Subtitle text color; falls back to `secondary` */
  subtitle?: string;
  /** Divider / decoration-bar color; falls back to `primary` */
  divider?: string;
  /** Muted text (footnotes, annotations); falls back to `secondary` */
  muted?: string;
  /** Table header background; falls back to `primary` */
  tableHeader?: string;
  /** Table zebra-row background; falls back to `background` */
  tableZebra?: string;
}

export interface ThemeFonts {
  heading: string;
  body: string;
  code: string;
  cjk: string;

  /** Cover-title face; falls back to `heading` */
  title?: string;
  /** Subtitle face; falls back to `heading` */
  subtitle?: string;
  /** Quote face; falls back to `body` */
  quote?: string;
}

export interface ThemeFontSizes {
  title: number;
  heading: number;
  body: number;
  code: number;
  small: number;

  /** Subtitle size; falls back to `body` */
  subtitle?: number;
  /** Caption / table-note size; falls back to `small` */
  caption?: number;
}

/** Layout parameters shared by all themes (data-parameter style, not coordinates) */
export interface ThemeLayoutSpec {
  /** Variant name interpreted by each layout function */
  variant?: string;
  titleAlign?: 'left' | 'center' | 'right';
  /** Decoration-bar position; use 'none' to hide */
  accentBar?: 'left' | 'bottom' | 'top' | 'none';
  /** Title-zone height in inches */
  titleHeight?: number;
  /** Content-zone padding in inches */
  contentPadding?: number;
  /** Page margin in inches (overrides the layout's built-in MARGIN) */
  margin?: number;
  /** Whether to draw the footer divider line */
  footerDivider?: boolean;
  /** Free-form extras interpreted by individual layout functions */
  extra?: Record<string, string | number | boolean>;
}

export interface ThemeLayouts {
  title?: ThemeLayoutSpec;
  section?: ThemeLayoutSpec;
  content?: ThemeLayoutSpec;
  code?: ThemeLayoutSpec;
  quote?: ThemeLayoutSpec;
  closing?: ThemeLayoutSpec;
  imageSingle?: ThemeLayoutSpec;
  imageDouble?: ThemeLayoutSpec;
  imageTriple?: ThemeLayoutSpec;
  /** Footer geometry / divider (consumed by layouts/index.ts) */
  footer?: ThemeLayoutSpec;
}

export interface ThemeStyles {
  /** Code-block corner radius in pt */
  codeRadius?: number;
  /** Code-block border color */
  codeBorder?: string;
  /** Whether the cover shows a corner badge / logo slot */
  coverBadge?: boolean;
  /** Section-page accent-bar width in inches */
  sectionBarWidth?: number;
  /** Whether non-cover pages draw a footer divider line */
  footerDivider?: boolean;
}

/** Per-role text style; every property overrides the matching legacy field */
export interface ThemeTextStyle {
  face?: string;
  size?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  /** Letter spacing in pt (pptxgenjs `charSpacing`) */
  letterSpacing?: number;
  /** Line-spacing multiplier (1.0 = single) */
  lineSpacing?: number;
  textTransform?: 'upper' | 'lower' | 'none';
}

/** Typographic styles organized by role; layout falls back to fonts/fontSize/colors */
export interface ThemeTypography {
  title?: ThemeTextStyle;
  subtitle?: ThemeTextStyle;
  heading?: ThemeTextStyle;
  body?: ThemeTextStyle;
  bodyStrong?: ThemeTextStyle;
  bodyEm?: ThemeTextStyle;
  code?: ThemeTextStyle;
  inlineCode?: ThemeTextStyle;
  quote?: ThemeTextStyle;
  caption?: ThemeTextStyle;
  footer?: ThemeTextStyle;
  tableHeader?: ThemeTextStyle;
  tableCell?: ThemeTextStyle;
}

/** Background resource: flat color, gradient, or image with optional overlay */
export interface ThemeBackground {
  type: 'color' | 'gradient' | 'image';
  /** Used when type === 'color'; falls back to `colors.background` */
  color?: string;
  /** Used when type === 'gradient'; falls back to `colors.backgroundGradient` */
  gradient?: ThemeGradient;
  /** Used when type === 'image'; overlay keeps text readable */
  image?: {
    src: string;
    /** Overlay hex color (e.g. 'FFFFFF' / '000000') */
    overlay?: string;
    /** Overlay opacity 0~1, default 0.35 */
    overlayOpacity?: number;
  };
}

export interface Theme {
  name: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  fontSize: ThemeFontSizes;
  shikiTheme?: string;

  /** Per-layout visual parameters (optional; layouts fall back to built-in values) */
  layouts?: ThemeLayouts;
  /** Decoration / code-block styling knobs */
  styles?: ThemeStyles;
  /** Role-based typography overrides */
  typography?: ThemeTypography;
  /** Background resource pool (color / gradient / image+overlay) */
  background?: ThemeBackground;
  /** Reverse design traps for this theme (documentation only, not rendered) */
  avoid?: string[];

  // --- Text-set layer (optional; independent of typography) ---

  /** Activated TextScheme name (e.g. 'system' / 'academic') */
  textSet?: string;
  /** Resolved TextScheme */
  textScheme?: TextScheme;
  /** Position → FontStyleEntry from the scheme (object references) */
  textStyles?: Partial<Record<TextSchemePositionKey, FontStyleEntry>>;

  // --- Layout-set layer (optional) ---

  /** Activated LayoutScheme name (e.g. 'folio' / 'legacy') */
  layoutSet?: string;

  // --- Theme-preset layer (optional; step 5) ---

  /** Activated ThemePreset name when resolved via `preset` (e.g. 'tech-share') */
  presetSet?: string;
}
