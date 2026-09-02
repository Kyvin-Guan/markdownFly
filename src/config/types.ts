/**
 * Configuration type definitions
 */

export interface MarkdownFlyConfig {
  theme: string;
  ai: boolean;
  aiProvider: 'openai' | 'anthropic' | 'ollama' | 'none';
  aiModel?: string;
  aiLayout: boolean;
  aiNotes: boolean;
  aiPolish: boolean;
  author?: string;
  date?: string;
  footer?: string;
}
