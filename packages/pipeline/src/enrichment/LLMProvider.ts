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
 * Claude API provider (placeholder — requires API key configuration).
 */
export class ClaudeProvider implements LLMProvider {
  constructor(private apiKey: string, private model: string = 'claude-sonnet-4-5-20250929') {}

  async analyze(prompt: string): Promise<string> {
    // This would make an actual API call to Claude
    // For now, throw to indicate it needs real implementation
    throw new Error(
      'ClaudeProvider requires API integration. Use MockLLMProvider for testing.'
    );
  }
}

/**
 * OpenRouter provider (placeholder — requires API key configuration).
 */
export class OpenRouterProvider implements LLMProvider {
  constructor(
    private apiKey: string,
    private model: string = 'anthropic/claude-sonnet-4-5-20250929'
  ) {}

  async analyze(prompt: string): Promise<string> {
    throw new Error(
      'OpenRouterProvider requires API integration. Use MockLLMProvider for testing.'
    );
  }
}
