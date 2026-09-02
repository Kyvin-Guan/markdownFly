import type { Theme } from '../models/theme.js';

/** Base interface for all diagram renderers */
export interface DiagramRenderer {
  readonly type: string;
  initialize(): Promise<void>;
  render(code: string, theme?: Theme): Promise<Buffer>;
}
