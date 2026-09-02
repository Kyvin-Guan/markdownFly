/**
 * Layout Registry
 * Routes SlideNode to the correct layout renderer
 */

import PptxGenJS from 'pptxgenjs';
import type { SlideNode } from '../../models/slide.js';
import type { Theme } from '../../models/theme.js';
import { renderTitleSlide } from './title.js';
import { renderSectionSlide } from './section.js';
import { renderContentSlide } from './content.js';
import { renderCodeSlide } from './code.js';
import { renderQuoteSlide } from './quote.js';

/** Context passed to layout renderers for async operations */
export interface RenderContext {
  highlightCode: (code: string, language: string) => Promise<PptxGenJS.TextProps[]>;
  resolveImage: (src: string) => Promise<{ path?: string; data?: string } | null>;
  renderDiagram: (diagramType: string, code: string) => Promise<Buffer>;
}

/**
 * Render a slide using the appropriate layout
 */
export async function renderSlideLayout(
  slide: PptxGenJS.Slide,
  node: SlideNode,
  theme: Theme,
  ctx: RenderContext,
): Promise<void> {
  switch (node.layout) {
    case 'title':
      renderTitleSlide(slide, node, theme);
      break;

    case 'section':
      renderSectionSlide(slide, node, theme);
      break;

    case 'code':
      await renderCodeSlide(slide, node, theme, ctx);
      break;

    case 'quote':
      renderQuoteSlide(slide, node, theme);
      break;

    case 'content':
    default:
      await renderContentSlide(slide, node, theme, ctx);
      break;
  }

  // Add speaker notes if present
  if (node.notes) {
    slide.addNotes(node.notes);
  }
}
