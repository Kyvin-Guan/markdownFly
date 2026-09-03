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
  highlightCode: (code: string, language: string, highlightLines?: number[]) => Promise<PptxGenJS.TextProps[]>;
  resolveImage: (src: string) => Promise<{ path?: string; data?: string } | null>;
  renderDiagram: (diagramType: string, code: string) => Promise<Buffer>;
  /** Page footer template with {page}/{total}/{section}/{title} placeholders */
  footerTemplate?: string;
  pageNumber?: number;
  totalSlides?: number;
  /** Title of the most recent section layout slide ({section} placeholder) */
  currentSection?: string;
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
  // @(background=...) overrides the slide's background (image or theme color)
  if (node.directives?.background) {
    const resolved = await ctx.resolveImage(node.directives.background);
    if (resolved?.path) {
      slide.background = { path: resolved.path };
    } else if (node.directives.background.startsWith('#')) {
      slide.background = { color: node.directives.background.replace(/^#/, '') };
    }
  }

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

  // Footer / page number (skip cover slides)
  if (node.layout !== 'title' && node.layout !== 'closing' && node.layout !== 'blank') {
    const footerText = renderFooter(node, theme, ctx);
    if (footerText) {
      slide.addText(footerText, {
        x: 0.6,
        y: 7.16,
        w: 12.13,
        h: 0.28,
        fontSize: theme.fontSize.small - 1,
        fontFace: theme.fonts.body,
        color: theme.colors.secondary,
        align: 'right',
        valign: 'middle',
      });
    }
  }
}

/** Compose the per-slide footer line from context (section tracking + config footer) */
function renderFooter(node: SlideNode, theme: Theme, ctx: RenderContext): string {
  const template = ctx.footerTemplate;
  if (!template) return '';
  return template
    .replace('{page}', String(ctx.pageNumber))
    .replace('{total}', String(ctx.totalSlides))
    .replace('{section}', ctx.currentSection || '')
    .replace('{title}', node.title ?? '');
}
