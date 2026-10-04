import type { ThemeLayoutSpec } from '../../../models/theme.js';

/**
 * minimal 封面：左侧竖装饰线作视觉锚点，主/副标题沿竖线右缘左对齐，
 * 作者与日期沉底。整页留白充足，视觉重心偏左上。
 */
export const titleLayout: ThemeLayoutSpec = {
  titleAlign: 'left',
  margin: 0.83,
  extra: {
    minimalTitle: true,
    minimalLineX: 0.83,
    minimalLineY1: 2.64,
    minimalLineH: 1.94,
    minimalLineW: 0.04,
    minimalBoxX: 1.11,
    minimalBoxW: 8.89,
    minimalTitleY: 2.64,
    minimalSubtitleY: 3.64,
    minimalAuthorY: 5.28,
    minimalDateY: 5.64,
    minimalMetaW: 4.17,
  },
};
