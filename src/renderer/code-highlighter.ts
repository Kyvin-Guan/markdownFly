/**
 * Code Highlighter
 * Uses Shiki for token-level syntax highlighting → pptxgenjs text runs
 */

import { createHighlighter, type Highlighter } from 'shiki';
import type { Theme } from '../models/theme.js';
import { hexToRgb } from '../utils/gradient.js';

interface PptxTextRun {
  text: string;
  options: {
    color?: string;
    fontFace?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    highlight?: string;
    /** Ends the line — pptxgenjs starts a new paragraph after this run. */
    breakLine?: boolean;
  };
}

let highlighterInstance: Highlighter | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterInstance) {
    highlighterInstance = await createHighlighter({
      themes: ['github-dark', 'dracula'],
      langs: [
        'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
        'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'bash', 'shell',
        'sql', 'html', 'css', 'json', 'yaml', 'markdown', 'xml', 'docker',
      ],
    });
  }
  return highlighterInstance;
}

/**
 * Strip '#' prefix from hex color
 */
function cleanColor(color: string | undefined): string {
  if (!color) return 'E2E8F0';
  return color.replace(/^#/, '');
}

/** Mix a hex colour toward white. */
function tint(hex: string, amount: number): string {
  const mix = (channel: number): string =>
    Math.round(channel + (255 - channel) * amount)
      .toString(16)
      .padStart(2, '0');
  const [r, g, b] = hexToRgb(hex);
  return `${mix(r)}${mix(g)}${mix(b)}`;
}

/**
 * Colour of the band drawn behind a highlighted line.
 *
 * The tokens on that band come from Shiki's dark theme, so they are light: the
 * band has to be dark for them to stay legible. A theme may name its own band,
 * but one picked for a light surface (or no value at all) produced pale-on-pale
 * text — the highlight was effectively unreadable in most themes. A missing
 * value is therefore derived from the code background rather than defaulted to
 * a light colour.
 */
export function highlightBackgroundFor(theme: Theme): string {
  const explicit = theme.colors.highlightBackground;
  if (explicit) return explicit;
  return tint(theme.colors.codeBackground, 0.25);
}

/**
 * Plain-text runs: one run carrying the whole source. pptxgenjs splits a
 * string run on its newlines natively and groups the pieces into real
 * paragraphs, which is the one encoding that stays schema-valid for blank
 * lines too.
 */
function plainTextRuns(code: string, theme: Theme): PptxTextRun[] {
  return [
    {
      text: code,
      options: {
        color: theme.colors.codeText,
        fontFace: theme.fonts.code,
        fontSize: theme.fontSize.code,
      },
    },
  ];
}

/**
 * Highlight code and return pptxgenjs text runs
 * @param highlightLines 1-based line numbers drawn with a highlight background
 */
export async function highlightCode(
  code: string,
  language: string,
  theme: Theme,
  highlightLines: number[] = [],
): Promise<PptxTextRun[]> {
  const highlighter = await getHighlighter();
  const runs: PptxTextRun[] = [];
  const shikiThemeName = theme.shikiTheme ?? 'github-dark';
  const highlightColor = highlightBackgroundFor(theme);

  try {
    // Load language if not already loaded
    const loadedLangs = highlighter.getLoadedLanguages();
    if (!loadedLangs.includes(language as never)) {
      try {
        await highlighter.loadLanguage(language as never);
      } catch {
        // Language not supported — fall back to plain text
        return plainTextRuns(code, theme);
      }
    }

    // Load theme if not loaded
    const loadedThemes = highlighter.getLoadedThemes();
    if (!loadedThemes.includes(shikiThemeName as never)) {
      try {
        await highlighter.loadTheme(shikiThemeName as never);
      } catch {
        // Theme not supported — use github-dark fallback
      }
    }

    const effectiveTheme = highlighter.getLoadedThemes().includes(shikiThemeName as never)
      ? shikiThemeName
      : 'github-dark';

    const result = highlighter.codeToTokens(code, {
      lang: language as never,
      theme: effectiveTheme,
    });

    for (let i = 0; i < result.tokens.length; i++) {
      const lineNumber = i + 1;
      const line = result.tokens[i];
      const isHighlighted = highlightLines.includes(lineNumber);
      if (line.length === 0) {
        // A blank source line yields no tokens; an empty run of its own keeps
        // the line (pptxgenjs groups `breakLine` runs into real paragraphs).
        runs.push({
          text: '',
          options: {
            color: theme.colors.codeText,
            fontFace: theme.fonts.code,
            fontSize: theme.fontSize.code,
          },
        });
      }
      for (const token of line) {
        const options: PptxTextRun['options'] = {
          color: cleanColor(token.color),
          fontFace: theme.fonts.code,
          fontSize: theme.fontSize.code,
        };
        if (isHighlighted) {
          options.highlight = highlightColor;
        }
        runs.push({ text: token.content, options });
      }
      // Break the paragraph after each line but the last. Never join lines
      // with '\n'-only runs: pptxgenjs keeps those as literal newline
      // characters inside <a:t> and emits paragraph properties mid-paragraph —
      // adjacent ones around blank lines — which is schema-invalid XML that
      // PowerPoint refuses to open (WPS tolerates it).
      if (i < result.tokens.length - 1 && runs.length > 0) {
        runs[runs.length - 1].options.breakLine = true;
      }
    }
  } catch {
    // Fallback: plain text
    return plainTextRuns(code, theme);
  }

  return runs;
}
