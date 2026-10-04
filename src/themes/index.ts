import type { Theme } from '../models/theme.js';
import type { ColorScheme } from '../models/color-scheme.js';
import type { LayoutScheme } from '../models/layout-scheme.js';
import type { TextScheme } from '../models/text-set.js';
import type { ThemePreset } from '../models/theme-preset.js';
import { DEFAULT_THEME_NAME } from '../models/theme-preset.js';
import { createThemeFromScheme } from './from-scheme.js';
import { getColorScheme, listColorSchemes } from './color-schemes/index.js';
import { getThemePreset, listThemePresets } from './presets/index.js';
import { DEFAULT_TEXT_SCHEME_NAME } from './text-schemes/text-index.js';
import { resolveThemePresetOption } from './from-scheme.js';

/** Color-only fallback when a ColorScheme name is unknown */
export const DEFAULT_SCHEME_NAME = 'ocean';

export interface GetThemeOptions {
  /** Color scheme name or resolved ColorScheme (overrides preset slot) */
  colorScheme?: string | ColorScheme;
  /** Text scheme name or resolved TextScheme (overrides preset slot) */
  textScheme?: string | TextScheme;
  /** Layout scheme name or resolved LayoutScheme (overrides preset slot) */
  layoutScheme?: string | LayoutScheme;
  /**
   * Optional ThemePreset object for advanced callers.
   * The user-facing path is the `name` argument (`-t` / frontmatter `theme`).
   */
  preset?: string | ThemePreset;
}

type ThemeNameResolution =
  | { kind: 'preset'; preset: ThemePreset }
  | { kind: 'color'; colorName: string }
  | { kind: 'default' };

/**
 * Resolve a user-facing theme name (CLI `-t` / frontmatter `theme`).
 * Order: ThemePreset → ColorScheme → default theme (blue).
 */
function resolveThemeName(name?: string | null): ThemeNameResolution {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  const key = trimmed || DEFAULT_THEME_NAME;

  const preset = getThemePreset(key);
  if (preset) return { kind: 'preset', preset };

  if (getColorScheme(key)) return { kind: 'color', colorName: key };

  return { kind: 'default' };
}

/**
 * Build a Theme from a user-facing theme name.
 *
 * - `blue` (or any ThemePreset) → full package (color × text × layout)
 * - `ocean` / `ocean-dark` (ColorScheme only) → color path; text `system`;
 *   layouts stay unset unless `options.layoutScheme` is passed
 * - omitted / unknown → default theme `blue` (unknown warns)
 *
 * Non-string `name` values still throw (CLI contract).
 */
export function getTheme(name?: string, options: GetThemeOptions = {}): Theme {
  if (name !== undefined && name !== null && typeof name !== 'string') {
    throw new Error(`Invalid theme value: expected a string, got ${typeof name}`);
  }

  // Advanced: explicit preset object still wins for its slots when provided
  const explicitPreset = resolveThemePresetOption(options.preset);
  const resolved = resolveThemeName(name);

  if (resolved.kind === 'preset' || (resolved.kind === 'default' && !explicitPreset)) {
    const preset =
      resolved.kind === 'preset'
        ? resolved.preset
        : (getThemePreset(DEFAULT_THEME_NAME) as ThemePreset);

    if (resolved.kind === 'default' && name?.trim()) {
      console.warn(`Theme "${name}" not found, using "${preset.name}"`);
    }

    return createThemeFromScheme(getColorScheme(preset.colorScheme)!, {
      colorScheme: options.colorScheme,
      textScheme: options.textScheme ?? preset.textScheme,
      layoutScheme: options.layoutScheme ?? preset.layoutScheme,
      presetSet: preset.name,
    });
  }

  if (resolved.kind === 'default' && explicitPreset) {
    // unknown name but options.preset provided
    console.warn(`Theme "${name}" not found, using preset "${explicitPreset.name}"`);
    return createThemeFromScheme(getColorScheme(explicitPreset.colorScheme)!, {
      colorScheme: options.colorScheme,
      textScheme: options.textScheme ?? explicitPreset.textScheme,
      layoutScheme: options.layoutScheme ?? explicitPreset.layoutScheme,
      presetSet: explicitPreset.name,
    });
  }

  // ColorScheme-only path (README `-t ocean` / `-t ocean-dark`)
  const colorName =
    resolved.kind === 'color' ? resolved.colorName : explicitPreset!.colorScheme;
  return createThemeFromScheme(getColorScheme(colorName)!, {
    colorScheme: options.colorScheme,
    textScheme: options.textScheme ?? explicitPreset?.textScheme,
    layoutScheme: options.layoutScheme ?? explicitPreset?.layoutScheme,
    presetSet: explicitPreset?.name,
  });
}

/** User-facing theme names: presets first, then color-only schemes. */
export function themeNames(): string[] {
  const presets = listThemePresets().map((p) => p.name.toLowerCase());
  const colors = listColorSchemes().map((s) => s.name.toLowerCase());
  return [...presets, ...colors.filter((c) => !presets.includes(c))];
}

/** Whether `name` is a known user-facing theme (preset or color scheme). */
export function hasTheme(name?: string): boolean {
  if (!name) return false;
  return Boolean(getThemePreset(name) || getColorScheme(name));
}

// ColorScheme pipeline
export { resolveColorScheme } from './resolve-scheme.js';
export { createThemeFromScheme } from './from-scheme.js';
export type { ThemeFromSchemeOptions } from './from-scheme.js';
export {
  colorSchemes,
  getColorScheme,
  listColorSchemes,
  registerColorScheme,
  oceanScheme,
  oceanDarkScheme,
} from './color-schemes/index.js';

// Text-set pipeline (v5.1)
export {
  textSchemes,
  getTextScheme,
  listTextSchemes,
  registerTextScheme,
  systemTextScheme,
  academicTextScheme,
  kaiTextScheme,
  sourceHanSerifTextScheme,
  DEFAULT_TEXT_SCHEME_NAME,
} from './text-schemes/text-index.js';
export {
  bridgeFontsFromTextScheme,
  bridgeFontSizesFromTextScheme,
  resolveTextSchemeOption,
  resolveLayoutSchemeOption,
} from './from-scheme.js';
export { defineUniformTextScheme } from '../models/text-set.js';

// Layout-set pipeline (step 3)
export {
  layoutSchemes,
  getLayoutScheme,
  listLayoutSchemes,
  registerLayoutScheme,
  folioLayoutScheme,
  legacyLayoutScheme,
} from './layout-schemes/index.js';
export { DEFAULT_LAYOUT_SCHEME_NAME } from '../models/layout-scheme.js';
export type { LayoutScheme } from '../models/layout-scheme.js';

// Theme-preset pipeline (step 5) — presets are user-facing theme names
export {
  themePresets,
  getThemePreset,
  listThemePresets,
  registerThemePreset,
  themePresetNames,
  hasThemePreset,
  bluePreset,
  emeraldPreset,
  goldPreset,
  slatePreset,
} from './presets/index.js';
export { DEFAULT_THEME_NAME, DEFAULT_PRESET_NAME } from '../models/theme-preset.js';
export type { ThemePreset } from '../models/theme-preset.js';
export { resolveThemePresetOption } from './from-scheme.js';
