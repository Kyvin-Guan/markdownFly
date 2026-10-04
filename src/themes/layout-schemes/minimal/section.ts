import type { ThemeLayoutSpec } from '../../../models/theme.js';

/**
 * minimal 章节页：左侧超大章节序号 + 竖分隔线 + 章节标题 的横排布局。
 * 章节序号由通用计数功能自动递增（从 01 开始），footer 关（`footer: 'off'`）。
 */
export const sectionLayout: ThemeLayoutSpec = {
  titleAlign: 'left',
  margin: 0.83,
  extra: {
    minimalNumber: true,
    footer: 'off',
    minimalNumberX: 1.11,
    minimalNumberY: 2.43,
    minimalNumberW: 2.5,
    minimalNumberH: 1.53,
    minimalRuleX: 3.89,
    minimalRuleY1: 2.71,
    minimalRuleW: 0.03,
    minimalRuleH: 1.11,
    minimalTitleX: 4.31,
    minimalTitleY: 2.71,
    minimalTitleW: 6.94,
    minimalTitleH: 0.69,
  },
};
