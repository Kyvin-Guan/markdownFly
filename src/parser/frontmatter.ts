/**
 * Frontmatter extractor
 * Extracts YAML frontmatter from remark AST and merges with defaults
 */

import type { Root } from 'mdast';
import { parse as parseYaml } from 'yaml';
import type { MarkdownFlyConfig } from '../config/types.js';
import { DEFAULT_CONFIG } from '../config/defaults.js';

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
    };
    const merged: MarkdownFlyConfig = {
      ...DEFAULT_CONFIG,
      ...parsed,
    };
    if (parsed.resource_dir && !merged.resourceDir) {
      merged.resourceDir = parsed.resource_dir;
    }
    return merged;
  } catch {
    console.warn('Failed to parse frontmatter YAML, using defaults');
    return { ...DEFAULT_CONFIG };
  }
}
