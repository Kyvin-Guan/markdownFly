import type { ThemeLayoutSpec } from '../../../models/theme.js';

const imageBase = {
  titleAlign: 'left' as const,
  margin: 0.83,
  extra: {
    minimalImage: true,
    minimalImageY: 1.33,
    minimalImageH: 5.28,
    minimalTitleY: 0.5,
    minimalTitleRuleY: 1.03,
    minimalTitleRuleW: 0.56,
    minimalTitleRuleH: 0.03,
  },
};

/** minimal 单图：占满内容区宽度的虚线占位框 + 页脚 */
export const imageSingleLayout: ThemeLayoutSpec = { ...imageBase };
/** minimal 双图：两个等宽虚线占位框左右并排（间距 0.28） */
export const imageDoubleLayout: ThemeLayoutSpec = { ...imageBase };
/** minimal 三图：三个等宽虚线占位框横排（间距 0.21） */
export const imageTripleLayout: ThemeLayoutSpec = { ...imageBase };
