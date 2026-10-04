/**
 * Title slide layout — cover/opening slide
 *
 * Creative extras (folio etc., all optional; omit → legacy-centered cover):
 * - extra.spineWidth: left full-height spine bar (inches)
 * - extra.titleY / subtitleY / metaY: vertical anchors
 * - extra.titleRule: draw a horizontal rule under the title
 * - extra.metaBottom: park meta near the slide bottom
 */

import PptxGenJS from 'pptxgenjs';
import type { SlideNode } from '../../models/slide.js';
import type { Theme } from '../../models/theme.js';
import {
  addHRuler,
  extraBoolean,
  extraNumber,
  layoutSpec,
  resolveSideMargins,
  ruleColor,
  specAlign,
  titleRuleRole,
} from './layout-spec.js';

export function renderTitleSlide(
  slide: PptxGenJS.Slide,
  node: SlideNode,
  theme: Theme,
): void {
  const spec = layoutSpec(theme, 'title');

  // minimal 封面：左侧竖装饰线 + 主/副标题沿竖线左对齐 + 作者/日期沉底
  if (extraBoolean(spec, 'minimalTitle', false)) {
    renderMinimalTitle(slide, node, theme);
    return;
  }

  const align = specAlign(spec.titleAlign, 'center');
  const { left, right } = resolveSideMargins(spec, 0.8);
  const spineW = extraNumber(spec, 'spineWidth', 0);
  const boxX = left + spineW;
  const contentW = Math.max(2, 13.33 - boxX - right);

  const textColor = theme.colors.titleText ?? 'FFFFFF';
  const subtitleColor = textColor === 'FFFFFF' ? 'FFFFFFCC' : theme.colors.secondary;
  const metaColor = textColor === 'FFFFFF' ? 'FFFFFF99' : theme.colors.secondary;

  const bgColor = theme.colors.backgroundGradient
    ? undefined
    : theme.colors.titleBackground ?? theme.colors.primary;
  if (bgColor) {
    slide.background = { color: bgColor };
  }

  // Editorial spine on the left edge
  if (spineW > 0) {
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x: 0,
      y: 0,
      w: spineW,
      h: 7.5,
      fill: { color: theme.colors.primary },
    });
  }

  const titleY = extraNumber(spec, 'titleY', 2.0);
  const subtitleY = extraNumber(spec, 'subtitleY', 3.8);
  const metaBottom = extraBoolean(spec, 'metaBottom', false);
  const metaY = extraNumber(spec, 'metaY', metaBottom ? 6.55 : 5.5);

  if (node.title) {
    // Optional scale-up for the cover title (layout-driven; default 1 = legacy/folio)
    const titleScale = extraNumber(spec, 'titleFontSizeScale', 1);
    slide.addText(node.title, {
      x: boxX,
      y: titleY,
      w: contentW,
      h: 1.5,
      fontSize: Math.round(theme.fontSize.title * titleScale),
      fontFace: theme.fonts.heading,
      color: textColor,
      bold: true,
      align,
      valign: 'middle',
    });

    if (extraBoolean(spec, 'titleRule', false)) {
      const ruleH = extraNumber(spec, 'titleRuleHeight', 0.03);
      const ruleY = extraNumber(spec, 'titleRuleY', titleY + 1.55);
      const ruleW = extraNumber(spec, 'titleRuleWidth', Math.min(contentW, 4.2));
      // Anchor the rule to the same edge as the title alignment (right → right edge)
      let ruleX = boxX;
      if (align === 'center') ruleX = boxX + (contentW - ruleW) / 2;
      else if (align === 'right') ruleX = boxX + contentW - ruleW;
      addHRuler(slide, { x: ruleX, y: ruleY, w: ruleW, h: ruleH, color: ruleColor(theme, titleRuleRole(spec)) });
    }
  }

  if (node.subtitle) {
    slide.addText(node.subtitle, {
      x: boxX,
      y: subtitleY,
      w: contentW,
      h: 0.8,
      fontSize: theme.fontSize.body,
      fontFace: theme.fonts.body,
      color: subtitleColor,
      align,
      valign: 'middle',
    });
  }

  // 作者 / 日期：来自封面前缀段元信息，作者在上、日期在下叠排。
  const meta = node.metadata ?? {};
  const author = typeof meta.author === 'string' ? meta.author : undefined;
  const date = typeof meta.date === 'string' ? meta.date : undefined;
  const textElements = node.elements.filter((e) => e.type === 'text');
  if (author || date) {
    const lineH = 0.31;
    if (author) {
      slide.addText(author, {
        x: boxX,
        y: metaY,
        w: contentW,
        h: lineH,
        fontSize: theme.fontSize.small,
        fontFace: theme.fonts.body,
        color: metaColor,
        align,
        valign: 'middle',
      });
    }
    if (date) {
      slide.addText(date, {
        x: boxX,
        y: metaY + lineH + 0.03,
        w: contentW,
        h: lineH,
        fontSize: theme.fontSize.small,
        fontFace: theme.fonts.body,
        color: metaColor,
        align,
        valign: 'middle',
      });
    }
  } else if (textElements.length > 0) {
    const metaText = textElements.map((e) => e.content).join(' · ');
    slide.addText(metaText, {
      x: boxX,
      y: metaY,
      w: contentW,
      h: 0.6,
      fontSize: theme.fontSize.small,
      fontFace: theme.fonts.body,
      color: metaColor,
      align,
    });
  }
}

