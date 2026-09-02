import type { Theme } from '../models/theme.js';
import { defaultTheme } from './default.js';

const themes: Record<string, Theme> = {
  default: defaultTheme,
};

export function getTheme(name: string): Theme {
  const theme = themes[name];
  if (!theme) {
    console.warn(`Theme "${name}" not found, using default`);
    return defaultTheme;
  }
  return theme;
}

export { defaultTheme };
