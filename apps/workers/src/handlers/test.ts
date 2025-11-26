import { Context } from 'hono';
import type { Env } from '../types';

/**
 * Test handler for R2 bucket connectivity
 */
export async function testR2Handler(c: Context<{ Bindings: Env }>) {
  try {
    const bucket = c.env.PREVIEW_DIAGRAMS;

    const testKey = 'test/connectivity-check.json';
    const testData = {
      message: 'R2 connectivity test',
      timestamp: new Date().toISOString(),
      environment: c.env.ENVIRONMENT,
    };

    await bucket.put(testKey, JSON.stringify(testData), {
      httpMetadata: {
        contentType: 'application/json',
      },
    });

    const retrieved = await bucket.get(testKey);
    if (!retrieved) {
      return c.json(
        {
          success: false,
          error: 'Failed to retrieve test object',
        },
        500
      );
    }

    const retrievedData = await retrieved.json();

    await bucket.delete(testKey);

    return c.json({
      success: true,
      message: 'R2 bucket connectivity test passed',
      environment: c.env.ENVIRONMENT,
      testData: retrievedData,
      operations: {
        put: 'success',
        get: 'success',
        delete: 'success',
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'R2 connectivity test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}

/**
 * Health check handler with R2 binding verification
 */
export async function healthCheckHandler(c: Context<{ Bindings: Env }>) {
  const checks = {
    api: 'healthy',
    r2: 'unknown',
    environment: c.env.ENVIRONMENT,
  };

  try {
    const bucket = c.env.PREVIEW_DIAGRAMS;
    await bucket.list({ limit: 1 });
    checks.r2 = 'connected';
  } catch (error) {
    checks.r2 = 'error';
  }

  const allHealthy = Object.values(checks).every(
    (status) => status === 'healthy' || status === 'connected'
  );

  return c.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
    },
    allHealthy ? 200 : 503
  );
}
