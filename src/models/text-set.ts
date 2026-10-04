/**
 * Text-set types — three layers: registry → TextScheme → shared FontStyleEntry.
 *
 * Policy (user decision): one scheme uses ONE typeface for Chinese and
 * English alike. No sentence-level dual fonts, no OOXML a:ea rewrite.
 * `cjkFace` remains only as an optional bridge hint for diagrams (`fonts.cjk`);
 * when omitted, diagrams fall back to `face`.
 *
 * Compatibility: additive on Theme; existing fields unchanged.
 * Entries carry no color (ColorScheme owns color) and no text transform.
 */

/** One font-style entry. `face` is the typeface used for all scripts. */
export interface FontStyleEntry {
  /** Typeface for this position (pptxgenjs `fontFace`) */
  face: string;
  /**
   * Optional CJK hint for diagram bridge (`theme.fonts.cjk`).
   * Omit for uniform schemes — bridge uses `face`.
   */
  cjkFace?: string;
  size: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  letterSpacing?: number;
  lineSpacing?: number;
}

/** Fixed position keys — every TextScheme must supply all six. */
export type TextSchemePositionKey =
  | 'coverTitle'
  | 'slideTitle'
  | 'body'
  | 'quote'
  | 'code'
  | 'small';

export const TEXT_SCHEME_POSITION_KEYS = [
  'coverTitle',
  'slideTitle',
  'body',
  'quote',
  'code',
  'small',
] as const satisfies readonly TextSchemePositionKey[];

export type TextSchemePositions = Record<TextSchemePositionKey, FontStyleEntry>;

export interface TextScheme {
  name: string;
  /** Fixed six positions → FontStyleEntry (object references for sharing) */
  positions: TextSchemePositions;
  /** Documentation only */
  note?: string;
}

export const DEFAULT_TEXT_SCHEME_NAME = 'system';

export const DEFAULT_UNIFORM_SIZES: Record<TextSchemePositionKey, number> = {
  coverTitle: 36,
  slideTitle: 28,
  body: 18,
  quote: 20,
  code: 14,
  small: 12,
};

export interface UniformTextSchemeOptions {
  name: string;
  /** Single typeface for titles, body, quote, small (CN + EN) */
  face: string;
  /** Code face; defaults to Consolas */
  codeFace?: string;
  /** Reuse a shared code entry (object identity) instead of creating one */
  codeEntry?: FontStyleEntry;
  sizes?: Partial<Record<TextSchemePositionKey, number>>;
  /** Defaults: coverTitle + slideTitle bold */
  bold?: Partial<Record<TextSchemePositionKey, boolean>>;
  /** Defaults: quote italic */
  italic?: Partial<Record<TextSchemePositionKey, boolean>>;
  note?: string;
}

/**
 * Build a complete TextScheme from one typeface — the happy path for
 * adding a scheme: one file + one registry line.
 */
export function defineUniformTextScheme(options: UniformTextSchemeOptions): TextScheme {
  const sizes = { ...DEFAULT_UNIFORM_SIZES, ...options.sizes };
  const boldOn: Partial<Record<TextSchemePositionKey, boolean>> = {
    coverTitle: true,
    slideTitle: true,
    ...options.bold,
  };
  const italicOn: Partial<Record<TextSchemePositionKey, boolean>> = {
    quote: true,
    ...options.italic,
  };

  const make = (key: TextSchemePositionKey, face: string): FontStyleEntry => {
    const entry: FontStyleEntry = { face, size: sizes[key] };
    if (boldOn[key]) entry.bold = true;
    if (italicOn[key]) entry.italic = true;
    return entry;
  };

  return {
    name: options.name,
    note: options.note ?? `Uniform typeface: ${options.face}`,
    positions: {
      coverTitle: make('coverTitle', options.face),
      slideTitle: make('slideTitle', options.face),
      body: make('body', options.face),
      quote: make('quote', options.face),
      code:
        options.codeEntry ??
        make('code', options.codeFace ?? 'Consolas'),
      small: make('small', options.face),
    },
  };
}
