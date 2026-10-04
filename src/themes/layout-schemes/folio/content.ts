import type { ThemeLayoutSpec } from '../../../models/theme.js';

/**
 * folio 正文：左宽右窄的编辑页边距 + 标题下粗线（次级色）
 * 与 legacy 对称边距 + 细主线区分
 */
export const contentLayout: ThemeLayoutSpec = {
  titleAlign: 'left',
  margin: 0.55,
  titleHeight: 0.82,
  contentPadding: 0,
  extra: {
    marginLeft: 0.72,
    marginRight: 0.38,
    titleRule: true,
    titleRuleHeight: 0.07,
    titleRuleColor: 'secondary',
  },
};
