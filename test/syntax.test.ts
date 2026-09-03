import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/parser/index.js';
import { preprocessMarkdown } from '../src/parser/preprocess.js';
import { parseDirectiveString, parseHighlightRanges } from '../src/parser/splitter.js';
import type { SlideElement } from '../src/models/slide.js';

describe('preprocessMarkdown', () => {
  it('rewrites standalone ===, <-> and @(...) lines into comments', () => {
    const md = [
      '# Title',
      '',
      'content',
      '===',
      'more',
      '<->',
      'right',
      '@(notes=hello, layout=content)',
    ].join('\n');
    const out = preprocessMarkdown(md);
    expect(out).toContain('<!-- mfly:row -->');
    expect(out).toContain('<!-- mfly:col -->');
    expect(out).toContain('<!-- mfly:dir:');
    expect(out).not.toContain('\n===\n');
    expect(out).not.toContain('\n<->\n');
  });

  it('does not rewrite markers inside fenced code blocks', () => {
    const md = [
      '```',
      '===',
      '<->',
      '@(layout=content)',
      '```',
      '==='.trim(),
    ].join('\n');
    const out = preprocessMarkdown(md);
    // Inside fence stays raw
    expect(out).toContain('```\n===\n<->\n@(layout=content)\n```');
    // Outside fence is rewritten
    expect(out.endsWith('<!-- mfly:row -->')).toBe(true);
    expect(out).toContain('@(layout=content)');
  });

  it('row marker wins over setext heading underlines (documented choice)', () => {
    // In mfly grammar "====" standalone is always a row break, even directly
    // under a text line where CommonMark would parse it as a setext heading.
    const md = 'Title\n====';
    const out = preprocessMarkdown(md);
    expect(out).toContain('<!-- mfly:row -->');
  });
});

describe('parseDirectiveString', () => {
  it('parses simple key=value pairs', () => {
    expect(parseDirectiveString('@(layout=code, notes="a, b, c", highlight=3-5, steps=true)')).toEqual({
      layout: 'code',
      notes: 'a, b, c',
      highlight: '3-5',
      steps: 'true',
    });
  });

  it('returns empty object for garbage', () => {
    expect(parseDirectiveString('@()')).toEqual({});
    expect(parseDirectiveString('@@')).toEqual({});
  });
});

describe('parseHighlightRanges', () => {
  it('parses single lines and ranges', () => {
    expect(parseHighlightRanges('3')).toEqual([3]);
    expect(parseHighlightRanges('2-4')).toEqual([2, 3, 4]);
    expect(parseHighlightRanges('1,3-5,9')).toEqual([1, 3, 4, 5, 9]);
    expect(parseHighlightRanges('5-3')).toEqual([3, 4, 5]);
  });
});

