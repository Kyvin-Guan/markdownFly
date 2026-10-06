/**
 * Code-focused slide layout
 * Supports asymmetric margins + optional title rule via layout spec extras.
 */

import PptxGenJS from 'pptxgenjs';
import type { SlideNode } from '../../models/slide.js';
import type { Theme } from '../../models/theme.js';
import type { RenderContext } from './index.js';
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
import { CODE_INSET_IN, fitCodeBlock } from './measure.js';

export async function renderCodeSlide(
  slide: PptxGenJS.Slide,
  node: SlideNode,
  theme: Theme,
  ctx: RenderContext,
): Promise<void> {
  const spec = layoutSpec(theme, 'code');

  // minimal 代码页：标题 + 短横线 + 圆角代码卡片
  if (extraBoolean(spec, 'minimalCard', false)) {
    await renderMinimalCode(slide, node, theme, ctx);
    return;
  }

  const { left, right } = resolveSideMargins(spec, 0.5);
  const titleH = specNumber(spec.titleHeight, 0.7);
  const titleAlign = specAlign(spec.titleAlign, 'left');
  const contentW = Math.max(3, 13.33 - left - right);
  const titleGap = 0.2;

  let yPos = extraNumber(spec, 'titleY', 0.3);

  if (node.title) {
    slide.addText(node.title, {
      x: left,
      y: yPos,
      w: contentW,
      h: titleH,
      fontSize: theme.fontSize.heading,
      fontFace: theme.fonts.heading,
      color: theme.colors.primary,
      bold: true,
      align: titleAlign === 'center' ? 'center' : 'left',
    });

    if (extraBoolean(spec, 'titleRule', false)) {
      const rh = titleRuleHeight(spec, 0.03);
      const ruleW = extraNumber(spec, 'titleRuleWidth', contentW);
      addHRuler(slide, {
        x: left,
        y: yPos + titleH + 0.02,
        w: ruleW,
        h: rh,
        color: ruleColor(theme, titleRuleRole(spec)),
      });
    }
    yPos += titleH + titleGap;
  }

  for (const element of node.elements) {
    if (element.type === 'code') {
      const runs = await ctx.highlightCode(
        element.content,
        element.language ?? 'text',
        element.highlightLines,
      );

      // The panel keeps its full remaining height (a dedicated code page is a
      // full-bleed code surface); the font shrinks until the wrapped content
      // fits it instead of the text spilling off the slide bottom.
      const boxH = 7.5 - yPos - 0.45;
      const fit = fitCodeBlock(element.content, contentW, boxH - 0.3, theme.fontSize.code);

      slide.addText(runs, {
        x: left,
        y: yPos,
        w: contentW,
        h: boxH,
        fill: { color: theme.colors.codeBackground },
        color: theme.colors.codeText,
        fontFace: theme.fonts.code,
        fontSize: fit.fontSize,
        valign: 'top',
        paraSpaceAfter: 2,
        margin: [10, 15, 10, 15],
      });
      yPos += boxH + 0.2;
    }
  }
}

/**
 * minimal 代码页：页标题 + 短横线 + 独立圆角代码卡片。
 * 代码文本铺满卡片内部，底色为 codeBackground，边框为 divider/secondary 细线。
 */
async function renderMinimalCode(
  slide: PptxGenJS.Slide,
  node: SlideNode,
  theme: Theme,
  ctx: RenderContext,
): Promise<void> {
  const spec = layoutSpec(theme, 'code');
  const margin = specNumber(spec.margin, 0.83);
  const boxX = extraNumber(spec, 'minimalCardX', margin);
  const boxY = extraNumber(spec, 'minimalCardY', 1.33);
  const boxW = extraNumber(spec, 'minimalCardW', 13.33 - margin * 2);
  const boxH = extraNumber(spec, 'minimalCardH', 5.28);
  const lineColor = theme.colors.divider ?? theme.colors.secondary;
  const radius = extraNumber(spec, 'minimalCardRadius', 0.08);

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
    addHRuler(slide, {
      x: boxX,
      y: extraNumber(spec, 'minimalTitleRuleY', 1.03),
      w: extraNumber(spec, 'minimalTitleRuleW', 0.56),
      h: extraNumber(spec, 'minimalTitleRuleH', 0.03),
      color: lineColor,
    });
  }

  // 圆角代码卡片（独立卡片，底色 codeBackground）
  slide.addShape('roundRect' as PptxGenJS.ShapeType, {
    x: boxX,
    y: boxY,
    w: boxW,
    h: boxH,
    rectRadius: radius,
    fill: { color: theme.colors.codeBackground },
    line: { color: lineColor, width: 0.01 },
  });

  const pad = 0.3;
  for (const element of node.elements) {
    if (element.type !== 'code') continue;
    const runs = await ctx.highlightCode(
      element.content,
      element.language ?? 'text',
      element.highlightLines,
    );
    // Inner text box leaves the card padding plus the 16pt text margin;
    // shrink the font until the wrapped content fits that area.
    const innerH = boxH - pad * 2 - CODE_INSET_IN;
    const fit = fitCodeBlock(element.content, boxW - pad * 2, innerH, theme.fontSize.code);
    slide.addText(runs, {
      x: boxX + pad,
      y: boxY + pad,
      w: boxW - pad * 2,
      h: boxH - pad * 2,
      fill: { color: theme.colors.codeBackground },
      color: theme.colors.codeText,
      fontFace: theme.fonts.code,
      fontSize: fit.fontSize,
      valign: 'top',
      paraSpaceAfter: 2,
      margin: [8, 12, 8, 12],
    });
    break;
  }
}
