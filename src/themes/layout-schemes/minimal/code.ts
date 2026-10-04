import type { ThemeLayoutSpec } from '../../../models/theme.js';

/**
 * minimal 代码页：页标题与正文一致；标题下方为独立圆角代码卡片，
 * 以圆角边框暗示此处为等宽字体代码文本。
 */
export const codeLayout: ThemeLayoutSpec = {
  titleAlign: 'left',
  margin: 0.83,
  extra: {
    minimalCard: true,
    minimalCardX: 0.83,
    minimalCardY: 1.33,
    minimalCardW: 11.67,
    minimalCardH: 5.28,
    minimalCardRadius: 0.08,
    minimalTitleY: 0.5,
    minimalTitleRuleY: 1.03,
    minimalTitleRuleW: 0.56,
    minimalTitleRuleH: 0.03,
  },
};
