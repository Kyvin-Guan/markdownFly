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
import { getImageSize } from '../../utils/image-size.js';
import { fitInBox, fitImageWithOptions } from '../../utils/image-fit.js';
import { tableToChartOption } from '../../utils/table-chart.js';
import { log } from '../../utils/progress.js';
import { readFileSync } from 'node:fs';
import {
  addHRuler,
  extraBoolean,
  extraNumber,
  layoutSpec,
  resolveSideMargins,
  ruleColor,
  specNumber,
  titleRuleHeight,
  titleRuleRole,
} from './layout-spec.js';

// Slide dimensions (16:9 LAYOUT_WIDE)
const SLIDE_W = 13.33;
const SLIDE_H = 7.5;
/** Fallbacks matching production hard-coded values (layout-scheme legacy) */
const DEFAULT_MARGIN = 0.6;
const DEFAULT_TITLE_H = 0.9;
const DEFAULT_BOTTOM_MARGIN = 0.45;
const DEFAULT_GRID_GAP = 0.25;

interface ContentMetrics {
  marginLeft: number;
  marginRight: number;
  titleH: number;
  titleY: number;
  contentW: number;
  bottom: number;
  gridGap: number;
  contentPadding: number;
  titleRule: boolean;
  titleRuleH: number;
  titleRuleWidth: number;
  titleRuleColor: 'primary' | 'secondary' | 'divider';
}

function contentMetrics(theme: Theme): ContentMetrics {
  const spec = layoutSpec(theme, 'content');
  const { left, right } = resolveSideMargins(spec, DEFAULT_MARGIN);
  const titleH = specNumber(spec.titleHeight, DEFAULT_TITLE_H);
  const contentPadding = specNumber(spec.contentPadding, 0);
  const contentW = Math.max(2, SLIDE_W - left - right);
  return {
    marginLeft: left,
    marginRight: right,
    titleH,
    titleY: extraNumber(spec, 'titleY', 0.3),
    contentW,
    bottom: DEFAULT_BOTTOM_MARGIN,
    gridGap: DEFAULT_GRID_GAP,
    contentPadding,
    titleRule: extraBoolean(spec, 'titleRule', true),
    titleRuleH: titleRuleHeight(spec, 0.04),
    titleRuleWidth: extraNumber(spec, 'titleRuleWidth', contentW),
    titleRuleColor: titleRuleRole(spec),
  };
}

/** Extension → MIME map used when embedding images as base64 data */
const IMAGE_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
};

