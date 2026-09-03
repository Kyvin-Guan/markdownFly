import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/parser/index.js';
import type { ImageElement } from '../src/models/slide.js';

function collectImages(md: string): ImageElement[] {
  const presentation = parseMarkdown(md);
  const out: ImageElement[] = [];
  for (const slide of presentation.slides) {
    for (const element of slide.elements) {
      if (element.type === 'image') out.push(element);
    }
  }
  return out;
}

describe('Image syntax: ![alt](src){w=...,h=...,align=...}', () => {
  it('parses a plain image line (no params)', () => {
    const md = '## Img\n\n![架构图](./assets/arch.png)';
    const images = collectImages(md);
    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({ type: 'image', src: './assets/arch.png', alt: '架构图' });
    expect(images[0].width).toBeUndefined();
    expect(images[0].align).toBeUndefined();
  });

  it('parses width (inches) and alignment', () => {
    const md = '## Img\n\n![架构图](./assets/arch.png){w=6in,align=center}';
    const images = collectImages(md);
    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({ width: '6in', align: 'center' });
  });

  it('parses percentage widths', () => {
    const md = '## Img\n\n![图](./assets/a.png){w=60%}';
    const images = collectImages(md);
    expect(images[0].width).toBe('60%');
  });

  it('parses px/mm values and normalizes to inches', () => {
    const md = '## Img\n\n![图](./assets/a.png){width=120px,height=40mm}';
    const images = collectImages(md);
    expect(images[0].width).toBe('1.25in'); // 120px @ 96dpi
    expect(images[0].height).toBe('1.57in'); // 40mm
  });

  it('keeps the image when params use a bare number (regression: {w=200} swallowed the image)', () => {
    const md = '## Img\n\n![图](./assets/a.png){w=200}';
    const images = collectImages(md);
    expect(images).toHaveLength(1);
    expect(images[0].width).toBe('2.08in'); // 200px @ 96dpi
  });

  it('ignores invalid params without dropping the image', () => {
    const md = '## Img\n\n![图](./assets/a.png){w=abc,h=-5,align=top}';
    const images = collectImages(md);
    expect(images).toHaveLength(1);
    expect(images[0].width).toBeUndefined();
    expect(images[0].height).toBeUndefined();
    expect(images[0].align).toBeUndefined();
  });

  it('supports width/height/align together with key aliases', () => {
    const md = '## Img\n\n![图](./assets/a.png){h=3.5in,w=7in,align=right}';
    const images = collectImages(md);
    expect(images[0]).toMatchObject({ width: '7in', height: '3.5in', align: 'right' });
  });
});
