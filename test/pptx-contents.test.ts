import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import JSZip from 'jszip';
import { mkdtempSync, writeFileSync, copyFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { convert } from '../src/index.js';
import { getImageSize } from '../src/utils/image-size.js';

const fixturePng = fileURLToPath(new URL('./fixtures/pixel-400x300.png', import.meta.url));

let tmpDir: string;

/**
 * A WebP header is enough: the file is embedded verbatim, never decoded, so the
 * test does not need a real encoder. (`getImageSize` reads the same header.)
 */
function syntheticWebp(width: number, height: number): Buffer {
  const b = Buffer.alloc(30);
  b.write('RIFF', 0, 'latin1');
  b.writeUInt32LE(b.length - 8, 4);
  b.write('WEBP', 8, 'latin1');
  b.write('VP8X', 12, 'latin1');
  b.writeUIntLE(width - 1, 24, 3);
  b.writeUIntLE(height - 1, 27, 3);
  return b;
}

/** Every slide's XML, keyed by file name. */
async function readSlides(pptxPath: string): Promise<Record<string, string>> {
  const zip = await JSZip.loadAsync(readFileSync(pptxPath));
  const out: Record<string, string> = {};
  for (const name of Object.keys(zip.files)) {
    if (/^ppt\/slides\/slide\d+\.xml$/.test(name)) {
      out[name] = await zip.file(name)!.async('string');
    }
  }
  return out;
}

/** The alt text (`descr`) of each picture, in document order. */
function describePictures(slideXml: string): string[] {
  return [...slideXml.matchAll(/<p:pic>[\s\S]*?<\/p:pic>/g)].map((pic) => {
    const descr = pic[0].match(/<p:cNvPr[^>]*descr="([^"]*)"/);
    return descr ? descr[1] : '';
  });
}

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'mfly-pptx-'));
  copyFileSync(fixturePng, join(tmpDir, 'pic.png'));
  writeFileSync(join(tmpDir, 'pic.webp'), syntheticWebp(640, 480));
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('pptx picture metadata', () => {
  it('uses the author’s alt text instead of the internal placeholder name', async () => {
    writeFileSync(
      join(tmpDir, 'alt.md'),
      [
        '# Deck',
        '',
        '## 架构图',
        '',
        '![架构图](./pic.png)',
        '',
        '---',
        '',
        '## 没有 alt',
        '',
        '![](./pic.png)',
        '',
        '---',
        '',
        '## 流程图',
        '',
        '```mermaid',
        'graph TD',
        '  A-->B',
        '```',
        '',
      ].join('\n'),
    );

    const out = join(tmpDir, 'alt.pptx');
    await convert(join(tmpDir, 'alt.md'), { output: out });

    const slides = await readSlides(out);
    const all = Object.values(slides).join('\n');

    // The regression: pptxgenjs falls back to the `path` we pass for the blip,
    // so with no altText every picture was described as "preencoded.png".
    expect(all).not.toContain('descr="preencoded.png"');

    const described = Object.keys(slides)
      .sort()
      .flatMap((name) => describePictures(slides[name]));

    expect(described).toContain('架构图');
    // No alt of its own: the source the author referenced, not a placeholder.
    expect(described).toContain('./pic.png');
    // A diagram has no alt either, so the slide title describes it.
    expect(described).toContain('流程图');
  }, 120000);
});

describe('unsupported-format warning', () => {
  it('warns that WebP does not render everywhere', async () => {
    writeFileSync(
      join(tmpDir, 'webp.md'),
      '# Deck\n\n## WebP 图片\n\n![webp](./pic.webp)\n',
    );

    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await convert(join(tmpDir, 'webp.md'), { output: join(tmpDir, 'webp.pptx') });

      const warnings = warn.mock.calls.flat().join(' ');
      expect(warnings).toMatch(/WebP/);
      expect(warnings).toMatch(/PowerPoint for the web/);
    } finally {
      warn.mockRestore();
    }
  }, 120000);

  it('does not warn about formats PowerPoint does render', async () => {
    writeFileSync(join(tmpDir, 'png.md'), '# Deck\n\n## PNG\n\n![png](./pic.png)\n');

    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await convert(join(tmpDir, 'png.md'), { output: join(tmpDir, 'png.pptx') });
      expect(warn.mock.calls.flat().join(' ')).not.toMatch(/WebP/);
    } finally {
      warn.mockRestore();
    }
  }, 120000);
});

