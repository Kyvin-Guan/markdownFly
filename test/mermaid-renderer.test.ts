import { describe, it, expect, vi } from 'vitest';
import { renderDiagram } from '../src/diagrams/index.js';
import { getImageSize } from '../src/utils/image-size.js';
import { getTheme } from '../src/themes/index.js';

const captured = vi.hoisted(() => [] as string[]);
const stripInputMarkers = vi.hoisted(() => ({ value: false }));

/**
 * Forwards to the real rasterizer, optionally after removing the markers from
 * the SVG the engine produced. Comparing the two renders shows whether marker
 * ink (mermaid's arrowheads) survives the pipeline: were anything to strip
 * markers again, both renders would lose it and the comparison would stop
 * differing.
 */
vi.mock('../src/diagrams/svg-to-png.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/diagrams/svg-to-png.js')>();
  return {
    ...actual,
    svgToPng: async (svg: string, width?: number) => {
      captured.push(svg);
      const input = stripInputMarkers.value
        ? svg
            .replace(/<marker\b[\s\S]*?<\/marker>/gi, '')
            .replace(/\s+marker-(end|start|mid)=["'][^"']*["']/gi, '')
        : svg;
      return actual.svgToPng(input, width);
    },
  };
});

const FLOWCHART = `graph TD
    A[Client] --> B[API Gateway]
    B --> C[Auth Service]
    C --> D[(PostgreSQL)]
    B --> E[Cache]`;

const SEQUENCE = `sequenceDiagram
    participant U as 用户
    participant S as 服务器
    U->>S: 登录请求
    S-->>U: 登录成功`;

const STATE = `stateDiagram-v2
    [*] --> 待处理
    待处理 --> 处理中: 开始
    处理中 --> 已完成: 完成
    已完成 --> [*]`;

const CLASS = `classDiagram
    class Animal {
      +String name
      +makeSound() void
    }
    class Dog
    Animal <|-- Dog`;

const ER = `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains`;

const MINDMAP = `mindmap
  root((产品))
    前端
      组件库
    后端
      数据库`;

const BLOCK = `block-beta
    columns 3
    a b c
    d e f`;

/** Render a diagram, then render it again with the marker defs removed. */
async function renderWithAndWithoutMarkers(code: string): Promise<[Buffer, Buffer]> {
  stripInputMarkers.value = false;
  const withMarkers = await renderDiagram('mermaid', code, getTheme('ocean'));

  stripInputMarkers.value = true;
  const withoutMarkers = await renderDiagram('mermaid', code, getTheme('ocean'));

  stripInputMarkers.value = false;
  return [withMarkers, withoutMarkers];
}

describe('mermaid arrowheads survive rasterization', () => {
  // Markers are how mermaid draws arrowheads. They are rendered by resvg (the
  // `geom.rs` panic the stripping was written for is not reproducible on the
  // installed @resvg/resvg-js), so removing the definitions must change the
  // picture — for these types the arrowhead is the only thing it changes.
  const cases: Array<[string, string]> = [
    ['sequence', SEQUENCE],
    ['state', STATE],
    ['class', CLASS],
    ['er', ER],
    // Flowcharts are the regression that motivated this: node boxes used to be
    // sized from an invented 80x40, so edges were clipped against a box smaller
    // than the shape they end in and the arrowhead was buried under the fill.
    ['flowchart', FLOWCHART],
  ];

  for (const [name, code] of cases) {
    it(`${name} draws its arrowheads`, async () => {
      const [withMarkers, withoutMarkers] = await renderWithAndWithoutMarkers(code);
      expect(withMarkers.equals(withoutMarkers)).toBe(false);
    }, 60000);
  }
});

describe('mermaid node geometry', () => {
  it('centres every flowchart node label', async () => {
    // A fabricated SVGRect used to defeat mermaid's text-anchor compensation,
    // leaving shape labels (e.g. the cylinder's) offset to the side.
    captured.length = 0;
    await renderDiagram('mermaid', FLOWCHART, getTheme('ocean'));

    const offsets = [...captured[captured.length - 1].matchAll(
      /<g class="label"[^>]*transform="translate\(([-\d.]+)/g,
    )].map((match) => Number(match[1]));

    expect(offsets.length).toBeGreaterThan(0);
    expect(offsets.filter((x) => x !== 0)).toEqual([]);
  }, 60000);

  it('keeps block-beta a landscape grid', async () => {
    // Guards the deliberate scope of the node measurement: widening it to every
    // group re-flows block-beta into a tall column (aspect ~0.87). A 3-column,
    // 2-row block diagram has to stay wider than it is tall.
    const png = getImageSize(await renderDiagram('mermaid', BLOCK, getTheme('ocean')))!;
    expect(png.width / png.height).toBeGreaterThan(2);
  }, 60000);
});

describe('mermaid diagram types that used to fail', () => {
  it('renders a mindmap', async () => {
    // Used to throw "Cannot read properties of undefined (reading 'h')": jsdom
    // reports unset CSS padding as "", so cytoscape's container size became NaN.
    const png = getImageSize(await renderDiagram('mermaid', MINDMAP, getTheme('ocean')));
    expect(png).not.toBeNull();
    expect(png!.width).toBeGreaterThan(0);
  }, 60000);
});
