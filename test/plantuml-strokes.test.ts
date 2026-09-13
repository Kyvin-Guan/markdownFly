import { describe, it, expect, vi } from 'vitest';
import { renderDiagram } from '../src/diagrams/index.js';
import { cleanTheme } from '../src/themes/index.js';

const captured = vi.hoisted(() => [] as string[]);

/**
 * Captures the SVG as the rasterizer receives it — i.e. after the renderer has
 * restored the strokes the engine left off — and rasterizes it either way, so a
 * test can show the styling actually changes the picture.
 */
const removeInjectedStroke = vi.hoisted(() => ({ value: false }));

vi.mock('../src/diagrams/svg-to-png.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/diagrams/svg-to-png.js')>();
  return {
    ...actual,
    svgToPng: async (svg: string, width?: number) => {
      captured.push(svg);
      return actual.svgToPng(removeInjectedStroke.value ? unrepair(svg) : svg, width);
    },
  };
});

/** The two styles the renderer injects, per the reference PlantUML server. */
const INJECTED = [
  'stroke:#181818;stroke-width:0.5;',
  'stroke:#181818;stroke-width:0.5;stroke-dasharray:5,5;',
];

function unrepair(svg: string): string {
  return svg.replace(/<line\b([^>]*?)\/>/g, (match, attributes: string) => {
    const style = (attributes.match(/style="([^"]*)"/) ?? [])[1];
    if (!style || !INJECTED.includes(style)) return match;
    return `<line${attributes.replace(/ style="[^"]*"/, '')}/>`;
  });
}

const SEQUENCE = `@startuml
actor 用户
participant "Web 应用" as Web
database "PostgreSQL" as DB

用户 -> Web : 提交表单
Web -> DB : 写入记录
DB --> Web : 返回主键
Web --> 用户 : 201 Created
@enduml`;

const CLASS_DIAGRAM = `@startuml
class Document {
  +String title
  +render() Pptx
}
class Slide {
  +String title
}
Document "1" *-- "many" Slide
@enduml`;

function lineStyles(svg: string): Array<string | null> {
  return (svg.match(/<line\b[^>]*>/g) ?? []).map(
    (line) => (line.match(/style="([^"]*)"/) ?? [])[1] ?? null,
  );
}

describe('PlantUML strokes the engine omits', () => {
  it('draws sequence lifelines as dashed lines', async () => {
    captured.length = 0;
    await renderDiagram('plantuml', SEQUENCE, cleanTheme);

    const styles = lineStyles(captured[captured.length - 1]);
    expect(styles.length).toBeGreaterThanOrEqual(3);
    // Without a stroke the lifelines are invisible: SVG defaults to stroke:none.
    expect(styles.filter((s) => s === null)).toEqual([]);
    expect(styles.filter((s) => s?.includes('stroke-dasharray:5,5')).length).toBeGreaterThanOrEqual(3);
  }, 60000);

  it('draws class compartment dividers as solid lines', async () => {
    captured.length = 0;
    await renderDiagram('plantuml', CLASS_DIAGRAM, cleanTheme);

    const styles = lineStyles(captured[captured.length - 1]);
    // The dividers under the title and between fields and methods.
    expect(styles.length).toBeGreaterThanOrEqual(4);
    expect(styles.filter((s) => s === null)).toEqual([]);
    // Solid here, unlike the sequence lifelines.
    expect(styles.some((s) => s === 'stroke:#181818;stroke-width:0.5;')).toBe(true);
    expect(styles.some((s) => s?.includes('dasharray'))).toBe(false);
  }, 60000);

  for (const [name, code] of [
    ['lifelines', SEQUENCE],
    ['class dividers', CLASS_DIAGRAM],
  ] as const) {
    it(`makes a visible difference to ${name}`, async () => {
      removeInjectedStroke.value = false;
      const withStrokes = await renderDiagram('plantuml', code, cleanTheme);

      removeInjectedStroke.value = true;
      const withoutStrokes = await renderDiagram('plantuml', code, cleanTheme);

      removeInjectedStroke.value = false;
      expect(withStrokes.equals(withoutStrokes)).toBe(false);
    }, 60000);
  }
});
