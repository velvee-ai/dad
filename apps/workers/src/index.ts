import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { analyzeHandler } from './handlers/analyze';
import { exportHandler } from './handlers/export';
import { diagramHandler } from './handlers/diagram';
import { handleRenderSVG, handleGetFormats } from './handlers/render';

const app = new Hono();

// CORS middleware
app.use('/*', cors());

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'DAAD Workers API',
    version: '0.0.1',
    status: 'healthy',
  });
});

// API routes
app.post('/api/analyze', analyzeHandler);
app.post('/api/export', exportHandler);
app.get('/api/diagrams', diagramHandler.list);
app.post('/api/diagrams', diagramHandler.save);
app.get('/api/diagrams/:id', diagramHandler.get);
app.delete('/api/diagrams/:id', diagramHandler.delete);

// Render routes
app.post('/api/render/svg', handleRenderSVG);
app.get('/api/render/formats', handleGetFormats);

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

export default app;
