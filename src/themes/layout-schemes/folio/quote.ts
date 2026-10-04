import type { ThemeLayoutSpec } from '../../../models/theme.js';

/**
 * folio 引用：左侧粗竖条 pull-quote，无大引号，文案左对齐
 * 与 legacy「大引号 + 居中」区分
 */
export const quoteLayout: ThemeLayoutSpec = {
  titleAlign: 'left',
  accentBar: 'none',
  margin: 0.9,
  extra: {
    quoteMark: false,
    quoteBar: true,
    quoteBarWidth: 0.1,
    marginLeft: 0.9,
    marginRight: 0.7,
    attributionAlign: 'left',
  },
};
