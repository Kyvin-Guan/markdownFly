/**
 * Slide Splitter
 * Converts remark AST into SlideNode[] with automatic layout detection
 */

import type { Root, Content, PhrasingContent } from 'mdast';
import type {
  SlideNode,
  SlideElement,
  SlideLayout,
  TextElement,
  HeadingElement,
  ListElement,
  CodeElement,
  ImageElement,
  TableElement,
  BlockquoteElement,
  DiagramElement,
} from '../models/slide.js';

/** Diagram languages that trigger DiagramElement instead of CodeElement */
const DIAGRAM_LANGUAGES = new Set(['mermaid', 'dot', 'graphviz', 'echarts']);

/**
 * Recursively extract plain text from mdast inline/phrasing nodes
 */
function extractText(node: PhrasingContent | Content): string {
  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }
  if ('children' in node && Array.isArray(node.children)) {
    return (node.children as PhrasingContent[]).map(extractText).join('');
  }
  return '';
}

/**
 * Convert an mdast content node to a SlideElement
 */
function nodeToElement(node: Content): SlideElement | null {
  switch (node.type) {
    case 'heading': {
      return {
        type: 'heading',
        content: node.children.map(extractText).join(''),
        level: node.depth,
      } satisfies HeadingElement;
    }

    case 'paragraph': {
      // Check if paragraph contains only an image
      if (node.children.length === 1 && node.children[0].type === 'image') {
        const img = node.children[0];
        return {
          type: 'image',
          src: img.url,
          alt: img.alt ?? undefined,
        } satisfies ImageElement;
      }
      return {
        type: 'text',
        content: node.children.map(extractText).join(''),
      } satisfies TextElement;
    }

    case 'list': {
      const items = node.children.map((item) => {
        return item.children.map((child) => extractText(child)).join('');
      });
      return {
        type: 'list',
        items,
        ordered: node.ordered ?? false,
      } satisfies ListElement;
    }

    case 'code': {
      const lang = node.lang?.toLowerCase() ?? '';
      if (DIAGRAM_LANGUAGES.has(lang)) {
        return {
          type: 'diagram',
          diagramType: lang === 'graphviz' ? 'dot' : lang,
          content: node.value,
        } satisfies DiagramElement;
      }
      return {
        type: 'code',
        content: node.value,
        language: node.lang ?? undefined,
      } satisfies CodeElement;
    }

    case 'image': {
      return {
        type: 'image',
        src: node.url,
        alt: node.alt ?? undefined,
      } satisfies ImageElement;
    }

    case 'table': {
      const rows = node.children.map((row) =>
        row.children.map((cell) =>
          cell.children.map(extractText).join(''),
        ),
      );
      const headers = rows.length > 0 ? rows[0] : [];
      const bodyRows = rows.slice(1);
      return {
        type: 'table',
        headers,
        rows: bodyRows,
      } satisfies TableElement;
    }

    case 'blockquote': {
      const content = node.children
        .map((child) => extractText(child))
        .join('\n');
      return {
        type: 'blockquote',
        content,
      } satisfies BlockquoteElement;
    }

    default:
      return null;
  }
}

/**
 * Determine slide layout based on content (rule engine)
 */
function detectLayout(
  title: string | undefined,
  elements: SlideElement[],
  isFirstSlide: boolean,
  headingLevel: number,
): SlideLayout {
  // First slide with H1 → title
  if (isFirstSlide && headingLevel === 1) {
    return 'title';
  }

  // H2 with no body content → section divider
  if (headingLevel === 2 && elements.length === 0) {
    return 'section';
  }

  // Only code elements → code layout
  const nonEmptyElements = elements.filter(
    (e) => e.type !== 'text' || e.content.trim() !== '',
  );
  if (
    nonEmptyElements.length > 0 &&
    nonEmptyElements.every((e) => e.type === 'code')
  ) {
    return 'code';
  }

  // Only blockquote → quote layout
  if (
    nonEmptyElements.length > 0 &&
    nonEmptyElements.every((e) => e.type === 'blockquote')
  ) {
    return 'quote';
  }

  return 'content';
}

/**
 * Split remark AST into SlideNode array
 */
export function splitIntoSlides(tree: Root): SlideNode[] {
  const slides: SlideNode[] = [];
  let currentTitle: string | undefined;
  let currentSubtitle: string | undefined;
  let currentElements: SlideElement[] = [];
  let currentHeadingLevel = 0;
  let isFirstSlide = true;

  function flushSlide(): void {
    // Don't create empty slides
    if (!currentTitle && currentElements.length === 0) {
      return;
    }

    const layout = detectLayout(
      currentTitle,
      currentElements,
      isFirstSlide && slides.length === 0,
      currentHeadingLevel,
    );

    slides.push({
      layout,
      title: currentTitle,
      subtitle: currentSubtitle,
      elements: currentElements,
    });

    currentTitle = undefined;
    currentSubtitle = undefined;
    currentElements = [];
    currentHeadingLevel = 0;
    isFirstSlide = false;
  }

  for (const node of tree.children) {
    // Skip frontmatter
    if (node.type === 'yaml') continue;

    // --- separator → new slide
    if (node.type === 'thematicBreak') {
      flushSlide();
      continue;
    }

    // H1 or H2 → new slide
    if (node.type === 'heading' && (node.depth === 1 || node.depth === 2)) {
      flushSlide();
      currentTitle = node.children.map(extractText).join('');
      currentHeadingLevel = node.depth;
      continue;
    }

    // Other content → add to current slide
    const element = nodeToElement(node);
    if (element) {
      currentElements.push(element);
    }
  }

  // Flush remaining content
  flushSlide();

  return slides;
}
