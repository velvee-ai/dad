import type { CacheManager } from './storage/cache';
import type { StructuredLogger } from './monitoring/logger';

/**
 * Cloudflare Workers environment bindings
 */
export interface Env {
  // KV namespace binding for caching
  DAAD_CACHE: KVNamespace;

  // R2 bucket binding for preview diagram storage
  PREVIEW_DIAGRAMS: R2Bucket;

  // R2 bucket binding for general storage (legacy/alternative)
  DAAD_BUCKET?: R2Bucket;

  // Environment variables
  ENVIRONMENT?: string;
  CORS_ORIGINS?: string;
  DRY_RUN?: string; // For cleanup worker dry-run mode
  CACHE_ENABLED?: string; // Enable/disable caching
  CACHE_DEFAULT_TTL?: string; // Default TTL in seconds

  // API Keys (stored as secrets)
  OPENROUTER_API_KEY?: string;
  CLAUDE_API_KEY?: string;

  // Analytics binding (optional)
  ANALYTICS?: AnalyticsEngineDataset;

  // Allow additional properties for compatibility with Hono
  [key: string]: any;
}

/**
 * Hono context variables
 */
export interface Variables {
  cache: CacheManager;
  logger?: StructuredLogger;

  // Allow additional properties for compatibility with Hono
  [key: string]: any;
}

/**
 * Extended context type for Hono handlers with Cloudflare bindings
 */
export interface CloudflareContext {
  env: Env;
  executionCtx: ExecutionContext;
}
