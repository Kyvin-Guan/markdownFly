/**
 * Build a full Theme from a ColorScheme (+ optional font / text-set overrides).
 *
 * Text-set layer is the only font source: `textScheme` (default `system`)
 * bridges into Theme.fonts / Theme.fontSize. Explicit `options.fonts` /
 * `options.fontSize` still win when provided.
 *
 * The legacy `font-sets/` folder has been removed; do not reintroduce it.
 */

import type { ColorScheme } from '../models/color-scheme.js';
import { resolveSchemeMode } from '../models/color-scheme.js';
import { getColorScheme } from './color-schemes/index.js';
import type { LayoutScheme } from '../models/layout-scheme.js';
import type { Theme, ThemeFonts, ThemeFontSizes, ThemeLayouts, ThemeStyles } from '../models/theme.js';
import type { ThemePreset } from '../models/theme-preset.js';
import {
  DEFAULT_TEXT_SCHEME_NAME,
  type FontStyleEntry,
  type TextScheme,
  type TextSchemePositionKey,
} from '../models/text-set.js';
import { resolveColorScheme } from './resolve-scheme.js';
import { getLayoutScheme } from './layout-schemes/index.js';
import { getThemePreset } from './presets/index.js';
import { getTextScheme } from './text-schemes/text-index.js';

export interface ThemeFromSchemeOptions {
  fonts?: ThemeFonts;
  fontSize?: ThemeFontSizes;
  shikiTheme?: string;
  layouts?: Theme['layouts'];
  styles?: Theme['styles'];
  typography?: Theme['typography'];
  avoid?: string[];
  /** Color scheme name or object; defaults to the `scheme` argument */
  colorScheme?: string | ColorScheme;
  /** Text scheme name or object; defaults to `system` */
  textScheme?: string | TextScheme;
  /** Layout scheme name or object; omitted → layouts/styles stay unset (legacy) */
  layoutScheme?: string | LayoutScheme;
  /** ThemePreset name for provenance (`theme.presetSet`); does not drive slots here */
  presetSet?: string;
}

/** Resolve preset option → object; unknown name warns and returns undefined. */
export function resolveThemePresetOption(
  input?: string | ThemePreset,
): ThemePreset | undefined {
  if (input === undefined || input === null) return undefined;
  if (typeof input === 'object') return input;
  const name = input.trim();
  if (!name) return undefined;
  const preset = getThemePreset(name);
  if (!preset) {
    console.warn(`Theme preset "${name}" not found; using scheme defaults only`);
    return undefined;
  }
  return preset;
}

export function resolveColorSchemeOption(
  input?: string | ColorScheme,
): ColorScheme | undefined {
  if (input && typeof input === 'object') return input;
  if (typeof input !== 'string' || !input.trim()) return undefined;
  const name = input.trim();
  const scheme = getColorScheme(name);
  if (!scheme) {
    console.warn(`Color scheme "${name}" not found`);
    return undefined;
  }
  return scheme;
}

export function resolveTextSchemeOption(
  input?: string | TextScheme,
): TextScheme {
  if (input && typeof input === 'object') return input;
  const name =
    typeof input === 'string' && input.trim() ? input.trim() : DEFAULT_TEXT_SCHEME_NAME;
  const scheme = getTextScheme(name);
  if (!scheme) {
    if (typeof input === 'string' && input.trim()) {
      console.warn(`Text scheme "${name}" not found, using "${DEFAULT_TEXT_SCHEME_NAME}"`);
    }
    const fallback = getTextScheme(DEFAULT_TEXT_SCHEME_NAME);
    if (!fallback) {
      throw new Error(`Default text scheme "${DEFAULT_TEXT_SCHEME_NAME}" is not registered`);
    }
    return fallback;
  }
  return scheme;
}

/** Bridge TextScheme → ThemeFonts. Red-line `fonts.cjk` always written. */
export function bridgeFontsFromTextScheme(scheme: TextScheme): ThemeFonts {
  const p = scheme.positions;
  const body = p.body;
  const headingSource = p.slideTitle ?? p.coverTitle;
  return {
    body: body.face,
    cjk: body.cjkFace ?? body.face,
    heading: headingSource.face ?? body.face,
    code: p.code.face,
  };
}

export function bridgeFontSizesFromTextScheme(scheme: TextScheme): ThemeFontSizes {
  const p = scheme.positions;
  return {
    title: p.coverTitle.size,
    heading: p.slideTitle.size,
    body: p.body.size,
    code: p.code.size,
    small: p.small.size,
  };
}

function textStylesFromScheme(
  scheme: TextScheme,
): Partial<Record<TextSchemePositionKey, FontStyleEntry>> {
  return { ...scheme.positions };
}

/**
 * Resolve optional layoutScheme → scheme payload + layouts/styles.
 * Omitted or unknown name → layouts/styles/layoutSet undefined (legacy hard-coded fallbacks).
 */
export function resolveLayoutSchemeOption(
  input?: string | LayoutScheme,
): {
  layouts?: ThemeLayouts;
  styles?: ThemeStyles;
  layoutSet?: string;
  scheme?: LayoutScheme;
} {
  if (input === undefined) return {};
  if (typeof input === 'object' && input !== null) {
    return {
      layouts: input.layouts,
      styles: input.styles,
      layoutSet: input.name,
      scheme: input,
    };
  }
  const name = input.trim();
  if (!name) return {};
  const scheme = getLayoutScheme(name);
  if (!scheme) {
    console.warn(`Layout scheme "${name}" not found, using built-in layout defaults`);
    return {};
  }
  return {
    layouts: scheme.layouts,
    styles: scheme.styles,
    layoutSet: scheme.name,
    scheme,
  };
}

export function createThemeFromScheme(
  scheme: ColorScheme,
  options: ThemeFromSchemeOptions = {},
): Theme {
  const colorScheme = resolveColorSchemeOption(options.colorScheme) ?? scheme;
  const textScheme = resolveTextSchemeOption(options.textScheme);

  const fonts = options.fonts ?? bridgeFontsFromTextScheme(textScheme);
  const fontSize = options.fontSize ?? bridgeFontSizesFromTextScheme(textScheme);
  const fromLayout = resolveLayoutSchemeOption(options.layoutScheme);

  return {
    name: scheme.name,
    colors: resolveColorScheme(colorScheme),
    fonts,
    fontSize,
    shikiTheme:
      options.shikiTheme ??
      (resolveSchemeMode(colorScheme) === 'dark' ? 'github-dark' : 'github-light'),
    layouts: options.layouts ?? fromLayout.layouts,
    styles: options.styles ?? fromLayout.styles,
    typography: options.typography,
    avoid: options.avoid,
    textSet: textScheme.name,
    textScheme,
    textStyles: textStylesFromScheme(textScheme),
    layoutSet: fromLayout.layoutSet,
    presetSet: options.presetSet,
  };
}
