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

  const { resourceDir } = presentation.config;

  // Build render context
  const ctx = {
    highlightCode: async (code: string, language: string, highlightLines: number[] = []) => {
      return highlightCode(code, language, theme, highlightLines) as unknown as Promise<PptxGenJS.TextProps[]>;
    },
    resolveImage: async (src: string) => {
      return resolveImage(src, resourceDir || inputPath);
    },
    renderDiagram: async (diagramType: string, code: string) => {
      return renderDiagram(diagramType, code, theme);
    },
    footerTemplate: presentation.config.footer,
    pageNumber: 0,
    totalSlides: presentation.slides.length,
    currentSection: '',
  };

  // Render each slide
  for (let i = 0; i < presentation.slides.length; i++) {
    const node = presentation.slides[i];
    const slide = pptx.addSlide();

    // Set default background
    slide.background = { color: theme.colors.background };

    ctx.pageNumber = i + 1;
    if (node.layout === 'section' && node.title) {
      ctx.currentSection = node.title;
    }

    await renderSlideLayout(slide, node, theme, ctx);
  }

  // Write file using nodebuffer for 100% reliable path handling across OS
  const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
  writeFileSync(outputPath, Buffer.from(buffer));
}
