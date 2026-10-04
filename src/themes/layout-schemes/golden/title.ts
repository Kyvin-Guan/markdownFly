import type { ThemeLayoutSpec } from '../../../models/theme.js';

/**
 * golden 封面：右对齐 + 大量留白 + 标题下黄金分割横线。
 * 主标题/副标题右上方，横线下方排作者与日期。
 * 横线长 8.22 ≈ 页宽 × 0.618；横线 y=4.64 将页高分为 1.618:1。
 */
export const titleLayout: ThemeLayoutSpec = {
  titleAlign: 'right',
  margin: 0.83,
  extra: {
    marginLeft: 6.94,
    marginRight: 0.83,
    titleY: 3.0,
    subtitleY: 4.0,
    titleRule: true,
    titleRuleHeight: 0.04,
    titleRuleWidth: 8.22,
    titleRuleY: 4.64,
    titleRuleColor: 'primary',
    metaBottom: true,
    metaY: 5.0,
  },
};
