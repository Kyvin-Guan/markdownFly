import type { Theme } from '../models/theme.js';

/**
 * Nord — the classic Arctic Frost palette (frost blues + aurora warm accents).
 */
export const nordTheme: Theme = {
  name: 'nord',
  colors: {
    primary: '88C0D0',
    secondary: '81A1C1',
    background: '2E3440',
    text: 'D8DEE9',
    accent: 'EBCB8B',
    codeBackground: '272C36',
    codeText: 'A9BBD3',
    titleBackground: '2E3440',
    titleText: '88C0D0',
    highlightBackground: '3B4252',
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
  shikiTheme: 'nord',
};
