import { describe, it, expect, vi } from 'vitest';
import { existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveVideoCover, extractFrameWithWinShell } from '../src/renderer/video-cover.js';
import type { Theme } from '../src/models/slide.js';

// 1x1 red PNG — the "decoded frame" the fake ffmpeg writes.
const FAKE_FRAME = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const execFileMock = vi.hoisted(() => vi.fn());
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, execFile: execFileMock };
});

const theme = { colors: { primary: '2B6CB0' } } as unknown as Theme;

describe('ffmpeg frame extraction (mocked decoder)', () => {
  it('prefers the ffmpeg frame and retries from frame 0 when the offset yields nothing', async () => {
    execFileMock.mockImplementation(
      (cmd: string, args: string[], _opts: unknown, cb: (err: Error | null) => void) => {
        if (cmd !== 'ffmpeg') {
          cb(new Error('tool unavailable'));
          return;
        }
        // A video shorter than the seek offset decodes no frame on the first
        // pass; the retry without -ss must succeed.
        if (args.includes('-ss')) {
          cb(new Error('no frame at offset'));
          return;
        }
        writeFileSync(args[args.length - 1], FAKE_FRAME);
        cb(null);
      },
    );

    const cover = await resolveVideoCover('does-not-matter.mp4', undefined, theme, tmpdir());
    expect(cover?.source).toBe('frame');
    expect(cover?.data).toBe(`image/png;base64,${FAKE_FRAME.toString('base64')}`);

    // First pass seeks 1s (fast, before -i), retry starts at 0; output last.
    const ffmpegCalls = execFileMock.mock.calls.filter((c) => c[0] === 'ffmpeg') as [
      string,
      string[],
    ][];
    expect(ffmpegCalls).toHaveLength(2);
    expect(ffmpegCalls[0][1].slice(0, 2)).toEqual(['-ss', '1']);
    expect(ffmpegCalls[0][1].indexOf('-ss')).toBeLessThan(ffmpegCalls[0][1].indexOf('-i'));
    expect(ffmpegCalls[1][1].join(' ')).not.toContain('-ss');
  });

  it('falls through to the themed card when the ffmpeg tool itself is missing', async () => {
    execFileMock.mockImplementation(
      (cmd: string, _args: string[], _opts: unknown, cb: (err: Error | null) => void) => {
        cb(cmd === 'ffmpeg' ? new Error('ENOENT: spawn ffmpeg') : null);
      },
    );

    const cover = await resolveVideoCover('does-not-matter.mp4', undefined, theme, tmpdir());
    expect(cover?.source).toBe('themed');
  });
});

describe('windows shell thumbnail quality gate', () => {
  /** Header-only PNG: the size reader needs nothing beyond the IHDR box. */
  function pngWithDims(width: number, height: number): Buffer {
    const b = Buffer.alloc(33);
    b.write('89504e470d0a1a0a', 0, 'hex');
    b.writeUInt32BE(13, 8);
    b.write('IHDR', 12, 'latin1');
    b.writeUInt32BE(width, 16);
    b.writeUInt32BE(height, 20);
    return b;
  }

  it('rejects a cached thumbnail too small to look sharp, cleaning its file up', async () => {
    const out = join(tmpdir(), `mfly-test-small-${Date.now()}.png`);
    execFileMock.mockImplementation(
      (cmd: string, _a: string[], opts: { env?: { MFLY_OUT?: string } }, cb: (err: Error | null) => void) => {
        if (cmd !== 'powershell.exe') {
          cb(new Error('not this tool'));
          return;
        }
        writeFileSync(opts.env!.MFLY_OUT!, pngWithDims(96, 54));
        cb(null);
      },
    );

    expect(await extractFrameWithWinShell('video.mp4', out)).toBe(false);
    expect(existsSync(out)).toBe(false);
  });

  it('accepts a full-size thumbnail', async () => {
    const out = join(tmpdir(), `mfly-test-big-${Date.now()}.png`);
    execFileMock.mockImplementation(
      (cmd: string, _a: string[], opts: { env?: { MFLY_OUT?: string } }, cb: (err: Error | null) => void) => {
        if (cmd !== 'powershell.exe') {
          cb(new Error('not this tool'));
          return;
        }
        writeFileSync(opts.env!.MFLY_OUT!, pngWithDims(1920, 1080));
        cb(null);
      },
    );

    expect(await extractFrameWithWinShell('video.mp4', out)).toBe(true);
    expect(existsSync(out)).toBe(true);
  });
});
