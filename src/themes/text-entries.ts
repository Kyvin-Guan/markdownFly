/**
 * Shared FontStyleEntry pool — optional reuse across TextSchemes.
 * Prefer `defineUniformTextScheme` for new schemes; use this pool only
 * when several schemes must share the exact same entry object (e.g. code).
 */

import type { FontStyleEntry } from '../models/text-set.js';

/** Shared mono code entry — reference via `codeEntry` when defining schemes. */
export const sharedCode: FontStyleEntry = {
  face: 'Consolas',
  cjkFace: 'Consolas',
  size: 14,
};
