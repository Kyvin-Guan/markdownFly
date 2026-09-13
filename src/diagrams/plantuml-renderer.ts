/**
 * PlantUML Diagram Renderer
 *
 * Uses the official TeaVM-compiled PlantUML engine, which runs as plain JS —
 * no JVM jar and no Graphviz binary, so the package keeps its promise of zero
 * native binary dependencies.
 *
 * The dependency is on `@plantuml/mcp-js`, whose `engine.js` is the *headless*
 * build (renderSvg → SVG string). `@plantuml/core` is the same engine but only
 * exposes DOM-facing entry points (`render(lines, targetId)`), which would mean
 * driving it through jsdom. Graphviz layout is supplied by `@viz-js/viz` — the
 * WASM build the DOT renderer already depends on.
 */

import type { DiagramRenderer } from './renderer.js';
import type { Theme } from '../models/theme.js';
import { svgToPng } from './svg-to-png.js';
import { isDarkTheme } from './theme.js';
import { log } from '../utils/progress.js';

type Engine = typeof import('@plantuml/mcp-js/engine.js');

/** Rasterized width; matches the other diagram renderers. */
const RENDER_WIDTH = 1200;

/**
 * A render that never settles would hang the whole CLI, and the engine can do
 * exactly that: a `!theme` line makes it look for themes.js, which the headless
 * build does not ship (see `stripUnsupported`). Every render is bounded.
 */
const RENDER_TIMEOUT_MS = 30_000;

/** Payload delivered by renderSvg as a JSON string. */
interface EngineResult {
  valid?: boolean;
  diagramType?: string;
  errorLineNumber?: number;
  errorMessage?: string;
  svg?: string;
}

/** Prepared source plus the bookkeeping needed to read error lines back. */
interface PreparedSource {
  source: string;
  warnings: string[];
  /** How many lines the injected prelude (and envelope) add. */
  lineShift: number;
  /** Last 1-based source line that is not shifted; later lines shift by lineShift. */
  shiftAfter: number;
}

/** Map an engine-reported line back to the line the author actually wrote. */
function originalLine(
  reported: number | undefined,
  prepared: PreparedSource,
): number | undefined {
  if (reported === undefined) return undefined;
  return reported > prepared.shiftAfter ? reported - prepared.lineShift : reported;
}

/**
 * The engine maps Java's System.out to console.log and narrates its internals
 * there — dozens of `[TimLoader]`/`[PSystemBuilder2]` lines per diagram. That is
 * engine bookkeeping rather than something an author can act on (real problems
 * come back through the render result, which is reported with a line number), so
 * it is muted: stdout stays reserved for the summary line and the `--json`
 * payload, and stderr stays readable. MFLY_DEBUG=1 forwards it to stderr.
 *
 * The writers are restored afterwards — replacing them for good would push
 * `log.info` and the "Done in Xs" summary off stdout.
 */
async function withEngineLogsMuted<T>(fn: () => Promise<T>): Promise<T> {
  const originals = { log: console.log, info: console.info, debug: console.debug };
  const sink: (...args: unknown[]) => void = process.env.MFLY_DEBUG
    ? (...args) => console.error(...args)
    : () => {};
  console.log = sink;
  console.info = sink;
  console.debug = sink;
  try {
    return await fn();
  } finally {
    console.log = originals.log;
    console.info = originals.info;
    console.debug = originals.debug;
  }
}

/** Quote a font family for a skinparam value. */
function fontValue(theme: Theme): string {
  return `"${theme.fonts.cjk.replace(/"/g, '')}"`;
}

/**
 * Styling the engine omits from bare `<line>` elements, taken from what the
 * reference PlantUML server emits for the same diagrams.
 */
const LINE_STROKE = 'stroke:#181818;stroke-width:0.5;';

/** Sequence lifelines are dashed on top of the base stroke. */
const LIFELINE_STROKE = `${LINE_STROKE}stroke-dasharray:5,5;`;

/**
 * Give bare `<line>` elements their stroke back.
 *
 * The TeaVM-compiled engine emits line geometry but drops the styling:
 * `<line x1="22" y1="79" x2="22" y2="205"/>` with no `stroke` or `style`, no
 * class, no `<style>` block and no styled ancestor. Per SVG that means
 * `stroke: none`, so every renderer draws nothing. Two visible casualties:
 * sequence lifelines, which left the participants floating with nothing between
 * them, and the compartment dividers of a class diagram.
 *
 * The geometry is intact, so the styling is restored from the reference
 * server's output — a 0.5pt solid stroke, dashed for sequence lifelines.
 */
function restoreLineStrokes(svg: string, diagramType: string | undefined): string {
  const dashed = /sequence/i.test(diagramType ?? '');
  return svg.replace(/<line\b([^>]*?)\/>/g, (match, attributes: string) =>
    /\b(stroke|style)=/.test(attributes)
      ? match
      : `<line${attributes} style="${dashed ? LIFELINE_STROKE : LINE_STROKE}"/>`,
  );
}

export class PlantUmlDiagramRenderer implements DiagramRenderer {
  readonly type = 'plantuml';
  private engine: Engine | null = null;

  async initialize(): Promise<void> {
    if (this.engine) return;

    // Loaded lazily: a deck without PlantUML blocks never touches the engine.
    this.engine = await withEngineLogsMuted(async () => {
      // The engine reaches Graphviz through a global `Viz` shaped like Viz.js in
      // a browser; @viz-js/viz is that shape in Node. Left untouched if a host
      // already provided one.
      const globalWithViz = globalThis as { Viz?: unknown };
      if (!globalWithViz.Viz) {
        const vizModule = await import('@viz-js/viz');
        let instancePromise: ReturnType<typeof vizModule.instance> | null = null;
        globalWithViz.Viz = {
          instance: () => (instancePromise ??= vizModule.instance()),
        };
      }
      return import('@plantuml/mcp-js/engine.js');
    });
  }

