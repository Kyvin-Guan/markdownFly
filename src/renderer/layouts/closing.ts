/**
 * Closing slide layout — fixed “Thank you” page (@(layout=closing)).
 * Extras: thankText, titleRule (rules above/below the word).
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
  titleRuleRole,
} from './layout-spec.js';

export function renderClosingSlide(
  slide: PptxGenJS.Slide,
  node: SlideNode,
  theme: Theme,
): void {
  const spec = layoutSpec(theme, 'closing');

  // minimal 结尾页：上方短横线 + 居中致谢语 + 下方居中联系方式，无页脚
  if (extraBoolean(spec, 'minimalClosing', false)) {
    renderMinimalClosing(slide, node, theme);
    return;
  }

  const align = specAlign(spec.titleAlign, 'center');
  const { left, right } = resolveSideMargins(spec, 0.8);
  const contentW = Math.max(3, 13.33 - left - right);
  const thankText = extraString(spec, 'thankText', 'Thank you');
  const primary = node.title?.trim() || thankText;
  const textY = extraNumber(spec, 'textY', 2.7);
  const showRules = extraBoolean(spec, 'titleRule', false);
  const color = ruleColor(theme, titleRuleRole(spec) === 'primary' ? 'primary' : titleRuleRole(spec));
  const ruleW = extraNumber(spec, 'ruleWidth', Math.min(contentW, 3.2));
  // closingRule: 'both' (default legacy, above+below) | 'above' | 'below'
  const closingRule = extraString(spec, 'closingRule', 'both') as 'both' | 'above' | 'below';
  const ruleH = extraNumber(spec, 'ruleHeight', 0.03);
  const ruleY = extraNumber(spec, 'ruleY', textY + 1.5);
  const ruleX =
    align === 'center'
      ? left + (contentW - ruleW) / 2
      : align === 'right'
        ? left + contentW - ruleW
        : left;

  const drawAbove = showRules && (closingRule === 'both' || closingRule === 'above');
  const drawBelow = showRules && (closingRule === 'both' || closingRule === 'below');

  if (drawAbove) {
    addHRuler(slide, { x: ruleX, y: textY - 0.35, w: ruleW, h: ruleH, color });
  }

  slide.addText(primary, {
    x: left,
    y: textY,
    w: contentW,
    h: 1.3,
    fontSize: theme.fontSize.title,
    fontFace: theme.fonts.heading,
    color: theme.colors.primary,
    bold: true,
    align,
    valign: 'middle',
  });

  if (drawBelow) {
    addHRuler(slide, { x: ruleX, y: ruleY, w: ruleW, h: ruleH, color });
  }

  const secondary = node.subtitle?.trim();
  if (secondary) {
    slide.addText(secondary, {
      x: left,
      y: textY + 1.7,
      w: contentW,
      h: 0.6,
      fontSize: theme.fontSize.body,
      fontFace: theme.fonts.body,
      color: theme.colors.secondary,
      align,
      valign: 'middle',
    });
  }
}

/**
 * minimal 结尾页：上方短装饰横线（居中）+ 致谢语（居中）+ 联系方式（居中），
 * 整页居中对称、不带页脚，与封面首尾呼应。
 */
function renderMinimalClosing(
  slide: PptxGenJS.Slide,
  node: SlideNode,
  theme: Theme,
): void {
  const spec = layoutSpec(theme, 'closing');
  const color = theme.colors.divider ?? theme.colors.secondary;
  const thankText = extraString(spec, 'thankText', 'Thank you');
  const primary = node.title?.trim() || thankText;

  // 上方短装饰横线（水平居中于页面）
  const ruleW = extraNumber(spec, 'minimalRuleW', 1.11);
  const ruleH = extraNumber(spec, 'minimalRuleH', 0.03);
  const ruleY = extraNumber(spec, 'minimalRuleY', 2.78);
  addHRuler(slide, {
    x: (13.33 - ruleW) / 2,
    y: ruleY,
    w: ruleW,
    h: ruleH,
    color,
  });

  // 致谢语（水平居中）
  slide.addText(primary, {
    x: extraNumber(spec, 'minimalThankX', 2.5),
    y: extraNumber(spec, 'minimalThankY', 3.06),
    w: extraNumber(spec, 'minimalThankW', 8.33),
    h: 0.83,
    fontSize: theme.fontSize.title,
    fontFace: theme.fonts.heading,
    color: theme.colors.primary,
    bold: true,
    align: 'center',
    valign: 'middle',
  });

  // 联系方式（居中，位于致谢语下方）
  const contact = node.subtitle?.trim() ?? '';
  if (contact) {
    slide.addText(contact, {
      x: extraNumber(spec, 'minimalContactX', 3.89),
      y: extraNumber(spec, 'minimalContactY', 4.31),
      w: extraNumber(spec, 'minimalContactW', 5.56),
      h: 0.33,
      fontSize: theme.fontSize.body,
      fontFace: theme.fonts.body,
      color: theme.colors.secondary,
      align: 'center',
      valign: 'middle',
    });
  }
}
