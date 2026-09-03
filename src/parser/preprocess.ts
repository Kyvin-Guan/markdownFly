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
 * Lines inside fenced code blocks are never rewritten.
 */

const ROW_RE = /^={3,}$/;
const COL_RE = /^<->$/;
const DIR_RE = /^@\(.+\)$/;
const COMMENT_RE = /^%%/;

export function preprocessMarkdown(markdown: string): string {
  const lines = markdown.split('\n');
  const out: string[] = [];

  let inFence = false;
  let fenceChar = '';

  for (const line of lines) {
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);

    if (!inFence) {
      if (fenceMatch) {
        inFence = true;
        fenceChar = fenceMatch[1][0];
        out.push(line);
        continue;
      }
      if (COMMENT_RE.test(trimmed)) {
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
    if (fenceMatch && trimmed.startsWith(fenceChar)) {
      inFence = false;
    }
  }

  return out.join('\n');
}
