import type { ThemeLayoutSpec } from '../../../models/theme.js';

/** folio 页脚：分割线 + 居中（legacy 为右对齐、无分割线） */
export const footerLayout: ThemeLayoutSpec = {
  margin: 0.55,
  footerDivider: true,
  extra: {
    footerAlign: 'center',
  },
};
