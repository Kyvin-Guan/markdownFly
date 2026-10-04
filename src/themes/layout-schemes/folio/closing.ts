import type { ThemeLayoutSpec } from '../../../models/theme.js';

/** folio 结尾：Thank you 上下短线，与封面短横线呼应 */
export const closingLayout: ThemeLayoutSpec = {
  titleAlign: 'center',
  margin: 0.7,
  extra: {
    thankText: 'Thank you',
    titleRule: true,
    ruleWidth: 2.8,
    textY: 2.85,
  },
};
