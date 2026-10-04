import type { ThemeLayoutSpec } from '../../../models/theme.js';

/** 旧版引用页：大引号 + 居中 */
export const quoteLayout: ThemeLayoutSpec = {
  titleAlign: 'center',
  accentBar: 'none',
  extra: {
    quoteMark: true,
    quoteMarkSize: 72,
  },
};
