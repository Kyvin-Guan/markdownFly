/**
 * Content slide layout — the most common, handles mixed content.
 *
 * Supports grid layout via break elements:
 *   - BreakElement('row')  (from `===`): stack content vertically
 *   - BreakElement('col')  (from `<->`): lay content out side-by-side
 * Columns and rows split the content area evenly.
 */

import PptxGenJS from 'pptxgenjs';
import type { SlideNode, SlideElement } from '../../models/slide.js';
import type { Theme } from '../../models/theme.js';
import type { RenderContext } from './index.js';
import { getPngSize } from '../../utils/png-size.js';
import { fitInBox } from '../../utils/image-fit.js';
import { tableToChartOption } from '../../utils/table-chart.js';
import { readFileSync } from 'node:fs';

// Slide dimensions (16:9 LAYOUT_WIDE)
const SLIDE_W = 13.33;
const SLIDE_H = 7.5;
const MARGIN = 0.6;
const CONTENT_W = SLIDE_W - MARGIN * 2;
const TITLE_H = 0.9;
const BOTTOM_MARGIN = 0.45;
const GRID_GAP = 0.25;

/** Vertical space available below the title bar */
function contentAreaInsets(node: SlideNode): { top: number; bottom: number } {
  return {
    top: node.title ? 0.3 + TITLE_H + 0.2 : 0.3,
    bottom: BOTTOM_MARGIN,
  };
}

/**
 * Split the element stream into rows (by row breaks), then each row
 * into columns (by col breaks). A slide with no breaks is one row of one column.
 */
function splitGrid(elements: SlideElement[]): SlideElement[][][] {
  const rows: SlideElement[][] = [];
  let currentRow: SlideElement[] = [];

  for (const el of elements) {
    if (el.type === 'break' && el.direction === 'row') {
      rows.push(currentRow);
      currentRow = [];
      continue;
    }
    // col breaks and content stay in the row; col splitting happens next
    currentRow.push(el);
  }
  rows.push(currentRow);

  return rows.map((row) => {
    const columns: SlideElement[][] = [];
    let currentCol: SlideElement[] = [];
    for (const el of row) {
      if (el.type === 'break' && el.direction === 'col') {
        columns.push(currentCol);
        currentCol = [];
        continue;
      }
      currentCol.push(el);
    }
    columns.push(currentCol);
    return columns;
  });
}

export async function renderContentSlide(
  slide: PptxGenJS.Slide,
  node: SlideNode,
  theme: Theme,
  ctx: RenderContext,
): Promise<void> {
  const { top } = contentAreaInsets(node);

  // Title bar
  if (node.title) {
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x: MARGIN,
      y: 0.3 + TITLE_H - 0.05,
      w: CONTENT_W,
      h: 0.04,
      fill: { color: theme.colors.primary },
    });

    slide.addText(node.title, {
      x: MARGIN,
      y: 0.3,
      w: CONTENT_W,
      h: TITLE_H,
      fontSize: theme.fontSize.heading,
      fontFace: theme.fonts.heading,
      color: theme.colors.primary,
      bold: true,
      valign: 'bottom',
    });
  }

  const grid = splitGrid(prepareElements(node));
  const rows = grid.length;
  const availH = SLIDE_H - top - BOTTOM_MARGIN - GRID_GAP * (rows - 1);

  // Rows are sized by estimated content weight (like flexbox), not evenly —
  // a row with one short line shouldn't eat half the slide. Shrunk to fit.
  const ests = grid.map((columns) =>
    Math.max(
      0.8,
      ...columns.map((c) => estimateColumnHeight(c, (CONTENT_W - GRID_GAP * (columns.length - 1)) / columns.length)),
    ),
  );
  const totalEst = ests.reduce((a, b) => a + b, 0);
  const scale = totalEst > availH ? availH / totalEst : 1;

  let y = top;
  for (let r = 0; r < rows; r++) {
    const columns = grid[r];
    const cols = columns.length;
    const colW = (CONTENT_W - GRID_GAP * (cols - 1)) / cols;
    const rowH = ests[r] * scale;

    for (let c = 0; c < cols; c++) {
      await renderColumn(
        slide,
        columns[c],
        { x: MARGIN + c * (colW + GRID_GAP), y, w: colW, h: rowH },
        node,
        theme,
        ctx,
      );
    }
    y += rowH + GRID_GAP;
  }
}

/**
 * Rewrites the slide's elements for rendering:
 * - @(chart=...) converts the first table into an echarts diagram so that
 *   layout estimation treats it as an image (big row) instead of a table.
 */
