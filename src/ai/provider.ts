/**
 * AI Provider Interface — Phase 2
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  readonly name: string;
  chat(messages: ChatMessage[]): Promise<string>;
  chatJSON<T>(messages: ChatMessage[], schema: Record<string, unknown>): Promise<T>;
}
