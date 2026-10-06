/**
 * Layout Registry
 * Routes SlideNode to the correct layout renderer
 */

import PptxGenJS from 'pptxgenjs';
import type { SlideNode } from '../../models/slide.js';
import type { Theme } from '../../models/theme.js';
import type { ImageResolution } from '../image-handler.js';
import { log } from '../../utils/progress.js';
import { renderTitleSlide } from './title.js';
import { renderSectionSlide } from './section.js';
import { renderContentSlide } from './content.js';
import { renderCodeSlide } from './code.js';
import { renderQuoteSlide } from './quote.js';
import { renderClosingSlide } from './closing.js';
import { renderImageSlide } from './image-pages.js';
import { extraNumber, extraString, layoutSpec, resolveSideMargins, specNumber } from './layout-spec.js';

/** Context passed to layout renderers for async operations */
export interface RenderContext {
  highlightCode: (code: string, language: string, highlightLines?: number[]) => Promise<PptxGenJS.TextProps[]>;
  resolveImage: (src: string) => Promise<ImageResolution>;
  /** Local video files only — remote URLs resolve to a rejection with guidance */
  resolveVideo: (src: string) => Promise<ImageResolution>;
  /**
   * Cover payload for a video embed (poster param → extracted frame → themed
   * card); undefined only when even the themed card failed to render.
   */
  resolveVideoCover: (
    videoPath: string,
    poster?: string,
  ) => Promise<{ data: string; source: 'poster' | 'frame' | 'themed' } | undefined>;
  renderDiagram: (
    diagramType: string,
    code: string,
    box?: { width: number; height: number },
  ) => Promise<Buffer>;
  /** Page footer template with {page}/{total}/{section}/{title} placeholders */
  footerTemplate?: string;
  pageNumber?: number;
  totalSlides?: number;
  /** Title of the most recent section layout slide ({section} placeholder) */
  currentSection?: string;
  /**
   * Auto-incrementing section number, started at 1 and incremented once per
   * section layout slide. Formatted by section renderers (minimal → "01").
   */
  sectionNumber?: number;
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
    if (resolved.ok && resolved.path) {
      slide.background = { path: resolved.path };
    } else if (node.directives.background.startsWith('#')) {
      slide.background = { color: node.directives.background.replace(/^#/, '') };
    } else if (!resolved.ok) {
      log.warn(`[${node.title ?? 'slide'}] ${resolved.error}`);
    }
  }

  switch (node.layout) {
    case 'title':
      renderTitleSlide(slide, node, theme);
      break;

    case 'section':
      renderSectionSlide(slide, node, theme, ctx);
      break;

    case 'code':
      await renderCodeSlide(slide, node, theme, ctx);
      break;

    case 'quote':
      renderQuoteSlide(slide, node, theme);
      break;

    case 'closing':
      renderClosingSlide(slide, node, theme);
      break;

    case 'image-single':
      await renderImageSlide(slide, node, theme, ctx, 1);
      break;

    case 'image-double':
      await renderImageSlide(slide, node, theme, ctx, 2);
      break;

    case 'image-triple':
      await renderImageSlide(slide, node, theme, ctx, 3);
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

  // Footer / page number (skip cover, closing, blank, and section pages that opt out)
  const sectionSpec = layoutSpec(theme, 'section');
  const sectionNoFooter = extraString(sectionSpec, 'footer', 'on') === 'off';
  if (
    node.layout !== 'title' &&
    node.layout !== 'closing' &&
    node.layout !== 'blank' &&
    !(node.layout === 'section' && sectionNoFooter)
  ) {
    const footerText = renderFooter(node, theme, ctx);
    const footerSpec = layoutSpec(theme, 'footer');
    const sides = resolveSideMargins(
      footerSpec,
      specNumber(theme.layouts?.content?.margin, 0.6),
    );
    // Prefer content-side asymmetric margins when footer omits its own
    const marginLeft =
      footerSpec.extra?.marginLeft !== undefined
        ? sides.left
        : specNumber(
            theme.layouts?.content?.extra?.marginLeft as number | undefined,
            specNumber(theme.layouts?.content?.margin, sides.left),
          );
    const marginRight =
      footerSpec.extra?.marginRight !== undefined
        ? sides.right
        : specNumber(
            theme.layouts?.content?.extra?.marginRight as number | undefined,
            specNumber(theme.layouts?.content?.margin, sides.right),
          );
    const contentW = Math.max(2, 13.33 - marginLeft - marginRight);
    const showDivider =
      theme.styles?.footerDivider ?? footerSpec.footerDivider ?? false;
    const footerAlign = extraString(footerSpec, 'footerAlign', 'right') as
      | 'left'
      | 'center'
      | 'right';

    if (showDivider) {
      slide.addShape('rect' as PptxGenJS.ShapeType, {
        x: marginLeft,
        y: extraNumber(footerSpec, 'dividerY', 7.08),
        w: contentW,
        h: 0.015,
        fill: { color: theme.colors.divider ?? theme.colors.secondary },
      });
    }

    if (footerText) {
      slide.addText(footerText, {
        x: marginLeft,
        y: extraNumber(footerSpec, 'footerY', 7.16),
        w: contentW,
        h: 0.28,
        fontSize: theme.fontSize.small - 1,
        fontFace: theme.fonts.body,
        color: theme.colors.secondary,
        align: footerAlign,
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
