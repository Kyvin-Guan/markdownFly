import type { Theme } from '../models/theme.js';

export const cleanTheme: Theme = {
  name: 'clean',
  colors: {
    primary: '2563EB',
    secondary: '4B5563',
    background: 'FFFFFF',
    text: '1F2937',
    accent: '10B981',
    codeBackground: '1E293B',
    codeText: 'E2E8F0',
    titleBackground: '2563EB',
    titleText: 'FFFFFF',
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
  shikiTheme: 'github-dark',
};
