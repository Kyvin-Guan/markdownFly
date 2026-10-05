/**
 * Video cover resolution — decides what a video shows before it is played.
 *
 * PowerPoint's own insert flow shows a real frame from the video; pptxgenjs'
 * fallback is a generic gray play button that clashes with every theme. The
 * resolver therefore never lets that gray asset ship. It tries, in order:
 *   1. an explicit `{poster=...}` image from the markdown,
 *   2. a real frame extracted with tools already on the machine — ffmpeg on
 *      PATH, the Windows shell thumbnail (what Explorer shows for videos),
 *      or macOS Quick Look — no bundled decoder, zero added weight,
 *   3. a themed cover card rendered through the project's own SVG rasterizer.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { Theme } from '../models/theme.js';
import { rasterizeSvg } from '../diagrams/svg-to-png.js';
import { resolveImage } from './image-handler.js';
import { getImageSize } from '../utils/image-size.js';
import { log } from '../utils/progress.js';

const execFileAsync = promisify(execFile);

export type VideoCoverSource = 'poster' | 'frame' | 'themed';

export interface VideoCover {
  /** `image/png;base64,...` payload for addMedia's `cover` option */
  data: string;
  source: VideoCoverSource;
}

/**
 * Ordered extraction attempts for a platform. ffmpeg serves all of them;
 * each OS additionally has a native, zero-install thumbnailer.
 */
export function coverExtractorsFor(platform: NodeJS.Platform): string[] {
  const chain = ['ffmpeg'];
  if (platform === 'win32') chain.push('shell-thumbnail');
  if (platform === 'darwin') chain.push('quicklook');
  return chain;
}

/**
 * Run an external tool, swallowing every failure (missing binary, non-zero
 * exit, timeout). Extraction is best-effort by design — a themed card is
 * always available as the final fallback, so a broken toolchain must never
 * fail the deck.
 */
