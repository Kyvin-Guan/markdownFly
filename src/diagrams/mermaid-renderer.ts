/**
 * Mermaid Diagram Renderer
 * Uses mermaid + jsdom to render diagrams to SVG in Node.js
 */

import type { DiagramRenderer } from './renderer.js';
import type { Theme } from '../models/theme.js';
import { svgToPng } from './svg-to-png.js';

let initialized = false;

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

    // Polyfill SVG layout methods that JSDOM lacks
    const polyfillBBox = function (this: Element) {
      const tag = this.tagName ? this.tagName.toLowerCase() : '';
      if (tag === 'style' || tag === 'script' || tag === 'defs' || tag === 'clippath' || tag === 'marker') {
        return { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, toJSON: () => {} };
      }
      const text = getDirectText(this);
      const width = text ? Math.max(30, text.length * 9 + 20) : 80;
      const height = text ? 28 : 40;
      return {
        x: 0,
        y: 0,
        width,
        height,
        top: 0,
        right: width,
        bottom: height,
        left: 0,
        toJSON: () => {},
      };
    };

    if (!dom.window.SVGElement.prototype.getBBox) {
      dom.window.SVGElement.prototype.getBBox = polyfillBBox as unknown as () => DOMRect;
    }
    if (!dom.window.Element.prototype.getBBox) {
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
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: 'default',
      htmlLabels: false,
      flowchart: { htmlLabels: false, curve: 'basis', useMaxWidth: false },
      sequence: { useMaxWidth: false },
    });

    initialized = true;
  }

  async render(code: string, _theme?: Theme): Promise<Buffer> {
    await this.initialize();

    const mermaid = (await import('mermaid')).default;
    const id = `mfly-mermaid-${Date.now()}-${this.renderCounter++}`;

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
