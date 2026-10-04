/**
 * Built-in ColorScheme registry.
 *
 * Convention: one scheme per file in this folder (`kebab-case.ts`), each
 * exporting a single `ColorScheme`. To add a built-in scheme:
 *   1. create `color-schemes/<name>.ts` exporting `{name}Scheme`
 *   2. import it below and append to `builtInSchemes`
 *
 * Step 2 is the only registry touch; values never live in this file.
 * `test/color-schemes-folder.test.ts` fails if a scheme file is not registered.
 */

import type { ColorScheme } from '../../models/color-scheme.js';
import { oceanScheme } from './ocean.js';
import { oceanDarkScheme } from './ocean-dark.js';
import { forestScheme } from './forest.js';
import { champagneScheme } from './champagne.js';
import { graphiteScheme } from './graphite.js';

/** All built-in schemes. Keep in sync with *.ts files in this folder. */
const builtInSchemes: ColorScheme[] = 
  [ oceanScheme, 
    oceanDarkScheme, 
    forestScheme,
    champagneScheme,
    graphiteScheme
];

export const colorSchemes: Record<string, ColorScheme> = Object.fromEntries(
  builtInSchemes.map((s) => [s.name.toLowerCase(), s]),
);

export function getColorScheme(name?: string): ColorScheme | undefined {
  if (!name) return undefined;
  return colorSchemes[name.toLowerCase()];
}

export function listColorSchemes(): ColorScheme[] {
  return Object.values(colorSchemes);
}

export function registerColorScheme(scheme: ColorScheme): void {
  colorSchemes[scheme.name.toLowerCase()] = scheme;
}

export { oceanScheme, oceanDarkScheme, forestScheme, champagneScheme, graphiteScheme };
