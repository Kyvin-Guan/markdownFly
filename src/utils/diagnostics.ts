/**
 * Syntax diagnostics: warnings about the *source markdown* that surface while
 * parsing. Every warning is printed immediately (stderr, so JSON/stdout stays
 * clean) and buffered so the CLI can summarize at the end and include it in
 * `--json` output — an agent driving the CLI can read the list, fix the exact
 * lines in the source, and re-run.
 */

import { log } from './progress.js';

export interface SyntaxDiagnostic {
  /** Source file the warning belongs to (set via beginSource). */
  file: string;
  /** 1-based line in the source markdown, when known. */
  line?: number;
  /** What was wrong, including the offending text when short. */
  message: string;
  /** How to fix it in the markdown — the part an agent acts on. */
  hint?: string;
}

const buffer: SyntaxDiagnostic[] = [];

let currentSource = 'input';

/** Set the file name/path attached to warnings reported from here on. */
export function beginSource(name: string): void {
  currentSource = name;
}

export function reportSyntaxWarning(d: Omit<SyntaxDiagnostic, 'file'>): void {
  const diag: SyntaxDiagnostic = { file: currentSource, ...d };
  buffer.push(diag);
  const loc = diag.line != null ? `:${diag.line}` : '';
  log.warn(`${diag.file}${loc} — ${diag.message}`);
  if (diag.hint) log.warn(`  ↳ fix: ${diag.hint}`);
}

/** Take everything reported so far and empty the buffer. */
export function takeSyntaxWarnings(): SyntaxDiagnostic[] {
  return buffer.splice(0);
}
