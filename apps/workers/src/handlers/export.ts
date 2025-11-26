import { Context } from 'hono';
import type { ExportRequest, ExportResponse } from '@daad/shared-types';
import { toD2, toMermaid, toJSON } from '@daad/diagram-schema';
import { getMetrics } from '../monitoring/metrics';
import { PerformanceTimer } from '../monitoring/logger';

export async function exportHandler(c: Context) {
  const metrics = getMetrics();
  const timer = new PerformanceTimer();
  const logger = c.get('logger');

  try {
    const body: ExportRequest = await c.req.json();
    timer.mark('parsed_request');

    logger?.info('Exporting diagram', {
      format: body.format,
      nodeCount: body.diagram.nodes.length,
    });

    timer.mark('export_start');

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

    timer.mark('export_complete');
    const exportDuration = timer.getDurationBetween('export_start', 'export_complete');

    const response: ExportResponse = {
      content,
      format: body.format,
      success: true,
    };

    logger?.info('Export completed', {
      duration: timer.getDuration(),
      exportDuration,
      format: body.format,
      contentLength: content.length,
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
