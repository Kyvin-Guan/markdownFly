/**
 * Code Highlighter
 * Uses Shiki for token-level syntax highlighting → pptxgenjs text runs
 */

import { createHighlighter, type Highlighter } from 'shiki';
import type { Theme } from '../models/theme.js';

interface PptxTextRun {
  text: string;
  options: {
    color?: string;
    fontFace?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
  };
}

let highlighterInstance: Highlighter | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterInstance) {
    highlighterInstance = await createHighlighter({
      themes: ['github-dark'],
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

/**
 * Highlight code and return pptxgenjs text runs
 */
export async function highlightCode(
  code: string,
  language: string,
  theme: Theme,
): Promise<PptxTextRun[]> {
  const highlighter = await getHighlighter();
  const runs: PptxTextRun[] = [];

  try {
    // Load language if not already loaded
    const loadedLangs = highlighter.getLoadedLanguages();
    if (!loadedLangs.includes(language as never)) {
      try {
        await highlighter.loadLanguage(language as never);
      } catch {
        // Language not supported — fall back to plain text
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
    }

    const result = highlighter.codeToTokens(code, {
      lang: language as never,
      theme: 'github-dark',
    });

    for (let i = 0; i < result.tokens.length; i++) {
      const line = result.tokens[i];
      for (const token of line) {
        runs.push({
          text: token.content,
          options: {
            color: cleanColor(token.color),
            fontFace: theme.fonts.code,
            fontSize: theme.fontSize.code,
          },
        });
      }
      // Add line break between lines (except last)
      if (i < result.tokens.length - 1) {
        runs.push({
          text: '\n',
          options: {
            fontFace: theme.fonts.code,
            fontSize: theme.fontSize.code,
          },
        });
      }
    }
  } catch {
    // Fallback: plain text
    runs.push({
      text: code,
      options: {
        color: theme.colors.codeText,
        fontFace: theme.fonts.code,
        fontSize: theme.fontSize.code,
      },
    });
  }

  return runs;
}
