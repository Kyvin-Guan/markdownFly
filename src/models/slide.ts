/**
 * Slide IR (Intermediate Representation)
 * Core data structures for the MarkdownFly pipeline
 */

import type { MarkdownFlyConfig } from '../config/types.js';

/** Available slide layouts */
export type SlideLayout =
  | 'title'
  | 'section'
  | 'content'
  | 'two-column'
  | 'code'
  | 'quote'
  | 'blank'
  | 'closing';

/** A layout marker inside a slide: starts a new row (===) or column (<->) */
export interface BreakElement {
  type: 'break';
  direction: 'row' | 'col';
}

/** Callout box (> [!NOTE]/[!TIP]/[...]) */
export interface CalloutElement {
  type: 'callout';
  variant: string; // note | tip | warning | caution | danger | success | info
  /** Custom title from "> [!WARNING] my title"; defaults to variant name */
  title?: string;
  content: string;
}

/** Slide-level directives parsed from @(key=value, ...) */
export interface SlideDirectives {
  layout?: string;
  notes?: string;
  chart?: string;
  highlight?: string;
  background?: string;
  steps?: boolean;
}

// --- Slide Elements ---

export interface TextElement {
  type: 'text';
  content: string;
  bold?: boolean;
  italic?: boolean;
}

export interface HeadingElement {
  type: 'heading';
  content: string;
  level: number;
}

export interface ListElement {
  type: 'list';
  items: string[];
  ordered: boolean;
  /** Parallel to items; present only for task lists (- [x] / - [ ]) */
  checked?: boolean[];
}

export interface CodeElement {
  type: 'code';
  content: string;
  language?: string;
  /** 1-based line numbers to highlight (from @(highlight=...)) */
  highlightLines?: number[];
}

export interface ImageElement {
  type: 'image';
  src: string;
  alt?: string;
}

export interface TableElement {
  type: 'table';
  headers: string[];
  rows: string[][];
}

export interface BlockquoteElement {
  type: 'blockquote';
  content: string;
}

export interface DiagramElement {
  type: 'diagram';
  diagramType: string;
  content: string;
}

export type SlideElement =
  | TextElement
  | HeadingElement
  | ListElement
  | CodeElement
  | ImageElement
  | TableElement
  | BlockquoteElement
  | DiagramElement
  | BreakElement
  | CalloutElement;

/** A single slide in the presentation */
export interface SlideNode {
  layout: SlideLayout;
  title?: string;
  subtitle?: string;
  elements: SlideElement[];
  notes?: string;
  directives?: SlideDirectives;
  metadata?: Record<string, unknown>;
}

/** The complete presentation */
export interface Presentation {
  config: MarkdownFlyConfig;
  slides: SlideNode[];
}