/** Media parts whose name ends in the given extension, with their sizes. */
async function mediaOf(pptxPath: string): Promise<Record<string, { bytes: number; size: { width: number; height: number } | null }>> {
  const zip = await JSZip.loadAsync(readFileSync(pptxPath));
  const out: Record<string, { bytes: number; size: { width: number; height: number } | null }> = {};
  for (const name of Object.keys(zip.files)) {
    if (!name.startsWith('ppt/media/') || name.endsWith('/')) continue;
    const buf = await zip.file(name)!.async('nodebuffer');
    out[name] = { bytes: buf.length, size: getImageSize(buf) };
  }
  return out;
}

async function slideXml(pptxPath: string, slide = 1): Promise<string> {
  const zip = await JSZip.loadAsync(readFileSync(pptxPath));
  return zip.file(`ppt/slides/slide${slide}.xml`)!.async('string');
}

/** Every slide's XML concatenated, so assertions need not know the numbering. */
async function allSlideXml(pptxPath: string): Promise<string> {
  const zip = await JSZip.loadAsync(readFileSync(pptxPath));
  const names = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  return (await Promise.all(names.map((name) => zip.file(name)!.async('string')))).join('\n');
}

/** Every slide's relationship XML concatenated, whatever slide the media is on. */
async function allSlideRels(pptxPath: string): Promise<string> {
  const zip = await JSZip.loadAsync(readFileSync(pptxPath));
  const parts = await Promise.all(
    Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(name))
      .map((name) => zip.file(name)!.async('string')),
  );
  return parts.join('\n');
}

const EMU_PER_INCH = 914400;

/** Position/size (inches) of every shape filled with a given hex colour. */
function shapesFilledWith(
  slideXml: string,
  hex: string,
): Array<{ y: number; height: number }> {
  return [...slideXml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)]
    .filter((shape) => shape[0].includes(`srgbClr val="${hex}"`))
    .map((shape) => {
      const off = shape[0].match(/<a:off x="-?\d+" y="(-?\d+)"/);
      const ext = shape[0].match(/<a:ext cx="\d+" cy="(\d+)"/);
      return {
        y: off ? Number(off[1]) / EMU_PER_INCH : NaN,
        height: ext ? Number(ext[1]) / EMU_PER_INCH : NaN,
      };
    });
}

/** Position (inches) of every picture on a slide, top to bottom. */
function pictures(slideXml: string): Array<{ y: number }> {
  return [...slideXml.matchAll(/<p:pic>[\s\S]*?<\/p:pic>/g)].map((pic) => {
    const off = pic[0].match(/<a:off x="-?\d+" y="(-?\d+)"/);
    return { y: off ? Number(off[1]) / EMU_PER_INCH : NaN };
  });
}

// An icon authored the usual way: a padded viewBox so the glyph keeps optical
// margins. The padding is deliberate and must survive rasterization.
const PADDED_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20"><rect x="10" y="5" width="20" height="10" fill="#2563EB"/></svg>';

// Valid SVG that declares only width/height — no viewBox to fall back on.
const NO_VIEWBOX_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="#16A34A"/></svg>';

