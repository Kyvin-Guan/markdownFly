import type { ColorScheme } from '../../models/color-scheme.js';

/**
 * Graphite（石墨）— 灰白中性极简。
 * ink 深灰作文字，paper 浅灰近白作底，primary 中灰主装饰，
 * secondary 灰阶辅助。强调靠字重/字号/线条，不额外占彩槽。
 */
export const graphiteScheme: ColorScheme = {
  name: 'graphite',
  mode: 'light',
  ink: '4D4D4D',
  paper: 'F8F8F8',
  primary: 'D9D9D9',
  secondary: 'A6A6A6',
};
