import type { ThemeLayoutSpec } from '../../../models/theme.js';

/**
 * golden 正文：页标题左上，标题下一条短装饰线（左缘对齐），
 * 底部页脚分割线 + 左文案右页码（由 layouts/index.ts 统一渲染）。
 */
export const contentLayout: ThemeLayoutSpec = {
  titleAlign: 'left',
  margin: 1.11,
  titleHeight: 1.3,
  contentPadding: 0,
  extra: {
    marginLeft: 1.11,
    marginRight: 1.11,
    titleY: 0.72,
    titleRule: true,
    titleRuleWidth: 0.89,
    titleRuleHeight: 0.04,
    titleRuleColor: 'primary',
  },
};
