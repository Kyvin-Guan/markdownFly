/**
 * Smart output file naming
 */

import { existsSync } from 'node:fs';
import { basename, extname, dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Determine output path:
 * 1. If specified, use it
 * 2. Otherwise: input.md → input.pptx
 * 3. If exists: add timestamp
 * 4. If still exists: add 4-char uuid
 */
export function getOutputPath(inputPath: string, specifiedOutput?: string): string {
  if (specifiedOutput) return specifiedOutput;

  const dir = dirname(inputPath);
  const name = basename(inputPath, extname(inputPath));

  // Try simple name
  const simple = join(dir, `${name}.pptx`);
  if (!existsSync(simple)) return simple;

  // Add timestamp
  const now = new Date();
  const ts = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    '-' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');

  const withTimestamp = join(dir, `${name}-${ts}.pptx`);
  if (!existsSync(withTimestamp)) return withTimestamp;

  // Add random suffix
  const uuid = randomUUID().slice(0, 4);
  return join(dir, `${name}-${ts}-${uuid}.pptx`);
}
