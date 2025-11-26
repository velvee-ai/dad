/**
 * Metrics Dashboard Types and Utilities
 *
 * Provides data structures and helpers for building monitoring dashboards.
 */

import { MetricsSummary } from './metrics';
import { Alert } from './alerting';

export interface DashboardData {
  overview: OverviewMetrics;
  performance: PerformanceMetrics;
  storage: StorageMetrics;
  ai: AIMetrics;
  errors: ErrorMetrics;
  alerts: Alert[];
  timestamp: string;
}

export interface OverviewMetrics {
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  status: 'healthy' | 'degraded' | 'down';
  uptime: number; // in seconds
}

export interface PerformanceMetrics {
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  slowestEndpoints: EndpointMetric[];
}

export interface EndpointMetric {
  endpoint: string;
  avgResponseTime: number;
  requestCount: number;
  errorRate: number;
}

export interface StorageMetrics {
  r2Operations: number;
  r2OperationsPerSecond: number;
  kvCacheHitRate: number;
  estimatedStorageSize: number; // in bytes
  estimatedStorageCost: number; // in dollars
}

export interface AIMetrics {
  totalCalls: number;
  successRate: number;
  avgResponseTime: number;
  estimatedCost: number;
  costPerRequest: number;
  providers: ProviderMetric[];
}

export interface ProviderMetric {
  provider: string;
  calls: number;
  successRate: number;
  avgCost: number;
}

export interface ErrorMetrics {
  total: number;
  rate: number;
  byType: Record<string, number>;
  recent: RecentError[];
}

export interface RecentError {
  timestamp: string;
  message: string;
  context: string;
  count: number;
}

/**
 * Transform metrics summary to dashboard data
 */
