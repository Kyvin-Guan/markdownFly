/**
 * Image Handler
 * Resolves and downloads images for embedding in PPTX
 */

import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Resolve an image source to a local file path or base64 data
 * Returns { path } for local files, { data, type } for downloaded/base64
 */
export async function resolveImage(
  src: string,
  basePath: string,
): Promise<{ path?: string; data?: string } | null> {
  try {
    // data: URI
    if (src.startsWith('data:')) {
      const match = src.match(/^data:image\/(\w+);base64,(.+)/);
      if (match) {
        const ext = match[1];
        const base64 = match[2];
        const tmpPath = join(tmpdir(), `mfly-${randomUUID().slice(0, 8)}.${ext}`);
        writeFileSync(tmpPath, Buffer.from(base64, 'base64'));
        return { path: tmpPath };
      }
      return null;
    }

    // URL (http/https)
    if (src.startsWith('http://') || src.startsWith('https://')) {
      const response = await fetch(src);
      if (!response.ok) return null;

      const buffer = Buffer.from(await response.arrayBuffer());
      const ext = src.split('.').pop()?.split('?')[0] ?? 'png';
      const tmpPath = join(tmpdir(), `mfly-${randomUUID().slice(0, 8)}.${ext}`);
      writeFileSync(tmpPath, buffer);
      return { path: tmpPath };
    }

    // Local file path
    const absolutePath = resolve(dirname(basePath), src);
    if (existsSync(absolutePath)) {
      return { path: absolutePath };
    }

    return null;
  } catch {
    return null;
  }
}
