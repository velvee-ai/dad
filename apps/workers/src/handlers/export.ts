import { Context } from 'hono';
import type { ExportRequest, ExportResponse } from '@dad/shared-types';
import { toD2, toMermaid, toJSON } from '@dad/diagram-schema';
import {
  CacheManager,
  CacheKeyPrefix,
  CacheTTL,
  getWithCache,
} from '../storage/cache';
import { getMetrics } from '../monitoring/metrics';
import { PerformanceTimer } from '../monitoring/logger';

export async function exportHandler(c: Context) {
  const metrics = getMetrics();
  const timer = new PerformanceTimer();
  const logger = c.get('logger');

  try {
    const body: ExportRequest = await c.req.json();
    const cache = c.get('cache') as CacheManager;

    timer.mark('parsed_request');

    logger?.info('Exporting diagram', {
      format: body.format,
      nodeCount: body.diagram.nodes.length,
    });

    timer.mark('export_start');

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

    timer.mark('export_complete');
    const exportDuration = timer.getDurationBetween('export_start', 'export_complete');

    const response: ExportResponse = {
      content: cachedExport || '',
      format: body.format,
      success: true,
    };

    logger?.info('Export completed', {
      duration: timer.getDuration(),
      exportDuration,
      format: body.format,
      contentLength: cachedExport?.length || 0,
    });

    return c.json(response);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    metrics.trackError(err, 'export_handler');

    logger?.error('Export failed', err, {
      duration: timer.getDuration(),
    });

    return c.json(
      {
        success: false,
        error: err.message,
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
