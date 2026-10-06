/**
 * Shared text/code measurement for the layout estimators and renderers.
 *
 * Everything here is estimation — PowerPoint does the real layout — so the
 * numbers deliberately err slightly tall: an element box a line too tall
 * leaves breathing room, one a line too short overlaps its neighbor.
 */

/** Display width of a string in Latin-equivalent units (CJK takes two). */
export function displayWidth(text: string): number {
  let units = 0;
  for (const char of text) {
    units += (char.codePointAt(0) ?? 0) > 0x2e80 ? 2 : 1;
  }
  return units;
}

/**
 * Characters that fit on one line of `fontSizePt` text in a column `widthIn`
 * inches wide. Average advance is about half an em for Latin, so a 12in column
 * of 18pt text holds roughly 97 units — the previous estimate assumed 60 per
 * inch, ~7x too many, which made every paragraph look like a single line and
 * let the next element overlap it.
 */
export function charsPerLine(widthIn: number, fontSizePt: number): number {
  return Math.max(8, Math.floor((widthIn * 72) / (fontSizePt * 0.5)));
}

/** Estimate wrapped text lines for a string in a column of width w (inches). */
export function estimateTextLines(content: string, w: number, fontSizePt: number): number {
  return Math.max(1, Math.ceil(displayWidth(content) / charsPerLine(w, fontSizePt)));
}

/** Like estimateTextLines, but hard line breaks each start their own segment. */
export function estimateBlockLines(content: string, w: number, fontSizePt: number): number {
  return content.split('\n').reduce((n, seg) => n + estimateTextLines(seg, w, fontSizePt), 0);
}

/** Text-box insets on a code block (margin: [8, 12, 8, 12], in points). */
export const CODE_INSET_IN = 16 / 72;

/**
 * PowerPoint lays a line out at roughly 1.2-1.25x its font size; rounding up
 * keeps the box slightly taller than the text rather than clipping it. The
 * extra margin also absorbs the per-paragraph spacing a dedicated code page
 * adds under each line (every rendered line is its own paragraph).
 */
export const CODE_LINE_FACTOR = 1.35;

/**
 * Advance width of the code font as a fraction of its size. Consolas and most
 * monospace faces sit near 0.55 em; assuming 0.6 overestimates the wraps a
 * little, which errs toward a taller box — the safe side, since a short box
 * lets wrapped text escape the background fill.
 */
const CODE_CHAR_EM = 0.6;

/** Never shrink code text below this, even if it still overflows. */
const CODE_MIN_FONT_PT = 10;

/**
 * Height a code block needs, in inches.
 *
 * The insets matter: they are 16pt of the total, which a bare lines x per-line
 * estimate misses — that is what left the last line of a block sticking out
 * below the dark fill.
 */
export function codeBlockHeight(lines: number, fontSizePt: number): number {
  return Math.max(1.0, (lines * fontSizePt * CODE_LINE_FACTOR) / 72 + CODE_INSET_IN);
}

/**
 * Rendered line count of a code block: source lines plus the wraps PowerPoint
 * produces for lines wider than the box (CJK counts double via displayWidth).
 */
export function codeLineCount(content: string, w: number, fontSizePt: number): number {
  const perLine = Math.max(8, Math.floor((w * 72) / (fontSizePt * CODE_CHAR_EM)));
  return content.split('\n').reduce(
    (n, line) => n + Math.max(1, Math.ceil(displayWidth(line) / perLine)),
    0,
  );
}

export interface CodeFit {
  fontSize: number;
  lines: number;
  /** Box height in inches, always ≤ maxH (but never below one line). */
  height: number;
}

/**
 * Size a code block that must fit `maxH` inches: shrink the font a point at a
 * time until the wrapped content fits, bottoming out at CODE_MIN_FONT_PT.
 * Content that fits at the base size comes back unchanged; oversized blocks
 * scale down instead of spilling past the slide edge.
 */
export function fitCodeBlock(
  content: string,
  w: number,
  maxH: number,
  baseFontSizePt: number,
): CodeFit {
  let fontSize = baseFontSizePt;
  for (;;) {
    const lines = codeLineCount(content, w, fontSize);
    const height = codeBlockHeight(lines, fontSize);
    if (height <= maxH || fontSize <= CODE_MIN_FONT_PT) {
      return { fontSize, lines, height: Math.min(height, Math.max(1.0, maxH)) };
    }
    fontSize -= 1;
  }
}
