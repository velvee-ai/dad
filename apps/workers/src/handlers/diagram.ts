import { Context } from 'hono';
import type { SavedDiagram } from '@daad/shared-types';

// TODO: Implement actual storage using R2/KV
// For now, these are mock handlers

export const diagramHandler = {
  async list(c: Context) {
    // TODO: Fetch from KV/R2
    return c.json({
      diagrams: [],
      total: 0,
    });
  },

  async save(c: Context) {
    try {
      const body: SavedDiagram = await c.req.json();
      // TODO: Save to R2/KV
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
    const id = c.req.param('id');
    // TODO: Fetch from R2/KV
    return c.json(
      {
        error: 'Not implemented',
        message: `Diagram ${id} fetch not implemented yet`,
      },
      501
    );
  },

  async delete(c: Context) {
    const id = c.req.param('id');
    // TODO: Delete from R2/KV
    return c.json({
      success: true,
      message: `Diagram ${id} deleted`,
    });
  },
};
