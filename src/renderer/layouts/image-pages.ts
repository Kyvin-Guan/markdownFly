/**
 * Image-focused slide layouts — single / double / triple.
 * Trigger: @(layout=image-single|image-double|image-triple) or pure-image auto-detect.
 */

import { readFileSync } from 'node:fs';
import PptxGenJS from 'pptxgenjs';
import type { SlideNode, SlideElement } from '../../models/slide.js';
import type { Theme, ThemeLayoutSpec } from '../../models/theme.js';
import type { RenderContext } from './index.js';
import { getImageSize } from '../../utils/image-size.js';
import { fitInBox } from '../../utils/image-fit.js';
import { log } from '../../utils/progress.js';
import {
  addHRuler,
  extraBoolean,
  extraNumber,
  layoutSpec,
  resolveSideMargins,
  ruleColor,
  specAlign,
  specNumber,
  titleRuleHeight,
  titleRuleRole,
} from './layout-spec.js';

const SLIDE_W = 13.33;
const SLIDE_H = 7.5;

const IMAGE_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
};

export type ImageSlots = 1 | 2 | 3;

function specFor(theme: Theme, slots: ImageSlots): ThemeLayoutSpec {
  if (slots === 1) return layoutSpec(theme, 'imageSingle');
  if (slots === 2) return layoutSpec(theme, 'imageDouble');
  return layoutSpec(theme, 'imageTriple');
}

function pickImages(node: SlideNode, slots: ImageSlots): {
  images: Extract<SlideElement, { type: 'image' }>[];
  captions: string[];
} {
  const images = node.elements
    .filter((e): e is Extract<SlideElement, { type: 'image' }> => e.type === 'image')
    .slice(0, slots);
  const captions = node.elements
    .filter((e) => e.type === 'text')
    .map((e) => (e.type === 'text' ? e.content.trim() : ''))
    .filter((t) => t.length > 0 && t.length <= 40);
  return { images, captions };
}

