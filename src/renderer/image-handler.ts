/**
 * Image Handler
 * Resolves and downloads images for embedding in PPTX
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { isSvgImage } from '../utils/image-size.js';
import { rasterizeSvg, SVG_EMBED_WIDTH } from '../diagrams/svg-to-png.js';
import { log } from '../utils/progress.js';

/** Outcome of resolving an image source. Failure carries a human-readable reason. */
export type ImageResolution =
  | { ok: true; path: string }
  | { ok: false; error: string };

const REMOTE_FETCH_TIMEOUT_MS = 10_000;

/**
 * Resolve an image source to a local file path ready for embedding.
 *
 * Never throws — failures are returned as { ok: false, error }.
 */
export async function resolveImage(
  src: string,
  basePath: string,
): Promise<ImageResolution> {
  const located = await locateImage(src, basePath);
  if (!located.ok) return located;
  return rasterizeIfSvg(located);
}

/**
 * Replace an SVG with a PNG raster of it.
 *
 * Done here rather than at the point of use because everything funnels through
 * this path: a local file, a downloaded URL and a `data:` URI all arrive as a
 * local file, and both consumers (the image element and the `@(background=...)`
 * directive) only look at the returned path. The PPTX then carries a PNG, which
 * every reader can decode — storing the SVG instead needs the `svgBlip`
 * extension, whose PNG fallback is a broken-image placeholder.
 *
 * If resvg cannot parse the file the original SVG is returned unchanged, so a
 * malformed SVG degrades to the previous behaviour rather than losing the image.
 */
async function rasterizeIfSvg(resolved: ImageResolution): Promise<ImageResolution> {
  if (!resolved.ok) return resolved;

  try {
    const data = readFileSync(resolved.path);
    if (!isSvgImage(data)) return resolved;

    const png = await rasterizeSvg(data.toString('utf8'), SVG_EMBED_WIDTH);
    // `.png` extension matters: the MIME type is derived from it downstream.
    const tmpPath = join(tmpdir(), `mfly-${randomUUID().slice(0, 8)}.png`);
    writeFileSync(tmpPath, png);
    return { ok: true, path: tmpPath };
  } catch (err) {
    log.warn(
      `Could not rasterize ${resolved.path}: ${err instanceof Error ? err.message : String(err)} — embedding the SVG as-is`,
    );
    return resolved;
  }
}

/**
 * Find the image on disk, downloading or unpacking it when needed.
 * Never throws — failures are returned as { ok: false, error }.
 */
async function locateImage(src: string, basePath: string): Promise<ImageResolution> {
  try {
    // data: URI
    if (src.startsWith('data:')) {
      // Subtypes can carry a suffix — `image/svg+xml` is the common one, and
      // `\w+` alone rejected it outright. Only the base type becomes the file
      // extension, so `svg+xml` lands as `.svg` and keeps a usable MIME.
      const match = src.match(/^data:image\/([\w.+-]+);base64,(.+)/);
      if (match) {
        const ext = match[1].split('+')[0];
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
