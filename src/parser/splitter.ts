/**
 * Slide Splitter
 * Converts remark AST into SlideNode[] with automatic layout detection
 */

import type { Root, Content, PhrasingContent } from 'mdast';
import type {
  SlideNode,
  SlideElement,
  SlideLayout,
  SlideDirectives,
  TextElement,
  HeadingElement,
  ListElement,
  CodeElement,
  ImageElement,
  TableElement,
  BlockquoteElement,
  DiagramElement,
  BreakElement,
  CalloutElement,
  ImageAlign,
} from '../models/slide.js';

/** Diagram languages that trigger DiagramElement instead of CodeElement */
const DIAGRAM_LANGUAGES = new Set(['mermaid', 'dot', 'graphviz', 'echarts']);

/** Callout variants recognized in blockquotes: > [!NOTE] / [!TIP] / ... */
const CALLOUT_VARIANTS = new Set([
  'note', 'info', 'tip', 'success', 'warning', 'caution', 'danger',
]);

/**
 * Recursively extract plain text from mdast inline/phrasing nodes
 */
function extractText(node: PhrasingContent | Content): string {
  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }
  // Soft line breaks inside blockquotes/lists map to "\n"
  // (@types/mdast 4.0.4 omits Softbreak from its unions — cast to check)
  if ((node as { type: string }).type === 'softbreak') {
    return '\n';
  }
  if ('children' in node && Array.isArray(node.children)) {
    return (node.children as PhrasingContent[]).map(extractText).join('');
  }
  return '';
}

/**
 * Parse an HTML comment node produced by preprocess.ts
 * Returns a BreakElement or directive key/values
 */
function parseComment(value: string): BreakElement | { directives: Record<string, string> } | null {
  const match = value.match(/<!--\s*mfly:(row|col|dir)\s*(.*?)\s*-->/s);
  if (!match) return null;

  if (match[1] === 'row' || match[1] === 'col') {
    return { type: 'break', direction: match[1] } satisfies BreakElement;
  }

  if (match[1] === 'dir') {
    const raw = decodeURIComponent(match[2]);
    return { directives: parseDirectiveString(raw) };
  }

  return null;
}

/**
 * Parse "@(key=value, key=value, ...)" into a record.
 * Values may be quoted ("...", '...') to contain commas or parens.
 */
export function parseDirectiveString(input: string): Record<string, string> {
  const inner = input.replace(/^@\(/, '').replace(/\)$/, '').trim();
  const result: Record<string, string> = {};
  if (!inner) return result;

  const re = /([A-Za-z][A-Za-z0-9_-]*)\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^,)]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) {
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[m[1]] = value;
  }
  return result;
}

/** Build the typed directive object for a slide */
function toDirectives(raw: Record<string, string>): SlideDirectives {
  const d: SlideDirectives = {};
  if (raw.layout) d.layout = raw.layout;
  if (raw.notes) d.notes = raw.notes;
  if (raw.chart) d.chart = raw.chart;
  if (raw.highlight) d.highlight = raw.highlight;
  if (raw.background) d.background = raw.background;
  if (raw.steps) d.steps = raw.steps === 'true' || raw.steps === 'yes' || raw.steps === '1';
  return d;
}

/** Parse "2-4,6,8-9" style line ranges into a list of 1-based numbers */
export function parseHighlightRanges(spec: string): number[] {
  const lines = new Set<number>();
  for (const part of spec.split(',')) {
    const range = part.trim().match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const from = Number(range[1]);
      const to = Number(range[2]);
      for (let n = Math.min(from, to); n <= Math.max(from, to); n++) lines.add(n);
    } else {
      const single = part.trim().match(/^\d+$/);
      if (single) lines.add(Number(single));
    }
  }
  return [...lines].sort((a, b) => a - b);
}

/** Detect "> [!NOTE] Custom title ..." style callouts (moffee-compatible). */
function parseCallout(content: string): CalloutElement | null {
  const lines = content.split('\n');
  const markerMatch = lines[0]?.match(/^\s*\[!(.*?)\]\s*(.*?)\s*$/);
  if (!markerMatch) return null;
  const variant = markerMatch[1].toLowerCase();
  if (!CALLOUT_VARIANTS.has(variant)) return null;
  const title = markerMatch[2].trim() || undefined;
  return {
    type: 'callout',
    variant,
    title,
    content: lines.slice(1).join('\n').trim(),
  } satisfies CalloutElement;
}

/**
 * Parse a `{w=6in,h=40mm,align=left}` suffix into image element params.
 * Keys: w/width, h/height, align. Invalid pieces are silently ignored, so a
 * `![alt](src){w=200}` line still renders the image.
 */
function parseImageParams(text: string): Pick<ImageElement, 'width' | 'height' | 'align'> {
  const result: Pick<ImageElement, 'width' | 'height' | 'align'> = {};
  const body = text.replace(/^\{\s*|\s*\}$/g, '');
  for (const part of body.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim().toLowerCase();
    const value = part.slice(eq + 1).trim();
    switch (key) {
      case 'w':
      case 'width': {
        const normalized = normalizeImageSize(value);
        if (normalized) result.width = normalized;
        break;
      }
      case 'h':
      case 'height': {
        const normalized = normalizeImageSize(value);
        if (normalized) result.height = normalized;
        break;
      }
      case 'align': {
        if (value === 'left' || value === 'center' || value === 'right') {
          result.align = value as ImageAlign;
        }
        break;
      }
    }
  }
  return result;
}

