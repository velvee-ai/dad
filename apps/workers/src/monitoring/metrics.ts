/**
 * Metrics Collection System
 *
 * Tracks performance and operational metrics for the DAAD Workers API.
 * Integrates with Cloudflare Analytics and provides custom metrics collection.
 */

export interface MetricsCollector {
  trackApiCall(endpoint: string, duration: number, status: number): void;
  trackDiagramGeneration(duration: number, success: boolean): void;
  trackR2Operation(operation: 'get' | 'put' | 'delete', duration: number): void;
  trackKVOperation(operation: 'get' | 'put', hit: boolean): void;
  trackAIApiCall(provider: string, duration: number, cost?: number, success?: boolean): void;
  trackError(error: Error, context: string): void;
  getMetrics(): MetricsSummary;
}

export interface MetricsSummary {
  api: {
    totalCalls: number;
    successRate: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };
  storage: {
    r2Operations: number;
    kvCacheHitRate: number;
  };
  ai: {
    totalCalls: number;
    successRate: number;
    estimatedCost: number;
  };
  errors: {
    total: number;
    rate: number;
  };
}

interface MetricDataPoint {
  timestamp: number;
  value: number;
  tags?: Record<string, string>;
}

/**
 * In-memory metrics collector for Cloudflare Workers
 *
 * Stores recent metrics for aggregation and reporting.
 * Uses sliding window to prevent unbounded memory growth.
 */
export class InMemoryMetricsCollector implements MetricsCollector {
  private apiCalls: MetricDataPoint[] = [];
  private diagramGenerations: MetricDataPoint[] = [];
  private r2Operations: MetricDataPoint[] = [];
  private kvOperations: { hits: number; misses: number } = { hits: 0, misses: 0 };
  private aiCalls: MetricDataPoint[] = [];
  private errors: Array<{ error: Error; context: string; timestamp: number }> = [];

  private readonly MAX_DATA_POINTS = 1000;
  private readonly WINDOW_MS = 60 * 60 * 1000; // 1 hour

  trackApiCall(endpoint: string, duration: number, status: number): void {
    this.addDataPoint(this.apiCalls, duration, {
      endpoint,
      status: status.toString(),
      success: status >= 200 && status < 300 ? 'true' : 'false',
    });
  }

  trackDiagramGeneration(duration: number, success: boolean): void {
    this.addDataPoint(this.diagramGenerations, duration, {
      success: success.toString(),
    });
  }

  trackR2Operation(operation: 'get' | 'put' | 'delete', duration: number): void {
    this.addDataPoint(this.r2Operations, duration, { operation });
  }

  trackKVOperation(operation: 'get' | 'put', hit: boolean): void {
    if (operation === 'get') {
      if (hit) {
        this.kvOperations.hits++;
      } else {
        this.kvOperations.misses++;
      }
    }
  }

  trackAIApiCall(
    provider: string,
    duration: number,
    cost?: number,
    success?: boolean
  ): void {
    this.addDataPoint(this.aiCalls, duration, {
      provider,
      success: success !== undefined ? success.toString() : 'true',
      cost: cost?.toString(),
    });
  }

  trackError(error: Error, context: string): void {
    this.errors.push({
      error,
      context,
      timestamp: Date.now(),
    });
    this.cleanupOldData(this.errors);
  }

  getMetrics(): MetricsSummary {
    const now = Date.now();
    const recentApiCalls = this.getRecentDataPoints(this.apiCalls, now);
    const recentAiCalls = this.getRecentDataPoints(this.aiCalls, now);
    const recentErrors = this.errors.filter(
      (e) => now - e.timestamp < this.WINDOW_MS
    );

    return {
      api: {
        totalCalls: recentApiCalls.length,
        successRate: this.calculateSuccessRate(recentApiCalls),
        p50ResponseTime: this.calculatePercentile(recentApiCalls, 50),
        p95ResponseTime: this.calculatePercentile(recentApiCalls, 95),
        p99ResponseTime: this.calculatePercentile(recentApiCalls, 99),
      },
      storage: {
        r2Operations: this.r2Operations.length,
        kvCacheHitRate: this.calculateCacheHitRate(),
      },
      ai: {
        totalCalls: recentAiCalls.length,
        successRate: this.calculateSuccessRate(recentAiCalls),
        estimatedCost: this.calculateTotalCost(recentAiCalls),
      },
      errors: {
        total: recentErrors.length,
        rate: recentApiCalls.length > 0
          ? recentErrors.length / recentApiCalls.length
          : 0,
      },
    };
  }

