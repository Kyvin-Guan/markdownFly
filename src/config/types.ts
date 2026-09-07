/**
 * Configuration type definitions
 */

export interface MarkdownFlyConfig {
  theme: string;
  author?: string;
  date?: string;
  footer?: string;
  /** Base directory for relative image paths (defaults to the .md file's dir) */
  resourceDir?: string;
  /** Default layout for slides without @(layout=...) (auto-detection used when unset) */
  layout?: string;
}
