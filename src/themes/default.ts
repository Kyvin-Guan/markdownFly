import type { Theme } from '../models/theme.js';

export const defaultTheme: Theme = {
  name: 'default',
  colors: {
    primary: '2563EB',
    secondary: '3B82F6',
    background: 'FFFFFF',
    text: '1F2937',
    accent: '10B981',
    codeBackground: '1E293B',
    codeText: 'E2E8F0',
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
};
