/**
 * SVG to PNG conversion using @resvg/resvg-js (native N-API binding)
 */

// Type-only: erased at build time, so importing it never loads the addon.
import type { Resvg } from '@resvg/resvg-js';

/** A normalized SVG plus whether its declared frame can be measured against. */
interface NormalizedSvg {
  svg: string;
  /**
   * False when the SVG declares a degenerate viewBox (zero/negative extent, e.g.
   * mermaid's `viewBox="0 0 0 148"`). Resvg still draws such a file via its
   * content-bounds fallback, but its coordinate space is meaningless, so a
   * measured reframe cannot be trusted and must be skipped.
   */
  frameUsable: boolean;
}

/** Resvg requires the SVG namespace, which some exports leave implicit. */
function ensureSvgNamespace(svg: string): string {
  if (svg.includes('xmlns=')) return svg;
  return svg.replace(/<svg\b([^>]*)>/i, '<svg xmlns="http://www.w3.org/2000/svg" $1>');
}

/**
 * Normalize SVG string to guarantee valid dimensions and viewBox for Resvg
 */
function normalizeSvg(svg: string): NormalizedSvg {
  let clean = ensureSvgNamespace(svg.trim());

  // Remove existing width and height attributes (with any units pt/px/%/em) to prevent duplicates or percentage panics
  clean = clean.replace(/(<svg\b[^>]*)\s+width=["'][^"']*["']/gi, '$1');
  clean = clean.replace(/(<svg\b[^>]*)\s+height=["'][^"']*["']/gi, '$1');

  // NOTE: `<marker>` definitions and marker-end/start/mid references used to be
  // stripped here, to dodge a Rust panic in Resvg's geom.rs. That is not
  // reproducible on the installed @resvg/resvg-js (2.6.2): real mermaid marker
  // definitions render fine, as do deliberately degenerate ones. Stripping them
  // instead deleted drawn arrowheads from every mermaid sequence, state, class
  // and ER diagram. Only mermaid emits markers at all — Graphviz and PlantUML
  // draw arrowheads as inline polygons — and markers do not affect getBBox(), so
  // removing this cannot change framing. `test/mermaid-renderer.test.ts` fails
  // if marker ink ever stops reaching the raster.

  // Check for viewBox
  const viewBoxMatch = clean.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  let frameUsable = true;

  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      const w = parts[2];
      const h = parts[3];
      clean = clean.replace(/<svg\b([^>]*)>/i, `<svg width="${w}" height="${h}" $1>`);
    } else {
      frameUsable = false;
    }
  } else {
    clean = clean.replace(/<svg\b([^>]*)>/i, `<svg width="800" height="600" viewBox="0 0 800 600" $1>`);
  }

  return { svg: clean, frameUsable };
}

/**
 * Convert SVG string to PNG Buffer
 * @resvg/resvg-js is a native addon — loaded lazily so that runs without
 * diagrams (or on platforms lacking the prebuilt binary) never touch it.
 */
export async function svgToPng(svg: string, width: number = 800): Promise<Buffer> {
  const { svg: normalized, frameUsable } = normalizeSvg(svg);
  const { Resvg } = await import('@resvg/resvg-js');
  const resvg = new Resvg(normalized, {
    fitTo: { mode: 'width' as const, value: width },
  });
  if (frameUsable) reframeToContent(resvg);
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}

/**
 * Width, in pixels, that an author-supplied SVG is rasterized to. Matches what
 * the diagram renderers use, so an embedded SVG and a diagram land at a
 * comparable resolution.
 */
export const SVG_EMBED_WIDTH = 1200;

/**
 * Rasterize an SVG the author supplied, as opposed to one a diagram engine
 * emitted.
 *
 * Deliberately none of what `svgToPng` does to engine output, because here the
 * author's frame is authoritative:
 *
 * - no reframing. Rebuilding the viewport around the drawn geometry trims the
 *   padding a logo or icon was designed with — measured on a padded 2:1 icon it
 *   changed the aspect from 2.000 to 1.556, which would also stretch the image
 *   on the slide, since placement is derived from the same measurement.
 * - no width/height stripping and no synthesised viewBox. An SVG declaring only
 *   `width`/`height` is valid and common; forcing an 800x600 frame on it would
 *   shrink the drawing into the corner of a 4:3 box.
 */
export async function rasterizeSvg(svg: string, width: number): Promise<Buffer> {
  const { Resvg } = await import('@resvg/resvg-js');
  const resvg = new Resvg(ensureSvgNamespace(svg.trim()), {
    fitTo: { mode: 'width' as const, value: width },
  });
  return Buffer.from(resvg.render().asPng());
}

/** Breathing room kept around the drawing, in SVG user units. */
const CONTENT_PADDING = 4;

/**
 * How far the content aspect may stray from the declared frame before the
 * measurement is treated as untrustworthy.
 *
 * A genuine correction — revealing clipped content or trimming padding — shifts
 * the aspect by a few tens of a percent. Pathological cases differ by orders of
 * magnitude: mermaid's gantt places a decorative "today" marker thousands of
 * units off-chart (it is meant to be clipped away by the viewBox), and
 * measuring that would drag the frame out into a sliver. `getBBox()` reports a
 * single maximum box with no way to exclude one stray element, so an
 * implausible result is rejected rather than trusted.
 */
const MAX_ASPECT_SHIFT = 3;

/**
 * Rebuild the viewport around what is actually drawn.
 *
 * Every engine decides its own viewBox from measurements taken outside a real
 * layout engine, so the emitted frame regularly disagrees with the drawing:
 * mermaid measures text with a jsdom polyfill (and falls back to constants for
 * elements it cannot measure), which leaves class diagrams and pies overflowing
 * the frame, block diagrams framed at a fraction of their width, and flowcharts
 * with a sliced-off bottom edge. Resvg can measure the real geometry, so the
 * frame is rebuilt from that instead of trusting the engine's own numbers.
 *
 * Content larger than the frame is revealed; content smaller than it is trimmed
 * of the padding the engine added for a viewport it cannot know about here.
 */
function reframeToContent(resvg: Resvg, padding: number = CONTENT_PADDING): void {
  const bbox = resvg.getBBox();
  // getBBox() is undefined for an empty drawing, and a zero-area box would
  // collapse the frame rather than describe it.
  if (!bbox || !(bbox.width > 0) || !(bbox.height > 0)) return;

  const frameAspect = resvg.width / resvg.height;
  if (!Number.isFinite(frameAspect) || frameAspect <= 0) return;
  const contentAspect = bbox.width / bbox.height;
  const shift = Math.max(contentAspect / frameAspect, frameAspect / contentAspect);
  if (shift > MAX_ASPECT_SHIFT) return;

  try {
    // Grown in place so the padding is honoured. These fields are native
    // accessors, so if they turn out to be read-only the exact content frame is
    // still a correct (if tighter) result.
    bbox.x -= padding;
    bbox.y -= padding;
    bbox.width += padding * 2;
    bbox.height += padding * 2;
  } catch {
    /* fall through to the unpadded box */
  }

  resvg.cropByBBox(bbox);
}
