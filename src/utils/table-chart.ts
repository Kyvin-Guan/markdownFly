/**
 * Table → ECharts option converter
 * Powers the @(chart=bar|line|pie) directive: a plain Markdown table
 * becomes a rendered chart without writing JSON by hand.
 */

import type { TableElement } from '../models/slide.js';

/**
 * Convert a Markdown table into an ECharts option JSON string.
 *
 * bar/line: first column = category, every other column = one series.
 * pie:      first column = slice name, second column = value.
 */
export function tableToChartOption(
  table: TableElement,
  type: string,
): string {
  const { headers, rows } = table;

  if (headers.length < 2 || rows.length === 0) {
    throw new Error('chart: table needs at least 2 columns and 1 data row');
  }

  if (type === 'pie') {
    const series = {
      name: headers[1],
      type: 'pie',
      radius: '55%',
      data: rows.map((r) => ({ name: r[0], value: Number(r[1]) || 0 })),
    };
    return JSON.stringify({
      toolbox: { show: false },
      series: [series],
    });
  }

  // bar / line / others → category axis + one series per data column
  const categories = rows.map((r) => r[0]);
  const series = headers.slice(1).map((name, i) => ({
    name,
    type,
    data: rows.map((r) => Number(r[i + 1]) || 0),
  }));

  return JSON.stringify({
    xAxis: { type: 'category', data: categories, axisLabel: { hideOverlap: true } },
    yAxis: { type: 'value' },
    series,
  });
}
