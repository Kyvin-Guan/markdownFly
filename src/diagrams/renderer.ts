import type { Theme } from '../models/theme.js';

/**
 * The box (in inches) a diagram will be placed into, when the caller knows it.
 * Renderers that scale text with the diagram (mermaid) use it to keep the
 * rendered text at a size that reads as part of the slide's type scale.
 */
export interface DiagramBox {
  width: number;
  height: number;
}

/** Base interface for all diagram renderers */
export interface DiagramRenderer {
  readonly type: string;
  initialize(): Promise<void>;
  render(code: string, theme?: Theme, box?: DiagramBox): Promise<Buffer>;
}
