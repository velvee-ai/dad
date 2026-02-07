import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider } from '../types';

/**
 * Mock LLM provider for testing. Returns pre-configured responses.
 */
export class MockLLMProvider implements LLMProvider {
  private responses = new Map<string, string>();
  private defaultResponse =
    '# Generated Description\n\nThis is a mock description generated for testing purposes.';

  /** Register a response for prompts containing a specific keyword */
  registerResponse(keyword: string, response: string): void {
    this.responses.set(keyword.toLowerCase(), response);
  }

  async analyze(prompt: string): Promise<string> {
    const lower = prompt.toLowerCase();
    for (const [keyword, response] of this.responses) {
      if (lower.includes(keyword)) {
        return response;
      }
    }
    return this.defaultResponse;
  }
}

/**
 * Claude API provider using the Anthropic SDK.
 */
export class ClaudeProvider implements LLMProvider {
  private client: Anthropic;

  constructor(
    private apiKey: string = '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',
    private model: string = 'claude-sonnet-4-5-20250929',
    private maxTokens: number = 1024
  ) {
    this.client = new Anthropic({ apiKey: this.apiKey });
  }

  async analyze(prompt: string): Promise<string> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlocks = message.content.filter(
      (block) => block.type === 'text'
    );
    return textBlocks.map((block) => block.type === 'text' ? block.text : '').join('\n');
  }
}

/**
 * OpenRouter provider — routes to Claude or other models via OpenRouter.
 * Uses the Anthropic SDK with a base URL override.
 */
export class OpenRouterProvider implements LLMProvider {
  private client: Anthropic;

  constructor(
    private apiKey: string,
    private model: string = 'anthropic/claude-sonnet-4-5-20250929',
    private maxTokens: number = 1024
  ) {
    this.client = new Anthropic({
      apiKey: this.apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  async analyze(prompt: string): Promise<string> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlocks = message.content.filter(
      (block) => block.type === 'text'
    );
    return textBlocks.map((block) => block.type === 'text' ? block.text : '').join('\n');
  }
}
