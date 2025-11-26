/**
 * Analytics Middleware
 *
 * Tracks request metrics, performance, and errors for all API endpoints.
 */

import { Context, Next } from 'hono';
import { getMetrics } from '../monitoring/metrics';
import { createRequestLogger, PerformanceTimer } from '../monitoring/logger';
import { nanoid } from 'nanoid';

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return nanoid(10);
}

/**
 * Analytics middleware for tracking request metrics
 */
export async function analyticsMiddleware(c: Context, next: Next) {
  const requestId = generateRequestId();
  const endpoint = `${c.req.method} ${c.req.path}`;
  const timer = new PerformanceTimer();
  const metrics = getMetrics();
  const logger = createRequestLogger(requestId, endpoint);

  // Store request ID and logger in context for handlers to use
  c.set('requestId', requestId);
  c.set('logger', logger);
  c.set('timer', timer);

  logger.info('Request started', {
    method: c.req.method,
    path: c.req.path,
    userAgent: c.req.header('user-agent'),
  });

  try {
    await next();

    const duration = timer.getDuration();
    const status = c.res.status;

    // Track successful request
    metrics.trackApiCall(endpoint, duration, status);

    logger.info('Request completed', {
      status,
      duration,
      success: status >= 200 && status < 300,
    });

    // Add performance headers
    c.header('X-Request-ID', requestId);
    c.header('X-Response-Time', `${duration}ms`);
  } catch (error) {
    const duration = timer.getDuration();
    const err = error instanceof Error ? error : new Error(String(error));

    // Track failed request
    metrics.trackApiCall(endpoint, duration, 500);
    metrics.trackError(err, endpoint);

    logger.error('Request failed', err, {
      duration,
    });

    // Add error headers
    c.header('X-Request-ID', requestId);
    c.header('X-Response-Time', `${duration}ms`);

    throw error;
  }
}

/**
 * Metrics endpoint middleware
 *
 * Provides a /metrics endpoint for Prometheus-style metrics scraping.
 */
export async function metricsEndpoint(c: Context) {
  const metrics = getMetrics();
  const summary = metrics.getMetrics();

  return c.json({
    timestamp: new Date().toISOString(),
    metrics: summary,
    prometheus: convertToPrometheusFormat(summary),
  });
}

/**
 * Convert metrics to Prometheus format
 */
function convertToPrometheusFormat(summary: any): string {
  const lines: string[] = [];

  // API metrics
  lines.push('# HELP api_requests_total Total number of API requests');
  lines.push('# TYPE api_requests_total counter');
  lines.push(`api_requests_total ${summary.api.totalCalls}`);

  lines.push('# HELP api_success_rate Success rate of API requests');
  lines.push('# TYPE api_success_rate gauge');
  lines.push(`api_success_rate ${summary.api.successRate}`);

  lines.push('# HELP api_response_time_p50 50th percentile response time in ms');
  lines.push('# TYPE api_response_time_p50 gauge');
  lines.push(`api_response_time_p50 ${summary.api.p50ResponseTime}`);

  lines.push('# HELP api_response_time_p95 95th percentile response time in ms');
  lines.push('# TYPE api_response_time_p95 gauge');
  lines.push(`api_response_time_p95 ${summary.api.p95ResponseTime}`);

  lines.push('# HELP api_response_time_p99 99th percentile response time in ms');
  lines.push('# TYPE api_response_time_p99 gauge');
  lines.push(`api_response_time_p99 ${summary.api.p99ResponseTime}`);

  // Storage metrics
  lines.push('# HELP r2_operations_total Total number of R2 operations');
  lines.push('# TYPE r2_operations_total counter');
  lines.push(`r2_operations_total ${summary.storage.r2Operations}`);

  lines.push('# HELP kv_cache_hit_rate KV cache hit rate');
  lines.push('# TYPE kv_cache_hit_rate gauge');
  lines.push(`kv_cache_hit_rate ${summary.storage.kvCacheHitRate}`);

  // AI metrics
  lines.push('# HELP ai_api_calls_total Total number of AI API calls');
  lines.push('# TYPE ai_api_calls_total counter');
  lines.push(`ai_api_calls_total ${summary.ai.totalCalls}`);

  lines.push('# HELP ai_api_success_rate AI API success rate');
  lines.push('# TYPE ai_api_success_rate gauge');
  lines.push(`ai_api_success_rate ${summary.ai.successRate}`);

  lines.push('# HELP ai_api_cost_total Estimated AI API cost');
  lines.push('# TYPE ai_api_cost_total counter');
  lines.push(`ai_api_cost_total ${summary.ai.estimatedCost}`);

  // Error metrics
  lines.push('# HELP errors_total Total number of errors');
  lines.push('# TYPE errors_total counter');
  lines.push(`errors_total ${summary.errors.total}`);

  lines.push('# HELP error_rate Error rate');
  lines.push('# TYPE error_rate gauge');
  lines.push(`error_rate ${summary.errors.rate}`);

  return lines.join('\n');
}

/**
 * Health check with metrics
 */
export async function healthCheckWithMetrics(c: Context) {
  const metrics = getMetrics();
  const summary = metrics.getMetrics();

  // Determine health status based on metrics
  const isHealthy =
    summary.errors.rate < 0.01 && // Error rate < 1%
    summary.api.p95ResponseTime < 500; // P95 < 500ms

  const status = isHealthy ? 'healthy' : 'degraded';

  return c.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        errorRate: {
          status: summary.errors.rate < 0.01 ? 'pass' : 'fail',
          value: summary.errors.rate,
          threshold: 0.01,
        },
        responseTime: {
          status: summary.api.p95ResponseTime < 500 ? 'pass' : 'fail',
          value: summary.api.p95ResponseTime,
          threshold: 500,
        },
      },
      metrics: {
        totalRequests: summary.api.totalCalls,
        successRate: summary.api.successRate,
        p95ResponseTime: summary.api.p95ResponseTime,
      },
    },
    isHealthy ? 200 : 503
  );
}
