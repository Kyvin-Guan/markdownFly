import type { Theme } from '../models/theme.js';

/**
 * Aurora — dark neon gradient (mint/blue/purple accents on deep navy),
 * inspired by the SlideForge "aurora" deck palette.
 */
export const auroraTheme: Theme = {
  name: 'aurora',
  colors: {
    primary: '7AA2FF',
    secondary: '8FA3C9',
    background: '06091C',
    text: 'E8F0FF',
    accent: '5EF2C6',
    codeBackground: '0B1128',
    codeText: 'AECAF5',
    titleText: 'F4F8FF',
    highlightBackground: '233152',
    backgroundGradient: { from: '101A3A', to: '05060F', angle: 135 },
  },
  fonts: {
    heading: 'Segoe UI',
    body: 'Segoe UI',
    code: 'Consolas',
    cjk: '微软雅黑',
  },
  fontSize: {
    title: 36,
    heading: 28,
    body: 18,
    code: 14,
    small: 12,
  },
  shikiTheme: 'dracula',
};
