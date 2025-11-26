import { Context } from 'hono';
import type { ExportRequest, ExportResponse } from '@daad/shared-types';
import { toD2, toMermaid, toJSON } from '@daad/diagram-schema';
import {
  CacheManager,
  CacheKeyPrefix,
  CacheTTL,
  getWithCache,
} from '../storage/cache';

export async function exportHandler(c: Context) {
  try {
    const body: ExportRequest = await c.req.json();
    const cache = c.get('cache') as CacheManager;

    const diagramHash = JSON.stringify(body.diagram);
    const cacheKey = `${body.format}:${hashString(diagramHash)}`;

    const cachedExport = await getWithCache<string>(
      cache,
      CacheKeyPrefix.EXPORT,
      cacheKey,
      async () => {
        let content: string;
        switch (body.format) {
          case 'd2':
            content = toD2(body.diagram);
            break;
          case 'mermaid':
            content = toMermaid(body.diagram);
            break;
          case 'json':
            content = toJSON(body.diagram);
            break;
          default:
            throw new Error(`Unsupported format: ${body.format}`);
        }
        return content;
      },
      CacheTTL.EXPORT
    );

    const response: ExportResponse = {
      content: cachedExport || '',
      format: body.format,
      success: true,
    };

    return c.json(response);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      400
    );
  }
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
