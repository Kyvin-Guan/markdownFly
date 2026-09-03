/**
 * Mermaid Diagram Renderer
 * Uses mermaid + jsdom to render diagrams to SVG in Node.js
 */

import type { DiagramRenderer } from './renderer.js';
import type { Theme } from '../models/theme.js';
import { svgToPng } from './svg-to-png.js';
import { isDarkTheme, diagramFontFamily } from './theme.js';

let initialized = false;

// ---------------------------------------------------------------------------
// SVG geometry measurement
//
// jsdom has no layout engine, so every getBBox() mermaid relies on is a fake.
// Mermaid sizes its output via `svg.getBBox()` on the root <svg> (its
// `setupGraphViewbox`), which previously returned a constant 80x40 — far
// smaller than the actual drawing — so the produced viewBox was tiny and the
// rasterized PNG turned into a huge zoomed crop (the "giant purple box" bug).
// The polyfills below measure REAL geometry (rect/path/circle/line/... with
// translate/rotate/scale chains) for the root <svg>; other elements keep the
// old text heuristics because mermaid's internal node layout already works
// with them.
// ---------------------------------------------------------------------------

type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

const SKIP_TAGS = new Set([
  'style', 'script', 'defs', 'clippath', 'marker', 'filter', 'mask', 'pattern', 'foreignobject',
]);

