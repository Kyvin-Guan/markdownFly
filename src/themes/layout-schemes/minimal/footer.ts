import type { ThemeLayoutSpec } from '../../../models/theme.js';

/** minimal 页脚：分割线 + 文案/页码，几何沿用方案统一坐标（线 y=6.94，文 y=7.03）。 */
export const footerLayout: ThemeLayoutSpec = {
  margin: 0.83,
  footerDivider: true,
  extra: {
    footerAlign: 'left',
    dividerY: 6.94,
    footerY: 7.03,
  },
};
