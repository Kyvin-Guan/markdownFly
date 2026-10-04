import type { ThemeLayoutSpec } from '../../../models/theme.js';

/**
 * golden 引用：视觉安静——引用文本居中、上下大留白，
 * 文本上方一条居中短横线呼应横线语言，无大引号、无左竖条。
 */
export const quoteLayout: ThemeLayoutSpec = {
  titleAlign: 'center',
  accentBar: 'none',
  margin: 2.22,
  extra: {
    quoteMark: false,
    quoteBar: false,
    marginLeft: 2.22,
    marginRight: 2.22,
    quoteRule: true,
    quoteRuleY: 2.19,
    quoteRuleWidth: 1.33,
    quoteRuleHeight: 0.04,
    quoteRuleColor: 'primary',
    textY: 2.58,
    textH: 1.94,
    attributionAlign: 'center',
  },
};
