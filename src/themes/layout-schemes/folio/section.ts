import type { ThemeLayoutSpec } from '../../../models/theme.js';

/**
 * folio 章节：无左/顶条；上下双横线构成「标题带」
 * 与 legacy 的左侧竖条章节页刻意区分
 */
export const sectionLayout: ThemeLayoutSpec = {
  accentBar: 'none',
  titleAlign: 'left',
  margin: 1.0,
  extra: {
    doubleRules: true,
    ruleWeight: 0.04,
    bandY: 2.55,
    bandH: 1.55,
    titleRuleColor: 'primary',
    marginLeft: 1.0,
    marginRight: 0.7,
  },
};
