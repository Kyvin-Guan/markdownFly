/**
 * Preprocess the raw markdown before remark parsing.
 *
 * Converts inline layout markers that are NOT valid CommonMark into HTML
 * comment nodes, which remark keeps intact and our splitter can recognize:
 *
 *   ===   (standalone line)  → <!-- mfly:row -->   vertical block separator
 *   <->   (standalone line)  → <!-- mfly:col -->   horizontal column separator
 *   @(...) (standalone line) → <!-- mfly:dir:... --> slide-level directive
 *
 * Standalone lines starting with `%%` are removed entirely (like moffee's
 * comment syntax) — handy for drafting notes that never reach the deck.
 *
 * Why comments: `===` collides with setext heading underlines, and `<->`
 * would otherwise be a plain paragraph. Encoding them as comments makes the
 * AST explicit and keeps the rest of the markdown untouched.
 *
 * Lines inside fenced code blocks are never rewritten. The fence tracker must
 * agree with remark/CommonMark exactly: a closing fence is a run of the same
 * character as the opening fence, at least as long, followed by nothing but
 * whitespace — a line like ```mermaid carries an info string and can never
 * close a fence. If the two trackers disagree, directives get rewritten while
 * remark still sees them inside a code fence and renders them as literal
 * code, so closeness here is what keeps internal markers out of the deck.
 *
 * Anything mfly-flavored found inside a fence is reported as a syntax
 * warning: it nearly always means a fence above failed to close where the
 * author thought it did, and an agent generating the deck can fix the source.
 */

import { isDiagramLanguage } from '../diagrams/languages.js';
import { beginSource, reportSyntaxWarning } from '../utils/diagnostics.js';

const ROW_RE = /^={3,}$/;
const COL_RE = /^<->$/;
const DIR_RE = /^@\(.+\)$/;

interface FenceState {
  inFence: boolean;
  char: string;
  length: number;
  /** First word of the opening line's info string ('' when none). */
  lang: string;
}

/** CommonMark closing fence: same char, at least the opening length, no info string. */
function closingFence(trimmed: string, fence: FenceState): boolean {
  if (!fence.inFence) return false;
  const run = trimmed.match(/^(`+|~+)/);
  if (!run) return false;
  return run[1][0] === fence.char && run[1].length >= fence.length && trimmed === run[1];
}

const UNCLOSED_FENCE_HINT =
  'a closing fence cannot carry an info string (```mermaid never closes a fence); ' +
  'to show fenced markdown inside a fence, open the outer one with more backticks (````)';

/**
 * Fences whose job is to show markdown itself — mfly markers in them are
 * documented examples, not accidents. Deliberately narrow: a bare or
 * `text`-typed fence that contains `<->` or `@(...)` is far more often an
 * unclosed fence swallowing real directives, so it still warns.
 */
const DOC_FENCE_LANGS = new Set(['markdown', 'md']);

export function preprocessMarkdown(markdown: string, sourceName = 'input'): string {
  beginSource(sourceName);
  const lines = markdown.split('\n');
  const out: string[] = [];

  const fence: FenceState = { inFence: false, char: '', length: 0, lang: '' };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);

    if (!fence.inFence) {
      if (fenceMatch) {
        fence.inFence = true;
        fence.char = fenceMatch[1][0];
        fence.length = fenceMatch[1].length;
        fence.lang = trimmed.slice(fenceMatch[1].length).trim().split(/\s+/)[0] ?? '';
        out.push(line);
        continue;
      }
      if (/^%%/.test(trimmed)) {
        // Drop %% comment lines entirely
        out.push('');
        continue;
      }
      if (COL_RE.test(trimmed)) {
        out.push('<!-- mfly:col -->');
        continue;
      }
      if (ROW_RE.test(trimmed)) {
        out.push('<!-- mfly:row -->');
        continue;
      }
      if (DIR_RE.test(trimmed)) {
        // Encode so anything inside (parens, "--", etc.) is comment-safe
        out.push(`<!-- mfly:dir:${encodeURIComponent(trimmed)} -->`);
        continue;
      }
      out.push(line);
      continue;
    }

    // Inside a fenced block: only watch for the closing fence
    out.push(line);
    if (closingFence(trimmed, fence)) {
      fence.inFence = false;
      continue;
    }
    // Diagram notations legitimately contain --- / -- lines (edges, dividers),
    // and a ```markdown fence exists precisely to document syntax like <-> or
    // @(...) — neither is a fence-gone-wrong signal. Everywhere else those are
    // worth reporting: they almost always mean a fence above failed to close.
    if (isDiagramLanguage(fence.lang) || DOC_FENCE_LANGS.has(fence.lang)) continue;
    if (/^-{3,}$/.test(trimmed)) {
      reportSyntaxWarning({
        line: i + 1,
        message: `"---" slide separator sits inside a code fence and will not split slides`,
        hint: `the fence opened above is probably still open — ${UNCLOSED_FENCE_HINT}`,
      });
    }
    if (ROW_RE.test(trimmed) || COL_RE.test(trimmed) || DIR_RE.test(trimmed)) {
      reportSyntaxWarning({
        line: i + 1,
        message: `mfly syntax "${trimmed}" sits inside a code fence and renders as literal code`,
        hint: `if it should act as a directive, the fence above is probably unclosed — ${UNCLOSED_FENCE_HINT}; ` +
          `if the block intentionally documents the syntax, ignore this`,
      });
    }
  }

  if (fence.inFence) {
    reportSyntaxWarning({
      message: `unclosed code fence at end of file (opened with ${fence.char.repeat(fence.length)}) — ` +
        'everything after it renders as one code block',
      hint: `close the fence with ${fence.char.repeat(fence.length)} on its own line`,
    });
  }

  return out.join('\n');
}
