import type { ThemeLayoutSpec } from '../../../models/theme.js';

/** folio 代码页：近满幅图版，标题区矮 + 标题下细线 */
export const codeLayout: ThemeLayoutSpec = {
  titleAlign: 'left',
  margin: 0.35,
  titleHeight: 0.55,
  extra: {
    marginLeft: 0.4,
    marginRight: 0.4,
    titleRule: true,
    titleRuleHeight: 0.025,
    titleRuleColor: 'secondary',
  },
};
