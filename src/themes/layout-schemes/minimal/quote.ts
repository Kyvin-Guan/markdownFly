import type { ThemeLayoutSpec } from '../../../models/theme.js';

/**
 * minimal 引用页：左侧竖引用标记 + 引用文案沿竖线左对齐；文字较大留白充足，
 * 与内容页「标题+容器」结构明显区分，自带页脚。
 */
export const quoteLayout: ThemeLayoutSpec = {
  titleAlign: 'left',
  margin: 0.83,
  extra: {
    minimalQuote: true,
    minimalRuleX: 1.67,
    minimalRuleY: 2.78,
    minimalRuleH: 1.39,
    minimalRuleW: 0.04,
    minimalTextX: 2.08,
    minimalTextW: 9.58,
    minimalTextH: 1.39,
  },
};
