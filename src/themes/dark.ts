import type { Theme } from '../models/theme.js';

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    primary: '38BDF8',
    secondary: '94A3B8',
    background: '0F172A',
    text: 'F8FAFC',
    accent: 'A855F7',
    codeBackground: '020617',
    codeText: '38BDF8',
    titleBackground: '0F172A',
    titleText: '38BDF8',
    highlightBackground: '334155',
    backgroundGradient: { from: '0F172A', to: '1E293B', angle: 135 },
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
