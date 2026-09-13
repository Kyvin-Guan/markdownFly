/**
 * Diagram language registry — the single source of truth.
 *
 * Both the parser (a fenced block becomes a DiagramElement) and the renderer
 * registry dispatch on these names. They used to keep one hardcoded list each,
 * which meant a new language had to be added in two places or the block would
 * silently ship as a code block.
 */

/** Canonical language → the renderer key it resolves to. */
const ALIASES: Record<string, string> = {
  graphviz: 'dot',
  puml: 'plantuml',
};

/** Languages that have a renderer, keyed by canonical name. */
const CANONICAL = new Set(['mermaid', 'dot', 'echarts', 'plantuml']);

/**
 * Resolve any accepted spelling to its canonical language, or undefined when
 * the language is not a diagram. A Set is used rather than `in`/property
 * access so prototype keys ('constructor', 'toString') are not false positives.
 */
export function normalizeDiagramLanguage(language: string): string | undefined {
  const lang = language.toLowerCase();
  const canonical = ALIASES[lang] ?? lang;
  return CANONICAL.has(canonical) ? canonical : undefined;
}

/** Check if a code block language is a diagram type. */
export function isDiagramLanguage(language: string): boolean {
  return normalizeDiagramLanguage(language) !== undefined;
}
