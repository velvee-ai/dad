import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { analyzeHandler } from './handlers/analyze';
import { exportHandler } from './handlers/export';
import { diagramHandler } from './handlers/diagram';
import { analyzePreview, getDiagram, getManifest } from './handlers/preview';
import { testR2Handler, healthCheckHandler } from './handlers/test';
import cleanupWorker from './scheduled/cleanup';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('/*', cors());

// Health check
app.get('/', healthCheckHandler);
app.get('/health', healthCheckHandler);

// Test routes
app.get('/api/test/r2', testR2Handler);

// API routes
app.post('/api/analyze', analyzeHandler);
app.post('/api/export', exportHandler);
app.get('/api/diagrams', diagramHandler.list);
app.post('/api/diagrams', diagramHandler.save);
app.get('/api/diagrams/:id', diagramHandler.get);
app.delete('/api/diagrams/:id', diagramHandler.delete);

// Preview API routes
app.post('/api/preview/analyze', analyzePreview);
app.get('/api/preview/:sha/manifest', getManifest);
app.get('/api/preview/:sha/:fileId', getDiagram);

// Error handling
app.onError((err, c) => {
  console.error(err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: 'The requested resource was not found',
    },
    404
  );
});

// Export the main worker with both HTTP and scheduled handlers
export default {
  fetch: app.fetch,
  scheduled: cleanupWorker.scheduled,
};
