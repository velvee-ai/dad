import { Context } from 'hono';
import type { SavedDiagram } from '@daad/shared-types';
import type { Env } from '../types';

export const diagramHandler = {
  async list(c: Context<{ Bindings: Env }>) {
    try {
      const bucket = c.env.PREVIEW_DIAGRAMS;
      const listed = await bucket.list();

      const diagrams = await Promise.all(
        listed.objects.map(async (obj) => {
          const object = await bucket.get(obj.key);
          if (!object) return null;
          return await object.json();
        })
      );

      return c.json({
        diagrams: diagrams.filter(Boolean),
        total: listed.objects.length,
      });
    } catch (error) {
      return c.json(
        {
          error: 'Failed to list diagrams',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  },

  async save(c: Context<{ Bindings: Env }>) {
    try {
      const body: SavedDiagram = await c.req.json();
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
      const bucket = c.env.PREVIEW_DIAGRAMS;

      const key = `diagrams/${id}.json`;
      const object = await bucket.get(key);

      if (!object) {
        return c.json(
          {
            error: 'Not found',
            message: `Diagram ${id} not found`,
          },
          404
        );
      }

      const diagram = await object.json();
      return c.json(diagram);
    } catch (error) {
      return c.json(
        {
          error: 'Failed to fetch diagram',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  },

  async delete(c: Context<{ Bindings: Env }>) {
    try {
      const id = c.req.param('id');
      const bucket = c.env.PREVIEW_DIAGRAMS;

      const key = `diagrams/${id}.json`;
      await bucket.delete(key);

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
