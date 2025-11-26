import { Context } from 'hono';
import type { SavedDiagram } from '@daad/shared-types';
import type { Env } from '../types';
import {
  CacheManager,
  CacheKeyPrefix,
  CacheTTL,
  getWithCache,
  invalidateCache,
} from '../storage/cache';

export const diagramHandler = {
  async list(c: Context<{ Bindings: Env }>) {
    try {
      const cache = c.get('cache') as CacheManager;
      const bucket = c.env.PREVIEW_DIAGRAMS;

      const diagrams = await getWithCache<SavedDiagram[]>(
        cache,
        CacheKeyPrefix.DIAGRAM,
        'list',
        async () => {
          const listed = await bucket.list();

          const results = await Promise.all(
            listed.objects.map(async (obj) => {
              const object = await bucket.get(obj.key);
              if (!object) return null;
              return await object.json();
            })
          );

          return results.filter(Boolean) as SavedDiagram[];
        },
        CacheTTL.DIAGRAM
      );

      return c.json({
        diagrams: diagrams || [],
        total: diagrams?.length || 0,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  },

  async save(c: Context<{ Bindings: Env }>) {
    try {
      const body: SavedDiagram = await c.req.json();
      const cache = c.get('cache') as CacheManager;
      const bucket = c.env.PREVIEW_DIAGRAMS;

      const key = `diagrams/${body.id}.json`;
      await bucket.put(key, JSON.stringify(body), {
        httpMetadata: {
          contentType: 'application/json',
        },
        customMetadata: {
          createdAt: new Date().toISOString(),
          type: 'preview-diagram',
        },
      });

      await cache.set(CacheKeyPrefix.DIAGRAM, body.id, body, CacheTTL.DIAGRAM);
      await invalidateCache(cache, CacheKeyPrefix.DIAGRAM, 'list');

      return c.json({
        success: true,
        id: body.id,
        message: 'Diagram saved successfully',
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        400
      );
    }
  },

  async get(c: Context<{ Bindings: Env }>) {
    try {
      const id = c.req.param('id');
      const cache = c.get('cache') as CacheManager;
      const bucket = c.env.PREVIEW_DIAGRAMS;

      const diagram = await getWithCache<SavedDiagram>(
        cache,
        CacheKeyPrefix.DIAGRAM,
        id,
        async () => {
          const key = `diagrams/${id}.json`;
          const object = await bucket.get(key);
          if (!object) return null;
          return await object.json();
        },
        CacheTTL.DIAGRAM
      );

      if (!diagram) {
        return c.json(
          {
            success: false,
            error: 'Diagram not found',
          },
          404
        );
      }

      return c.json({
        success: true,
        diagram,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  },

  async delete(c: Context<{ Bindings: Env }>) {
    try {
      const id = c.req.param('id');
      const cache = c.get('cache') as CacheManager;
      const bucket = c.env.PREVIEW_DIAGRAMS;

      const key = `diagrams/${id}.json`;
      await bucket.delete(key);

      await invalidateCache(cache, CacheKeyPrefix.DIAGRAM, id);
      await invalidateCache(cache, CacheKeyPrefix.DIAGRAM, 'list');

      return c.json({
        success: true,
        message: `Diagram ${id} deleted`,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  },
};
