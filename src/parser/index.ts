/**
 * Markdown Parser
 * Main entry point: markdown string → Presentation
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import type { Root } from 'mdast';
import type { Presentation } from '../models/slide.js';
import { extractFrontmatter } from './frontmatter.js';
import { splitIntoSlides } from './splitter.js';
import { preprocessMarkdown } from './preprocess.js';

/**
 * Parse a markdown string into a Presentation
 */
export function parseMarkdown(markdown: string): Presentation {
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkGfm); // GFM: tables, task lists, autolinks, strikethrough

  // Rewrite layout markers (<-> / === / @(...)) before parsing so they
  // never collide with setext headings or paragraph text.
  const tree = processor.parse(preprocessMarkdown(markdown)) as Root;

  const config = extractFrontmatter(tree);
  const slides = splitIntoSlides(tree, config.layout);

  return { config, slides };
}
