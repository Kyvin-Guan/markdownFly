import { describe, it, expect } from 'vitest';
import { renderDiagram, isDiagramLanguage } from '../src/diagrams/index.js';
import { getPngSize } from '../src/utils/png-size.js';
import { fitInBox } from '../src/utils/image-fit.js';
import { cleanTheme, darkTheme } from '../src/themes/index.js';

const FLOWCHART_CODE = `graph TD
    A[Markdown 源文件] --> B[Unified AST 解析]
    B --> C[Slide IR 中间表示]
    C --> D[Shiki 语法高亮]
    C --> E[WASM / SSR 图表渲染]
    D --> F[PptxGenJS 矢量生成]
    E --> F
    F --> G[可编辑 PPTX 文件]`;

describe('Diagrams', () => {
  it('should identify diagram languages', () => {
    expect(isDiagramLanguage('mermaid')).toBe(true);
    expect(isDiagramLanguage('dot')).toBe(true);
    expect(isDiagramLanguage('graphviz')).toBe(true);
    expect(isDiagramLanguage('echarts')).toBe(true);
    expect(isDiagramLanguage('javascript')).toBe(false);
  });

  it('should render graphviz/dot diagram to PNG buffer', async () => {
    const code = `
      digraph G {
        A -> B;
      }
    `;
    const buffer = await renderDiagram('dot', code);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // PNG magic header: 89 50 4E 47
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50);
    expect(buffer[2]).toBe(0x4E);
    expect(buffer[3]).toBe(0x47);
  });

  it('should render echarts diagram to PNG buffer', async () => {
    const code = JSON.stringify({
      xAxis: { type: 'category', data: ['A', 'B'] },
      yAxis: { type: 'value' },
      series: [{ data: [1, 2], type: 'bar' }],
    });
    const buffer = await renderDiagram('echarts', code);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer[0]).toBe(0x89);
  });

  it('should render mermaid diagram to PNG buffer', async () => {
    const code = `
      graph TD
        A[Client] --> B[Server]
    `;
    const buffer = await renderDiagram('mermaid', code);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer[0]).toBe(0x89);
  });

  it('mermaid flowchart PNG covers the full layout (no tiny viewBox crop)', async () => {
    const buffer = await renderDiagram('mermaid', FLOWCHART_CODE, cleanTheme);
    const size = getPngSize(buffer);
    expect(size).not.toBeNull();
    expect(size!.width).toBeGreaterThan(0);
    // TD flow with 7 nodes must be much taller than a cropped 96x56-layout
    // (the old bug produced an aspect of ~0.58 and a giant zoomed box)
    expect(size!.height / size!.width).toBeGreaterThan(1.2);
    expect(size!.height / size!.width).toBeLessThan(6);
  }, 60000);

  it('mermaid renders under a dark theme', async () => {
    const buffer = await renderDiagram('mermaid', FLOWCHART_CODE, darkTheme);
    const size = getPngSize(buffer);
    expect(size).not.toBeNull();
    expect(size!.width).toBeGreaterThan(0);
  }, 60000);

  it('graphviz chain PNG stays wide (correct aspect, no distortion)', async () => {
    const code = `digraph Architecture {
      rankdir=LR;
      node [shape=box, style=filled, fillcolor=lightblue, fontname="Segoe UI"];
      CLI -> Parser -> Transform -> PPTXRenderer -> FileOutput;
    }`;
    const buffer = await renderDiagram('dot', code, cleanTheme);
    const size = getPngSize(buffer);
    expect(size).not.toBeNull();
    expect(size!.width).toBeGreaterThan(0);
    expect(size!.height / size!.width).toBeLessThan(0.3);
  }, 60000);
});

describe('fitInBox', () => {
  it('keeps aspect ratio when width-limited', () => {
    const box = fitInBox({ width: 1200, height: 103 }, 12.13, 5.65);
    expect(box.width).toBeCloseTo(12.13);
    expect(box.height).toBeCloseTo(12.13 * (103 / 1200));
  });

  it('keeps aspect ratio when height-limited', () => {
    const box = fitInBox({ width: 1200, height: 3700 }, 12.13, 5.65);
    expect(box.height).toBeCloseTo(5.65);
    expect(box.width).toBeCloseTo(5.65 * (1200 / 3700));
  });

  it('handles degenerate inputs', () => {
    expect(fitInBox({ width: 0, height: 0 }, 8, 3.5)).toEqual({ width: 8, height: 3.5 });
  });
});
