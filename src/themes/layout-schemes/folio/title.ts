import type { ThemeLayoutSpec } from '../../../models/theme.js';

/** folio 封面：左侧书脊 + 左对齐 + 标题下短线 + 元信息沉底 */
export const titleLayout: ThemeLayoutSpec = {
  titleAlign: 'left',
  margin: 0.9,
  extra: {
    spineWidth: 0.2,
    marginLeft: 0.55,
    marginRight: 0.7,
    titleY: 2.35,
    subtitleY: 4.05,
    titleRule: true,
    titleRuleHeight: 0.035,
    titleRuleWidth: 3.6,
    titleRuleColor: 'primary',
    metaBottom: true,
  },
};
