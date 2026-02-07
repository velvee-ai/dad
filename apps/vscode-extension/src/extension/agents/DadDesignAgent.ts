/**
 * DadDesignAgent — Design phase agent for Author Mode.
 *
 * Composes the existing ClaudeProvider from @dad/pipeline to evaluate
 * proposed architectural changes and return an implementation plan + updated DAD.
 *
 * Uses the Anthropic SDK (already a dependency) via ClaudeProvider.
 */

import { ClaudeProvider } from '@dad/pipeline';
import type { AgentBridge, CoalesceInput, CoalesceOutput } from './AgentBridge';
import { AuthorPromptBuilder } from './AuthorPromptBuilder';
import { ResponseParser } from './ResponseParser';

export class DadDesignAgent implements Pick<AgentBridge, 'coalesce'> {
  private provider: ClaudeProvider;

  /**
   * @param apiKey - Anthropic API key. Falls back to ClaudeProvider default.
   * @param model - Model to use. Defaults to claude-sonnet-4-5.
   */
  constructor(apiKey?: string, model?: string) {
    // Use high maxTokens since coalesce responses include both MD plan + full JSON DAD
    this.provider = new ClaudeProvider(
      apiKey || undefined,
      model || 'claude-sonnet-4-5-20250929',
      16384
    );
  }

  /**
   * Evaluate proposed changes and return an implementation plan + updated DAD.
   */
  async coalesce(input: CoalesceInput): Promise<CoalesceOutput> {
    const prompt = AuthorPromptBuilder.coalesceDesign(input);
    const response = await this.provider.analyze(prompt);
    return ResponseParser.parseCoalesceResponse(response);
  }
}
