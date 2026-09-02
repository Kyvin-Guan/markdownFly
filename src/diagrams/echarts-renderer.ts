/**
 * ECharts Diagram Renderer
 * Uses ECharts SSR mode — pure Node.js, no DOM/canvas needed
 */

import type { DiagramRenderer } from './renderer.js';
import type { Theme } from '../models/theme.js';
import { svgToPng } from './svg-to-png.js';

export class EChartsDiagramRenderer implements DiagramRenderer {
  readonly type = 'echarts';

  async initialize(): Promise<void> {
    // ECharts SSR mode needs no initialization
  }

  async render(code: string, _theme?: Theme): Promise<Buffer> {
    const echarts = await import('echarts');

    let option: Record<string, unknown>;
    try {
      option = JSON.parse(code.trim());
    } catch {
      throw new Error('ECharts: invalid JSON option');
    }

    // Extract optional size hints
    const width = typeof option.width === 'number' ? option.width : 800;
    const height = typeof option.height === 'number' ? option.height : 450;
    delete option.width;
    delete option.height;

    // SSR mode: no DOM required
    const chart = echarts.init(null, null, {
      renderer: 'svg',
      ssr: true,
      width,
      height,
    });

    try {
      chart.setOption({
        ...option,
        animation: false,
      });

      const svg = chart.renderToSVGString();
      return svgToPng(svg, width * 2); // 2x for retina quality
    } finally {
      chart.dispose();
    }
  }
}
