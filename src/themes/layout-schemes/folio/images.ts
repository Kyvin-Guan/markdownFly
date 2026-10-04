import type { ThemeLayoutSpec } from '../../../models/theme.js';

const imageBase = {
  titleAlign: 'left' as const,
  margin: 0.55,
  titleHeight: 0.75,
  extra: {
    marginLeft: 0.72,
    marginRight: 0.38,
    titleRule: true,
    titleRuleHeight: 0.055,
    titleRuleColor: 'secondary' as const,
  },
};

export const imageSingleLayout: ThemeLayoutSpec = { ...imageBase };
export const imageDoubleLayout: ThemeLayoutSpec = { ...imageBase };
export const imageTripleLayout: ThemeLayoutSpec = { ...imageBase };
