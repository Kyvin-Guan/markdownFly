/**
 * Gold samples for text-set (uniform face policy).
 * One typeface per scheme; a:t text must stay intact. No dual-font rewrite.
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { parseMarkdown } from '../src/parser/index.js';
import { renderPresentation } from '../src/renderer/index.js';
import { getTheme } from '../src/themes/index.js';

const LATIN = /<a:latin\b[^>]*\btypeface="([^"]*)"/g;
const EA = /<a:ea\b[^>]*\btypeface="([^"]*)"/g;
const A_T = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;

async function renderToPptx(
  markdown: string,
  themeName: string,
  textScheme?: string,
): Promise<{ path: string; slides: Record<string, string> }> {
  const dir = mkdtempSync(join(tmpdir(), 'mfly-gold-'));
  const path = join(dir, `out-${themeName}-${textScheme ?? 'default'}.pptx`);
  const presentation = parseMarkdown(markdown);
  const theme = getTheme(themeName, { textScheme });
  await renderPresentation(presentation, theme, path);
  const zip = await JSZip.loadAsync(readFileSync(path));
  const slides: Record<string, string> = {};
  for (const name of Object.keys(zip.files)) {
    if (/^ppt\/slides\/slide\d+\.xml$/.test(name) && !zip.files[name].dir) {
      slides[name] = await zip.files[name]!.async('string');
    }
  }
  return { path, slides };
}

function collect(xml: string, re: RegExp): string[] {
  const out: string[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}

function extractAText(xml: string): string {
  return collect(xml, A_T)
    .map((s) =>
      s
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'"),
    )
    .join('');
}

describe('gold samples (uniform text schemes)', () => {
  it('G1: academic mixed sentence uses 宋体 for latin and ea; a:t intact', async () => {
    const md = `# 标题\n\n基于 Transformer 的方法在 2024 年提出\n`;
    const { slides } = await renderToPptx(md, 'ocean', 'academic');
    const xml = Object.values(slides).join('\n');
    expect(collect(xml, LATIN)).toContain('宋体');
    expect(collect(xml, EA)).toContain('宋体');
    // uniform: no Times/宋体 split pairing
    expect(xml).not.toMatch(
      /<a:latin[^>]*typeface="Times New Roman"[^>]*\/>\s*<a:ea[^>]*typeface="宋体"/,
    );
    expect(extractAText(xml)).toContain('基于 Transformer 的方法在 2024 年提出');
  });

  it('G2: pure Chinese paragraph keeps content under academic', async () => {
    const md = `# 标题\n\n这是一段纯中文正文内容用于完整性检查\n`;
    const { slides } = await renderToPptx(md, 'ocean', 'academic');
    const xml = Object.values(slides).join('\n');
    expect(extractAText(xml)).toContain('这是一段纯中文正文内容用于完整性检查');
    expect(collect(xml, LATIN)).toContain('宋体');
  });

  it('G3: pure English paragraph also uses the scheme face (宋体)', async () => {
    const md = `# Title\n\nThis pure English paragraph uses the scheme face.\n`;
    const { slides } = await renderToPptx(md, 'ocean', 'academic');
    const xml = Object.values(slides).join('\n');
    expect(extractAText(xml)).toContain('This pure English paragraph uses the scheme face.');
    expect(collect(xml, LATIN)).toContain('宋体');
  });

  it('G4: list with mixed CJK/Latin keeps bullet text intact', async () => {
    const md = `# 封面\n\n---\n\n## 列表页\n\n- 基于 Transformer 的方法\n- 纯中文条目\n- English item 2024\n`;
    const { slides } = await renderToPptx(md, 'ocean', 'academic');
    const text = extractAText(Object.values(slides).join('\n'));
    expect(text).toContain('基于 Transformer 的方法');
    expect(text).toContain('纯中文条目');
    expect(text).toContain('English item 2024');
  });

  it('G5: table path still converts successfully', async () => {
    const md = `# 表格\n\n| 名称 | 说明 |\n|---|---|\n| Transformer | 基于注意力 |\n| CNN | 卷积网络 |\n`;
    const { slides } = await renderToPptx(md, 'ocean', 'academic');
    expect(Object.keys(slides).length).toBeGreaterThan(0);
  });

  it('G6: full fixture converts and source phrases survive in a:t', async () => {
    const md = `# RAG Deep Dive\n\n## Overview\n\nRetrieval Augmented Generation 结合了检索与生成。\n\n- Dense retrieval\n- 稀疏检索 BM25\n\n基于 Transformer 的 reranker 在 2024 年被广泛使用。\n`;
    const { path, slides } = await renderToPptx(md, 'ocean', 'academic');
    expect(existsSync(path)).toBe(true);
    const text = extractAText(Object.values(slides).join('\n'));
    expect(text).toContain('Retrieval Augmented Generation');
    expect(text).toContain('结合了检索与生成');
    expect(text).toContain('Dense retrieval');
    expect(text).toContain('稀疏检索 BM25');
    expect(text).toContain('基于 Transformer 的 reranker 在 2024 年被广泛使用');
  });

  it('G7: default system scheme uses 微软雅黑 uniformly', async () => {
    const theme = getTheme('ocean');
    expect(theme.fonts.body).toBe('微软雅黑');
    expect(theme.fonts.cjk).toBe('微软雅黑');
    const md = `# 标题\n\n基于 Transformer 的方法\n`;
    const { slides } = await renderToPptx(md, 'ocean');
    const xml = Object.values(slides).join('\n');
    expect(collect(xml, LATIN)).toContain('微软雅黑');
    expect(extractAText(xml)).toContain('基于 Transformer 的方法');
  });

  it('G8: kai scheme uses KaiTi uniformly and keeps text', async () => {
    const md = `# 封面\n\n---\n\n## 正文\n\n楷体方案下的中英混排 Transformer 2024\n`;
    const { slides } = await renderToPptx(md, 'ocean', 'kai');
    const xml = Object.values(slides).join('\n');
    expect(collect(xml, LATIN)).toContain('KaiTi');
    expect(extractAText(xml)).toContain('楷体方案下的中英混排 Transformer 2024');
  });
});