  private addDataPoint(
    array: MetricDataPoint[],
    value: number,
    tags?: Record<string, string>
  ): void {
    array.push({
      timestamp: Date.now(),
      value,
      tags,
    });
    this.cleanupOldData(array);
  }

  private cleanupOldData(array: any[]): void {
    if (array.length > this.MAX_DATA_POINTS) {
      array.splice(0, array.length - this.MAX_DATA_POINTS);
    }
  }

  private getRecentDataPoints(
    array: MetricDataPoint[],
    now: number
  ): MetricDataPoint[] {
    return array.filter((dp) => now - dp.timestamp < this.WINDOW_MS);
  }

  private calculateSuccessRate(dataPoints: MetricDataPoint[]): number {
    if (dataPoints.length === 0) return 1;
    const successes = dataPoints.filter(
      (dp) => dp.tags?.success === 'true'
    ).length;
    return successes / dataPoints.length;
  }

  private calculatePercentile(
    dataPoints: MetricDataPoint[],
    percentile: number
  ): number {
    if (dataPoints.length === 0) return 0;
    const sorted = dataPoints.map((dp) => dp.value).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateCacheHitRate(): number {
    const total = this.kvOperations.hits + this.kvOperations.misses;
    return total > 0 ? this.kvOperations.hits / total : 0;
  }

  private calculateTotalCost(dataPoints: MetricDataPoint[]): number {
    return dataPoints.reduce((sum, dp) => {
      const cost = dp.tags?.cost ? parseFloat(dp.tags.cost) : 0;
      return sum + cost;
    }, 0);
  }
}

/**
 * Cloudflare Analytics integration
 *
 * Sends metrics to Cloudflare Analytics for persistent storage and dashboarding.
 */
export class CloudflareAnalyticsCollector implements MetricsCollector {
  constructor(
    private analytics?: AnalyticsEngineDataset,
    private fallback: MetricsCollector = new InMemoryMetricsCollector()
  ) {}

  trackApiCall(endpoint: string, duration: number, status: number): void {
    this.fallback.trackApiCall(endpoint, duration, status);

    if (this.analytics) {
      this.analytics.writeDataPoint({
        blobs: [endpoint],
        doubles: [duration],
        indexes: [`status:${status}`],
      });
    }
  }

  trackDiagramGeneration(duration: number, success: boolean): void {
    this.fallback.trackDiagramGeneration(duration, success);

    if (this.analytics) {
      this.analytics.writeDataPoint({
        blobs: ['diagram_generation'],
        doubles: [duration],
        indexes: [`success:${success}`],
      });
    }
  }

  trackR2Operation(operation: 'get' | 'put' | 'delete', duration: number): void {
    this.fallback.trackR2Operation(operation, duration);

    if (this.analytics) {
      this.analytics.writeDataPoint({
        blobs: ['r2_operation', operation],
        doubles: [duration],
        indexes: [],
      });
    }
  }

  trackKVOperation(operation: 'get' | 'put', hit: boolean): void {
    this.fallback.trackKVOperation(operation, hit);

    if (this.analytics) {
      this.analytics.writeDataPoint({
        blobs: ['kv_operation', operation],
        doubles: [hit ? 1 : 0],
        indexes: [`hit:${hit}`],
      });
    }
  }

  trackAIApiCall(
    provider: string,
    duration: number,
    cost?: number,
    success?: boolean
  ): void {
    this.fallback.trackAIApiCall(provider, duration, cost, success);

    if (this.analytics) {
      this.analytics.writeDataPoint({
        blobs: ['ai_api_call', provider],
        doubles: [duration, cost || 0],
        indexes: [`success:${success !== false}`],
      });
    }
  }

  trackError(error: Error, context: string): void {
    this.fallback.trackError(error, context);

    if (this.analytics) {
      this.analytics.writeDataPoint({
        blobs: ['error', context, error.name],
        doubles: [1],
        indexes: [error.message.substring(0, 100)],
      });
    }
  }

  getMetrics(): MetricsSummary {
    return this.fallback.getMetrics();
  }
}

// Singleton instance
let metricsInstance: MetricsCollector | null = null;

export function initializeMetrics(analytics?: AnalyticsEngineDataset): MetricsCollector {
  metricsInstance = new CloudflareAnalyticsCollector(analytics);
  return metricsInstance;
}

export function getMetrics(): MetricsCollector {
  if (!metricsInstance) {
    metricsInstance = new InMemoryMetricsCollector();
  }
  return metricsInstance;
}
