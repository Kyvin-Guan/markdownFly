import type { Theme } from '../models/theme.js';

/**
 * Dracula — the official Dracula palette (purple primary + pink accent on charcoal).
 */
export const draculaTheme: Theme = {
  name: 'dracula',
  colors: {
    primary: 'BD93F9',
    secondary: '6272A4',
    background: '282A36',
    text: 'F8F8F2',
    accent: 'FF79C6',
    codeBackground: '21222C',
    codeText: 'F8F8F2',
    titleBackground: '282A36',
    titleText: 'BD93F9',
    highlightBackground: '44475A',
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
