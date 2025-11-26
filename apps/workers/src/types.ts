/**
 * Cloudflare Workers environment bindings
 */
export interface Env {
  // R2 bucket binding for preview diagram storage
  PREVIEW_DIAGRAMS: R2Bucket;

  // R2 bucket binding for general storage (legacy/alternative)
  DAAD_BUCKET?: R2Bucket;

  // Environment variables
  ENVIRONMENT?: string;
  CORS_ORIGINS?: string;
  DRY_RUN?: string; // For cleanup worker dry-run mode

  // API Keys (stored as secrets)
  OPENROUTER_API_KEY?: string;
  CLAUDE_API_KEY?: string;
}

/**
 * Extended context type for Hono handlers with Cloudflare bindings
 */
export interface CloudflareContext {
  env: Env;
  executionCtx: ExecutionContext;
}
