import { Context } from 'hono';
import type { SavedDiagram } from '@daad/shared-types';
import { getMetrics } from '../monitoring/metrics';
import { PerformanceTimer } from '../monitoring/logger';
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
    const metrics = getMetrics();
    const timer = new PerformanceTimer();
    const logger = c.get('logger');

    try {
      logger?.info('Listing diagrams');
      const cache = c.get('cache') as CacheManager;
      const bucket = c.env.PREVIEW_DIAGRAMS;

      timer.mark('r2_list_start');

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

      timer.mark('r2_list_complete');
      metrics.trackR2Operation('get', timer.getDurationBetween('r2_list_start', 'r2_list_complete'));

      logger?.info('Diagrams listed', {
        duration: timer.getDuration(),
        count: diagrams?.length || 0,
      });

      return c.json({
        diagrams: diagrams || [],
        total: diagrams?.length || 0,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      metrics.trackError(err, 'diagram_list');

      logger?.error('Failed to list diagrams', err, {
        duration: timer.getDuration(),
      });

      return c.json(
        {
          success: false,
          error: err.message,
        },
        500
      );
    }
  },

  async save(c: Context<{ Bindings: Env }>) {
    const metrics = getMetrics();
    const timer = new PerformanceTimer();
    const logger = c.get('logger');

    try {
      const body: SavedDiagram = await c.req.json();
      const cache = c.get('cache') as CacheManager;
      const bucket = c.env.PREVIEW_DIAGRAMS;

      logger?.info('Saving diagram', { id: body.id });

      timer.mark('r2_save_start');

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

      timer.mark('r2_save_complete');
      metrics.trackR2Operation('put', timer.getDurationBetween('r2_save_start', 'r2_save_complete'));

      await cache.set(CacheKeyPrefix.DIAGRAM, body.id, body, CacheTTL.DIAGRAM);
      await invalidateCache(cache, CacheKeyPrefix.DIAGRAM, 'list');

      logger?.info('Diagram saved', {
        duration: timer.getDuration(),
        r2Duration: timer.getDurationBetween('r2_save_start', 'r2_save_complete'),
        id: body.id,
      });

      return c.json({
        success: true,
        id: body.id,
        message: 'Diagram saved successfully',
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      metrics.trackError(err, 'diagram_save');

      logger?.error('Diagram save failed', err, {
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
  },

  async get(c: Context<{ Bindings: Env }>) {
    const metrics = getMetrics();
    const timer = new PerformanceTimer();
    const logger = c.get('logger');

    try {
      const id = c.req.param('id');
      const cache = c.get('cache') as CacheManager;
      const bucket = c.env.PREVIEW_DIAGRAMS;

      logger?.info('Fetching diagram', { id });

      timer.mark('r2_fetch_start');

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

      timer.mark('r2_fetch_complete');
      metrics.trackR2Operation('get', timer.getDurationBetween('r2_fetch_start', 'r2_fetch_complete'));

      if (!diagram) {
        logger?.warn('Diagram not found', { id });
        return c.json(
          {
            success: false,
            error: 'Diagram not found',
          },
          404
        );
      }

      logger?.info('Diagram fetched', {
        duration: timer.getDuration(),
        id,
      });

      return c.json({
        success: true,
        diagram,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      metrics.trackError(err, 'diagram_get');

      logger?.error('Failed to fetch diagram', err, {
        duration: timer.getDuration(),
      });

      return c.json(
        {
          success: false,
          error: err.message,
        },
        500
      );
    }
  },

  async delete(c: Context<{ Bindings: Env }>) {
    const metrics = getMetrics();
    const timer = new PerformanceTimer();
    const logger = c.get('logger');

    try {
      const id = c.req.param('id');
      const cache = c.get('cache') as CacheManager;
      const bucket = c.env.PREVIEW_DIAGRAMS;

      logger?.info('Deleting diagram', { id });

      timer.mark('r2_delete_start');

      const key = `diagrams/${id}.json`;
      await bucket.delete(key);

      timer.mark('r2_delete_complete');
      metrics.trackR2Operation('delete', timer.getDurationBetween('r2_delete_start', 'r2_delete_complete'));

      await invalidateCache(cache, CacheKeyPrefix.DIAGRAM, id);
      await invalidateCache(cache, CacheKeyPrefix.DIAGRAM, 'list');

      logger?.info('Diagram deleted', {
        duration: timer.getDuration(),
        id,
      });

      return c.json({
        success: true,
        message: `Diagram ${id} deleted`,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      metrics.trackError(err, 'diagram_delete');

      logger?.error('Diagram deletion failed', err, {
        duration: timer.getDuration(),
      });

      return c.json(
        {
          success: false,
          error: err.message,
        },
        500
      );
    }
  },
};
