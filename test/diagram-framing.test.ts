import { describe, it, expect, vi } from 'vitest';
import { Resvg } from '@resvg/resvg-js';
import { getImageSize } from '../src/utils/image-size.js';
import { renderDiagram } from '../src/diagrams/index.js';
import { getTheme } from '../src/themes/index.js';

// Capturing the SVG on its way to the rasterizer lets every case be checked
// against the geometry resvg actually measures in that SVG, so no expectation
// here hardcodes an engine's internal numbers.
const captured = vi.hoisted(() => [] as string[]);

vi.mock('../src/diagrams/svg-to-png.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/diagrams/svg-to-png.js')>();
  return {
    ...actual,
    svgToPng: async (svg: string, width?: number) => {
      captured.push(svg);
      return actual.svgToPng(svg, width);
    },
  };
});

/** Mirrors CONTENT_PADDING in src/diagrams/svg-to-png.ts. */
const PADDING = 4;

const FLOWCHART = `graph TD
    A[Client] --> B[API Gateway]
    B --> C[Auth Service]
    C --> D[(PostgreSQL)]
    B --> E[Cache]`;

const CLASS_DIAGRAM = `classDiagram
    class Animal {
      +String name
      +makeSound() void
    }
    class Dog
    Animal <|-- Dog`;

const PIE = `pie title 流量来源
    "搜索" : 45
    "直接访问" : 30
    "社交媒体" : 25`;

const BLOCK = `block-beta
    columns 3
    a b c
    d e f`;

const GANTT = `gantt
    title 项目排期
    dateFormat YYYY-MM-DD
    section 设计
    需求调研 :a1, 2024-01-01, 10d
    原型设计 :a2, after a1, 8d`;

const DOT = `digraph A { rankdir=LR; node [shape=box, style=filled, fillcolor=lightblue]; CLI -> Parser -> Transform -> Renderer -> File; }`;

const ECHARTS = JSON.stringify({
  xAxis: { type: 'category', data: ['Q1', 'Q2', 'Q3', 'Q4'] },
  yAxis: { type: 'value' },
  series: [{ data: [150, 230, 224, 270], type: 'bar' }],
});

interface Measured {
  pngAspect: number;
  /** Aspect of the drawing resvg finds in the emitted SVG, plus the padding */
  contentAspect: number;
  /** Aspect of the frame the engine declared (its viewBox) */
  frameAspect: number;
}

async function measure(language: string, code: string): Promise<Measured> {
  captured.length = 0;
  const png = getImageSize(await renderDiagram(language, code, getTheme('ocean')));
  expect(png, 'rendered buffer should be a readable image').not.toBeNull();

  const svg = captured[captured.length - 1];
  const resvg = new Resvg(svg);
  const bbox = resvg.getBBox();
  expect(bbox, 'emitted SVG should contain measurable geometry').toBeDefined();

  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1].split(/[\s,]+/).map(Number);
  return {
    pngAspect: png!.width / png!.height,
    contentAspect: (bbox!.width + PADDING * 2) / (bbox!.height + PADDING * 2),
    frameAspect: viewBox ? viewBox[2] / viewBox[3] : resvg.width / resvg.height,
  };
}

function relativeDiff(a: number, b: number): number {
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));
}

/**
 * Diagrams whose declared frame disagreed with the drawing: the rasterized
 * result must match the real content, so nothing is clipped and no padding the
 * engine guessed at is kept.
 */
describe('diagram framing matches the drawing', () => {
  const cases: Array<[string, string, string]> = [
    ['mermaid flowchart (bottom edge used to be sliced off)', 'mermaid', FLOWCHART],
    ['mermaid class (content used to overflow the right edge)', 'mermaid', CLASS_DIAGRAM],
    ['mermaid pie (legend used to be clipped)', 'mermaid', PIE],
    ['mermaid block (two thirds used to be cut off)', 'mermaid', BLOCK],
    ['graphviz', 'dot', DOT],
    ['echarts', 'echarts', ECHARTS],
  ];

  for (const [name, language, code] of cases) {
    it(name, async () => {
      const { pngAspect, contentAspect } = await measure(language, code);
      expect(relativeDiff(pngAspect, contentAspect)).toBeLessThan(0.03);
    }, 60000);
  }

  it('keeps the echarts aspect ratio close to what was configured', async () => {
    // The uniform padding shifts the ratio slightly (≈0.8% here); what matters
    // is that a chart is not stretched.
    const { pngAspect } = await measure('echarts', ECHARTS);
    expect(relativeDiff(pngAspect, 800 / 450)).toBeLessThan(0.01);
  }, 60000);
});

describe('degenerate frames', () => {
  it('gives the gantt chart a usable viewBox', async () => {
    // jsdom reports offsetWidth as 0 rather than undefined, which defeated
    // mermaid's own fallback and produced `viewBox="0 0 0 148"`.
    captured.length = 0;
    await renderDiagram('mermaid', GANTT, getTheme('ocean'));
    const viewBox = captured[captured.length - 1]
      .match(/viewBox="([^"]+)"/)![1]
      .split(/[\s,]+/)
      .map(Number);
    expect(viewBox[2]).toBeGreaterThan(0);
    expect(viewBox[3]).toBeGreaterThan(0);
  }, 60000);

  it('keeps the declared frame when the measurement is not plausible', async () => {
    // The gantt chart places a decorative "today" marker thousands of units
    // off-chart, where the viewBox is meant to clip it. Measuring that would
    // drag the frame out to a sliver, so an implausible measurement is rejected
    // and the declared frame is kept.
    const { pngAspect, contentAspect, frameAspect } = await measure('mermaid', GANTT);
    expect(Math.max(contentAspect / frameAspect, frameAspect / contentAspect)).toBeGreaterThan(3);
    expect(relativeDiff(pngAspect, frameAspect)).toBeLessThan(0.03);
  }, 60000);
});