export function transformToDashboardData(
  summary: MetricsSummary,
  alerts: Alert[] = [],
  startTime: number = Date.now() - 60 * 60 * 1000 // Default 1 hour ago
): DashboardData {
  const now = Date.now();
  const uptimeSeconds = (now - startTime) / 1000;

  // Determine overall status
  const status =
    summary.errors.rate > 0.05 || summary.api.p95ResponseTime > 1000
      ? 'down'
      : summary.errors.rate > 0.01 || summary.api.p95ResponseTime > 500
      ? 'degraded'
      : 'healthy';

  return {
    overview: {
      totalRequests: summary.api.totalCalls,
      successRate: summary.api.successRate,
      avgResponseTime: summary.api.p50ResponseTime,
      status,
      uptime: uptimeSeconds,
    },
    performance: {
      p50ResponseTime: summary.api.p50ResponseTime,
      p95ResponseTime: summary.api.p95ResponseTime,
      p99ResponseTime: summary.api.p99ResponseTime,
      requestsPerSecond: uptimeSeconds > 0 ? summary.api.totalCalls / uptimeSeconds : 0,
      slowestEndpoints: [], // TODO: Implement endpoint-specific tracking
    },
    storage: {
      r2Operations: summary.storage.r2Operations,
      r2OperationsPerSecond: uptimeSeconds > 0 ? summary.storage.r2Operations / uptimeSeconds : 0,
      kvCacheHitRate: summary.storage.kvCacheHitRate,
      estimatedStorageSize: 0, // TODO: Implement actual storage tracking
      estimatedStorageCost: 0, // TODO: Calculate from storage size
    },
    ai: {
      totalCalls: summary.ai.totalCalls,
      successRate: summary.ai.successRate,
      avgResponseTime: 0, // TODO: Track AI response times
      estimatedCost: summary.ai.estimatedCost,
      costPerRequest: summary.ai.totalCalls > 0 ? summary.ai.estimatedCost / summary.ai.totalCalls : 0,
      providers: [], // TODO: Implement provider-specific tracking
    },
    errors: {
      total: summary.errors.total,
      rate: summary.errors.rate,
      byType: {}, // TODO: Implement error type tracking
      recent: [], // TODO: Implement recent error tracking
    },
    alerts,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate health status badge text
 */
export function getHealthBadge(status: 'healthy' | 'degraded' | 'down'): string {
  const badges = {
    healthy: '🟢 Healthy',
    degraded: '🟡 Degraded',
    down: '🔴 Down',
  };
  return badges[status];
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format currency to human-readable string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

/**
 * Format percentage to human-readable string
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}

/**
 * Calculate SLA compliance
 */
export function calculateSLA(metrics: MetricsSummary, targets: SLATargets): SLACompliance {
  return {
    availability: {
      target: targets.availability,
      actual: metrics.api.successRate,
      compliant: metrics.api.successRate >= targets.availability,
    },
    responseTime: {
      target: targets.p95ResponseTime,
      actual: metrics.api.p95ResponseTime,
      compliant: metrics.api.p95ResponseTime <= targets.p95ResponseTime,
    },
    errorRate: {
      target: targets.maxErrorRate,
      actual: metrics.errors.rate,
      compliant: metrics.errors.rate <= targets.maxErrorRate,
    },
  };
}

export interface SLATargets {
  availability: number; // 0.0 to 1.0 (e.g., 0.999 = 99.9%)
  p95ResponseTime: number; // in milliseconds
  maxErrorRate: number; // 0.0 to 1.0
}

export interface SLACompliance {
  availability: {
    target: number;
    actual: number;
    compliant: boolean;
  };
  responseTime: {
    target: number;
    actual: number;
    compliant: boolean;
  };
  errorRate: {
    target: number;
    actual: number;
    compliant: boolean;
  };
}

/**
 * Default SLA targets
 */
export const DEFAULT_SLA_TARGETS: SLATargets = {
  availability: 0.999, // 99.9%
  p95ResponseTime: 500, // 500ms
  maxErrorRate: 0.01, // 1%
};

/**
 * Generate text summary for dashboard
 */
export function generateDashboardSummary(data: DashboardData): string {
  const lines: string[] = [];

  lines.push(`System Status: ${getHealthBadge(data.overview.status)}`);
  lines.push(`Uptime: ${formatDuration(data.overview.uptime * 1000)}`);
  lines.push('');
  lines.push('Performance:');
  lines.push(`  Total Requests: ${data.overview.totalRequests.toLocaleString()}`);
  lines.push(`  Success Rate: ${formatPercentage(data.overview.successRate)}`);
  lines.push(`  P50 Response Time: ${formatDuration(data.performance.p50ResponseTime)}`);
  lines.push(`  P95 Response Time: ${formatDuration(data.performance.p95ResponseTime)}`);
  lines.push(`  P99 Response Time: ${formatDuration(data.performance.p99ResponseTime)}`);
  lines.push('');
  lines.push('Storage:');
  lines.push(`  R2 Operations: ${data.storage.r2Operations.toLocaleString()}`);
  lines.push(`  KV Cache Hit Rate: ${formatPercentage(data.storage.kvCacheHitRate)}`);
  lines.push('');
  lines.push('AI Services:');
  lines.push(`  Total Calls: ${data.ai.totalCalls.toLocaleString()}`);
  lines.push(`  Success Rate: ${formatPercentage(data.ai.successRate)}`);
  lines.push(`  Estimated Cost: ${formatCurrency(data.ai.estimatedCost)}`);
  lines.push('');
  lines.push('Errors:');
  lines.push(`  Total Errors: ${data.errors.total.toLocaleString()}`);
  lines.push(`  Error Rate: ${formatPercentage(data.errors.rate)}`);

  if (data.alerts.length > 0) {
    lines.push('');
    lines.push(`Active Alerts: ${data.alerts.length}`);
    for (const alert of data.alerts.slice(0, 5)) {
      lines.push(`  - [${alert.severity.toUpperCase()}] ${alert.message}`);
    }
  }

  return lines.join('\n');
}
