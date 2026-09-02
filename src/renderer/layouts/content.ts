/**
 * Content slide layout — the most common, handles mixed content
 */

import PptxGenJS from 'pptxgenjs';
import type { SlideNode, SlideElement } from '../../models/slide.js';
import type { Theme } from '../../models/theme.js';
import type { RenderContext } from './index.js';

// Slide dimensions (16:9 LAYOUT_WIDE)
const SLIDE_W = 13.33;
const MARGIN = 0.6;
const CONTENT_W = SLIDE_W - MARGIN * 2;
const TITLE_H = 0.9;

export async function renderContentSlide(
  slide: PptxGenJS.Slide,
  node: SlideNode,
  theme: Theme,
  ctx: RenderContext,
): Promise<void> {
  let yPos = 0.3;

  // Title bar
  if (node.title) {
    // Accent underline
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x: MARGIN,
      y: yPos + TITLE_H - 0.05,
      w: CONTENT_W,
      h: 0.04,
      fill: { color: theme.colors.primary },
    });

    slide.addText(node.title, {
      x: MARGIN,
      y: yPos,
      w: CONTENT_W,
      h: TITLE_H,
      fontSize: theme.fontSize.heading,
      fontFace: theme.fonts.heading,
      color: theme.colors.primary,
      bold: true,
      valign: 'bottom',
    });
    yPos += TITLE_H + 0.2;
  }

  // Render elements
  for (const element of node.elements) {
    const consumed = await renderElement(slide, element, yPos, theme, ctx);
    yPos += consumed;
  }
}

async function renderElement(
  slide: PptxGenJS.Slide,
  element: SlideElement,
  yPos: number,
  theme: Theme,
  ctx: RenderContext,
): Promise<number> {
  switch (element.type) {
    case 'text': {
      if (!element.content.trim()) return 0;
      slide.addText(element.content, {
        x: MARGIN,
        y: yPos,
        w: CONTENT_W,
        h: 0.6,
        fontSize: theme.fontSize.body,
        fontFace: theme.fonts.body,
        color: theme.colors.text,
        bold: element.bold,
        italic: element.italic,
        valign: 'top',
        wrap: true,
      });
      // Rough estimate: ~0.5 inch per 80 chars
      const lines = Math.ceil(element.content.length / 80);
      return Math.max(0.5, lines * 0.35);
    }

    case 'heading': {
      slide.addText(element.content, {
        x: MARGIN,
        y: yPos,
        w: CONTENT_W,
        h: 0.6,
        fontSize: theme.fontSize.heading - (element.level - 2) * 4,
        fontFace: theme.fonts.heading,
        color: theme.colors.text,
        bold: true,
      });
      return 0.7;
    }

    case 'list': {
      const items = element.items.map((item, i) => ({
        text: item,
        options: {
          bullet: element.ordered ? { type: 'number' as const, startAt: i + 1 } : true,
          color: theme.colors.text,
          fontSize: theme.fontSize.body,
          fontFace: theme.fonts.body,
          paraSpaceBefore: 4,
          paraSpaceAfter: 4,
        },
      }));

      const height = Math.max(0.8, items.length * 0.38);
      slide.addText(items as PptxGenJS.TextProps[], {
        x: MARGIN,
        y: yPos,
        w: CONTENT_W,
        h: height,
        valign: 'top',
      });
      return height + 0.15;
    }

    case 'code': {
      const runs = await ctx.highlightCode(element.content, element.language ?? 'text');
      const lines = element.content.split('\n').length;
      const height = Math.min(4.5, Math.max(1.0, lines * 0.25));

      slide.addText(runs, {
        x: MARGIN,
        y: yPos,
        w: CONTENT_W,
        h: height,
        fill: { color: theme.colors.codeBackground },
        fontFace: theme.fonts.code,
        fontSize: theme.fontSize.code,
        color: theme.colors.codeText,
        valign: 'top',
        margin: [8, 12, 8, 12],
      });
      return height + 0.2;
    }

    case 'diagram': {
      try {
        const pngBuffer = await ctx.renderDiagram(element.diagramType, element.content);
        const base64 = pngBuffer.toString('base64');
        const imgH = 3.5;

        slide.addImage({
          data: `image/png;base64,${base64}`,
          x: MARGIN + (CONTENT_W - 8) / 2,
          y: yPos,
          w: 8,
          h: imgH,
          sizing: { type: 'contain', w: 8, h: imgH },
        });
        return imgH + 0.2;
      } catch (err) {
        // Fallback: show diagram code as text
        slide.addText(`[Diagram render error: ${err instanceof Error ? err.message : 'unknown'}]`, {
          x: MARGIN,
          y: yPos,
          w: CONTENT_W,
          h: 0.5,
          fontSize: theme.fontSize.small,
          color: 'FF0000',
          italic: true,
        });
        return 0.6;
      }
    }

    case 'image': {
      try {
        const resolved = await ctx.resolveImage(element.src);
        if (resolved?.path) {
          const imgH = 3.0;
          slide.addImage({
            path: resolved.path,
            x: MARGIN + (CONTENT_W - 6) / 2,
            y: yPos,
            w: 6,
            h: imgH,
            sizing: { type: 'contain', w: 6, h: imgH },
          });
          return imgH + 0.2;
        }
      } catch {
        // Skip broken images
      }
      return 0;
    }

    case 'table': {
      const headerRow = element.headers.map((h) => ({
        text: h,
        options: {
          bold: true,
          color: 'FFFFFF',
          fill: { color: theme.colors.primary },
          fontSize: theme.fontSize.body - 2,
          fontFace: theme.fonts.body,
          align: 'center' as const,
          border: { type: 'solid' as const, pt: 0.5, color: theme.colors.primary },
        },
      }));

      const bodyRows = element.rows.map((row) =>
        row.map((cell) => ({
          text: cell,
          options: {
            fontSize: theme.fontSize.body - 2,
            fontFace: theme.fonts.body,
            color: theme.colors.text,
            border: { type: 'solid' as const, pt: 0.5, color: 'D1D5DB' },
          },
        })),
      );

      const allRows = [headerRow, ...bodyRows];
      const tableH = Math.min(4.0, allRows.length * 0.4);

      slide.addTable(allRows as PptxGenJS.TableRow[], {
        x: MARGIN,
        y: yPos,
        w: CONTENT_W,
        h: tableH,
        colW: Array(element.headers.length).fill(CONTENT_W / element.headers.length),
        margin: [4, 6, 4, 6],
        border: { type: 'solid', pt: 0.5, color: 'D1D5DB' },
        autoPage: false,
      });
      return tableH + 0.2;
    }

    case 'blockquote': {
      // Left accent border + italic text
      slide.addShape('rect' as PptxGenJS.ShapeType, {
        x: MARGIN,
        y: yPos,
        w: 0.06,
        h: 0.8,
        fill: { color: theme.colors.accent },
      });

      slide.addText(element.content, {
        x: MARGIN + 0.2,
        y: yPos,
        w: CONTENT_W - 0.2,
        h: 0.8,
        fontSize: theme.fontSize.body,
        fontFace: theme.fonts.body,
        color: theme.colors.secondary,
        italic: true,
        valign: 'middle',
      });
      return 1.0;
    }

    default:
      return 0;
  }
}
