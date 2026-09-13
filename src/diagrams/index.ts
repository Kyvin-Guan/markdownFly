/**
 * Diagram Registry
 * Unified entry point for all diagram renderers
 */

import type { DiagramRenderer } from './renderer.js';
import type { Theme } from '../models/theme.js';
import { MermaidDiagramRenderer } from './mermaid-renderer.js';
import { GraphvizDiagramRenderer } from './graphviz-renderer.js';
import { EChartsDiagramRenderer } from './echarts-renderer.js';
import { PlantUmlDiagramRenderer } from './plantuml-renderer.js';
import { normalizeDiagramLanguage } from './languages.js';

export { isDiagramLanguage } from './languages.js';

/**
 * Canonical language → renderer factory. Factories (not instances) so that
 * merely knowing a language never constructs a renderer or loads its engine.
 */
const RENDERERS: Record<string, () => DiagramRenderer> = {
  mermaid: () => new MermaidDiagramRenderer(),
  dot: () => new GraphvizDiagramRenderer(),
  echarts: () => new EChartsDiagramRenderer(),
  plantuml: () => new PlantUmlDiagramRenderer(),
};

/** Cached renderer instances (lazy init), keyed by canonical language */
const instances = new Map<string, DiagramRenderer>();

function getOrCreate(language: string): DiagramRenderer | undefined {
  // Resolve aliases first so the cache key and the factory lookup agree.
  const canonical = normalizeDiagramLanguage(language);
  if (!canonical) return undefined;

  const cached = instances.get(canonical);
  if (cached) return cached;

  const renderer = RENDERERS[canonical]();
  instances.set(canonical, renderer);
  return renderer;
}

/** Get a diagram renderer by language */
export function getDiagramRenderer(language: string): DiagramRenderer | undefined {
  return getOrCreate(language);
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
  const renderer = getOrCreate(language);
  if (!renderer) {
    throw new Error(`No diagram renderer for language: ${language}`);
  }

  await renderer.initialize();
  return renderer.render(code, theme);
}
