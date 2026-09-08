/**
 * Image Handler
 * Resolves and downloads images for embedding in PPTX
 */

import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

/** Outcome of resolving an image source. Failure carries a human-readable reason. */
export type ImageResolution =
  | { ok: true; path: string }
  | { ok: false; error: string };

const REMOTE_FETCH_TIMEOUT_MS = 10_000;

/**
 * Resolve an image source to a local file path or base64 data
 * Never throws — failures are returned as { ok: false, error }.
 */
export async function resolveImage(
  src: string,
  basePath: string,
): Promise<ImageResolution> {
  try {
    // data: URI
    if (src.startsWith('data:')) {
      const match = src.match(/^data:image\/(\w+);base64,(.+)/);
      if (match) {
        const ext = match[1];
        const base64 = match[2];
        const tmpPath = join(tmpdir(), `mfly-${randomUUID().slice(0, 8)}.${ext}`);
        writeFileSync(tmpPath, Buffer.from(base64, 'base64'));
        return { ok: true, path: tmpPath };
      }
      return { ok: false, error: `Unsupported data URI: ${src.slice(0, 48)}` };
    }

    // URL (http/https)
    if (src.startsWith('http://') || src.startsWith('https://')) {
      let response: Response;
      try {
        response = await fetch(src, { signal: AbortSignal.timeout(REMOTE_FETCH_TIMEOUT_MS) });
      } catch (err) {
        const name = err instanceof Error ? err.name : '';
        const reason = name === 'TimeoutError' || name === 'AbortError'
          ? `request timed out after ${REMOTE_FETCH_TIMEOUT_MS / 1000}s`
          : err instanceof Error ? err.message : String(err);
        return { ok: false, error: `Failed to fetch ${src}: ${reason}` };
      }
      if (!response.ok) {
        return { ok: false, error: `Failed to fetch ${src}: HTTP ${response.status}` };
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const ext = src.split('.').pop()?.split('?')[0] ?? 'png';
      const tmpPath = join(tmpdir(), `mfly-${randomUUID().slice(0, 8)}.${ext}`);
      writeFileSync(tmpPath, buffer);
      return { ok: true, path: tmpPath };
    }

    // Local file path (basePath is always a directory)
    const absolutePath = resolve(basePath, src);
    if (existsSync(absolutePath)) {
      return { ok: true, path: absolutePath };
    }

    return { ok: false, error: `Image not found: ${src} (resolved to ${absolutePath})` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
