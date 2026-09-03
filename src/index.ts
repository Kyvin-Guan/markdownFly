/**
 * MarkdownFly — Main orchestration
 * Public API: convert(inputPath, options) → outputPath
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseMarkdown } from './parser/index.js';
import { renderPresentation } from './renderer/index.js';
import { getTheme } from './themes/index.js';
import { enhanceWithAI } from './ai/index.js';
import { getOutputPath } from './utils/output-namer.js';

export interface ConvertOptions {
  output?: string;
  theme?: string;
  ai?: boolean;
}

/**
 * Convert a Markdown file to PPTX
 * @returns Absolute path of the generated .pptx file
 */
export async function convert(inputPath: string, options: ConvertOptions = {}): Promise<string> {
  const absInput = resolve(inputPath);
  const markdown = readFileSync(absInput, 'utf-8');

  // Parse
  const presentation = parseMarkdown(markdown);

  // Merge CLI options into config
  if (options.theme) presentation.config.theme = options.theme;
  if (options.ai !== undefined) presentation.config.ai = options.ai;

  // Get theme
  const theme = getTheme(presentation.config.theme);

  // AI enhancement (Phase 2 — currently pass-through)
  if (presentation.config.ai) {
    presentation.slides = await enhanceWithAI(presentation.slides, theme, {
      layout: presentation.config.aiLayout,
      polish: presentation.config.aiPolish,
      notes: presentation.config.aiNotes,
    });
  }

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
  themes,
  cleanTheme,
  academicTheme,
  darkTheme,
  businessTheme,
  warmTheme,
  defaultTheme,
} from './themes/index.js';
export { renderDiagram, isDiagramLanguage } from './diagrams/index.js';
export type { Presentation, SlideNode, SlideElement } from './models/slide.js';
export type { Theme } from './models/theme.js';
export type { MarkdownFlyConfig } from './config/types.js';
