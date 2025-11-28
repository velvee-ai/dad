/**
 * Monitoring Module Exports
 *
 * Central export point for all monitoring functionality.
 */

// Metrics
export type { MetricsCollector, MetricsSummary } from './metrics';
export {
  InMemoryMetricsCollector,
  CloudflareAnalyticsCollector,
  initializeMetrics,
  getMetrics,
} from './metrics';

// Logging
export type { LogLevel, LogContext, LogEntry } from './logger';
export {
  StructuredLogger,
  createRequestLogger,
  logger,
  PerformanceTimer,
  logExecutionTime,
} from './logger';

// Alerting
export type { AlertSeverity, Alert, AlertRule, AlertChannel } from './alerting';
export {
  ConsoleAlertChannel,
  WebhookAlertChannel,
  AlertManager,
  getAlertManager,
  initializeAlerting,
} from './alerting';

// Dashboard
export type {
  DashboardData,
  OverviewMetrics,
  PerformanceMetrics,
  EndpointMetric,
  StorageMetrics,
  AIMetrics,
  ProviderMetric,
  ErrorMetrics,
  RecentError,
  SLATargets,
  SLACompliance,
} from './dashboard';
export {
  DEFAULT_SLA_TARGETS,
  transformToDashboardData,
  getHealthBadge,
  formatBytes,
  formatCurrency,
  formatPercentage,
  formatDuration,
  calculateSLA,
  generateDashboardSummary,
} from './dashboard';
