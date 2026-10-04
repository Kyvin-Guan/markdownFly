import type { ThemeLayoutSpec } from '../../../models/theme.js';

/**
 * minimal 结尾页：上方短装饰横线（居中）+ 致谢语（居中）+ 联系方式（居中），
 * 整页居中对称、不带页脚，与封面页首尾呼应。
 */
export const closingLayout: ThemeLayoutSpec = {
  titleAlign: 'center',
  margin: 0.83,
  extra: {
    minimalClosing: true,
    thankText: 'Thank you',
    minimalRuleW: 1.11,
    minimalRuleH: 0.03,
    minimalRuleY: 2.78,
    minimalThankX: 2.5,
    minimalThankY: 3.06,
    minimalThankW: 8.33,
    minimalContactX: 3.89,
    minimalContactY: 4.31,
    minimalContactW: 5.56,
  },
};
