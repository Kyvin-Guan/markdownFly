import type { Theme } from '../models/theme.js';
import { cleanTheme } from './clean.js';

export const defaultTheme: Theme = {
  ...cleanTheme,
  name: 'default',
};