/** 2x3 affine multiply: result = m1·m2 (right operand applies to points first) */
function mul(m1: Matrix, m2: Matrix): Matrix {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

function parseTransform(attr: string | null): Matrix {
  if (!attr) return IDENTITY;
  let m: Matrix = IDENTITY;
  const re = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
  let mt: RegExpExecArray | null;
  while ((mt = re.exec(attr))) {
    const name = mt[1];
    const args = mt[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (args.some((n) => !Number.isFinite(n))) continue;
    let next: Matrix | null = null;
    switch (name) {
      case 'matrix':
        if (args.length >= 6) next = [args[0], args[1], args[2], args[3], args[4], args[5]];
        break;
      case 'translate':
        next = [1, 0, 0, 1, args[0] || 0, args[1] || 0];
        break;
      case 'scale': {
        const sx = args[0] || 1;
        const sy = args.length > 1 ? args[1] || 1 : sx;
        next = [sx, 0, 0, sy, 0, 0];
        break;
      }
      case 'rotate': {
        const rad = ((args[0] || 0) * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rot: Matrix = [cos, sin, -sin, cos, 0, 0];
        next =
          args.length >= 3
            ? mul(mul([1, 0, 0, 1, args[1], args[2]], rot), [1, 0, 0, 1, -args[1], -args[2]])
            : rot;
        break;
      }
      case 'skewX':
        next = [1, 0, Math.tan((args[0] || 0) * Math.PI / 180), 1, 0, 0];
        break;
      case 'skewY':
        next = [1, Math.tan((args[0] || 0) * Math.PI / 180), 0, 1, 0, 0];
        break;
    }
    if (next) m = mul(m, next);
  }
  return m;
}

function expandedBox(m: Matrix, b: { x: number; y: number; width: number; height: number }) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const pts = [
    [b.x, b.y],
    [b.x + b.width, b.y],
    [b.x, b.y + b.height],
    [b.x + b.width, b.y + b.height],
  ];
  for (const [px, py] of pts) {
    const x = m[0] * px + m[2] * py + m[4];
    const y = m[1] * px + m[3] * py + m[5];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Rough text width: CJK chars ≈ 1em, others ≈ 0.55em (mermaid default 16px) */
function textWidth(el: Element): number {
  let width = 0;
  const collect = (e: Element): void => {
    for (const child of Array.from(e.childNodes)) {
      if (child.nodeType === 3) {
        for (const ch of child.textContent ?? '') {
          width += (ch.codePointAt(0) ?? 0) > 0x2e80 ? 16 : 9;
        }
      } else if (child.nodeType === 1) {
        collect(child as Element);
      }
    }
  };
  collect(el);
  return width;
}

/** Bounds of a path's geometry; control points included (over-estimate is safe) */
function pathBounds(d: string): { x: number; y: number; width: number; height: number } | null {
  const re = /([a-zA-Z])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/gi;
  const toks: Array<string | number> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) toks.push(m[1] ?? parseFloat(m[2]));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (x: number, y: number): void => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  let i = 0;
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let lastCmd = '';
  let lastRel = false;
  const nums = (count: number): number[] | null => {
    const out: number[] = [];
    while (count-- > 0) {
      const t = toks[i++];
      if (typeof t !== 'number') return null;
      out.push(t);
    }
    return out;
  };

  while (i < toks.length) {
    let cmd = toks[i];
    let rel: boolean;
    if (typeof cmd === 'string') {
      rel = cmd === cmd.toLowerCase();
      cmd = cmd.toUpperCase();
      lastCmd = cmd;
      lastRel = rel;
      i++;
    } else {
      // Implicit repeat of the previous command (e.g. value pairs after M)
      cmd = lastCmd;
      rel = lastRel;
    }
    switch (cmd) {
      case 'M': {
        const v = nums(2);
        if (!v) return null;
        x = rel ? x + v[0] : v[0];
        y = rel ? y + v[1] : v[1];
        sx = x;
        sy = y;
        add(x, y);
        lastCmd = 'L'; // subsequent value pairs are implicit lineto
        lastRel = rel;
        break;
      }
      case 'L': {
        const v = nums(2);
        if (!v) return null;
        x = rel ? x + v[0] : v[0];
        y = rel ? y + v[1] : v[1];
        add(x, y);
        break;
      }
      case 'H': {
        const v = nums(1);
        if (!v) return null;
        x = rel ? x + v[0] : v[0];
        add(x, y);
        break;
      }
      case 'V': {
        const v = nums(1);
        if (!v) return null;
        y = rel ? y + v[0] : v[0];
        add(x, y);
        break;
      }
      case 'C': {
        const v = nums(6);
        if (!v) return null;
        // Control points are included; curves stay inside their convex hull
        add(rel ? x + v[0] : v[0], rel ? y + v[1] : v[1]);
        add(rel ? x + v[2] : v[2], rel ? y + v[3] : v[3]);
        x = rel ? x + v[4] : v[4];
        y = rel ? y + v[5] : v[5];
        add(x, y);
        break;
      }
      case 'S':
      case 'Q': {
        const v = nums(4);
        if (!v) return null;
        add(rel ? x + v[0] : v[0], rel ? y + v[1] : v[1]);
        x = rel ? x + v[2] : v[2];
        y = rel ? y + v[3] : v[3];
        add(x, y);
        break;
      }
      case 'T': {
        const v = nums(2);
        if (!v) return null;
        x = rel ? x + v[0] : v[0];
        y = rel ? y + v[1] : v[1];
        add(x, y);
        break;
      }
      case 'A': {
        const v = nums(7);
        if (!v) return null;
        x = rel ? x + v[5] : v[5];
        y = rel ? y + v[6] : v[6];
        add(x, y);
        break;
      }
      case 'Z':
        x = sx;
        y = sy;
        break;
      default:
        return null;
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Bounds of one element's own geometry, in its local coordinate space */
function elementLocalBox(el: Element): { x: number; y: number; width: number; height: number } | null {
  const tag = el.tagName ? el.tagName.toLowerCase() : '';
  const num = (name: string): number => {
    const v = parseFloat(el.getAttribute(name) ?? '');
    return Number.isFinite(v) ? v : 0;
  };
  switch (tag) {
    case 'rect': {
      const w = num('width');
      const h = num('height');
      if (!(w > 0 && h > 0)) return null;
      return { x: num('x'), y: num('y'), width: w, height: h };
    }
    case 'circle': {
      const r = num('r');
      if (!(r > 0)) return null;
      return { x: num('cx') - r, y: num('cy') - r, width: 2 * r, height: 2 * r };
    }
    case 'ellipse': {
      const rx = num('rx');
      const ry = num('ry');
      if (!(rx > 0 && ry > 0)) return null;
      return { x: num('cx') - rx, y: num('cy') - ry, width: 2 * rx, height: 2 * ry };
    }
    case 'line': {
      const x1 = num('x1');
      const y1 = num('y1');
      const x2 = num('x2');
      const y2 = num('y2');
      return { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
    }
    case 'polygon':
    case 'polyline': {
      const pts = (el.getAttribute('points') ?? '').split(/[\s,]+/).filter(Boolean).map(Number);
      if (pts.length < 4 || pts.some((n) => !Number.isFinite(n))) return null;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let k = 0; k + 1 < pts.length; k += 2) {
        const px = pts[k];
        const py = pts[k + 1];
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      }
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    case 'path':
      return pathBounds(el.getAttribute('d') ?? '');
    case 'text':
    case 'tspan': {
      const w = textWidth(el);
      // Mermaid centers node labels (text-anchor: middle); degenerate (empty)
      // labels are dropped so they do not pollute the bounds
      if (w <= 4) return null;
      return { x: num('x') - w / 2, y: num('y') - 14, width: w, height: 24 };
    }
    default:
      return null;
  }
}

/** Union of all descendant geometry, expressed in the root element's space */
function contentBBox(root: Element): { x: number; y: number; width: number; height: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const accumulate = (b: { x: number; y: number; width: number; height: number }): void => {
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  };
  const walk = (el: Element, m: Matrix): void => {
    for (const child of Array.from(el.children)) {
      const tag = child.tagName ? child.tagName.toLowerCase() : '';
      if (SKIP_TAGS.has(tag)) continue;
      const cm = mul(m, parseTransform(child.getAttribute('transform')));
      const local = elementLocalBox(child);
      if (local) {
        const b = expandedBox(cm, local);
        // Skip zero-area geometry (empty labels, straight lines) that would
        // only stretch the bounds by a point
        if (b.width > 0.5 || b.height > 0.5) accumulate(b);
      }
      walk(child, cm);
    }
  };
  walk(root, IDENTITY);
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export class MermaidDiagramRenderer implements DiagramRenderer {
  readonly type = 'mermaid';
  private renderCounter = 0;

  async initialize(): Promise<void> {
    if (initialized) return;

    // Set up jsdom globals for mermaid
    const { JSDOM } = await import('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      pretendToBeVisual: true,
    });

    // Mermaid requires browser globals
    const assignGlobal = (key: string, value: unknown) => {
      try {
        Object.defineProperty(globalThis, key, {
          value,
          configurable: true,
          writable: true,
        });
      } catch {
        (globalThis as Record<string, unknown>)[key] = value;
      }
    };

    assignGlobal('window', dom.window);
    assignGlobal('document', dom.window.document);
    assignGlobal('navigator', dom.window.navigator);
    assignGlobal('DOMParser', dom.window.DOMParser);
    assignGlobal('XMLSerializer', dom.window.XMLSerializer);
    assignGlobal('HTMLElement', dom.window.HTMLElement);
    assignGlobal('SVGElement', dom.window.SVGElement);
    assignGlobal('Element', dom.window.Element);
    assignGlobal('Node', dom.window.Node);
    assignGlobal('Text', dom.window.Text);
    assignGlobal('getComputedStyle', dom.window.getComputedStyle);
    assignGlobal('CustomEvent', dom.window.CustomEvent);
    assignGlobal('Event', dom.window.Event);
    assignGlobal('EventTarget', dom.window.EventTarget);
    assignGlobal('HTMLCollection', dom.window.HTMLCollection);
    assignGlobal('NodeList', dom.window.NodeList);
    assignGlobal('MutationObserver', dom.window.MutationObserver);

    // CSSStyleSheet polyfill / bind
    if (dom.window.CSSStyleSheet) {
      assignGlobal('CSSStyleSheet', dom.window.CSSStyleSheet);
    } else {
      class MockCSSStyleSheet {
        cssRules = [];
        insertRule() { return 0; }
        deleteRule() {}
        replaceSync() {}
        replace() { return Promise.resolve(this); }
      }
      assignGlobal('CSSStyleSheet', MockCSSStyleSheet);
    }

    // Extract text from direct text nodes or text elements, ignoring <style> and <script>
    const getDirectText = (el: Element): string => {
      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      if (tag === 'style' || tag === 'script' || tag === 'defs' || tag === 'marker') return '';
      let text = '';
      for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === 3) {
          text += child.textContent || '';
        } else if (child.nodeType === 1) {
          const ctag = (child as Element).tagName.toLowerCase();
          if (ctag === 'tspan' || ctag === 'text' || ctag === 'span' || ctag === 'div' || ctag === 'p') {
            text += getDirectText(child as Element);
          }
        }
      }
      return text;
    };

    const toRect = (b: { x: number; y: number; width: number; height: number }) => ({
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      top: b.y,
      right: b.x + b.width,
      bottom: b.y + b.height,
      left: b.x,
      toJSON: () => ({}),
    });

    // Polyfill SVG layout methods that JSDOM lacks
    const polyfillBBox = function (this: Element) {
      const tag = this.tagName ? this.tagName.toLowerCase() : '';
      if (tag === 'style' || tag === 'script' || tag === 'defs' || tag === 'clippath' || tag === 'marker') {
        return toRect({ x: 0, y: 0, width: 0, height: 0 });
      }
      // Mermaid sizes the output SVG from getBBox() on the root <svg>. Measure
      // the real geometry instead of a constant, so the viewBox matches content.
      if (tag === 'svg') {
        const box = contentBBox(this);
        if (box) return toRect(box);
      }
      const text = getDirectText(this);
      const width = text ? Math.max(30, text.length * 9 + 20) : 80;
      const height = text ? 28 : 40;
      return toRect({ x: 0, y: 0, width, height });
    };

    if (!(dom.window.SVGElement.prototype as unknown as Record<string, unknown>).getBBox) {
      (dom.window.SVGElement.prototype as unknown as Record<string, unknown>).getBBox = polyfillBBox;
    }
    if (!(dom.window.Element.prototype as unknown as Record<string, unknown>).getBBox) {
      (dom.window.Element.prototype as unknown as Record<string, unknown>).getBBox = polyfillBBox;
    }
    if (!dom.window.Element.prototype.getBoundingClientRect) {
      dom.window.Element.prototype.getBoundingClientRect = polyfillBBox as unknown as () => DOMRect;
    }
    const computeTextLength = function (this: Element) {
      const text = getDirectText(this);
      return text.length * 9;
    };
    (dom.window.Element.prototype as unknown as Record<string, unknown>).getComputedTextLength = computeTextLength;
    (dom.window.SVGElement.prototype as unknown as Record<string, unknown>).getComputedTextLength = computeTextLength;
    (dom.window.HTMLElement.prototype as unknown as Record<string, unknown>).getComputedTextLength = computeTextLength;

    if (dom.window.HTMLCanvasElement) {
      dom.window.HTMLCanvasElement.prototype.getContext = (() => ({
        measureText: (text: string) => ({ width: text.length * 8 }),
        fillRect: () => {},
        clearRect: () => {},
        getImageData: () => ({ data: new Array(4) }),
        putImageData: () => {},
        createImageData: () => [],
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        fillText: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        fill: () => {},
      })) as unknown as typeof dom.window.HTMLCanvasElement.prototype.getContext;
    }

    if (dom.window.SVGSVGElement) {
      if (!dom.window.SVGSVGElement.prototype.createSVGMatrix) {
        dom.window.SVGSVGElement.prototype.createSVGMatrix = () => ({
          a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
          multiply: function () { return this; },
          inverse: function () { return this; },
          translate: function () { return this; },
          scale: function () { return this; },
          rotate: function () { return this; },
        } as unknown as DOMMatrix);
      }
      if (!dom.window.SVGSVGElement.prototype.createSVGPoint) {
        dom.window.SVGSVGElement.prototype.createSVGPoint = () => ({
          x: 0, y: 0,
          matrixTransform: function () { return this; },
        } as unknown as DOMPoint);
      }
    }

    // Mock matchMedia if missing
    if (!dom.window.matchMedia) {
      dom.window.matchMedia = () => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList;
    }

    // Import and initialize mermaid
    const mermaid = (await import('mermaid')).default;
    mermaid.initialize(this.buildConfig() as unknown as Parameters<typeof mermaid.initialize>[0]);

    initialized = true;
  }

  private buildConfig(theme?: Theme) {
    return {
      startOnLoad: false,
      securityLevel: 'loose',
      // Top-level htmlLabels is required: flowchart-v2 reads it (the
      // flowchart.htmlLabels key is ignored) and html labels rely on real DOM
      // layout (scrollWidth) that jsdom does not provide — with them on, nodes
      // collapse to 60x30 stubs and resvg drops the HTML content entirely.
      htmlLabels: false,
      theme: isDarkTheme(theme) ? 'dark' : 'default',
      themeVariables: {
        fontFamily: diagramFontFamily(theme),
        background: 'transparent',
      },
      flowchart: { htmlLabels: false, curve: 'basis', useMaxWidth: false },
      sequence: { useMaxWidth: false },
    };
  }

  async render(code: string, theme?: Theme): Promise<Buffer> {
    await this.initialize();

    const mermaid = (await import('mermaid')).default;
    const id = `mfly-mermaid-${Date.now()}-${this.renderCounter++}`;

    // Re-apply per render so diagram follows the selected presentation theme
    mermaid.initialize(this.buildConfig(theme) as unknown as Parameters<typeof mermaid.initialize>[0]);

    try {
      const { svg } = await mermaid.render(id, code.trim());
      return svgToPng(svg, 1200);
    } catch (err) {
      throw new Error(
        `Mermaid render failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
