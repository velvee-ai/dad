import { Context } from 'hono';
import type {
  PreviewAnalyzeRequest,
  PreviewAnalyzeResponse,
  PreviewManifest,
  Diagram,
  ExportFormat,
} from '@dad/shared-types';
import type { Env, Variables } from '../types';
import {
  CacheManager,
  CacheKeyPrefix,
  CacheTTL,
  getWithCache,
} from '../storage/cache';

/**
 * Generates a SHA-256 hash for the preview session using Web Crypto API
 */
async function generateSessionSha(changes: any[]): Promise<string> {
  const content = JSON.stringify(changes);
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16);
}

/**
 * Mock diagram generation - will be replaced with actual AI analysis
 */
function generateMockDiagram(fileId: string, filename: string, code: string, language: string): Diagram {
  return {
    nodes: [
      {
        id: `${fileId}-1`,
        type: 'start',
        label: 'Start',
        position: { x: 0, y: 0 },
      },
      {
        id: `${fileId}-2`,
        type: 'process',
        label: `Process ${filename}`,
        position: { x: 0, y: 100 },
      },
      {
        id: `${fileId}-3`,
        type: 'end',
        label: 'End',
        position: { x: 0, y: 200 },
      },
    ],
    edges: [
      { id: `${fileId}-e1`, source: `${fileId}-1`, target: `${fileId}-2` },
      { id: `${fileId}-e2`, source: `${fileId}-2`, target: `${fileId}-3` },
    ],
    metadata: {
      language,
      filename,
      timestamp: new Date().toISOString(),
      summary: `Mock diagram for ${filename}`,
    },
  };
}

/**
 * Convert diagram to different formats
 */
function convertDiagramToFormat(diagram: Diagram, format: ExportFormat): string {
  switch (format) {
    case 'json':
      return JSON.stringify(diagram, null, 2);

    case 'd2':
      // Simple D2 conversion
      let d2 = '';
      diagram.nodes.forEach(node => {
        d2 += `${node.id}: ${node.label}\n`;
      });
      d2 += '\n';
      diagram.edges.forEach(edge => {
        d2 += `${edge.source} -> ${edge.target}`;
        if (edge.label) d2 += `: ${edge.label}`;
        d2 += '\n';
      });
      return d2;

    case 'mermaid':
      // Simple Mermaid conversion
      let mermaid = 'graph TD\n';
      diagram.nodes.forEach(node => {
        const shape = node.type === 'decision' ? '{' : '[';
        const endShape = node.type === 'decision' ? '}' : ']';
        mermaid += `  ${node.id}${shape}"${node.label}"${endShape}\n`;
      });
      diagram.edges.forEach(edge => {
        mermaid += `  ${edge.source} --> `;
        if (edge.label) mermaid += `|${edge.label}| `;
        mermaid += `${edge.target}\n`;
      });
      return mermaid;

    default:
      return JSON.stringify(diagram, null, 2);
  }
}

/**
 * POST /api/preview/analyze
 * Creates a preview session by analyzing code changes and storing diagrams in R2
 */
export async function analyzePreview(c: Context<{ Bindings: Env; Variables: Variables }>) {
  try {
    const body: PreviewAnalyzeRequest = await c.req.json();

    // Validate request
    if (!body.changes || !Array.isArray(body.changes) || body.changes.length === 0) {
      return c.json(
        {
          success: false,
          error: 'Invalid request: changes array is required and must not be empty',
        },
        400
      );
    }

    // Validate each change
    for (const change of body.changes) {
      if (!change.fileId || !change.filename || !change.code || !change.language) {
        return c.json(
          {
            success: false,
            error: 'Invalid request: each change must have fileId, filename, code, and language',
          },
          400
        );
      }
    }

    // Generate session SHA
    const sha = await generateSessionSha(body.changes);
    const timestamp = Date.now();

    // Generate diagrams for each file change
    const diagrams = body.changes.map(change => {
      const diagram = generateMockDiagram(
        change.fileId,
        change.filename,
        change.code,
        change.language
      );

      return {
        fileId: change.fileId,
        filename: change.filename,
        diagram,
        url: `/api/preview/${sha}/${change.fileId}`,
      };
    });

    // Store diagrams in R2
    const bucket = c.env.PREVIEW_DIAGRAMS;
    if (bucket) {
      // Store each diagram in multiple formats
      for (const { fileId, diagram } of diagrams) {
        const formats: ExportFormat[] = ['json', 'd2', 'mermaid'];

        for (const format of formats) {
          const content = convertDiagramToFormat(diagram, format);
          const key = `${sha}/${fileId}.${format}`;

          await bucket.put(key, content, {
            httpMetadata: {
              contentType: format === 'json' ? 'application/json' : 'text/plain',
            },
            customMetadata: {
              sha,
              fileId,
              format,
              timestamp: timestamp.toString(),
            },
          });
        }
      }

      // Store manifest
      const manifest: PreviewManifest = {
        sha,
        timestamp,
        diagrams: body.changes.map(change => ({
          fileId: change.fileId,
          filename: change.filename,
          language: change.language,
          formats: ['json', 'd2', 'mermaid'],
        })),
      };

      await bucket.put(`${sha}/manifest.json`, JSON.stringify(manifest, null, 2), {
        httpMetadata: {
          contentType: 'application/json',
        },
        customMetadata: {
          sha,
          type: 'manifest',
          timestamp: timestamp.toString(),
        },
      });

      // Cache the manifest
      const cache = c.get('cache') as CacheManager;
      await cache.set(CacheKeyPrefix.SESSION, sha, manifest, CacheTTL.SESSION);
    }

    // Create response
    const response: PreviewAnalyzeResponse = {
      success: true,
      sha,
      diagrams,
      manifest: {
        sha,
        timestamp,
        diagrams: body.changes.map(change => ({
          fileId: change.fileId,
          filename: change.filename,
          language: change.language,
          formats: ['json', 'd2', 'mermaid'],
        })),
      },
    };

    return c.json(response, 201);
  } catch (error) {
    console.error('Error in analyzePreview:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      500
    );
  }
}

