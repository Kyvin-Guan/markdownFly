/**
 * Section divider slide layout
 *
 * Creative extras:
 * - accentBar 'none' + extra.doubleRules → magazine band framed by two rules
 * - extra.ruleWeight / extra.bandY / extra.bandH control the ruled band
 */

import PptxGenJS from 'pptxgenjs';
import type { SlideNode } from '../../models/slide.js';
import type { Theme } from '../../models/theme.js';
import type { RenderContext } from './index.js';
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

/** Zero-pad a number to two digits (1 → "01", 12 → "12"). */
export function formatSectionNumber(n: number): string {
  return String(n).padStart(2, '0');
}

export function renderSectionSlide(
  slide: PptxGenJS.Slide,
  node: SlideNode,
  theme: Theme,
  ctx?: RenderContext,
): void {
  const spec = layoutSpec(theme, 'section');

  // minimal: 超大章节序号 + 竖分隔线 + 标题 的横排布局
  if (extraBoolean(spec, 'minimalNumber', false)) {
    renderMinimalSection(slide, node, theme, ctx);
    return;
  }

  const barW = theme.styles?.sectionBarWidth ?? extraNumber(spec, 'sectionBarWidth', 0.15);
  const accentBar = spec.accentBar ?? 'left';
  const titleAlign = specAlign(spec.titleAlign, 'left');
  const { left, right } = resolveSideMargins(spec, accentBar === 'left' ? 1.0 : 0.9);

  if (accentBar !== 'none') {
    if (accentBar === 'left') {
      slide.addShape('rect' as PptxGenJS.ShapeType, {
        x: 0,
        y: 0,
        w: barW,
        h: 7.5,
        fill: { color: theme.colors.accent },
      });
    } else if (accentBar === 'top') {
      slide.addShape('rect' as PptxGenJS.ShapeType, {
        x: 0,
        y: 0,
        w: 13.33,
        h: barW,
        fill: { color: theme.colors.accent },
      });
    } else if (accentBar === 'bottom') {
      slide.addShape('rect' as PptxGenJS.ShapeType, {
        x: 0,
        y: 7.5 - barW,
        w: 13.33,
        h: barW,
        fill: { color: theme.colors.accent },
      });
    }
  }

  const leftPad = accentBar === 'left' ? Math.max(left, barW + 0.85) : left;
  const textW = Math.max(3, 13.33 - leftPad - right);

  // Ruled editorial band (innovative section: no side bar)
  if (extraBoolean(spec, 'doubleRules', false)) {
    const weight = extraNumber(spec, 'ruleWeight', 0.035);
    const bandY = extraNumber(spec, 'bandY', 2.35);
    const bandH = extraNumber(spec, 'bandH', 1.7);
    const color = ruleColor(theme, titleRuleRole(spec) === 'primary' ? 'primary' : titleRuleRole(spec));
    const ruleX = leftPad;
    const ruleW = textW;
    addHRuler(slide, { x: ruleX, y: bandY, w: ruleW, h: weight, color });
    addHRuler(slide, { x: ruleX, y: bandY + bandH, w: ruleW, h: weight, color });

    if (node.title) {
      slide.addText(node.title, {
        x: leftPad,
        y: bandY + weight + 0.08,
        w: textW,
        h: bandH - weight * 2 - 0.16,
        fontSize: theme.fontSize.heading + 6,
        fontFace: theme.fonts.heading,
        color: theme.colors.text,
        bold: true,
        align: titleAlign,
        valign: 'middle',
      });
    }

    const sub = node.subtitle?.trim();
    if (sub) {
      slide.addText(sub, {
        x: leftPad,
        y: bandY + bandH + 0.35,
        w: textW,
        h: 0.45,
        fontSize: theme.fontSize.small,
        fontFace: theme.fonts.body,
        color: theme.colors.secondary,
        align: titleAlign,
      });
    }
    return;
  }

  // Golden-ratio section rule (single decorative line spanning wider than the text area)
  if (extraBoolean(spec, 'sectionRule', false)) {
    const secRuleY = extraNumber(spec, 'sectionRuleY', 4.64);
    const secRuleW = extraNumber(spec, 'sectionRuleWidth', 5);
    const secRuleH = extraNumber(spec, 'sectionRuleHeight', 0.04);
    const secRuleX = extraNumber(
      spec,
      'sectionRuleX',
      titleAlign === 'right' ? 13.33 - right - secRuleW : leftPad,
    );
    addHRuler(slide, {
      x: secRuleX,
      y: secRuleY,
      w: secRuleW,
      h: secRuleH,
      color: ruleColor(
        theme,
        extraString(spec, 'sectionRuleColor', 'primary') as 'primary' | 'secondary' | 'divider',
      ),
    });
  }

  if (node.subtitle) {
    const subY = extraNumber(spec, 'subtitleY', 0.85);
    const subH = extraNumber(spec, 'subtitleH', 0.45);
    slide.addText(node.subtitle, {
      x: leftPad,
      y: subY,
      w: textW,
      h: subH,
      fontSize: theme.fontSize.body,
      fontFace: theme.fonts.body,
      color: theme.colors.secondary,
      align: titleAlign,
      valign: 'middle',
    });
  }

  if (node.title) {
    const tY = extraNumber(spec, 'titleY', 2.5);
    const tH = extraNumber(spec, 'titleH', 2.0);
    slide.addText(node.title, {
      x: leftPad,
      y: tY,
      w: textW,
      h: tH,
      fontSize: theme.fontSize.heading + 4,
      fontFace: theme.fonts.heading,
      color: theme.colors.text,
      bold: true,
      align: titleAlign,
      valign: 'middle',
    });
  }
}

