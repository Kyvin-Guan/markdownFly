/**
 * MarkdownFly — Main orchestration
 * Public API: convert(inputPath, options) → outputPath
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseMarkdown } from './parser/index.js';
import { renderPresentation } from './renderer/index.js';
import { getTheme } from './themes/index.js';
import { getOutputPath } from './utils/output-namer.js';

export interface ConvertOptions {
  output?: string;
  /**
   * User-facing theme name (same as CLI `-t` / frontmatter `theme`).
   * ThemePreset first (e.g. 'blue'), then ColorScheme (e.g. 'ocean').
   */
  theme?: string;
  /** ColorScheme override (CLI `--color` / frontmatter `color_scheme`) */
  colorScheme?: string;
  /** TextScheme override (CLI `--text` / frontmatter `text_scheme`) */
  textScheme?: string;
  /** LayoutScheme override (CLI `--layout` / frontmatter `layout_scheme`) */
  layoutScheme?: string;
}

/**
 * Convert a Markdown file to PPTX
 * @returns Absolute path of the generated .pptx file
 */
export async function convert(inputPath: string, options: ConvertOptions = {}): Promise<string> {
  const absInput = resolve(inputPath);
  const markdown = readFileSync(absInput, 'utf-8');

  // Parse
  const presentation = parseMarkdown(markdown, absInput);

  // Theme + slot overrides come from frontmatter as base, CLI/API wins.
  // Slots: explicit CLI/API > frontmatter > theme preset slots (> default).
  const baseTheme = options.theme ?? presentation.config.theme;
  const colorScheme = options.colorScheme ?? presentation.config.colorScheme;
  const textScheme = options.textScheme ?? presentation.config.textScheme;
  const layoutScheme = options.layoutScheme ?? presentation.config.layoutScheme;

  const theme = getTheme(baseTheme, { colorScheme, textScheme, layoutScheme });

  // Determine output path
  const outputPath = resolve(getOutputPath(absInput, options.output));

  // Render PPTX
  await renderPresentation(presentation, theme, outputPath, absInput);

  return outputPath;
}

// Re-export for library use
export { parseMarkdown } from './parser/index.js';
export {
  getTheme,
  themeNames,
  hasTheme,
  DEFAULT_SCHEME_NAME,
  resolveColorScheme,
  createThemeFromScheme,
  getColorScheme,
  listColorSchemes,
  registerColorScheme,
  oceanScheme,
  oceanDarkScheme,
  getTextScheme,
  listTextSchemes,
  registerTextScheme,
  textSchemes,
  systemTextScheme,
  academicTextScheme,
  kaiTextScheme,
  sourceHanSerifTextScheme,
  DEFAULT_TEXT_SCHEME_NAME,
  defineUniformTextScheme,
  layoutSchemes,
  getLayoutScheme,
  listLayoutSchemes,
  registerLayoutScheme,
  folioLayoutScheme,
  legacyLayoutScheme,
  DEFAULT_LAYOUT_SCHEME_NAME,
  themePresets,
  getThemePreset,
  listThemePresets,
  registerThemePreset,
  themePresetNames,
  hasThemePreset,
  bluePreset,
  DEFAULT_THEME_NAME,
  DEFAULT_PRESET_NAME,
  resolveThemePresetOption,
} from './themes/index.js';
export { renderDiagram, isDiagramLanguage } from './diagrams/index.js';
export { renderPresentation } from './renderer/index.js';
export type { Presentation, SlideNode, SlideElement } from './models/slide.js';
export type { Theme } from './models/theme.js';
export type { MarkdownFlyConfig } from './config/types.js';
export type { ColorScheme, ColorSchemeMode } from './models/color-scheme.js';
export type { LayoutScheme } from './models/layout-scheme.js';
export type { ThemePreset } from './models/theme-preset.js';
export type {
  FontStyleEntry,
  TextScheme,
  TextSchemePositionKey,
  UniformTextSchemeOptions,
} from './models/text-set.js';
export { resolveSchemeMode, CHROMATIC_SLOTS } from './models/color-scheme.js';
export { TEXT_SCHEME_POSITION_KEYS } from './models/text-set.js';