/**
 * minimal 封面：统一边距上的左侧竖装饰线；主/副标题沿竖线右缘左对齐；
 * 作者与日期沉底，整页留白充足。
 */
function renderMinimalTitle(
  slide: PptxGenJS.Slide,
  node: SlideNode,
  theme: Theme,
): void {
  const spec = layoutSpec(theme, 'title');

  // 页面背景用主色块（方案「元素 1」）
  const bgColor =
    theme.colors.backgroundGradient
      ? undefined
      : theme.colors.titleBackground ?? theme.colors.primary;
  if (bgColor) {
    slide.background = { color: bgColor };
  }
  const textColor = theme.colors.titleText ?? 'FFFFFF';
  const softColor = textColor === 'FFFFFF' ? 'FFFFFFCC' : theme.colors.secondary;

  // 左侧竖装饰线（x=左边距，垂直居中于标题组高度）
  const lineX = extraNumber(spec, 'minimalLineX', 0.83);
  const lineY1 = extraNumber(spec, 'minimalLineY1', 2.64);
  const lineH = extraNumber(spec, 'minimalLineH', 1.94);
  const lineW = extraNumber(spec, 'minimalLineW', 0.04);
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: lineX,
    y: lineY1,
    w: lineW,
    h: lineH,
    fill: { color: textColor },
  });

  const boxX = extraNumber(spec, 'minimalBoxX', 1.11);
  const contentW = extraNumber(spec, 'minimalBoxW', 8.89);

  if (node.title) {
    slide.addText(node.title, {
      x: boxX,
      y: extraNumber(spec, 'minimalTitleY', 2.64),
      w: contentW,
      h: 0.89,
      fontSize: theme.fontSize.title,
      fontFace: theme.fonts.heading,
      color: textColor,
      bold: true,
      align: 'left',
      valign: 'middle',
    });
  }

  if (node.subtitle) {
    slide.addText(node.subtitle, {
      x: boxX,
      y: extraNumber(spec, 'minimalSubtitleY', 3.64),
      w: contentW,
      h: 0.44,
      fontSize: theme.fontSize.body,
      fontFace: theme.fonts.body,
      color: softColor,
      align: 'left',
      valign: 'middle',
    });
  }

  // 作者 / 日期：来自封面前缀段元信息，作者在上（5.28）、日期在下（5.64）。
  const meta = node.metadata ?? {};
  const author = typeof meta.author === 'string' ? meta.author : undefined;
  const date = typeof meta.date === 'string' ? meta.date : undefined;
  const metaX = boxX;
  const metaW = extraNumber(spec, 'minimalMetaW', 4.17);
  const metaH = 0.31;
  if (author) {
    slide.addText(author, {
      x: metaX,
      y: extraNumber(spec, 'minimalAuthorY', 5.28),
      w: metaW,
      h: metaH,
      fontSize: theme.fontSize.small,
      fontFace: theme.fonts.body,
      color: softColor,
      align: 'left',
      valign: 'middle',
    });
  }
  if (date) {
    slide.addText(date, {
      x: metaX,
      y: extraNumber(spec, 'minimalDateY', 5.64),
      w: metaW,
      h: metaH,
      fontSize: theme.fontSize.small,
      fontFace: theme.fonts.body,
      color: softColor,
      align: 'left',
      valign: 'middle',
    });
  }
}
