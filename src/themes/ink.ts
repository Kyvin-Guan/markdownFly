import type { Theme } from '../models/theme.js';

/**
 * Ink — Chinese ink-wash style (rice-paper background, ink blacks,
 * vermilion seal-red accent, Kai serif typography).
 */
export const inkTheme: Theme = {
  name: 'ink',
  colors: {
    primary: '2F3530',
    secondary: '6F6A5E',
    background: 'F7F4EC',
    text: '262626',
    accent: 'C0272D',
    codeBackground: '2B2924',
    codeText: 'D8D2C0',
    titleBackground: '30352F',
    titleText: '262626',
    highlightBackground: 'EBDDCD',
    backgroundGradient: { from: 'F7F4EC', to: 'EFE8DA', angle: 180 },
  },
  fonts: {
    heading: 'KaiTi',
    body: 'KaiTi',
    code: 'Consolas',
    cjk: 'KaiTi',
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
