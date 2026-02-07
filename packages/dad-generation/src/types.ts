export interface GenerationLogger {
  appendLine(message: string): void;
}

export interface GenerationProgress {
  report(message: string, increment?: number): void;
}

export interface LLMProviderConfig {
  provider: 'claude' | 'openrouter';
  openRouterApiKey?: string;
  openRouterModel?: string;
}

export interface GenerationOptions {
  logger?: GenerationLogger;
  llmConfig: LLMProviderConfig;
}
