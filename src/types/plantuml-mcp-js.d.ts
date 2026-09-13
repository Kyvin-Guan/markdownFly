/**
 * Minimal ambient types for the headless PlantUML engine.
 *
 * `@plantuml/mcp-js` publishes no declarations, and its `engine.js` is the
 * official TeaVM-compiled PlantUML build (see the renderer for why that entry
 * point is used instead of `@plantuml/core`).
 */
declare module '@plantuml/mcp-js/engine.js' {
  /** PlantUML version embedded in the engine, e.g. "PlantUML version 1.2026.8". */
  export function version(): string;

  /**
   * Render PlantUML source to SVG. The callback receives a JSON string:
   * `{ valid, diagramType, lineCount, warnings, svg }` on success, or
   * `{ valid: false, errorLineNumber, errorMessage, ... }` on a syntax error.
   */
  export function renderSvg(source: string, onDone: (result: string) => void): void;

  /** Validate a diagram without rendering it. Same JSON shape as renderSvg. */
  export function checkSyntax(source: string, onDone: (result: string) => void): void;

  /** Explain how a diagram is parsed, line by line. */
  export function explain(source: string, onDone: (result: string) => void): void;
}
