import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { analyzeHandler } from './handlers/analyze';
import { batchAnalyzeHandler } from './handlers/batch-analyze';
import { exportHandler } from './handlers/export';
import { diagramHandler } from './handlers/diagram';
import { analyzePreview, getDiagram, getManifest } from './handlers/preview';
import { testR2Handler, healthCheckHandler } from './handlers/test';
import { analyticsMiddleware, metricsEndpoint, healthCheckWithMetrics } from './middleware/analytics';
import { initializeMetrics } from './monitoring/metrics';
import cleanupWorker from './scheduled/cleanup';
import { createCacheManager } from './storage/cache';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// Initialize metrics on first request
app.use('/*', async (c, next) => {
  initializeMetrics(c.env.ANALYTICS);
  await next();
});

// CORS middleware
app.use('/*', cors());

// Cache middleware
app.use('/*', async (c, next) => {
  const cacheEnabled = c.env.CACHE_ENABLED === 'true';
  const cache = createCacheManager(c.env.DAAD_CACHE, cacheEnabled);
  c.set('cache', cache);
  await next();
});

// Analytics middleware for all routes
app.use('/*', analyticsMiddleware);

// Health check with metrics
app.get('/', healthCheckWithMetrics);
app.get('/health', healthCheckHandler);

// Metrics endpoint
app.get('/metrics', metricsEndpoint);

// Test routes
app.get('/api/test/r2', testR2Handler);

// Cache metrics endpoints
app.get('/api/metrics/cache', (c) => {
  const cache = c.get('cache');
  const metrics = cache.getMetrics();
  return c.json({
    success: true,
    metrics: {
      hits: metrics.hits,
      misses: metrics.misses,
      sets: metrics.sets,
      deletes: metrics.deletes,
      hitRate: metrics.hitRate,
      hitRatePercentage: `${(metrics.hitRate * 100).toFixed(2)}%`,
    },
  });
});

app.post('/api/metrics/cache/reset', (c) => {
  const cache = c.get('cache');
  cache.resetMetrics();
  return c.json({
    success: true,
    message: 'Cache metrics reset successfully',
  });
});

// API routes
app.post('/api/analyze', analyzeHandler);
app.post('/api/batch/analyze', batchAnalyzeHandler);
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
