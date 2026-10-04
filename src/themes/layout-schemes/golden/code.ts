import type { ThemeLayoutSpec } from '../../../models/theme.js';

/**
 * golden 代码页：与正文共用骨架（页标题左对齐 + 短装饰线）。
 * 内容区替换为独立圆角代码容器，圆角由 styles.codeRadius 控制。
 */
export const codeLayout: ThemeLayoutSpec = {
  titleAlign: 'left',
  margin: 1.11,
  titleHeight: 0.6,
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
