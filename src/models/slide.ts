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
}

export interface CodeElement {
  type: 'code';
  content: string;
  language?: string;
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
  | DiagramElement;

/** A single slide in the presentation */
export interface SlideNode {
  layout: SlideLayout;
  title?: string;
  subtitle?: string;
  elements: SlideElement[];
  notes?: string;
  directives?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

/** The complete presentation */
export interface Presentation {
  config: MarkdownFlyConfig;
  slides: SlideNode[];
}