describe('author SVGs are rasterized for embedding', () => {
  it('stores a PNG instead of an SVG, with no svgBlip fallback', async () => {
    writeFileSync(join(tmpDir, 'icon.svg'), PADDED_SVG);
    writeFileSync(join(tmpDir, 'svg.md'), '# Deck\n\n## 图标\n\n![图标](./icon.svg)\n');

    const out = join(tmpDir, 'svg.pptx');
    await convert(join(tmpDir, 'svg.md'), { output: out });

    const media = await mediaOf(out);
    const names = Object.keys(media);
    // The whole point: no SVG part, so every reader decodes the same PNG, and
    // no broken-image fallback is involved.
    expect(names.filter((n) => n.endsWith('.svg'))).toEqual([]);
    expect(names.filter((n) => n.endsWith('.png'))).toHaveLength(1);

    const xml = await slideXml(out);
    expect(xml).not.toContain('asvg:svgBlip');
    // Every picture relationship points at a PNG part, and none at an SVG.
    const rels = await allSlideRels(out);
    expect(rels).toMatch(/Target="\.\.\/media\/[^"]+\.png"/);
    expect(rels).not.toMatch(/Target="\.\.\/media\/[^"]+\.svg"/);
  }, 120000);

  it('preserves the author’s padding and aspect ratio', async () => {
    // Regression guard for reusing the diagram rasterizer: its reframing trims
    // the padding, which turned this 2.000-aspect icon into 1200x771 (1.556)
    // and would have stretched it on the slide.
    writeFileSync(join(tmpDir, 'padded.svg'), PADDED_SVG);
    writeFileSync(join(tmpDir, 'padded.md'), '# Deck\n\n## 图标\n\n![图标](./padded.svg)\n');

    const out = join(tmpDir, 'padded.pptx');
    await convert(join(tmpDir, 'padded.md'), { output: out });

    const pngs = Object.entries(await mediaOf(out)).filter(([n]) => n.endsWith('.png'));
    expect(pngs).toHaveLength(1);
    expect(pngs[0][1].size).toEqual({ width: 1200, height: 600 });
  }, 120000);

  it('honours an SVG that declares only width/height', async () => {
    writeFileSync(join(tmpDir, 'square.svg'), NO_VIEWBOX_SVG);
    writeFileSync(join(tmpDir, 'square.md'), '# Deck\n\n## 图标\n\n![图标](./square.svg)\n');

    const out = join(tmpDir, 'square.pptx');
    await convert(join(tmpDir, 'square.md'), { output: out });

    const pngs = Object.entries(await mediaOf(out)).filter(([n]) => n.endsWith('.png'));
    // The diagram normalizer would have synthesised an 800x600 frame (→ 1200x900).
    expect(pngs[0][1].size).toEqual({ width: 1200, height: 1200 });
  }, 120000);

  it('rasterizes an SVG background image too', async () => {
    writeFileSync(join(tmpDir, 'bg.svg'), PADDED_SVG);
    writeFileSync(
      join(tmpDir, 'bgsvg.md'),
      '# Deck\n\n## 背景\n\ncontent\n\n@(background=./bg.svg)\n',
    );

    const out = join(tmpDir, 'bgsvg.pptx');
    await convert(join(tmpDir, 'bgsvg.md'), { output: out });

    const names = Object.keys(await mediaOf(out));
    // The background directive hands pptxgenjs a path, bypassing the image
    // element entirely — so this is the path that would otherwise still ship SVG.
    expect(names.filter((n) => n.endsWith('.svg'))).toEqual([]);
    expect(names.filter((n) => n.endsWith('.png')).length).toBeGreaterThan(0);
  }, 120000);

  it('rasterizes a data: URI SVG', async () => {
    // `image/svg+xml` used to be rejected outright — the subtype regex was
    // `\w+`, which does not match the `svg+xml` subtype.
    const base64 = Buffer.from(PADDED_SVG).toString('base64');
    writeFileSync(
      join(tmpDir, 'datauri.md'),
      `# Deck\n\n## 图标\n\n![图标](data:image/svg+xml;base64,${base64})\n`,
    );

    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = join(tmpDir, 'datauri.pptx');
    try {
      await convert(join(tmpDir, 'datauri.md'), { output: out });

      expect(warn.mock.calls.flat().join(' ')).not.toMatch(/Unsupported data URI/);
      const names = Object.keys(await mediaOf(out));
      expect(names.filter((n) => n.endsWith('.svg'))).toEqual([]);
      expect(names.filter((n) => n.endsWith('.png'))).toHaveLength(1);
    } finally {
      warn.mockRestore();
    }
  }, 120000);

  it('falls back to the raw SVG when it cannot be rasterized', async () => {
    writeFileSync(join(tmpDir, 'broken.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><rect');
    writeFileSync(join(tmpDir, 'broken.md'), '# Deck\n\n## 坏图\n\n![坏图](./broken.svg)\n');

    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = join(tmpDir, 'broken.pptx');
    try {
      await convert(join(tmpDir, 'broken.md'), { output: out });

      // Warned, still generated, and the SVG is embedded rather than dropped.
      expect(warn.mock.calls.flat().join(' ')).toMatch(/rasteriz/i);
      const names = Object.keys(await mediaOf(out));
      expect(names.filter((n) => n.endsWith('.svg'))).toHaveLength(1);
    } finally {
      warn.mockRestore();
    }
  }, 120000);
});

/**
 * Both of these come from height estimates in src/renderer/layouts/content.ts:
 * a block whose dark fill stopped short of its last line, and a paragraph that
 * wrapped onto more lines than assumed, so the next element landed on top of it.
 */
describe('element heights fit their content', () => {
  it('sizes a code block to cover every line', async () => {
    const code = ['mfly <files...>', '', '  -o, --output <path>', '  -t, --theme <name>', '  --quiet', '  --json'].join('\n');
    writeFileSync(
      join(tmpDir, 'code.md'),
      `# Deck\n\n## 命令行\n\n\`\`\`bash\n${code}\n\`\`\`\n`,
    );

    const out = join(tmpDir, 'code.pptx');
    await convert(join(tmpDir, 'code.md'), { output: out, theme: 'clean' });

    // clean's codeBackground — the dark fill the lines have to fit inside.
    const blocks = shapesFilledWith(await allSlideXml(out), '1E293B');
    expect(blocks).toHaveLength(1);

    // 6 lines at 14pt: 6 * 14 * 1.3 / 72 = 1.52in of text, plus 16pt insets.
    expect(blocks[0].height).toBeGreaterThanOrEqual(1.6);
  }, 120000);

  it('does not let an image land on a wrapped paragraph', async () => {
    // 103 display units in a 12in column: two lines at 18pt, not the one the
    // old estimate assumed.
    const paragraph =
      'w/width、h/height、align 三个键,支持 px(默认)、pt、cm、mm、in、%。只给一个方向时,另一边按原图比例推导。';
    copyFileSync(fixturePng, join(tmpDir, 'overlap.png'));
    writeFileSync(
      join(tmpDir, 'overlap.md'),
      `# Deck\n\n## 尺寸与对齐\n\n${paragraph}\n\n![图](./overlap.png){w=40%,align=left}\n`,
    );

    const out = join(tmpDir, 'overlap.pptx');
    await convert(join(tmpDir, 'overlap.md'), { output: out, theme: 'clean' });

    const xml = await allSlideXml(out);
    const picture = pictures(xml);
    expect(picture).toHaveLength(1);

    // The paragraph's own box, located by its text.
    const textBox = [...xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)].find((sp) =>
      sp[0].includes('align'),
    );
    expect(textBox, 'paragraph shape should be present').toBeDefined();
    const off = textBox![0].match(/<a:off x="-?\d+" y="(-?\d+)"/);
    const textY = Number(off![1]) / EMU_PER_INCH;

    // Two lines of 18pt text occupy ~0.7in; the image must clear that.
    expect(picture[0].y - textY).toBeGreaterThanOrEqual(0.6);
  }, 120000);
});
