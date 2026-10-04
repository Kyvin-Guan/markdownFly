import type { ThemeLayoutSpec } from '../../../models/theme.js';

/**
 * golden 页脚：分割线 + 左文案右页码（页码右缘对齐分割线右缘 x=12.22）。
 */
export const footerLayout: ThemeLayoutSpec = {
  margin: 1.11,
  footerDivider: true,
  extra: {
    footerAlign: 'left',
    marginLeft: 1.11,
    marginRight: 1.11,
  },
};
