import { Context } from 'hono';
import type { SavedDiagram } from '@daad/shared-types';
import { getMetrics } from '../monitoring/metrics';
import { PerformanceTimer } from '../monitoring/logger';
import type { Env } from '../types';

export const diagramHandler = {
  async list(c: Context<{ Bindings: Env }>) {
    const metrics = getMetrics();
    const timer = new PerformanceTimer();
    const logger = c.get('logger');

    try {
      logger?.info('Listing diagrams');
      timer.mark('r2_list_start');

      const bucket = c.env.PREVIEW_DIAGRAMS;
      const listed = await bucket.list();

      timer.mark('r2_list_complete');
      metrics.trackR2Operation('get', timer.getDurationBetween('r2_list_start', 'r2_list_complete'));

      const diagrams = await Promise.all(
        listed.objects.map(async (obj) => {
          const object = await bucket.get(obj.key);
          if (!object) return null;
          return await object.json();
        })
      );

      logger?.info('Diagrams listed', {
        duration: timer.getDuration(),
        count: listed.objects.length,
      });

      return c.json({
        diagrams: diagrams.filter(Boolean),
        total: listed.objects.length,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      metrics.trackError(err, 'diagram_list');

      logger?.error('Failed to list diagrams', err, {
        duration: timer.getDuration(),
      });

      return c.json(
        {
          error: 'Failed to list diagrams',
          message: err.message,
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
      logger?.info('Saving diagram', { id: body.id });

      timer.mark('r2_save_start');

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

      timer.mark('r2_save_complete');
      metrics.trackR2Operation('put', timer.getDurationBetween('r2_save_start', 'r2_save_complete'));

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
      logger?.info('Fetching diagram', { id });

      timer.mark('r2_fetch_start');

      const bucket = c.env.PREVIEW_DIAGRAMS;
      const key = `diagrams/${id}.json`;
      const object = await bucket.get(key);

      timer.mark('r2_fetch_complete');
      metrics.trackR2Operation('get', timer.getDurationBetween('r2_fetch_start', 'r2_fetch_complete'));

      if (!object) {
        logger?.warn('Diagram not found', { id });
        return c.json(
          {
            error: 'Not found',
            message: `Diagram ${id} not found`,
          },
          404
        );
      }

      const diagram = await object.json();

      logger?.info('Diagram fetched', {
        duration: timer.getDuration(),
        id,
      });

      return c.json(diagram);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      metrics.trackError(err, 'diagram_get');

      logger?.error('Failed to fetch diagram', err, {
        duration: timer.getDuration(),
      });

      return c.json(
        {
          error: 'Failed to fetch diagram',
          message: err.message,
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
      logger?.info('Deleting diagram', { id });

      timer.mark('r2_delete_start');

      const bucket = c.env.PREVIEW_DIAGRAMS;
      const key = `diagrams/${id}.json`;
      await bucket.delete(key);

      timer.mark('r2_delete_complete');
      metrics.trackR2Operation('delete', timer.getDurationBetween('r2_delete_start', 'r2_delete_complete'));

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
