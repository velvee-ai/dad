import { spawn } from 'child_process';
import type { C4AnalysisResult } from '@dad/shared-types';
import type { GenerationLogger, LLMProviderConfig } from '../types';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{ message: { content: string } }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * C4AnalysisClient wraps the existing Claude CLI and OpenRouter API
 * to send C4-specific prompts and parse C4AnalysisResult[] responses.
 */
export class C4AnalysisClient {
  private logger: GenerationLogger;
  private provider: 'claude' | 'openrouter';
  private openRouterApiKey?: string;
  private openRouterModel: string;

  constructor(config: LLMProviderConfig, logger: GenerationLogger) {
    this.logger = logger;

    this.provider = config.provider;
    this.openRouterApiKey = config.openRouterApiKey;
    this.openRouterModel = config.openRouterModel || 'qwen/qwen-2.5-coder-32b-instruct';
  }

  /**
   * Send a C4 analysis prompt and parse the response into C4AnalysisResult[].
   */
  async analyze(prompt: { system: string; user: string }): Promise<C4AnalysisResult[]> {
    this.logger.appendLine(`=== C4 Analysis (${this.provider}) ===`);
    this.logger.appendLine(`Prompt length: ${prompt.user.length} chars`);

    let rawResponse: string;

    if (this.provider === 'claude') {
      rawResponse = await this.callClaude(prompt.system, prompt.user);
    } else {
      rawResponse = await this.callOpenRouter(prompt.system, prompt.user);
    }

    this.logger.appendLine(`Response length: ${rawResponse.length} chars`);

    return this.parseResponse(rawResponse);
  }

  private async callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    return new Promise((resolve, reject) => {
      const claude = spawn('claude', ['-p', fullPrompt]);
      let output = '';
      let error = '';

      claude.stdout.on('data', (data) => { output += data.toString(); });
      claude.stderr.on('data', (data) => { error += data.toString(); });

      claude.on('close', (exitCode) => {
        if (exitCode !== 0) {
          this.logger.appendLine(`Claude CLI error: ${error}`);
          reject(new Error(`Claude process failed: ${error}`));
          return;
        }
        resolve(output);
      });

      claude.on('error', (err) => {
        reject(new Error(`Failed to start Claude CLI: ${err.message}`));
      });
    });
  }

  private async callOpenRouter(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.openRouterApiKey) {
      throw new Error('OpenRouter API key not configured. Set dad.openRouterApiKey in settings.');
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openRouterApiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'DAD - Diagram as a Delivery',
      },
      body: JSON.stringify({
        model: this.openRouterModel,
        messages,
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as OpenRouterResponse;

    if (data.usage) {
      this.logger.appendLine(
        `Tokens: ${data.usage.prompt_tokens} prompt + ${data.usage.completion_tokens} completion`
      );
    }

    if (!data.choices?.length) {
      throw new Error('No response from OpenRouter');
    }

    return data.choices[0].message.content;
  }

  /**
   * Parse the LLM's raw text into C4AnalysisResult[].
   * Handles markdown code fences, extra text, and partial JSON.
   */
  private parseResponse(raw: string): C4AnalysisResult[] {
    let cleaned = raw.trim();

    // Strip markdown code fences
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    // Try direct parse
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return this.validateResults(parsed);
      }
      // Maybe it's wrapped in an object
      if (parsed.results && Array.isArray(parsed.results)) {
        return this.validateResults(parsed.results);
      }
    } catch { /* fall through */ }

    // Try to extract JSON array from the response
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed)) {
          return this.validateResults(parsed);
        }
      } catch { /* fall through */ }
    }

    this.logger.appendLine('WARNING: Could not parse C4 analysis response');
    this.logger.appendLine(`Raw (first 500 chars): ${raw.substring(0, 500)}`);
    return [];
  }

  private validateResults(results: unknown[]): C4AnalysisResult[] {
    return results
      .filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
      .map(r => ({
        nodeId: String(r.nodeId || ''),
        designSpec: String(r.designSpec || ''),
        documentation: String(r.documentation || ''),
        relationships: Array.isArray(r.relationships)
          ? r.relationships.map((rel: Record<string, unknown>) => ({
              targetId: String(rel.targetId || ''),
              label: String(rel.label || ''),
              technology: rel.technology ? String(rel.technology) : undefined,
            }))
          : [],
      }))
      .filter(r => r.nodeId.length > 0);
  }

  dispose(): void {
    // No-op: no output channel to dispose in standalone mode
  }
}
