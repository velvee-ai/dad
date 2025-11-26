import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { analyzeHandler } from './handlers/analyze';
import { exportHandler } from './handlers/export';
import { diagramHandler } from './handlers/diagram';
import { createCacheManager } from './storage/cache';

type Bindings = {
  DAAD_CACHE: KVNamespace;
  CACHE_ENABLED?: string;
  CACHE_DEFAULT_TTL?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors());

app.use('/*', async (c, next) => {
  const cacheEnabled = c.env.CACHE_ENABLED === 'true';
  const cache = createCacheManager(c.env.DAAD_CACHE, cacheEnabled);
  c.set('cache', cache);
  await next();
});

app.get('/', (c) => {
  return c.json({
    name: 'DAAD Workers API',
    version: '0.0.1',
    status: 'healthy',
  });
});

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

app.post('/api/analyze', analyzeHandler);
app.post('/api/export', exportHandler);
app.get('/api/diagrams', diagramHandler.list);
app.post('/api/diagrams', diagramHandler.save);
app.get('/api/diagrams/:id', diagramHandler.get);
app.delete('/api/diagrams/:id', diagramHandler.delete);

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

export default app;
