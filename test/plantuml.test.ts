import { describe, it, expect, vi } from 'vitest';
import { renderDiagram, isDiagramLanguage } from '../src/diagrams/index.js';
import { parseMarkdown } from '../src/parser/index.js';
import { getImageSize } from '../src/utils/image-size.js';
import type { DiagramElement } from '../src/models/slide.js';
import { getTheme } from '../src/themes/index.js';

const SEQUENCE = `@startuml
Alice -> Bob : 登录请求
Bob --> Alice : 登录成功
@enduml`;

/** Exercises the Graphviz layout path, which the engine reaches through Viz. */
const CLASS_DIAGRAM = `@startuml
class Animal {
  +String name
  +makeSound() void
}
class Dog
Animal <|-- Dog
@enduml`;

function collectDiagrams(md: string): DiagramElement[] {
  const presentation = parseMarkdown(md);
  const out: DiagramElement[] = [];
  for (const slide of presentation.slides) {
    for (const element of slide.elements) {
      if (element.type === 'diagram') out.push(element);
    }
  }
  return out;
}

describe('PlantUML language recognition', () => {
  it('recognizes plantuml and its puml alias', () => {
    expect(isDiagramLanguage('plantuml')).toBe(true);
    expect(isDiagramLanguage('puml')).toBe(true);
    expect(isDiagramLanguage('PlantUML')).toBe(true);
  });

  it('does not treat prototype keys as diagram languages', () => {
    // Regression: the old `language in table` lookup matched inherited keys.
    expect(isDiagramLanguage('constructor')).toBe(false);
    expect(isDiagramLanguage('toString')).toBe(false);
    expect(isDiagramLanguage('valueOf')).toBe(false);
  });

  it('keeps the graphviz alias pointing at dot', () => {
    expect(isDiagramLanguage('graphviz')).toBe(true);
    expect(isDiagramLanguage('javascript')).toBe(false);
  });

  it('turns a plantuml fence into a diagram element (both spellings)', () => {
    const [diagram] = collectDiagrams('## UML\n\n```plantuml\nAlice -> Bob\n```');
    expect(diagram).toMatchObject({ type: 'diagram', diagramType: 'plantuml' });

    const [aliased] = collectDiagrams('## UML\n\n```puml\nAlice -> Bob\n```');
    expect(aliased).toMatchObject({ type: 'diagram', diagramType: 'plantuml' });
  });

  it('still resolves the graphviz fence to the dot renderer', () => {
    const [diagram] = collectDiagrams('## DOT\n\n```graphviz\ndigraph { A -> B }\n```');
    expect(diagram.diagramType).toBe('dot');
  });
});

describe('PlantUML rendering', () => {
  it('renders a sequence diagram to a PNG', async () => {
    const buffer = await renderDiagram('plantuml', SEQUENCE, getTheme('ocean'));
    expect(buffer.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    expect(getImageSize(buffer)).not.toBeNull();
  }, 60000);

  it('renders a class diagram (Graphviz layout path)', async () => {
    const buffer = await renderDiagram('plantuml', CLASS_DIAGRAM, getTheme('ocean'));
    const size = getImageSize(buffer);
    expect(size).not.toBeNull();
    // A two-class inheritance diagram is taller than it is wide but nothing like
    // the degenerate 2:1 guesses a failed rasterization would leave behind.
    expect(size!.height / size!.width).toBeGreaterThan(0.5);
    expect(size!.height / size!.width).toBeLessThan(6);
  }, 60000);

  it('renders under a dark theme without losing the diagram', async () => {
    const buffer = await renderDiagram('plantuml', CLASS_DIAGRAM, getTheme('ocean-dark'));
    expect(getImageSize(buffer)).not.toBeNull();
  }, 60000);

  it('accepts bare source with no @startuml envelope', async () => {
    const buffer = await renderDiagram('plantuml', 'Alice -> Bob : no envelope', getTheme('ocean'));
    expect(getImageSize(buffer)).not.toBeNull();
  }, 60000);

  it('closes a half-written envelope instead of failing on it', async () => {
    const buffer = await renderDiagram('plantuml', '@startuml\nAlice -> Bob : opened only');
    expect(getImageSize(buffer)).not.toBeNull();
  }, 60000);

  it('reports a syntax error with its line number instead of hanging', async () => {
    await expect(renderDiagram('plantuml', '@startuml\n!!!invalid!!!\n@enduml')).rejects.toThrow(
      /PlantUML render failed: .*line 2/s,
    );
  }, 60000);

  it('renders several diagrams in one process, including distinct !theme directives', async () => {
    // The engine never calls back for a *second distinct* `!theme` (it goes
    // looking for themes.js, which the headless build does not ship), so these
    // directives are stripped. Without that this test would hang.
    const first = await renderDiagram('plantuml', '@startuml\n!theme darkula\nclass A\n@enduml');
    const second = await renderDiagram('plantuml', '@startuml\n!theme cerulean\nclass A\n@enduml');
    const third = await renderDiagram('plantuml', SEQUENCE);

    for (const buffer of [first, second, third]) {
      expect(getImageSize(buffer)).not.toBeNull();
    }
  }, 60000);

  it('warns that !theme is unsupported', async () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await renderDiagram('plantuml', '@startuml\n!theme darkula\nclass A\n@enduml');
      expect(warn.mock.calls.flat().join(' ')).toMatch(/!theme.*no themes/s);
    } finally {
      warn.mockRestore();
    }
  }, 60000);

  it('keeps engine chatter off both stdout and stderr', async () => {
    // The engine narrates its internals through console.log (Java's System.out).
    // stdout is reserved for the CLI summary and the --json payload; the chatter
    // is engine bookkeeping, so it is muted rather than forwarded.
    const stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await renderDiagram('plantuml', SEQUENCE, getTheme('ocean'));
      expect(stdout).not.toHaveBeenCalled();
      expect(stderr.mock.calls.flat().join(' ')).not.toMatch(/TimLoader|PSystemBuilder/);
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }
  }, 60000);

  it('forwards engine chatter to stderr under MFLY_DEBUG', async () => {
    process.env.MFLY_DEBUG = '1';
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await renderDiagram('plantuml', SEQUENCE, getTheme('ocean'));
      expect(stderr.mock.calls.flat().join(' ')).toMatch(/TimLoader|PSystemBuilder/);
    } finally {
      stderr.mockRestore();
      delete process.env.MFLY_DEBUG;
    }
  }, 60000);
});