  /**
   * PlantUML has no dark-mode switch in this build, so the palette is injected
   * as skinparams — the same shape as the DOT renderer's attribute prelude.
   * Anything the author writes after the prelude still wins.
   *
   * `backgroundColor transparent` is stated explicitly rather than left to the
   * default: PlantUML otherwise writes `background:#FFFFFF` into the SVG style,
   * which only stays invisible because the rasterizer happens to ignore it.
   */
  private skinparams(theme?: Theme): string {
    const lines = ['skinparam backgroundColor transparent'];

    if (theme) {
      lines.push(`skinparam defaultFontName ${fontValue(theme)}`);
    }

    if (!isDarkTheme(theme)) {
      lines.push('skinparam defaultFontColor #1F2328');
      return lines.join('\n');
    }

    lines.push(
      'skinparam defaultFontColor #C9D1D9',
      'skinparam shadowing false',
      // Boxes are light by default, so the fills have to move with the text or
      // labels end up dark-on-dark.
      'skinparam classBackgroundColor #1F2937',
      'skinparam classBorderColor #6B7280',
      'skinparam classFontColor #E5E7EB',
      'skinparam classAttributeFontColor #CBD5E1',
      'skinparam participantBackgroundColor #1F2937',
      'skinparam participantBorderColor #6B7280',
      'skinparam actorBackgroundColor #1F2937',
      'skinparam actorBorderColor #6B7280',
      'skinparam sequenceArrowColor #9CA3AF',
      'skinparam sequenceLifeLineBorderColor #6B7280',
      'skinparam noteBackgroundColor #374151',
      'skinparam noteBorderColor #6B7280',
      'skinparam activityBackgroundColor #1F2937',
      'skinparam activityBorderColor #6B7280',
      'skinparam activityDiamondBackgroundColor #1F2937',
      'skinparam activityDiamondBorderColor #6B7280',
      'skinparam stateBackgroundColor #1F2937',
      'skinparam stateBorderColor #6B7280',
      'skinparam componentBackgroundColor #1F2937',
      'skinparam componentBorderColor #6B7280',
      'skinparam componentFontColor #E5E7EB',
    );
    return lines.join('\n');
  }

  /**
   * Drop `!theme` directives and inject the theme prelude.
   *
   * `!theme` needs themes.js, which the headless build does not ship — the
   * directive is ignored with a warning anyway. Dropping it up front also avoids
   * the theme loader entirely, which is what can leave renderSvg without ever
   * calling back (a second *distinct* theme in one process is enough).
   */
  private prepare(code: string, theme?: Theme): PreparedSource {
    const warnings: string[] = [];
    const kept: string[] = [];

    for (const line of code.trim().split('\n')) {
      if (/^\s*!theme\b/i.test(line)) {
        warnings.push(
          `"${line.trim()}" ignored — the bundled PlantUML engine ships no themes; use skinparam instead`,
        );
        continue;
      }
      kept.push(line);
    }

    const prelude = this.skinparams(theme);
    const preludeLines = prelude.split('\n').length;
    const startIndex = kept.findIndex((line) => /^\s*@start\w+/i.test(line));

    // Without an @start…/@end… envelope PlantUML cannot tell what to draw, so
    // authoring a bare diagram (as the other renderers accept) is supported.
    if (startIndex === -1) {
      return {
        source: `@startuml\n${prelude}\n${kept.join('\n')}\n@enduml`,
        warnings,
        lineShift: preludeLines + 1,
        shiftAfter: 1,
      };
    }

    kept.splice(startIndex + 1, 0, prelude);

    // A start tag with no matching @end… is closed here rather than left to fail:
    // bare source is already accepted, so a half-written envelope should not be
    // the one shape that errors out.
    if (!kept.some((line) => /^\s*@end\w+/i.test(line))) {
      const kind = kept[startIndex].match(/^\s*@start(\w+)/i)?.[1] ?? 'uml';
      kept.push(`@end${kind}`);
    }

    return {
      source: kept.join('\n'),
      warnings,
      lineShift: preludeLines,
      shiftAfter: startIndex + 1,
    };
  }

  async render(code: string, theme?: Theme): Promise<Buffer> {
    await this.initialize();
    const prepared = this.prepare(code, theme);
    for (const warning of prepared.warnings) log.warn(`[PlantUML] ${warning}`);

    try {
      const result = await this.renderToSvg(prepared.source);
      if (!result.valid || !result.svg) {
        // The engine counts lines in the source it was handed, which includes
        // the injected prelude — report the author's line numbers instead.
        const line = originalLine(result.errorLineNumber, prepared);
        const at = line ? ` (line ${line})` : '';
        throw new Error(`${result.errorMessage ?? 'invalid diagram'}${at}`);
      }
      return svgToPng(restoreLineStrokes(result.svg, result.diagramType), RENDER_WIDTH);
    } catch (err) {
      throw new Error(
        `PlantUML render failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async renderToSvg(source: string): Promise<EngineResult> {
    const engine = this.engine!;

    const json = await withEngineLogsMuted(
      () =>
        new Promise<string>((resolve, reject) => {
          let settled = false;
          const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            reject(new Error(`timed out after ${RENDER_TIMEOUT_MS / 1000}s`));
          }, RENDER_TIMEOUT_MS);

          engine.renderSvg(source, (result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(result);
          });
        }),
    );

    try {
      return JSON.parse(json) as EngineResult;
    } catch {
      throw new Error('engine returned malformed JSON');
    }
  }
}
