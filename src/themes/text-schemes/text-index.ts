/**
 * Built-in TextScheme registry.
 *
 * Add a scheme (two steps):
 *   1. create `text-schemes/<name>.ts` exporting a TextScheme
 *      (usually via `defineUniformTextScheme({ name, face, codeEntry: sharedCode })`)
 *   2. import it below and append to `builtInTextSchemes`
 *
 * `test/text-schemes-folder.test.ts` fails if a scheme file is not registered.
 */

import {
  DEFAULT_TEXT_SCHEME_NAME,
  type TextScheme,
} from '../../models/text-set.js';
import { academicTextScheme } from './academic.js';
import { systemTextScheme } from './system.js';
import { kaiTextScheme } from './kai.js';
import { sourceHanSerifTextScheme } from './source-han-serif.js';

/** All built-in schemes. Keep in sync with *.ts files in this folder. */
const builtInTextSchemes: TextScheme[] = [
  systemTextScheme,
  academicTextScheme,
  kaiTextScheme,
  sourceHanSerifTextScheme,
];

export const textSchemes: Record<string, TextScheme> = Object.fromEntries(
  builtInTextSchemes.map((s) => [s.name.toLowerCase(), s]),
);

export function getTextScheme(name?: string): TextScheme | undefined {
  if (!name) return undefined;
  return textSchemes[name.toLowerCase()];
}

export function listTextSchemes(): TextScheme[] {
  return Object.values(textSchemes);
}

export function registerTextScheme(scheme: TextScheme): void {
  textSchemes[scheme.name.toLowerCase()] = scheme;
}

export {
  systemTextScheme,
  academicTextScheme,
  kaiTextScheme,
  sourceHanSerifTextScheme,
  DEFAULT_TEXT_SCHEME_NAME,
};