function prepareElements(node: SlideNode): SlideElement[] {
  const chart = node.directives?.chart;
  if (!chart) return node.elements;

  const elements = [...node.elements];
  const idx = elements.findIndex((e) => e.type === 'table');
  if (idx === -1) return elements;

  const table = elements[idx] as Extract<SlideElement, { type: 'table' }>;
  try {
    elements[idx] = {
      type: 'diagram',
      diagramType: 'echarts',
      content: tableToChartOption(table, chart),
    };
  } catch {
    // Invalid chart table — fall through to rendering as a table
  }
  return elements;
}

/** Estimate wrapped text lines for a string in a column of width w (inches). */
function estimateTextLines(content: string, w: number): number {
  const charsPerLine = Math.max(20, Math.floor(w * 60));
  return Math.max(1, Math.ceil(content.length / charsPerLine));
}

/** Cheap height estimate for a column of elements (inches). */
function estimateColumnHeight(elements: SlideElement[], w: number): number {
  let h = 0;
  for (const el of elements) {
    switch (el.type) {
      case 'text':
        h += Math.max(0.5, Math.ceil(el.content.length / Math.max(20, Math.floor(w * 60))) * 0.35);
        break;
      case 'heading':
        h += 0.7;
        break;
      case 'list':
        h += el.items.length * 0.5;
        break;
      case 'code':
        h += Math.max(1.0, el.content.split('\n').length * 0.25);
        break;
      case 'diagram':
      case 'image':
        // Most diagrams are wide (aspect ~1.5-3:1); assume ~2:1 and let the
        // actual render down-scale. Enough height to look deliberate.
        h += Math.min(4.5, Math.max(1.2, w * 0.5));
        break;
      case 'table':
        h += (el.rows.length + 1) * 0.4;
        break;
      case 'callout':
        // Same adaptive sizing as the renderer: label row + one line per wrap
        h += Math.min(4.5, 0.72 + estimateTextLines(el.content, w) * 0.3);
        break;
      case 'blockquote':
        h += 1.0;
        break;
      case 'break':
        break;
      default:
        h += 0.5;
    }
  }
  return h;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Render a stream of elements inside a fixed box; content exceeding the box is clipped (kept simple). */
async function renderColumn(
  slide: PptxGenJS.Slide,
  elements: SlideElement[],
  box: Box,
  node: SlideNode,
  theme: Theme,
  ctx: RenderContext,
): Promise<void> {
  // Vertically center content that is shorter than its grid cell — a
  // two-line column next to a diagram shouldn't hug the row's top edge.
  const est = estimateColumnHeight(elements, box.w);
  const yPos = box.h > est ? box.y + (box.h - est) / 2 : box.y;
  let cursor = yPos;
  for (const element of elements) {
    const consumed = await renderElement(slide, element, cursor, box, node, theme, ctx);
    cursor += consumed;
  }
}

async function renderElement(
  slide: PptxGenJS.Slide,
  element: SlideElement,
  yPos: number,
  box: Box,
  node: SlideNode,
  theme: Theme,
  ctx: RenderContext,
): Promise<number> {
  const { x, w } = box;
  const maxH = Math.max(0.5, box.y + box.h - yPos);

  switch (element.type) {
    case 'text': {
      if (!element.content.trim()) return 0;
      slide.addText(element.content, {
        x,
        y: yPos,
        w,
        h: 0.6,
        fontSize: theme.fontSize.body,
        fontFace: theme.fonts.body,
        color: theme.colors.text,
        bold: element.bold,
        italic: element.italic,
        valign: 'top',
        wrap: true,
      });
      // Rough estimate: ~0.5 inch per 80 chars (scaled to column width)
      const charsPerLine = Math.max(20, Math.floor(w * 60));
      const lines = Math.ceil(element.content.length / charsPerLine);
      return Math.max(0.5, lines * 0.35);
    }

    case 'heading': {
      slide.addText(element.content, {
        x,
        y: yPos,
        w,
        h: 0.6,
        fontSize: theme.fontSize.heading - (element.level - 2) * 4,
        fontFace: theme.fonts.heading,
        color: theme.colors.primary,
        bold: true,
      });
      return 0.7;
    }

    case 'list': {
      const items = element.items.map((item, i) => {
        const checked = element.checked?.[i];
        const isTask = checked !== undefined;
        let text = item;
        const options: Record<string, unknown> = {
          // Task items have no bullet, so they need an explicit break line;
          // bulleted items break lines on their own.
          breakLine: isTask ? true : undefined,
          bullet: element.ordered
            ? { type: 'number' as const, startAt: i + 1 }
            : isTask
              ? false
              : true,
          color: theme.colors.text,
          fontSize: theme.fontSize.body,
          fontFace: theme.fonts.body,
          paraSpaceBefore: 4,
          paraSpaceAfter: 4,
        };
        if (isTask) {
          // Task list: prefix glyph, done items get muted color
          text = `${checked ? '☑' : '☐'}  ${item}`;
          if (checked) options.color = theme.colors.secondary;
        }
        return { text, options };
      });

      const height = Math.max(0.8, Math.min(maxH, items.length * 0.5));
      slide.addText(items as PptxGenJS.TextProps[], {
        x,
        y: yPos,
        w,
        h: height,
        valign: 'top',
      });
      return height + 0.15;
    }

    case 'code': {
      const runs = await ctx.highlightCode(
        element.content,
        element.language ?? 'text',
        element.highlightLines,
      );
      const lines = element.content.split('\n').length;
      const height = Math.min(maxH, Math.max(1.0, lines * 0.25));

      slide.addText(runs, {
        x,
        y: yPos,
        w,
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
        // Diagrams can be very wide (graphviz chains) or very tall (mermaid
        // flows) — scale into the box, aspect preserved.
        const imgSize = getPngSize(pngBuffer) ?? { width: 8, height: 3.5 };
        const boxH = Math.max(1.2, maxH);
        const fitted = fitInBox(imgSize, w, boxH);
        const base64 = pngBuffer.toString('base64');

        slide.addImage({
          data: `image/png;base64,${base64}`,
          x: x + (w - fitted.width) / 2,
          y: yPos,
          w: fitted.width,
          h: fitted.height,
        });
        return fitted.height + 0.2;
      } catch (err) {
        slide.addText(`[Diagram render error: ${err instanceof Error ? err.message : 'unknown'}]`, {
          x,
          y: yPos,
          w,
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
          const imgSize = getPngSize(readFileSync(resolved.path)) ?? { width: 6, height: 3.0 };
          const boxH = Math.max(1.2, maxH);
          const fitted = fitInBox(imgSize, w, boxH);
          slide.addImage({
            path: resolved.path,
            x: x + (w - fitted.width) / 2,
            y: yPos,
            w: fitted.width,
            h: fitted.height,
          });
          return fitted.height + 0.2;
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
      const tableH = Math.min(maxH, allRows.length * 0.4);

      slide.addTable(allRows as PptxGenJS.TableRow[], {
        x,
        y: yPos,
        w,
        h: tableH,
        colW: Array(element.headers.length).fill(w / element.headers.length),
        margin: [4, 6, 4, 6],
        border: { type: 'solid', pt: 0.5, color: 'D1D5DB' },
        autoPage: false,
      });
      return tableH + 0.2;
    }

    case 'blockquote': {
      // Left accent border + italic text
      slide.addShape('rect' as PptxGenJS.ShapeType, {
        x,
        y: yPos,
        w: 0.06,
        h: Math.min(0.8, maxH),
        fill: { color: theme.colors.accent },
      });

      slide.addText(element.content, {
        x: x + 0.2,
        y: yPos,
        w: w - 0.2,
        h: Math.min(0.8, maxH),
        fontSize: theme.fontSize.body,
        fontFace: theme.fonts.body,
        color: theme.colors.secondary,
        italic: true,
        valign: 'middle',
      });
      return 1.0;
    }

    case 'callout': {
      const palette: Record<string, string> = {
        note: theme.colors.primary,
        info: theme.colors.primary,
        tip: theme.colors.accent,
        success: theme.colors.accent,
        warning: 'EAB308',
        caution: 'EAB308',
        danger: 'DC2626',
      };
      const color = palette[element.variant] ?? theme.colors.primary;
      const label = element.title ?? element.variant.toUpperCase();

      // Card height adapts to content: label row + one line per wrapped line
      const textLines = estimateTextLines(element.content, w);
      const cardH = Math.min(maxH, 0.72 + textLines * 0.3);
      const textH = cardH - 0.44;

      // Soft background + left accent bar
      slide.addShape('roundRect' as PptxGenJS.ShapeType, {
        x,
        y: yPos,
        w,
        h: cardH,
        fill: { color, transparency: 88 },
        line: { color, width: 0.75, transparency: 70 },
        rectRadius: 0.08,
      });
      slide.addShape('rect' as PptxGenJS.ShapeType, {
        x,
        y: yPos + 0.12,
        w: 0.07,
        h: cardH - 0.24,
        fill: { color },
      });

      slide.addText(label, {
        x: x + 0.2,
        y: yPos + 0.08,
        w: w - 0.4,
        h: 0.3,
        fontSize: theme.fontSize.small,
        fontFace: theme.fonts.heading,
        color,
        bold: true,
      });
      slide.addText(element.content, {
        x: x + 0.2,
        y: yPos + 0.4,
        w: w - 0.4,
        h: textH,
        fontSize: theme.fontSize.body - 1,
        fontFace: theme.fonts.body,
        color: theme.colors.text,
        valign: 'top',
        wrap: true,
      });
      return cardH + 0.1;
    }

    default:
      return 0;
  }
}
