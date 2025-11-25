import { Context } from 'hono';
import type { ExportRequest, ExportResponse } from '@daad/shared-types';
import { toD2, toMermaid, toJSON } from '@daad/diagram-schema';

export async function exportHandler(c: Context) {
  try {
    const body: ExportRequest = await c.req.json();

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

    const response: ExportResponse = {
      content,
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
