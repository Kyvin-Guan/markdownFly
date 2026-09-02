/**
 * Graphviz/DOT Diagram Renderer
 * Uses @viz-js/viz (WASM) — works natively in Node.js, no DOM needed
 */

import type { DiagramRenderer } from './renderer.js';
import type { Theme } from '../models/theme.js';
import { svgToPng } from './svg-to-png.js';

export class GraphvizDiagramRenderer implements DiagramRenderer {
  readonly type = 'dot';
  private viz: Awaited<ReturnType<typeof import('@viz-js/viz').then>> | null = null;

  async initialize(): Promise<void> {
    if (this.viz) return;
    const vizModule = await import('@viz-js/viz');
    this.viz = await vizModule.instance();
  }

  async render(code: string, _theme?: Theme): Promise<Buffer> {
    await this.initialize();

    try {
      const svg = this.viz!.renderString(code.trim(), {
        format: 'svg',
        engine: 'dot',
      });
      return svgToPng(svg, 1200);
    } catch (err) {
      throw new Error(
        `Graphviz render failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