/** Vertical space available below the title bar */
function contentAreaInsets(
  node: SlideNode,
  metrics: ContentMetrics,
): { top: number; bottom: number } {
  return {
    top: node.title ? metrics.titleY + metrics.titleH + 0.2 : metrics.titleY,
    bottom: metrics.bottom,
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
  const spec = layoutSpec(theme, 'content');

  // minimal 正文：标题在上、标题下短横线，内容收进带边框容器
  if (extraBoolean(spec, 'minimalBox', false)) {
    await renderMinimalContent(slide, node, theme, ctx);
    return;
  }

  const metrics = contentMetrics(theme);
  const { marginLeft, titleH, titleY, contentW, gridGap, contentPadding, titleRuleWidth } = metrics;
  const { top } = contentAreaInsets(node, metrics);
  const pad = contentPadding > 0 ? contentPadding : 0;
  const drawX = marginLeft + pad;
  const drawW = contentW - pad * 2;

  // Title bar + rule
  if (node.title) {
    if (metrics.titleRule && metrics.titleRuleH > 0) {
      addHRuler(slide, {
        x: marginLeft,
        y: titleY + titleH - metrics.titleRuleH - 0.01,
        w: titleRuleWidth,
        h: metrics.titleRuleH,
        color: ruleColor(theme, metrics.titleRuleColor),
      });
    }

    slide.addText(node.title, {
      x: marginLeft,
      y: titleY,
      w: contentW,
      h: titleH,
      fontSize: theme.fontSize.heading,
      fontFace: theme.fonts.heading,
      color: theme.colors.primary,
      bold: true,
      valign: 'bottom',
    });
  }

  const grid = splitGrid(prepareElements(node));
  const rows = grid.length;
  const availH = SLIDE_H - top - metrics.bottom - gridGap * (rows - 1);

  // Rows are sized by estimated content weight (like flexbox), not evenly —
  // a row with one short line shouldn't eat half the slide. Shrunk to fit.
  const ests = grid.map((columns) =>
    Math.max(
      0.8,
      ...columns.map((c) => estimateColumnHeight(c, (drawW - gridGap * (columns.length - 1)) / columns.length, theme)),
    ),
  );
  const totalEst = ests.reduce((a, b) => a + b, 0);
  const scale = totalEst > availH ? availH / totalEst : 1;

  let y = top;
  for (let r = 0; r < rows; r++) {
    const columns = grid[r];
    const cols = columns.length;
    const colW = (drawW - gridGap * (cols - 1)) / cols;
    const rowH = ests[r] * scale;

    for (let c = 0; c < cols; c++) {
      await renderColumn(
        slide,
        columns[c],
        { x: drawX + c * (colW + gridGap), y, w: colW, h: rowH },
        node,
        theme,
        ctx,
      );
    }
    y += rowH + gridGap;
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

/** Text-box insets on a code block (margin: [8, 12, 8, 12], in points). */
const CODE_INSET_IN = 16 / 72;

/**
 * PowerPoint lays a line out at roughly 1.2-1.25x its font size; rounding up
 * keeps the box slightly taller than the text rather than clipping it.
 */
const CODE_LINE_FACTOR = 1.3;

/**
 * Height a code block needs, in inches.
 *
 * The insets matter: they are 16pt of the total, which a bare lines x per-line
 * estimate misses — that is what left the last line of a block sticking out
 * below the dark fill.
 */
function codeBlockHeight(lines: number, fontSizePt: number): number {
  return Math.max(1.0, (lines * fontSizePt * CODE_LINE_FACTOR) / 72 + CODE_INSET_IN);
}

/** Display width of a string in Latin-equivalent units (CJK takes two). */
function displayWidth(text: string): number {
  let units = 0;
  for (const char of text) {
    units += (char.codePointAt(0) ?? 0) > 0x2e80 ? 2 : 1;
  }
  return units;
}

/**
 * Characters that fit on one line of `fontSizePt` text in a column `widthIn`
 * inches wide. Average advance is about half an em for Latin, so a 12in column
 * of 18pt text holds roughly 97 units — the previous estimate assumed 60 per
 * inch, ~7x too many, which made every paragraph look like a single line and
 * let the next element overlap it.
 */
function charsPerLine(widthIn: number, fontSizePt: number): number {
  return Math.max(8, Math.floor((widthIn * 72) / (fontSizePt * 0.5)));
}

/** Estimate wrapped text lines for a string in a column of width w (inches). */
function estimateTextLines(content: string, w: number, fontSizePt: number): number {
  return Math.max(1, Math.ceil(displayWidth(content) / charsPerLine(w, fontSizePt)));
}

/** Cheap height estimate for a column of elements (inches). */
function estimateColumnHeight(elements: SlideElement[], w: number, theme: Theme): number {
  let h = 0;
  for (const el of elements) {
    switch (el.type) {
      case 'text':
        h += Math.max(0.5, estimateTextLines(el.content, w, theme.fontSize.body) * 0.35);
        break;
      case 'heading':
        h += 0.7;
        break;
      case 'list':
        h += el.items.length * 0.5;
        break;
      case 'code':
        h += codeBlockHeight(el.content.split('\n').length, theme.fontSize.code);
        break;
      case 'diagram':
      case 'image':
        // Most diagrams are wide (aspect ~1.5-3:1); assume ~2:1 and let the
        // actual render down-scale. Enough height to look deliberate.
        // Explicit image sizes are honored so a small icon doesn't eat the row.
        if (el.type === 'image' && el.height && !el.height.endsWith('%')) {
          h += parseFloat(el.height) + 0.2;
        } else if (el.type === 'image' && el.width && !el.width.endsWith('%')) {
          h += parseFloat(el.width) * 0.5 + 0.2;
        } else {
          h += Math.min(4.5, Math.max(1.2, w * 0.5));
        }
        break;
      case 'table':
        h += (el.rows.length + 1) * 0.4;
        break;
      case 'callout':
        // Same adaptive sizing as the renderer: label row + one line per wrap
        h += Math.min(4.5, 0.72 + estimateTextLines(el.content, w, theme.fontSize.body) * 0.3);
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
  const est = estimateColumnHeight(elements, box.w, theme);
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
      // Size the box and advance the cursor by the same estimate, so whatever
      // follows cannot land on top of a line that wrapped further than assumed.
      const lines = estimateTextLines(element.content, w, theme.fontSize.body);
      const height = Math.max(0.5, lines * 0.35);
      slide.addText(element.content, {
        x,
        y: yPos,
        w,
        h: height,
        fontSize: theme.fontSize.body,
        fontFace: theme.fonts.body,
        color: theme.colors.text,
        bold: element.bold,
        italic: element.italic,
        valign: 'top',
        wrap: true,
      });
      return height;
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
      const height = Math.min(maxH, codeBlockHeight(lines, theme.fontSize.code));

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
        const imgSize = getImageSize(pngBuffer) ?? { width: 8, height: 3.5 };
        const boxH = Math.max(1.2, maxH);
        const fitted = fitInBox(imgSize, w, boxH);
        const base64 = pngBuffer.toString('base64');

        slide.addImage({
          data: `image/png;base64,${base64}`,
          // A diagram has no alt text of its own, so the slide title describes
          // it best; without one, name the notation at least. Passing nothing
          // would leave pptxgenjs' internal placeholder filename as the alt text.
          altText: node.title || `${element.diagramType} diagram`,
          x: x + (w - fitted.width) / 2,
          y: yPos,
          w: fitted.width,
          h: fitted.height,
        });
        return fitted.height + 0.2;
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'unknown';
        const message = `[Diagram render error: ${reason}]`;
        // Mirrors the image path below: the deck still generates with a
        // placeholder on the slide, but headless runs need to hear about it.
        log.warn(`[${node.title ?? 'slide'}] ${message}`);
        slide.addText(message, {
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
        if (!resolved.ok) {
          log.warn(`[${node.title ?? 'slide'}] ${resolved.error}`);
          return 0;
        }
        const fileData = readFileSync(resolved.path);
        const imgSize = getImageSize(fileData) ?? { width: 6, height: 3.0 };
        const boxH = Math.max(1.2, maxH);
        const placed = fitImageWithOptions(
          imgSize,
          { width: w, height: boxH },
          { width: element.width, height: element.height, align: element.align },
        );
        // Base64 data (not a path): avoids pptxgenjs' Node-vs-browser media
        // encoding, which crashes under ESM hosts (no `require` → XHR path).
        const ext = resolved.path.split('.').pop()?.toLowerCase() ?? 'png';
        const mime = IMAGE_MIME[ext] ?? 'image/png';
        const data = `${mime};base64,${fileData.toString('base64')}`;

        // The deck stores WebP faithfully, but a common reader cannot decode it:
        // PowerPoint for the web and Office 2019 and earlier show a broken image.
        // Converting would mean taking on a WebP decoder, so say so instead.
        if (ext === 'webp') {
          log.warn(
            `[${node.title ?? 'slide'}] WebP does not render in PowerPoint for the web ` +
              `or Office 2019 and earlier — some recipients may see a broken image (${element.src})`,
          );
        }

        slide.addImage({
          data,
          path: 'preencoded.png',
          // The author's alt text when they wrote one; otherwise the source they
          // referenced, which at least beats pptxgenjs' internal placeholder name.
          // Falsy, not nullish: `![](...)` parses to an empty alt string.
          altText: element.alt || element.src,
          x: x + placed.x,
          y: yPos,
          w: placed.width,
          h: placed.height,
        });
        return placed.height + 0.2;
      } catch (err) {
        log.warn(
          `Failed to embed image ${element.src}: ${err instanceof Error ? err.message : String(err)}`,
        );
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
      const textLines = estimateTextLines(element.content, w, theme.fontSize.body);
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

/**
 * minimal 正文页：页标题 + 标题下短横线（非贯穿）+ 带边框内容容器。
 * 内容在容器内部按 grid 布局排布，与方案「内容区起始 y=1.33、底部收于 6.61」一致。
 */
async function renderMinimalContent(
  slide: PptxGenJS.Slide,
  node: SlideNode,
  theme: Theme,
  ctx: RenderContext,
): Promise<void> {
  const spec = layoutSpec(theme, 'content');
  const margin = specNumber(spec.margin, 0.83);
  const boxX = extraNumber(spec, 'minimalBoxX', margin);
  const boxY = extraNumber(spec, 'minimalBoxY', 1.33);
  const boxW = extraNumber(spec, 'minimalBoxW', SLIDE_W - margin * 2);
  const boxH = extraNumber(spec, 'minimalBoxH', 5.28);
  const lineColor = theme.colors.divider ?? theme.colors.secondary;

  if (node.title) {
    slide.addText(node.title, {
      x: boxX,
      y: extraNumber(spec, 'minimalTitleY', 0.5),
      w: boxW,
      h: 0.44,
      fontSize: theme.fontSize.heading,
      fontFace: theme.fonts.heading,
      color: theme.colors.primary,
      bold: true,
      align: 'left',
      valign: 'middle',
    });
    // 标题下装饰短横线（左缘与页标题左缘对齐，长度约 0.56，不贯穿整行）
    addHRuler(slide, {
      x: boxX,
      y: extraNumber(spec, 'minimalTitleRuleY', 1.03),
      w: extraNumber(spec, 'minimalTitleRuleW', 0.56),
      h: extraNumber(spec, 'minimalTitleRuleH', 0.03),
      color: lineColor,
    });
  }

  // 内容容器（占位边界，实际填充列表/表格/图表等）
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: boxX,
    y: boxY,
    w: boxW,
    h: boxH,
    fill: { transparency: 100 },
    line: { color: lineColor, width: 0.01 },
  });

  // 容器内排布内容
  const gap = 0.25;
  const pad = 0.3;
  const inner = { x: boxX + pad, y: boxY + pad, w: boxW - pad * 2, h: boxH - pad * 2 };
  const innerBox = {
    x: inner.x,
    y: inner.y,
    w: inner.w,
    h: inner.h,
  };
  const grid = splitGrid(prepareElements(node));
  const rows = grid.length;
  const availH = innerBox.h - gap * (rows - 1);
  const ests = grid.map((columns) =>
    Math.max(
      0.8,
      ...columns.map((c) => estimateColumnHeight(c, (innerBox.w - gap * (columns.length - 1)) / columns.length, theme)),
    ),
  );
  const totalEst = ests.reduce((a, b) => a + b, 0);
  const scale = totalEst > availH ? availH / totalEst : 1;

  let y = innerBox.y;
  for (let r = 0; r < rows; r++) {
    const columns = grid[r];
    const cols = columns.length;
    const colW = (innerBox.w - gap * (cols - 1)) / cols;
    const rowH = ests[r] * scale;
    for (let c = 0; c < cols; c++) {
      await renderColumn(
        slide,
        columns[c],
        { x: innerBox.x + c * (colW + gap), y, w: colW, h: rowH },
        node,
        theme,
        ctx,
      );
    }
    y += rowH + gap;
  }
}
