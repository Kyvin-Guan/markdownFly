import type { Theme } from '../models/theme.js';

export const businessTheme: Theme = {
  name: 'business',
  colors: {
    primary: '1E3A8A',
    secondary: '64748B',
    background: 'F8FAFC',
    text: '0F172A',
    accent: 'D97706',
    codeBackground: '0F172A',
    codeText: 'E2E8F0',
    titleBackground: '1E3A8A',
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
