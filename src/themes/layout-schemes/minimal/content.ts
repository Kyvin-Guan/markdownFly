import type { ThemeLayoutSpec } from '../../../models/theme.js';

/**
 * minimal 正文页：页标题 + 标题下短横线（非贯穿）+ 带边框内容容器。
 * 内容区起始 y=1.33、底部收于 y=6.61（高 5.28），页脚统一置于下方。
 */
export const contentLayout: ThemeLayoutSpec = {
  titleAlign: 'left',
  margin: 0.83,
  titleHeight: 0.44,
  extra: {
    minimalBox: true,
    minimalBoxX: 0.83,
    minimalBoxY: 1.33,
    minimalBoxW: 11.67,
    minimalBoxH: 5.28,
    minimalTitleY: 0.5,
    minimalTitleRuleY: 1.03,
    minimalTitleRuleW: 0.56,
    minimalTitleRuleH: 0.03,
  },
};
