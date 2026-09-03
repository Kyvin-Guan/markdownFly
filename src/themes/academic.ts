import type { Theme } from '../models/theme.js';

export const academicTheme: Theme = {
  name: 'academic',
  colors: {
    primary: '003366',
    secondary: '4A5568',
    background: 'FFFFFF',
    text: '111827',
    accent: '991B1B',
    codeBackground: '1E293B',
    codeText: 'E2E8F0',
    titleBackground: '003366',
    titleText: 'FFFFFF',
  },
  fonts: {
    heading: 'Times New Roman',
    body: 'Segoe UI',
    code: 'Consolas',
    cjk: '宋体',
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