async function placeImage(
  slide: PptxGenJS.Slide,
  element: Extract<SlideElement, { type: 'image' }>,
  box: { x: number; y: number; w: number; h: number },
  node: SlideNode,
  ctx: RenderContext,
): Promise<void> {
  try {
    const resolved = await ctx.resolveImage(element.src);
    if (!resolved.ok) {
      log.warn(`[${node.title ?? 'slide'}] ${resolved.error}`);
      return;
    }
    const fileData = readFileSync(resolved.path);
    const imgSize = getImageSize(fileData) ?? { width: 6, height: 3.0 };
    const fitted = fitInBox(imgSize, box.w, box.h);
    const ext = resolved.path.split('.').pop()?.toLowerCase() ?? 'png';
    const mime = IMAGE_MIME[ext] ?? 'image/png';
    const data = `${mime};base64,${fileData.toString('base64')}`;

    if (ext === 'webp') {
      log.warn(
        `[${node.title ?? 'slide'}] WebP does not render in PowerPoint for the web ` +
          `or Office 2019 and earlier — some recipients may see a broken image (${element.src})`,
      );
    }

    const x = box.x + (box.w - fitted.width) / 2;
    const y = box.y + (box.h - fitted.height) / 2;
    slide.addImage({
      data,
      altText: element.alt || element.src,
      x,
      y,
      w: fitted.width,
      h: fitted.height,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown';
    log.warn(`[${node.title ?? 'slide'}] image error: ${reason}`);
    slide.addText(`[Image error: ${reason}]`, {
      x: box.x,
      y: box.y,
      w: box.w,
      h: 0.4,
      fontSize: 12,
      color: 'FF0000',
    });
  }
}

export async function renderImageSlide(
  slide: PptxGenJS.Slide,
  node: SlideNode,
  theme: Theme,
  ctx: RenderContext,
  slots: ImageSlots,
): Promise<void> {
  // Image layouts pick slots by `type === 'image'`; a video here would be
  // silently dropped, so point the author at the layout that renders it.
  if (node.elements.some((e) => e.type === 'video')) {
    log.warn(
      `[${node.title ?? 'slide'}] video cannot be placed in image layouts — ` +
        `remove @(layout=image-*) (or move the video to a regular slide) so it renders as playable media`,
    );
  }

  const spec = specFor(theme, slots);

  // minimal 图文页：页标题 + 短横线 + 虚线图片占位框 + 页脚
  if (extraBoolean(spec, 'minimalImage', false)) {
    await renderMinimalImage(slide, node, theme, ctx, slots, spec);
    return;
  }

  const { left, right } = resolveSideMargins(spec, 0.6);
  const titleH = specNumber(spec.titleHeight, 0.9);
  const titleAlign = specAlign(spec.titleAlign, 'left');
  const contentW = Math.max(2, SLIDE_W - left - right);

  let top = extraNumber(spec, 'titleY', 0.3);
  if (node.title) {
    if (extraBoolean(spec, 'titleRule', true)) {
      const rh = titleRuleHeight(spec, 0.04);
      const ruleW = extraNumber(spec, 'titleRuleWidth', contentW);
      addHRuler(slide, {
        x: left,
        y: top + titleH - rh - 0.01,
        w: ruleW,
        h: rh,
        color: ruleColor(theme, titleRuleRole(spec)),
      });
    }
    slide.addText(node.title, {
      x: left,
      y: top,
      w: contentW,
      h: titleH,
      fontSize: theme.fontSize.heading,
      fontFace: theme.fonts.heading,
      color: theme.colors.primary,
      bold: true,
      align: titleAlign === 'center' ? 'center' : 'left',
      valign: 'bottom',
    });
    top = top + titleH + 0.2;
  }

  const bottom = 0.45;
  const zoneH = SLIDE_H - top - bottom;
  const { images, captions } = pickImages(node, slots);

  if (images.length === 0) {
    const fallback = captions[0] ?? node.title ?? 'No image';
    slide.addText(fallback, {
      x: left,
      y: top,
      w: contentW,
      h: zoneH,
      fontSize: theme.fontSize.body,
      fontFace: theme.fonts.body,
      color: theme.colors.secondary,
      align: 'center',
      valign: 'middle',
    });
    return;
  }

  const gap = 0.25;
  const captionH = 0.35;
  const cellW = (contentW - gap * (slots - 1)) / slots;
  const cellH = zoneH - captionH;

  for (let i = 0; i < images.length; i++) {
    const x = left + i * (cellW + gap);
    await placeImage(
      slide,
      images[i],
      { x, y: top, w: cellW, h: cellH },
      node,
      ctx,
    );
    const caption = images[i].alt?.trim() || captions[i];
    if (caption) {
      slide.addText(caption, {
        x,
        y: top + cellH + 0.05,
        w: cellW,
        h: captionH,
        fontSize: theme.fontSize.small,
        fontFace: theme.fonts.body,
        color: theme.colors.secondary,
        align: 'center',
        valign: 'top',
      });
    }
  }
}

/**
 * minimal 图文页：页标题 + 短横线，下方为虚线图片占位框（等宽并排），
 * 有真实图片时嵌入框内，否则展示占位提示文字。底部统一页脚。
 */
async function renderMinimalImage(
  slide: PptxGenJS.Slide,
  node: SlideNode,
  theme: Theme,
  ctx: RenderContext,
  slots: ImageSlots,
  spec: ThemeLayoutSpec,
): Promise<void> {
  const margin = specNumber(spec.margin, 0.83);
  const boxX = margin;
  const boxY = extraNumber(spec, 'minimalImageY', 1.33);
  const boxH = extraNumber(spec, 'minimalImageH', 5.28);
  const contentW = 13.33 - margin * 2;
  const lineColor = theme.colors.divider ?? theme.colors.secondary;

  if (node.title) {
    slide.addText(node.title, {
      x: boxX,
      y: extraNumber(spec, 'minimalTitleY', 0.5),
      w: contentW,
      h: 0.44,
      fontSize: theme.fontSize.heading,
      fontFace: theme.fonts.heading,
      color: theme.colors.primary,
      bold: true,
      align: 'left',
      valign: 'middle',
    });
    addHRuler(slide, {
      x: boxX,
      y: extraNumber(spec, 'minimalTitleRuleY', 1.03),
      w: extraNumber(spec, 'minimalTitleRuleW', 0.56),
      h: extraNumber(spec, 'minimalTitleRuleH', 0.03),
      color: lineColor,
    });
  }

  // 每个槽位的占位框宽度（等宽并排）
  const gaps: Record<ImageSlots, number> = { 1: 0, 2: 0.28, 3: 0.21 };
  const gap = gaps[slots];
  const cellW = (contentW - gap * (slots - 1)) / slots;

  const { images } = pickImages(node, slots);
  for (let i = 0; i < slots; i++) {
    const x = boxX + i * (cellW + gap);
    // 虚线图片占位框
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x,
      y: boxY,
      w: cellW,
      h: boxH,
      fill: { transparency: 100 },
      line: { color: lineColor, width: 0.01, dashType: 'dash' },
    });
    if (images[i]) {
      await placeImage(slide, images[i], { x, y: boxY, w: cellW, h: boxH }, node, ctx);
    } else {
      // 无图时的占位提示文字（框内水平垂直居中）
      slide.addText('Image', {
        x: x + (cellW - 2.22) / 2,
        y: boxY + (boxH - 0.56) / 2,
        w: 2.22,
        h: 0.56,
        fontSize: theme.fontSize.small,
        fontFace: theme.fonts.body,
        color: lineColor,
        align: 'center',
        valign: 'middle',
      });
    }
  }
}
