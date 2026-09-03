import type { Theme } from '../models/theme.js';
import { cleanTheme } from './clean.js';
import { academicTheme } from './academic.js';
import { darkTheme } from './dark.js';
import { businessTheme } from './business.js';
import { warmTheme } from './warm.js';
import { defaultTheme } from './default.js';

export const themes: Record<string, Theme> = {
  clean: cleanTheme,
  academic: academicTheme,
  dark: darkTheme,
  business: businessTheme,
  warm: warmTheme,
  default: defaultTheme,
};

export function getTheme(name?: string): Theme {
  if (!name) {
    return cleanTheme;
  }
  const theme = themes[name.toLowerCase()];
  if (!theme) {
    console.warn(`Theme "${name}" not found, using "clean"`);
    return cleanTheme;
  }
  return theme;
}

export {
  cleanTheme,
  academicTheme,
  darkTheme,
  businessTheme,
  warmTheme,
  defaultTheme,
};
