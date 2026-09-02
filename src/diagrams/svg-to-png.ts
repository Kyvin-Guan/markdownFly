/**
 * SVG to PNG conversion using @resvg/resvg-js (WASM)
 */

import { Resvg } from '@resvg/resvg-js';

/**
 * Normalize SVG string to guarantee valid dimensions and viewBox for Resvg
 */
function normalizeSvg(svg: string): string {
  let clean = svg.trim();

  // Ensure xmlns
  if (!clean.includes('xmlns=')) {
    clean = clean.replace(/<svg\b([^>]*)>/i, '<svg xmlns="http://www.w3.org/2000/svg" $1>');
  }

  // Remove existing width and height attributes (with any units pt/px/%/em) to prevent duplicates or percentage panics
  clean = clean.replace(/(<svg\b[^>]*)\s+width=["'][^"']*["']/gi, '$1');
  clean = clean.replace(/(<svg\b[^>]*)\s+height=["'][^"']*["']/gi, '$1');

  // Strip SVG marker definitions and references that cause Rust panics in Resvg's geom.rs
  clean = clean.replace(/<marker\b[\s\S]*?<\/marker>/gi, '');
  clean = clean.replace(/\s+marker-(end|start|mid)=["'][^"']*["']/gi, '');

  // Check for viewBox
  const viewBoxMatch = clean.match(/viewBox\s*=\s*["']([^"']+)["']/i);

  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      const w = parts[2];
      const h = parts[3];
      clean = clean.replace(/<svg\b([^>]*)>/i, `<svg width="${w}" height="${h}" $1>`);
    }
  } else {
    clean = clean.replace(/<svg\b([^>]*)>/i, `<svg width="800" height="600" viewBox="0 0 800 600" $1>`);
  }

  return clean;
}

/**
 * Convert SVG string to PNG Buffer
 */
export async function svgToPng(svg: string, width: number = 800): Promise<Buffer> {
  const normalized = normalizeSvg(svg);
  const resvg = new Resvg(normalized, {
    fitTo: { mode: 'width' as const, value: width },
  });
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}
