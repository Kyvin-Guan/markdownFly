import type { ThemeLayoutSpec } from '../../../models/theme.js';

/**
 * golden 图文页：与正文共用骨架（页标题左对齐 + 短装饰线 + 页脚）。
 * 单图/双图/三图除占位框数量外几何参数一致。
 */
const imageBase = {
  titleAlign: 'left' as const,
  margin: 1.11,
  titleHeight: 1.3,
  extra: {
    marginLeft: 1.11,
    marginRight: 1.11,
    titleY: 0.72,
    titleRule: true,
    titleRuleWidth: 0.89,
    titleRuleHeight: 0.04,
    titleRuleColor: 'primary' as const,
  },
};

export const imageSingleLayout: ThemeLayoutSpec = { ...imageBase };
export const imageDoubleLayout: ThemeLayoutSpec = { ...imageBase };
export const imageTripleLayout: ThemeLayoutSpec = { ...imageBase };
