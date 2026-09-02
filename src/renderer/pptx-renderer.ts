/**
 * PPTX Renderer
 * Orchestrates pptxgenjs to produce .pptx files from Presentation
 */

import PptxGenJS from 'pptxgenjs';
import type { Presentation } from '../models/slide.js';
import type { Theme } from '../models/theme.js';
import { renderSlideLayout } from './layouts/index.js';
import { highlightCode } from './code-highlighter.js';
import { resolveImage } from './image-handler.js';
import { renderDiagram } from '../diagrams/index.js';

import { writeFileSync } from 'node:fs';

/**
 * Render a Presentation to a .pptx file
 */
export async function renderPresentation(
  presentation: Presentation,
  theme: Theme,
  outputPath: string,
  inputPath: string = '',
): Promise<void> {
  const pptx = new PptxGenJS();

  // Configure presentation
  pptx.layout = 'LAYOUT_WIDE'; // 16:9 = 13.33" x 7.5"
  pptx.author = presentation.config.author ?? 'MarkdownFly';
  pptx.title = presentation.slides[0]?.title ?? 'Presentation';

  // Build render context
  const ctx = {
    highlightCode: async (code: string, language: string) => {
      return highlightCode(code, language, theme) as unknown as Promise<PptxGenJS.TextProps[]>;
    },
    resolveImage: async (src: string) => {
      return resolveImage(src, inputPath);
    },
    renderDiagram: async (diagramType: string, code: string) => {
      return renderDiagram(diagramType, code, theme);
    },
  };

  // Render each slide
  for (const node of presentation.slides) {
    const slide = pptx.addSlide();

    // Set default background
    slide.background = { color: theme.colors.background };

    await renderSlideLayout(slide, node, theme, ctx);
  }

  // Write file using nodebuffer for 100% reliable path handling across OS
  const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
  writeFileSync(outputPath, Buffer.from(buffer));
}