describe('parseMarkdown: grammar features', () => {
  it('splits rows/cols via === and <-> markers', () => {
    const md = [
      '## Grid',
      '',
      'top-left',
      '<->',
      'top-right',
      '===',
      'bottom-full',
    ].join('\n');
    const p = parseMarkdown(md);
    expect(p.slides).toHaveLength(1);
    const breaks = p.slides[0].elements.filter((e) => e.type === 'break');
    expect(breaks).toHaveLength(2);
    expect(breaks[0]).toMatchObject({ type: 'break', direction: 'col' });
    expect(breaks[1]).toMatchObject({ type: 'break', direction: 'row' });
  });

  it('parses @() directives into slide metadata', () => {
    const md = [
      '## Demo',
      '',
      'some text',
      '@(notes=记得补充案例, layout=content, chart=bar)',
    ].join('\n');
    const p = parseMarkdown(md);
    expect(p.slides[0].notes).toBe('记得补充案例');
    expect(p.slides[0].directives).toMatchObject({ layout: 'content', chart: 'bar' });
    expect(p.slides[0].layout).toBe('content');
  });

  it('directive @(layout=) overrides auto-detection', () => {
    const md = [
      '# Cover',
      '## subtitle',
      '@(layout=title)',
    ].join('\n');
    const p = parseMarkdown(md);
    expect(p.slides[0].layout).toBe('title');
  });

  it('parses GFM tables and task lists (remark-gfm)', () => {
    const md = [
      '## Checklist',
      '',
      '- [x] done item',
      '- [ ] todo item',
      '',
      '| A | B |',
      '| - | - |',
      '| 1 | 2 |',
    ].join('\n');
    const p = parseMarkdown(md);
    const list = p.slides[0].elements.find((e) => e.type === 'list') as { checked?: boolean[]; items: string[] };
    expect(list.checked).toEqual([true, false]);
    expect(list.items[0].trim()).toBe('done item');

    const table = p.slides[0].elements.find((e) => e.type === 'table') as { headers: string[]; rows: string[][] };
    expect(table.headers).toEqual(['A', 'B']);
    expect(table.rows).toEqual([['1', '2']]);
  });

  it('detects [!NOTE]/[!TIP] callouts in blockquotes', () => {
    const md = [
      '## Info',
      '',
      '> [!NOTE]',
      '> This is important.',
      '',
      '> [!TIP]',
      '> Try the dark theme.',
    ].join('\n');
    const p = parseMarkdown(md);
    const callouts = p.slides[0].elements.filter((e) => e.type === 'callout');
    expect(callouts).toHaveLength(2);
    expect(callouts[0]).toMatchObject({ type: 'callout', variant: 'note', content: 'This is important.' });
    expect(callouts[1]).toMatchObject({ type: 'callout', variant: 'tip' });
  });

  it('supports custom callout titles (moffee-style)', () => {
    const md = [
      '## Info',
      '',
      '> [!WARNING] 手工部署前先备份',
      '> 数据库会被覆盖。',
    ].join('\n');
    const p = parseMarkdown(md);
    const callout = p.slides[0].elements.find((e) => e.type === 'callout');
    expect(callout).toMatchObject({
      type: 'callout',
      variant: 'warning',
      title: '手工部署前先备份',
      content: '数据库会被覆盖。',
    });
  });

  it('removes %% comment lines but keeps them inside code fences', () => {
    const md = [
      '## Notes',
      '',
      '%% 这行不会出现在幻灯片里',
      '可见文本',
      '',
      '```bash',
      '%% 这在代码块里要保留',
      'echo ok',
      '```',
    ].join('\n');
    const p = parseMarkdown(md);
    const texts = p.slides[0].elements.filter((e) => e.type === 'text').map((e) => (e as { content: string }).content);
    expect(texts).toContain('可见文本');
    expect(texts.some((t) => t.includes('这行不会出现在幻灯片里'))).toBe(false);
    const code = p.slides[0].elements.find((e) => e.type === 'code') as { content: string };
    expect(code.content).toContain('%% 这在代码块里要保留');
  });

  it('applies @(highlight=) to code blocks even when directive follows the code', () => {
    const md = [
      '## Code',
      '',
      '```python',
      'def f():',
      '    return 1',
      '```',
      '@(highlight=2)',
    ].join('\n');
    const p = parseMarkdown(md);
    const code = p.slides[0].elements.find((e) => e.type === 'code') as { highlightLines?: number[] };
    expect(code.highlightLines).toEqual([2]);
    expect(p.slides[0].layout).toBe('code');
  });

  it('parses resource_dir alias from frontmatter', () => {
    const md = [
      '---',
      'theme: dark',
      'resource_dir: ./assets',
      '---',
      '# T',
    ].join('\n');
    const p = parseMarkdown(md);
    expect(p.config.resourceDir).toBe('./assets');
    expect(p.config.theme).toBe('dark');
  });

  it('frontmatter layout is used as fallback but @() beats it', () => {
    const md = [
      '---',
      'layout: code',
      '---',
      '# A',
      '## B',
      'plain text slide',
      '## C',
      'plain text slide 2',
      '@(layout=quote)',
    ].join('\n');
    const p = parseMarkdown(md);
    expect(p.slides[0].layout).toBe('title'); // auto-detect wins for title
    expect(p.slides[1].layout).toBe('code'); // fallback from frontmatter
    expect(p.slides[2].layout).toBe('quote'); // directive overrides fallback
  });

  it('keeps <-> text used inline as plain text (not a break)', () => {
    const md = [
      '## Title',
      '',
      'foo <-> bar',
    ].join('\n');
    const p = parseMarkdown(md);
    const breaks = p.slides[0].elements.filter((e) => e.type === 'break');
    expect(breaks).toHaveLength(0);
    const text = p.slides[0].elements.find((e) => e.type === 'text') as { content: string };
    expect(text.content).toContain('<->');
  });
});
