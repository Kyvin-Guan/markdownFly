/**
 * Graphviz/DOT Diagram Renderer
 * Uses @viz-js/viz (WASM) — works natively in Node.js, no DOM needed
 */

import type { DiagramRenderer } from './renderer.js';
import type { Theme } from '../models/theme.js';
import { svgToPng } from './svg-to-png.js';
import { isDarkTheme } from './theme.js';

export class GraphvizDiagramRenderer implements DiagramRenderer {
  readonly type = 'dot';
  private viz: Awaited<ReturnType<typeof import('@viz-js/viz').instance>> | null = null;

  async initialize(): Promise<void> {
    if (this.viz) return;
    const vizModule = await import('@viz-js/viz');
    this.viz = await vizModule.instance();
  }

  /**
   * Dark theme support: prepend default node/edge/graph attributes so nodes,
   * edges, and labels become light-on-dark. User-specified attrs in the DOT
   * code still win because they appear after these defaults.
   */
  private themeDefaults(code: string, dark: boolean): string {
    if (!dark) return code;
    const prelude =
      '  graph [fontcolor="#c9d1d9" bgcolor="transparent"];\n' +
      '  node [color="#8b949e" fontcolor="#c9d1d9"];\n' +
      '  edge [color="#8b949e" fontcolor="#c9d1d9"];\n';
    return code.replace(/\{/, `{\n${prelude}`);
  }

  async render(code: string, theme?: Theme): Promise<Buffer> {
    await this.initialize();

    try {
      const dark = isDarkTheme(theme);
      const svg = this.viz!.renderString(this.themeDefaults(code.trim(), dark), {
        format: 'svg',
        engine: 'dot',
        graphAttributes: {
          bgcolor: 'transparent',
        },
      });
      return svgToPng(svg, 1200);
    } catch (err) {
      throw new Error(
        `Graphviz render failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
