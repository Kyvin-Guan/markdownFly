import type { ThemeLayoutSpec } from '../../../models/theme.js';

/**
 * golden 结尾：与封面同构——右对齐致谢语、黄金分割横线、横线下联系方式区。
 * 单线模式（横线在致谢语下方），右对齐贴右侧缘。
 */
export const closingLayout: ThemeLayoutSpec = {
  titleAlign: 'right',
  margin: 0.83,
  extra: {
    thankText: 'Thank you',
    marginLeft: 5.83,
    marginRight: 0.83,
    textY: 3.22,
    titleRule: true,
    closingRule: 'below',
    ruleWidth: 8.22,
    ruleHeight: 0.04,
    ruleY: 4.64,
  },
};
