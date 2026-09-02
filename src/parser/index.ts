/**
 * Markdown Parser
 * Main entry point: markdown string → Presentation
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import type { Root } from 'mdast';
import type { Presentation } from '../models/slide.js';
import { extractFrontmatter } from './frontmatter.js';
import { splitIntoSlides } from './splitter.js';

/**
 * Parse a markdown string into a Presentation
 */
export function parseMarkdown(markdown: string): Presentation {
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml']);

  const tree = processor.parse(markdown) as Root;

  const config = extractFrontmatter(tree);
  const slides = splitIntoSlides(tree);

  return { config, slides };
}
