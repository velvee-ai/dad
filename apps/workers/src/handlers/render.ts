import { Context } from 'hono';
import { z } from 'zod';
import type { Diagram } from '@dad/shared-types';
import { renderDiagramToSVG, type SVGRenderOptions } from '../renderers/svg';

// Request validation schema
const renderRequestSchema = z.object({
  diagram: z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
    metadata: z.object({
      language: z.string(),
      complexity: z.number().optional(),
      summary: z.string().optional(),
      filename: z.string().optional(),
      timestamp: z.string().optional(),
    }).optional(),
  }),
  format: z.enum(['d2', 'mermaid']),
  options: z.object({
    theme: z.string().optional(),
    layout: z.string().optional(),
    optimize: z.boolean().optional(),
  }).optional(),
});

export interface RenderRequest {
  diagram: Diagram;
  format: 'd2' | 'mermaid';
  options?: SVGRenderOptions;
}

export interface RenderResponse {
  svg?: string;
  format: 'd2' | 'mermaid';
  success: boolean;
  error?: string;
}

/**
 * Handler for POST /api/render/svg
 * Renders a diagram to SVG format using either D2 or Mermaid
 */
export async function handleRenderSVG(c: Context): Promise<Response> {
  try {
    // Parse and validate request body
    const body = await c.req.json();
    const validationResult = renderRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return c.json({
        success: false,
        error: 'Invalid request body',
        details: validationResult.error.errors,
      }, 400);
    }

    const { diagram, format, options = {} } = validationResult.data;

    // Render diagram to SVG
    const result = await renderDiagramToSVG(diagram, format, options);

    if (!result.success) {
      return c.json({
        success: false,
        format: result.format,
        error: result.error,
      } as RenderResponse, 500);
    }

    // TODO: Store rendered SVG in R2 storage
    // await storeRenderedSVG(diagram.metadata?.filename, result.svg);

    return c.json({
      success: true,
      format: result.format,
      svg: result.svg,
    } as RenderResponse, 200);

  } catch (error) {
    console.error('Error rendering SVG:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }, 500);
  }
}

/**
 * Handler for GET /api/render/formats
 * Returns available rendering formats and their capabilities
 */
export async function handleGetFormats(c: Context): Promise<Response> {
  return c.json({
    formats: [
      {
        name: 'd2',
        description: 'D2 diagram language - modern diagram scripting language',
        features: ['flowcharts', 'sequence diagrams', 'architecture diagrams'],
        themes: ['default', 'dark', 'light', 'terminal'],
        layouts: ['dagre', 'elk'],
      },
      {
        name: 'mermaid',
        description: 'Mermaid - JavaScript-based diagramming and charting',
        features: ['flowcharts', 'sequence diagrams', 'class diagrams', 'state diagrams'],
        themes: ['default', 'dark', 'forest', 'neutral'],
        layouts: ['dagre', 'elk'],
      },
    ],
  });
}

/**
 * TODO: Store rendered SVG in R2 storage
 * This will be implemented when R2 storage integration is ready
 */
async function storeRenderedSVG(filename: string | undefined, svg: string): Promise<void> {
  // Implementation will be added when R2 storage is configured
  // Expected functionality:
  // 1. Generate a key based on filename or diagram ID
  // 2. Store SVG in R2 bucket
  // 3. Optionally store metadata (render timestamp, format, options)
  // 4. Return storage URL or key
  console.log('TODO: Store SVG in R2 storage', { filename, svgLength: svg.length });
}