/**
 * minimal 章节页：左侧超大章节序号 + 竖分隔线 + 章节标题 的横排布局。
 * 序号由 ctx.sectionNumber 自动递增（01、02…），见 pptx-renderer.ts。
 */
function renderMinimalSection(
  slide: PptxGenJS.Slide,
  node: SlideNode,
  theme: Theme,
  ctx?: RenderContext,
): void {
  const spec = layoutSpec(theme, 'section');
  const num = formatSectionNumber(ctx?.sectionNumber ?? 1);

  // 章节序号（超大号，左对齐）
  const nX = extraNumber(spec, 'minimalNumberX', 1.11);
  const nY = extraNumber(spec, 'minimalNumberY', 2.43);
  const nW = extraNumber(spec, 'minimalNumberW', 2.5);
  const nH = extraNumber(spec, 'minimalNumberH', 1.53);
  slide.addText(num, {
    x: nX,
    y: nY,
    w: nW,
    h: nH,
    fontSize: theme.fontSize.title,
    fontFace: theme.fonts.heading,
    color: theme.colors.primary,
    bold: true,
    align: 'left',
    valign: 'middle',
  });

  // 竖分隔线
  const rX = extraNumber(spec, 'minimalRuleX', 3.89);
  const rY1 = extraNumber(spec, 'minimalRuleY1', 2.71);
  const rH = extraNumber(spec, 'minimalRuleH', 1.11);
  const rW = extraNumber(spec, 'minimalRuleW', 0.03);
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: rX,
    y: rY1,
    w: rW,
    h: rH,
    fill: { color: theme.colors.divider ?? theme.colors.secondary },
  });

  // 章节标题（左对齐，与竖线对齐）
  if (node.title) {
    const tX = extraNumber(spec, 'minimalTitleX', 4.31);
    const tY = extraNumber(spec, 'minimalTitleY', rY1);
    const tW = extraNumber(spec, 'minimalTitleW', 6.94);
    const tH = extraNumber(spec, 'minimalTitleH', 0.69);
    slide.addText(node.title, {
      x: tX,
      y: tY,
      w: tW,
      h: tH,
      fontSize: theme.fontSize.heading,
      fontFace: theme.fonts.heading,
      color: theme.colors.text,
      bold: true,
      align: 'left',
      valign: 'middle',
    });
  }
}
