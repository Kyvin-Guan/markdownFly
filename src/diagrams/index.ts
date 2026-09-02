/**
 * Diagram Registry
 * Unified entry point for all diagram renderers
 */

import type { DiagramRenderer } from './renderer.js';
import type { Theme } from '../models/theme.js';
import { MermaidDiagramRenderer } from './mermaid-renderer.js';
import { GraphvizDiagramRenderer } from './graphviz-renderer.js';
import { EChartsDiagramRenderer } from './echarts-renderer.js';

/** Language identifiers that are diagrams */
const DIAGRAM_LANGUAGES: Record<string, () => DiagramRenderer> = {
  mermaid: () => new MermaidDiagramRenderer(),
  dot: () => new GraphvizDiagramRenderer(),
  graphviz: () => new GraphvizDiagramRenderer(),
  echarts: () => new EChartsDiagramRenderer(),
};

/** Cached renderer instances (lazy init) */
const instances = new Map<string, DiagramRenderer>();

function getOrCreate(language: string): DiagramRenderer | undefined {
  // Normalize 'graphviz' → 'dot' for caching
  const key = language === 'graphviz' ? 'dot' : language;

  if (instances.has(key)) return instances.get(key)!;

  const factory = DIAGRAM_LANGUAGES[language];
  if (!factory) return undefined;

  const renderer = factory();
  instances.set(key, renderer);
  return renderer;
}

/** Check if a code block language is a diagram type */
export function isDiagramLanguage(language: string): boolean {
  return language.toLowerCase() in DIAGRAM_LANGUAGES;
}

/** Get a diagram renderer by language */
export function getDiagramRenderer(language: string): DiagramRenderer | undefined {
  return getOrCreate(language.toLowerCase());
}

/**
 * Render a diagram code block to PNG
 * @returns PNG image as Buffer
 */
export async function renderDiagram(
  language: string,
  code: string,
  theme?: Theme,
): Promise<Buffer> {
  const renderer = getOrCreate(language.toLowerCase());
  if (!renderer) {
    throw new Error(`No diagram renderer for language: ${language}`);
  }

  await renderer.initialize();
  return renderer.render(code, theme);
}
