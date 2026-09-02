/**
 * Windows-compatible glob expansion
 */

import fg from 'fast-glob';
import { resolve } from 'node:path';

/**
 * Expand glob patterns to absolute .md file paths
 */
export async function expandGlob(patterns: string[]): Promise<string[]> {
  // fast-glob needs forward slashes even on Windows
  const normalized = patterns.map((p) => p.replace(/\\/g, '/'));

  const files = await fg(normalized, {
    absolute: true,
    onlyFiles: true,
  });

  // Filter to .md files and sort
  return files
    .filter((f) => f.toLowerCase().endsWith('.md'))
    .sort();
}
