import type { Theme } from '../models/theme.js';

/**
 * Beige — warm minimal light theme (paper beige, bronze + terracotta accents),
 * inspired by reveal.js' "beige" palette.
 */
export const beigeTheme: Theme = {
  name: 'beige',
  colors: {
    primary: '8B6F3D',
    secondary: '6B6455',
    background: 'F7F3DE',
    text: '2F2A1F',
    accent: 'C0563C',
    codeBackground: '3A352B',
    codeText: 'E8E0CC',
    titleBackground: '8B6F3D',
    titleText: '2F2A1F',
    highlightBackground: 'F0E2B8',
    backgroundGradient: { from: 'F7F3DE', to: 'F1E8D2', angle: 180 },
  },
  fonts: {
    heading: 'Georgia',
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
  shikiTheme: 'github-dark',
};
