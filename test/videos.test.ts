import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import JSZip from 'jszip';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseMarkdown } from '../src/parser/index.js';
import { convert } from '../src/index.js';
import { coverExtractorsFor, themedCoverSvg, buildThemedCover } from '../src/renderer/video-cover.js';
import { getImageSize } from '../src/utils/image-size.js';
import type { VideoElement } from '../src/models/slide.js';

function collectVideos(md: string): VideoElement[] {
  const presentation = parseMarkdown(md);
  const out: VideoElement[] = [];
  for (const slide of presentation.slides) {
    for (const element of slide.elements) {
      if (element.type === 'video') out.push(element);
    }
  }
  return out;
}

describe('Video syntax: ![alt](src.mp4){w=...,poster=...}', () => {
  it('parses a video file reference as a video element, not an image', () => {
    const md = '## Demo\n\n![产品演示](./assets/demo.mp4)';
    const videos = collectVideos(md);
    expect(videos).toHaveLength(1);
    expect(videos[0]).toMatchObject({ type: 'video', src: './assets/demo.mp4', alt: '产品演示' });
  });

  it('recognizes the common video extensions, case-insensitively, with query strings', () => {
    for (const src of ['a.MP4', 'b.mov', 'c.webm', 'd.m4v', 'e.mkv', 'f.avi', 'g.wmv', 'h.mp4?raw=1']) {
      expect(collectVideos(`## t\n\n![](${src})`)).toHaveLength(1);
    }
    expect(collectVideos('## t\n\n![](a.png)')).toHaveLength(0);
    expect(collectVideos('## t\n\n![](a.webp)')).toHaveLength(0);
  });

  it('parses size and alignment params', () => {
    const md = '## Demo\n\n![演示](demo.mp4){w=6in,align=left}';
    expect(collectVideos(md)[0]).toMatchObject({ width: '6in', align: 'left' });
  });

  it('parses the poster (cover image) param', () => {
    const md = '## Demo\n\n![演示](demo.mp4){poster=cover.png}';
    expect(collectVideos(md)[0].poster).toBe('cover.png');
  });

  it('a remote video URL still parses as a video element (rejected at render time)', () => {
    const md = '## Demo\n\n![](https://example.com/demo.mp4)';
    expect(collectVideos(md)).toHaveLength(1);
  });

  it('a video-only slide stays a content slide (image layouts are for pictures)', () => {
    const presentation = parseMarkdown('## Demo\n\n![](demo.mp4)');
    expect(presentation.slides[0].layout).toBe('content');
  });
});

describe('video cover resolution', () => {
  it('orders extractors: ffmpeg everywhere, plus the native thumbnailer per OS', () => {
    expect(coverExtractorsFor('linux')).toEqual(['ffmpeg']);
    expect(coverExtractorsFor('win32')).toEqual(['ffmpeg', 'shell-thumbnail']);
    expect(coverExtractorsFor('darwin')).toEqual(['ffmpeg', 'quicklook']);
  });

  it('renders a 1280x720 themed card in the theme color', async () => {
    const theme = { colors: { primary: '2B6CB0' } } as never;
    expect(themedCoverSvg(theme)).toContain('#2B6CB0');
    const png = await buildThemedCover(theme);
    expect(getImageSize(png)).toMatchObject({ width: 1280, height: 720 });
  });
});

