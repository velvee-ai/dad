import { Context } from 'hono';
import type { SavedDiagram } from '@daad/shared-types';
import {
  CacheManager,
  CacheKeyPrefix,
  CacheTTL,
  getWithCache,
  invalidateCache,
} from '../storage/cache';

export const diagramHandler = {
  async list(c: Context) {
    try {
      const cache = c.get('cache') as CacheManager;

      const diagrams = await getWithCache<SavedDiagram[]>(
        cache,
        CacheKeyPrefix.DIAGRAM,
        'list',
        async () => {
          return [];
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

  async save(c: Context) {
    try {
      const body: SavedDiagram = await c.req.json();
      const cache = c.get('cache') as CacheManager;

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

  async get(c: Context) {
    try {
      const id = c.req.param('id');
      const cache = c.get('cache') as CacheManager;

      const diagram = await getWithCache<SavedDiagram>(
        cache,
        CacheKeyPrefix.DIAGRAM,
        id,
        async () => {
          return null;
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

  async delete(c: Context) {
    try {
      const id = c.req.param('id');
      const cache = c.get('cache') as CacheManager;

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
