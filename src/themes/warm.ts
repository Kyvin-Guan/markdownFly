import type { Theme } from '../models/theme.js';

export const warmTheme: Theme = {
  name: 'warm',
  colors: {
    primary: '065F46',
    secondary: '78716C',
    background: 'FDFBF7',
    text: '292524',
    accent: 'C2410C',
    codeBackground: '292524',
    codeText: 'FDFBF7',
    titleBackground: '065F46',
    titleText: '292524',
    backgroundGradient: { from: 'FDFBF7', to: 'F5EEDF', angle: 180 },
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
