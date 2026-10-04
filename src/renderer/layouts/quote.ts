/**
 * Quote slide layout
 *
 * Creative extras:
 * - extra.quoteBar: thick left pull-quote rule instead of a giant “ mark
 * - extra.quoteMark=false hides the decorative mark
 * - extra.attributionAlign: left | right (default right for legacy)
 */

import PptxGenJS from 'pptxgenjs';
import type { SlideNode } from '../../models/slide.js';
import type { Theme } from '../../models/theme.js';
import {
  addHRuler,
  extraBoolean,
  extraNumber,
  extraString,
  layoutSpec,
  resolveSideMargins,
  ruleColor,
  specAlign,
} from './layout-spec.js';

export function renderQuoteSlide(
  slide: PptxGenJS.Slide,
  node: SlideNode,
  theme: Theme,
): void {
  const spec = layoutSpec(theme, 'quote');

  // minimal 引用页：左侧竖引用标记 + 引用文案沿竖线左对齐，无大引号
  if (extraBoolean(spec, 'minimalQuote', false)) {
    renderMinimalQuote(slide, node, theme);
    return;
  }

  const showMark = extraBoolean(spec, 'quoteMark', true);
  const markSize = extraNumber(spec, 'quoteMarkSize', 72);
  const align = specAlign(spec.titleAlign, 'center');
  const { left, right } = resolveSideMargins(spec, 1.5);
  const quoteBar = extraBoolean(spec, 'quoteBar', false);
  const barW = extraNumber(spec, 'quoteBarWidth', 0.09);
  const attrAlign = extraString(spec, 'attributionAlign', 'right') as 'left' | 'right' | 'center';

  if (showMark && !quoteBar) {
    slide.addText('“', {
      x: left,
      y: 1.0,
      w: 2.0,
      h: 1.5,
      fontSize: markSize,
      fontFace: 'Georgia',
      color: theme.colors.accent,
      bold: true,
    });
  }

  const quoteElement = node.elements.find((e) => e.type === 'blockquote');
  if (!quoteElement || quoteElement.type !== 'blockquote') return;

  let quoteText = quoteElement.content;
  let attribution = '';
  const attrMatch = quoteText.match(/\n?\s*[—–-]\s*(.+)$/);
  if (attrMatch) {
    attribution = attrMatch[1].trim();
    quoteText = quoteText.slice(0, attrMatch.index).trim();
  }

  const textX = quoteBar ? left + barW + 0.35 : Math.max(left, showMark && !quoteBar ? 1.8 : left);
  const textW = Math.max(4, 13.33 - textX - right);
  const textY = extraNumber(spec, 'textY', quoteBar ? 2.2 : 2.5);
  const textH = extraNumber(spec, 'textH', quoteBar ? 2.8 : 2.5);

  if (quoteBar) {
    addHRuler(slide, {
      // vertical bar via tall thin rect
      x: left,
      y: textY,
      w: barW,
      h: textH,
      color: theme.colors.accent,
    });
  }

  // Centered decorative rule above quote (golden-style)
  const quoteRule = extraBoolean(spec, 'quoteRule', false);
  if (quoteRule) {
    const qRuleY = extraNumber(spec, 'quoteRuleY', 2.19);
    const qRuleW = extraNumber(spec, 'quoteRuleWidth', 1.33);
    const qRuleH = extraNumber(spec, 'quoteRuleHeight', 0.04);
    const qRuleColor = ruleColor(
      theme,
      extraString(spec, 'quoteRuleColor', 'primary') as 'primary' | 'secondary' | 'divider',
    );
    const qRuleX = (13.33 - qRuleW) / 2; // centered on page
    addHRuler(slide, {
      x: qRuleX,
      y: qRuleY,
      w: qRuleW,
      h: qRuleH,
      color: qRuleColor,
    });
  }

  slide.addText(quoteText, {
    x: textX,
    y: textY,
    w: textW,
    h: textH,
    fontSize: theme.fontSize.heading,
    fontFace: theme.fonts.body,
    color: theme.colors.text,
    italic: true,
    align,
    valign: 'middle',
  });

  if (attribution) {
    slide.addText(`— ${attribution}`, {
      x: textX,
      y: textY + textH + 0.25,
      w: textW,
      h: 0.55,
      fontSize: theme.fontSize.body,
      fontFace: theme.fonts.body,
      color: theme.colors.secondary,
      align: attrAlign === 'left' ? 'left' : attrAlign === 'center' ? 'center' : 'right',
    });
  }
}

/**
 * minimal 引用页：左侧竖引用标记 + 引用文案沿竖线左对齐；无大引号、留白充足。
 * 与「内容页标题+容器」结构区分，自带页脚。
 */
function renderMinimalQuote(
  slide: PptxGenJS.Slide,
  node: SlideNode,
  theme: Theme,
): void {
  const spec = layoutSpec(theme, 'quote');
  const lineX = extraNumber(spec, 'minimalRuleX', 1.67);
  const lineY = extraNumber(spec, 'minimalRuleY', 2.78);
  const lineH = extraNumber(spec, 'minimalRuleH', 1.39);
  const lineW = extraNumber(spec, 'minimalRuleW', 0.04);
  const color = theme.colors.divider ?? theme.colors.secondary;

  const textX = extraNumber(spec, 'minimalTextX', 2.08);
  const textY = lineY;
  const textW = extraNumber(spec, 'minimalTextW', 9.58);
  const textH = extraNumber(spec, 'minimalTextH', 1.39);

  const quoteElement = node.elements.find((e) => e.type === 'blockquote');
  if (!quoteElement || quoteElement.type !== 'blockquote') return;

  let quoteText = quoteElement.content;
  let attribution = '';
  const attrMatch = quoteText.match(/\n?\s*[—–-]\s*(.+)$/);
  if (attrMatch) {
    attribution = attrMatch[1].trim();
    quoteText = quoteText.slice(0, attrMatch.index).trim();
  }

  // 左侧竖装饰引用标记
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: lineX,
    y: lineY,
    w: lineW,
    h: lineH,
    fill: { color },
  });

  slide.addText(quoteText, {
    x: textX,
    y: textY,
    w: textW,
    h: textH,
    fontSize: theme.fontSize.heading,
    fontFace: theme.fonts.body,
    color: theme.colors.text,
    italic: true,
    align: 'left',
    valign: 'middle',
    wrap: true,
  });

  if (attribution) {
    slide.addText(`— ${attribution}`, {
      x: textX,
      y: textY + textH + 0.3,
      w: textW,
      h: 0.4,
      fontSize: theme.fontSize.body,
      fontFace: theme.fonts.body,
      color: theme.colors.secondary,
      align: 'left',
    });
  }
}