/**
 * GET /api/preview/:sha/:fileId
 * Retrieves a specific diagram from R2
 * Query params: format (json|d2|mermaid) - defaults to json
 */
export async function getDiagram(c: Context<{ Bindings: Env; Variables: Variables }>) {
  try {
    const sha = c.req.param('sha');
    const fileId = c.req.param('fileId');
    const format = (c.req.query('format') || 'json') as ExportFormat;

    // Validate parameters
    if (!sha || !fileId) {
      return c.json(
        {
          error: 'Invalid request: sha and fileId are required',
        },
        400
      );
    }

    // Validate format
    if (!['json', 'd2', 'mermaid'].includes(format)) {
      return c.json(
        {
          error: 'Invalid format: must be json, d2, or mermaid',
        },
        400
      );
    }

    // Retrieve from cache or R2
    const cache = c.get('cache') as CacheManager;
    const bucket = c.env.PREVIEW_DIAGRAMS;

    if (bucket) {
      const cacheKey = `${sha}:${fileId}:${format}`;

      const content = await getWithCache<string>(
        cache,
        CacheKeyPrefix.EXPORT,
        cacheKey,
        async () => {
          const key = `${sha}/${fileId}.${format}`;
          const object = await bucket.get(key);
          if (!object) return null;
          return await object.text();
        },
        CacheTTL.EXPORT
      );

      if (!content) {
        return c.json(
          {
            error: 'Diagram not found',
            message: `No diagram found for sha=${sha}, fileId=${fileId}, format=${format}`,
          },
          404
        );
      }

      const contentType = format === 'json' ? 'application/json' : 'text/plain';

      return c.text(content, 200, {
        'Content-Type': contentType,
      });
    }

    // Fallback when R2 is not configured
    return c.json(
      {
        error: 'Storage not configured',
        message: 'R2 bucket is not configured for preview storage',
      },
      503
    );
  } catch (error) {
    console.error('Error in getDiagram:', error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      500
    );
  }
}

/**
 * GET /api/preview/:sha/manifest
 * Retrieves the manifest for a preview session
 */
export async function getManifest(c: Context<{ Bindings: Env; Variables: Variables }>) {
  try {
    const sha = c.req.param('sha');

    // Validate parameter
    if (!sha) {
      return c.json(
        {
          error: 'Invalid request: sha is required',
        },
        400
      );
    }

    // Retrieve from cache or R2
    const cache = c.get('cache') as CacheManager;
    const bucket = c.env.PREVIEW_DIAGRAMS;

    if (bucket) {
      const manifest = await getWithCache<PreviewManifest>(
        cache,
        CacheKeyPrefix.SESSION,
        sha,
        async () => {
          const key = `${sha}/manifest.json`;
          const object = await bucket.get(key);
          if (!object) return null;
          const content = await object.text();
          return JSON.parse(content);
        },
        CacheTTL.SESSION
      );

      if (!manifest) {
        return c.json(
          {
            error: 'Manifest not found',
            message: `No manifest found for sha=${sha}`,
          },
          404
        );
      }

      return c.json(manifest);
    }

    // Fallback when R2 is not configured
    return c.json(
      {
        error: 'Storage not configured',
        message: 'R2 bucket is not configured for preview storage',
      },
      503
    );
  } catch (error) {
    console.error('Error in getManifest:', error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      500
    );
  }
}
