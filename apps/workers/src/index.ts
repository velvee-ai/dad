import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { analyzeHandler } from './handlers/analyze';
import { exportHandler } from './handlers/export';
import { diagramHandler } from './handlers/diagram';
import { analyticsMiddleware, metricsEndpoint, healthCheckWithMetrics } from './middleware/analytics';
import { initializeMetrics } from './monitoring/metrics';

type Bindings = {
  ANALYTICS?: AnalyticsEngineDataset;
};

const app = new Hono<{ Bindings: Bindings }>();

// Initialize metrics on first request
app.use('/*', async (c, next) => {
  initializeMetrics(c.env.ANALYTICS);
  await next();
});

// CORS middleware
app.use('/*', cors());

// Analytics middleware for all routes
app.use('/*', analyticsMiddleware);

// Health check with metrics
app.get('/', healthCheckWithMetrics);

// Metrics endpoint
app.get('/metrics', metricsEndpoint);

// API routes
app.post('/api/analyze', analyzeHandler);
app.post('/api/export', exportHandler);
app.get('/api/diagrams', diagramHandler.list);
app.post('/api/diagrams', diagramHandler.save);
app.get('/api/diagrams/:id', diagramHandler.get);
app.delete('/api/diagrams/:id', diagramHandler.delete);

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

export default {
  fetch: app.fetch,

  // Scheduled handler for cleanup jobs
  async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
    const { cleanupHandler } = await import('./scheduled/cleanup');

    try {
      const result = await cleanupHandler(event, env);
      console.log('Cleanup job completed:', result);
    } catch (error) {
      console.error('Cleanup job failed:', error);
    }
  },
};
