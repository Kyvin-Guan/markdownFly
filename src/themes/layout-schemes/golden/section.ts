import type { ThemeLayoutSpec } from '../../../models/theme.js';

/**
 * golden 章节：延续封面语言——序号与标题右对齐、左侧留白，
 * 标题下方同一条黄金分割横线。与内容页明显区分。
 */
export const sectionLayout: ThemeLayoutSpec = {
  accentBar: 'none',
  titleAlign: 'right',
  margin: 0.83,
  extra: {
    marginLeft: 6.67,
    marginRight: 0.83,
    // 章节序号占位（node.subtitle）+ 标题
    subtitleY: 3.03,
    subtitleH: 0.36,
    titleY: 3.5,
    titleH: 0.89,
    // 黄金分割横线
    sectionRule: true,
    sectionRuleY: 4.64,
    sectionRuleWidth: 8.22,
    sectionRuleHeight: 0.04,
    sectionRuleColor: 'primary',
  },
};
