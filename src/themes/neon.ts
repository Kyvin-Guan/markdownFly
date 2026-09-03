import type { Theme } from '../models/theme.js';

/**
 * Neon — high-contrast dark tech theme with cyan/magenta accents,
 * inspired by ppt-agents' "dark" (cyan + magenta high contrast).
 */
export const neonTheme: Theme = {
  name: 'neon',
  colors: {
    primary: '00E5FF',
    secondary: '9AA4B5',
    background: '121212',
    text: 'FFFFFF',
    accent: 'FF4081',
    codeBackground: '0C0C0C',
    codeText: '85E7F7',
    titleBackground: '121212',
    titleText: '00E5FF',
    highlightBackground: '2A2A32',
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
