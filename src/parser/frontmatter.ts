/**
 * Frontmatter extractor
 * Extracts YAML frontmatter from remark AST and merges with defaults
 */

import type { Root } from 'mdast';
import { parse as parseYaml } from 'yaml';
import type { MarkdownFlyConfig } from '../config/types.js';
import { DEFAULT_CONFIG } from '../config/defaults.js';
import { log } from '../utils/progress.js';

/**
 * Extract and parse frontmatter from remark AST
 */
export function extractFrontmatter(tree: Root): MarkdownFlyConfig {
  const yamlNode = tree.children.find((node) => node.type === 'yaml') as
    | { type: 'yaml'; value: string }
    | undefined;

  if (!yamlNode) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const parsed = parseYaml(yamlNode.value) as Partial<MarkdownFlyConfig> & {
      resource_dir?: string; // snake_case alias
      color_scheme?: string; // snake_case alias
      text_scheme?: string; // snake_case alias
      layout_scheme?: string; // snake_case alias
    };
    const { resource_dir, color_scheme, text_scheme, layout_scheme, ...parsedOnly } = parsed;
    const merged: MarkdownFlyConfig = {
      ...DEFAULT_CONFIG,
      ...parsedOnly,
    };
    if (resource_dir && !merged.resourceDir) {
      merged.resourceDir = resource_dir;
    }
    if (color_scheme && !merged.colorScheme) {
      merged.colorScheme = color_scheme;
    }
    if (text_scheme && !merged.textScheme) {
      merged.textScheme = text_scheme;
    }
    if (layout_scheme && !merged.layoutScheme) {
      merged.layoutScheme = layout_scheme;
    }
    return merged;
  } catch {
    log.warn('Failed to parse frontmatter YAML, using defaults');
    return { ...DEFAULT_CONFIG };
  }
}