describe('video embedding in the generated pptx', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mfly-video-'));
    // A real container header is unnecessary: the file is embedded verbatim,
    // never decoded, so a few bytes claiming to be mp4 are enough.
    writeFileSync(join(tmpDir, 'demo.mp4'), Buffer.from('00000018667479706D703432', 'hex'));
    writeFileSync(join(tmpDir, 'cover.png'), Buffer.from('89504e470d0a1a0a', 'hex'));
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  /** # Deck gives the title slide 1, so the demo content slide is slide 2. */
  async function buildDeck(name: string): Promise<JSZip> {
    const pptxPath = join(tmpDir, name.replace(/\.md$/, '.pptx'));
    await convert(join(tmpDir, name), { output: pptxPath });
    return JSZip.loadAsync(readFileSync(pptxPath));
  }

  it('embeds a local video as a playable media part with a video shape', async () => {
    writeFileSync(join(tmpDir, 'local.md'), '# Deck\n\n---\n\n## Demo\n\n![演示](./demo.mp4)');
    const zip = await buildDeck('local.md');
    const media = Object.keys(zip.files).filter((n) => /^ppt\/media\/media-.*\.mp4$/.test(n));
    expect(media).toHaveLength(1);
    const slideXml = await zip.file('ppt/slides/slide2.xml')!.async('string');
    expect(slideXml).toMatch(/videoFile/);
  });

  it('honors explicit size params', async () => {
    writeFileSync(join(tmpDir, 'sized.md'), '# Deck\n\n---\n\n## Demo\n\n![](./demo.mp4){w=4in}');
    const zip = await buildDeck('sized.md');
    const slideXml = await zip.file('ppt/slides/slide2.xml')!.async('string');
    // 4in wide, 16:9 → 2.25in high (EMU: 1in = 914400)
    expect(slideXml).toContain('cx="3657600"');
    expect(slideXml).toContain('cy="2057400"');
  });

  it('uses the poster image as the video cover', async () => {
    writeFileSync(
      join(tmpDir, 'poster.md'),
      '# Deck\n\n---\n\n## Demo\n\n![](./demo.mp4){poster=cover.png}',
    );
    const zip = await buildDeck('poster.md');
    const slideXml = await zip.file('ppt/slides/slide2.xml')!.async('string');
    expect(slideXml).toMatch(/videoFile/);
    // The cover lands as an extra image part on the slide
    const coverParts = Object.keys(zip.files).filter((n) => /^ppt\/media\/image-2-\d+\.png$/.test(n));
    expect(coverParts).toHaveLength(1);
  });

  it('falls back to a themed 1280x720 cover card when no frame can be extracted', async () => {
    // The fixture mp4 is garbage bytes, so every extractor fails on every OS
    // and the deterministic themed card must take over.
    writeFileSync(join(tmpDir, 'coverless.md'), '# Deck\n\n---\n\n## Demo\n\n![](./demo.mp4)');
    const zip = await buildDeck('coverless.md');
    const coverName = Object.keys(zip.files).find((n) => /^ppt\/media\/image-2-\d+\.png$/.test(n));
    expect(coverName).toBeTruthy();
    const cover = await zip.file(coverName!)!.async('nodebuffer');
    expect(getImageSize(cover)).toMatchObject({ width: 1280, height: 720 });
  });

  it('embeds the same video once when it is referenced twice on one slide', async () => {
    writeFileSync(
      join(tmpDir, 'dup.md'),
      ['# Deck', '', '---', '', '## Demo', '', '![](./demo.mp4)', '===', '![](./demo.mp4)'].join('\n'),
    );
    const zip = await buildDeck('dup.md');
    const mp4s = Object.keys(zip.files).filter((n) => /^ppt\/media\/media-.*\.mp4$/.test(n));
    expect(mp4s).toHaveLength(1);
    const slideXml = await zip.file('ppt/slides/slide2.xml')!.async('string');
    expect(slideXml.match(/videoFile/g)).toHaveLength(2);
  });

  it('skips a remote video with a warning instead of failing the deck', async () => {
    writeFileSync(
      join(tmpDir, 'remote.md'),
      '# Deck\n\n---\n\n## Demo\n\n![](https://example.com/demo.mp4)\n',
    );
    const zip = await buildDeck('remote.md');
    const media = Object.keys(zip.files).filter((n) => n.startsWith('ppt/media/') && !zip.files[n].dir);
    expect(media).toHaveLength(0);
  });
});
