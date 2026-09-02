import { describe, it, expect } from 'vitest';
import { renderDiagram, isDiagramLanguage } from '../src/diagrams/index.js';

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
});
