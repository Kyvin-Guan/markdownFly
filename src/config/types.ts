/**
 * Configuration type definitions
 */

export interface MarkdownFlyConfig {
  /**
   * Theme name for `getTheme` / CLI `-t`.
   * Resolves ThemePreset first (e.g. 'blue'), then ColorScheme (e.g. 'ocean').
   */
  theme: string;
  /** ColorScheme override (frontmatter `color_scheme`) — overrides theme's color slot */
  colorScheme?: string;
  /** TextScheme override (frontmatter `text_scheme`) — overrides theme's text slot */
  textScheme?: string;
  /** LayoutScheme override (frontmatter `layout_scheme`) — overrides theme's layout slot */
  layoutScheme?: string;
  author?: string;
  date?: string;
  footer?: string;
  /** Base directory for relative image paths (defaults to the .md file's dir) */
  resourceDir?: string;
  /** Default layout for slides without @(layout=...) (auto-detection used when unset) */
  layout?: string;
}