async function runTool(cmd: string, args: string[], timeoutMs: number, env?: NodeJS.ProcessEnv): Promise<boolean> {
  try {
    await execFileAsync(cmd, args, {
      timeout: timeoutMs,
      windowsHide: true,
      ...(env ? { env } : {}),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * ffmpeg: seek a small offset before the first frame — screen recordings
 * often open on a black or desktop frame, and a frame one second in says
 * more about the content. Videos shorter than the offset produce no output,
 * so the run falls back to seeking from the very beginning.
 */
async function extractFrameWithFfmpeg(video: string, outPng: string): Promise<boolean> {
  const base = ['-hide_banner', '-loglevel', 'error', '-frames:v', '1', '-update', '1', '-y'];
  for (const seek of ['1', undefined]) {
    const args = [...(seek ? ['-ss', seek] : []), '-i', video, ...base, outPng];
    await runTool('ffmpeg', args, 15_000);
    if (existsSync(outPng)) return true;
  }
  return false;
}

/**
 * Windows shell thumbnail — the same pipeline Explorer uses for video
 * previews (H.264/HEVC decode via the OS). The C# worker does the COM calls;
 * paths travel through environment variables because non-ASCII command-line
 * arguments get mangled when spawning PowerShell.
 */
const PS_THUMB_SCRIPT = `
$ErrorActionPreference = 'Stop'
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;
public static class Thumb {
  [StructLayout(LayoutKind.Sequential)]
  public struct SIZE { public int cx; public int cy; public SIZE(int x, int y) { cx = x; cy = y; } }
  [ComImport, Guid("bcc18b79-ba16-442f-80c4-8a59c30c463b"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IShellItemImageFactory { void GetImage(SIZE size, int flags, out IntPtr phbm); }
  [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
  public static extern void SHCreateItemFromParsingName(string path, IntPtr pbc, ref Guid riid, out IShellItemImageFactory ppv);
  [DllImport("gdi32.dll")]
  public static extern bool DeleteObject(IntPtr hObject);
  public static string Extract(string video, string outPath, int w, int h) {
    Guid iid = new Guid("bcc18b79-ba16-442f-80c4-8a59c30c463b");
    IShellItemImageFactory factory;
    SHCreateItemFromParsingName(video, IntPtr.Zero, ref iid, out factory);
    IntPtr hbm = IntPtr.Zero;
    try {
      // 9 = SIIGBF_THUMBNAILONLY | SIIGBF_BIGGERSIZEOK: refuse the icon
      // fallback so an unparseable video yields no image at all (the themed
      // card then takes over) instead of a file-type icon.
      factory.GetImage(new SIZE(w, h), 9, out hbm);
      using (Bitmap bmp = (Bitmap)Image.FromHbitmap(hbm)) {
        bmp.Save(outPath, ImageFormat.Png);
        return bmp.Width + "x" + bmp.Height;
      }
    } finally { if (hbm != IntPtr.Zero) DeleteObject(hbm); }
  }
}
'@
[void][Thumb]::Extract($env:MFLY_VIDEO, $env:MFLY_OUT, 1920, 1080)
'ok'
`;

/**
 * Windows shell thumbnail — the same pipeline Explorer uses for video
 * previews (H.264/HEVC decode via the OS). The C# worker does the COM calls;
 * paths travel through environment variables because non-ASCII command-line
 * arguments get mangled when spawning PowerShell.
 *
 * Exported for tests.
 */
export async function extractFrameWithWinShell(video: string, outPng: string): Promise<boolean> {
  try {
    await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
        '-EncodedCommand', Buffer.from(PS_THUMB_SCRIPT, 'utf16le').toString('base64'),
      ],
      {
        timeout: 20_000,
        windowsHide: true,
        env: { ...process.env, MFLY_VIDEO: video, MFLY_OUT: outPng },
      },
    );
  } catch {
    return false;
  }
  if (!existsSync(outPng)) return false;
  // The shell hands back whatever its thumbnail cache holds — on a machine
  // that never previewed the video that can be a few hundred pixels wide,
  // which stretched over a slide looks worse than the themed card. Anything
  // under 640px is treated as "no usable frame".
  const size = getImageSize(readFileSync(outPng));
  if (!size || size.width < 640) {
    rmSync(outPng, { force: true });
    return false;
  }
  return true;
}

/** macOS Quick Look poster frame (`qlmanage` ships with every macOS). */
async function extractFrameWithQuickLook(video: string, outPng: string): Promise<boolean> {
  const outDir = tmpdir();
  const ran = await runTool('qlmanage', ['-t', '-s', '1280', '-o', outDir, video], 20_000);
  const produced = join(outDir, `${basename(video)}.png`);
  if (ran && existsSync(produced)) {
    renameSync(produced, outPng);
    return true;
  }
  return false;
}

const EXTRACTORS: Record<string, (video: string, outPng: string) => Promise<boolean>> = {
  ffmpeg: extractFrameWithFfmpeg,
  'shell-thumbnail': extractFrameWithWinShell,
  quicklook: extractFrameWithQuickLook,
};

/** Perceived luma on the 0-255 YIQ scale — drives the glyph contrast swap. */
function luma(hex: string): number {
  const n = parseInt(hex, 16);
  return (((n >> 16) & 0xff) * 299 + ((n >> 8) & 0xff) * 587 + (n & 0xff) * 114) / 1000;
}

/** Theme-colored cover card: pure shapes, no text, deterministic raster. */
export function themedCoverSvg(theme: Theme): string {
  const hex = (c: string) => c.replace(/^#/, '');
  const bg = hex(theme.colors.primary);
  // A white glyph vanishes on light primaries (graphite's light gray);
  // near-black survives every light background, white every dark one.
  const glyph = luma(bg) > 160 ? '#333333' : '#FFFFFF';
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">',
    `<rect width="1280" height="720" rx="28" fill="#${bg}"/>`,
    `<circle cx="640" cy="360" r="170" fill="none" stroke="${glyph}" stroke-opacity="0.28" stroke-width="8"/>`,
    `<circle cx="640" cy="360" r="140" fill="${glyph}" fill-opacity="0.12"/>`,
    `<path d="M 594 284 L 742 360 L 594 436 Z" fill="${glyph}"/>`,
    '</svg>',
  ].join('');
}

/** Render the themed card to a PNG (exported for tests). */
export async function buildThemedCover(theme: Theme): Promise<Buffer> {
  return rasterizeSvg(themedCoverSvg(theme), 1280);
}

function pngPayload(path: string): string {
  return `image/png;base64,${readFileSync(path).toString('base64')}`;
}

/**
 * Resolve the cover for a video embed. Never throws and only returns
 * undefined when even the themed card could not be rendered — the caller
 * then omits `cover` and pptxgenjs' gray button appears (last resort).
 */
export async function resolveVideoCover(
  videoPath: string,
  poster: string | undefined,
  theme: Theme,
  basePath: string,
): Promise<VideoCover | undefined> {
  // 1. Explicit poster from the markdown always wins.
  if (poster) {
    const resolved = await resolveImage(poster, basePath);
    if (resolved.ok) {
      const ext = resolved.path.split('.').pop()?.toLowerCase() ?? 'png';
      // pptxgenjs writes the cover rel as image/png regardless of source, so
      // anything else is a mismatch most readers tolerate but not one to
      // promise silently.
      if (ext !== 'png') {
        log.warn(`poster should be a PNG — PowerPoint may not show a ${ext} cover (${poster})`);
      }
      return { data: pngPayload(resolved.path), source: 'poster' };
    }
    log.warn(`${resolved.error}`);
  }

  // 2. Best-effort real frame with whatever the machine already has.
  for (const name of coverExtractorsFor(process.platform)) {
    const extractor = EXTRACTORS[name];
    if (!extractor) continue;
    const outPng = join(tmpdir(), `mfly-frame-${randomUUID().slice(0, 8)}.png`);
    if (await extractor(videoPath, outPng) && existsSync(outPng)) {
      return { data: pngPayload(outPng), source: 'frame' };
    }
  }

  // 3. Themed cover card — deterministic, needs no external tool.
  try {
    const png = await buildThemedCover(theme);
    const outPng = join(tmpdir(), `mfly-cover-${randomUUID().slice(0, 8)}.png`);
    writeFileSync(outPng, png);
    log.warn(
      'could not extract a video frame (no ffmpeg and no native thumbnailer) — ' +
      'generated a themed cover card; pass {poster=cover.png} to use your own image',
    );
    return { data: pngPayload(outPng), source: 'themed' };
  } catch (err) {
    log.warn(
      `could not render a themed video cover: ${err instanceof Error ? err.message : String(err)}`,
    );
    return undefined;
  }
}
