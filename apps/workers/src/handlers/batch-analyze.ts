import { Context } from 'hono';
import type {
  BatchAnalyzeRequest,
  BatchAnalyzeResponse,
  BatchItemResult,
  Diagram,
  AnalyzeRequest,
  AnalyzeResponse,
  BatchManifest,
} from '@dad/shared-types';
import { processBatch, BatchItem, BatchResult, RateLimiter } from '../utils/batch';
import { StorageManager } from '../utils/storage';
import { analyzeHandler } from './analyze';

const rateLimiter = new RateLimiter({
  maxTokens: 10,
  refillRate: 2,
  refillInterval: 1000,
});

async function analyzeSingleFile(
  c: Context,
  file: { id: string; code: string; language: string; filename?: string }
): Promise<Diagram> {
  const mockContext = {
    req: {
      json: async () =>
        ({
          code: file.code,
          language: file.language,
          filename: file.filename,
        } as AnalyzeRequest),
    },
    json: (data: any) => ({ data }),
  } as unknown as Context;

  const response = await analyzeHandler(mockContext);
  const result = (response as any).data as AnalyzeResponse;

  if (!result.success) {
    throw new Error(result.error || 'Analysis failed');
  }

  return result.diagram;
}

export async function batchAnalyzeHandler(c: Context) {
  try {
    const body: BatchAnalyzeRequest = await c.req.json();

    if (!body.files || body.files.length === 0) {
      return c.json(
        {
          success: false,
          error: 'No files provided for batch analysis',
        },
        400
      );
    }

    const batchItems: BatchItem<(typeof body.files)[0]>[] = body.files.map(file => ({
      id: file.id,
      data: file,
    }));

    let completedCount = 0;
    const startTime = Date.now();

    const results = await processBatch(
      batchItems,
      async (item) => {
        await rateLimiter.acquire();

        return await analyzeSingleFile(c, item.data);
      },
      {
        maxConcurrent: 5,
        retryAttempts: 3,
        retryDelayMs: 1000,
        retryBackoffMultiplier: 2,
        onProgress: (completed, total) => {
          completedCount = completed;
        },
      }
    );

    const batchResults: BatchItemResult[] = results.map(result => ({
      id: result.id,
      filename: result.data.filename,
      diagram: result.result,
      success: result.status === 'success',
      error: result.error?.message,
      attempts: result.attempts,
    }));

    const successCount = batchResults.filter(r => r.success).length;
    const failureCount = batchResults.filter(r => !r.success).length;
    const manifestId = generateManifestId();
    const timestamp = Date.now();

    const manifest: BatchManifest = {
      id: manifestId,
      timestamp,
      totalItems: body.files.length,
      successCount,
      failureCount,
      results: batchResults,
    };

    const env = c.env as any;
    if (env?.DAD_BUCKET) {
      try {
        const storage = new StorageManager({
          r2Bucket: env.DAD_BUCKET,
          kvNamespace: env.DAD_KV,
        });

        await storage.saveManifest(manifest);
        await storage.saveManifestMetadata(manifestId, {
          totalItems: manifest.totalItems,
          successCount: manifest.successCount,
          failureCount: manifest.failureCount,
          timestamp: manifest.timestamp,
        });
      } catch (storageError) {
        console.error('Failed to save manifest to storage:', storageError);
      }
    }

    const response: BatchAnalyzeResponse = {
      results: batchResults,
      manifestId,
      totalItems: body.files.length,
      successCount,
      failureCount,
      timestamp,
    };

    return c.json(response);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}

function generateManifestId(): string {
  return `manifest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