/** Normalize to '<n>in' or '<n>%'; bare numbers are px (96 dpi). Invalid → undefined. */
function normalizeImageSize(value: string): string | undefined {
  const match = value.match(/^(\d+(?:\.\d+)?)(px|pt|cm|mm|in|inch|%)?$/i);
  if (!match) return undefined;
  const n = parseFloat(match[1]);
  if (!(n > 0)) return undefined;
  const unit = (match[2] || 'px').toLowerCase();
  if (unit === '%') return `${n}%`;
  const inches =
    unit === 'px' ? n / 96 : unit === 'pt' ? n / 72 : unit === 'cm' ? n / 2.54 : unit === 'mm' ? n / 25.4 : n;
  return `${Math.round(inches * 100) / 100}in`;
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
      // A paragraph holding exactly one image — optionally followed by a
      // {w=...,align=...} suffix, which CommonMark parses as a plain text node.
      const first = node.children[0];
      if (first?.type === 'image') {
        const rest = node.children.slice(1);
        const paramsFromText = (() => {
          if (rest.length === 0) return {};
          if (!rest.every((c) => c.type === 'text')) return null;
          const suffix = rest
            .map((c) => (c.type === 'text' ? c.value : ''))
            .join('')
            .trim();
          const match = suffix.match(/^\{.*\}$/);
          return match ? parseImageParams(match[0]) : null;
        })();
        if (paramsFromText !== null) {
          return {
            type: 'image',
            src: first.url,
            alt: first.alt ?? undefined,
            ...paramsFromText,
          } satisfies ImageElement;
        }
      }
      return {
        type: 'text',
        content: node.children.map(extractText).join(''),
      } satisfies TextElement;
    }

    case 'list': {
      // remark-gfm sets checked to true/false for task items and null for
      // plain items — only treat boolean values as task-list markers.
      const hasCheckboxes = node.children.some(
        (item) => typeof item.checked === 'boolean',
      );
      const items = node.children.map((item) => {
        return item.children.map((child) => extractText(child)).join('');
      });
      const result: ListElement = {
        type: 'list',
        items,
        ordered: node.ordered ?? false,
      };
      if (hasCheckboxes) {
        result.checked = node.children.map((item) =>
          typeof item.checked === 'boolean' ? item.checked : false,
        );
      }
      return result;
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
      const element = {
        type: 'code',
        content: node.value,
        language: node.lang ?? undefined,
      } satisfies CodeElement;
      return element;
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
      const callout = parseCallout(content);
      if (callout) return callout;
      return {
        type: 'blockquote',
        content,
      } satisfies BlockquoteElement;
    }

    case 'html': {
      const parsed = parseComment(node.value);
      if (parsed === null) return null;
      if ('direction' in parsed) return parsed;
      // Directive comments are collected by the caller — see splitIntoSlides
      return null;
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
 * @param defaultLayout Optional frontmatter layout; the auto-detection rule
 *   engine runs first, @(layout=...) directives override it.
 */
export function splitIntoSlides(tree: Root, defaultLayout?: string): SlideNode[] {
  const slides: SlideNode[] = [];
  let currentTitle: string | undefined;
  let currentSubtitle: string | undefined;
  let currentElements: SlideElement[] = [];
  let currentDirectives: Record<string, string> = {};
  let currentHeadingLevel = 0;
  let isFirstSlide = true;

  function flushSlide(): void {
    // Don't create empty slides (but keep slides that carry directives/notes)
    if (!currentTitle && currentElements.length === 0 && Object.keys(currentDirectives).length === 0) {
      return;
    }

    // Apply @(highlight=...) to the slide's code block if not already applied
    if (currentDirectives.highlight && currentElements.length > 0) {
      const ranges = parseHighlightRanges(currentDirectives.highlight);
      if (ranges.length > 0) {
        const code = currentElements.find(
          (e): e is CodeElement => e.type === 'code' && !e.highlightLines,
        );
        if (code) code.highlightLines = ranges;
      }
    }

    const autoLayout = detectLayout(
      currentTitle,
      currentElements,
      isFirstSlide && slides.length === 0,
      currentHeadingLevel,
    );
    // Precedence: @(layout=...) directive > structural auto-detection
    // (title/section/code/quote) > frontmatter fallback (only for generic
    // content slides) > generic content.
    const layout: SlideLayout = (currentDirectives.layout as SlideLayout | undefined) ??
      (autoLayout === 'content' ? (defaultLayout as SlideLayout | undefined) : autoLayout) ??
      'content';

    slides.push({
      layout,
      title: currentTitle,
      subtitle: currentSubtitle,
      elements: currentElements,
      notes: currentDirectives.notes,
      directives: toDirectives(currentDirectives),
    });

    currentTitle = undefined;
    currentSubtitle = undefined;
    currentElements = [];
    currentDirectives = {};
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

    // Directive comment may precede content in any position — collect it,
    // but preserve ordering by pushing to elements when it's a break marker.
    if (node.type === 'html') {
      const parsed = parseComment(node.value);
      if (parsed !== null) {
        if ('direction' in parsed) {
          currentElements.push(parsed);
        } else {
          Object.assign(currentDirectives, parsed.directives);
        }
      }
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
