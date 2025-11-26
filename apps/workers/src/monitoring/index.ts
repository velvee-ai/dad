/**
 * Monitoring Module Exports
 *
 * Central export point for all monitoring functionality.
 */

// Metrics
export {
  MetricsCollector,
  MetricsSummary,
  InMemoryMetricsCollector,
  CloudflareAnalyticsCollector,
  initializeMetrics,
  getMetrics,
} from './metrics';

// Logging
export {
  LogLevel,
  LogContext,
  LogEntry,
  StructuredLogger,
  createRequestLogger,
  logger,
  PerformanceTimer,
  logExecutionTime,
} from './logger';

// Alerting
export {
  AlertSeverity,
  Alert,
  AlertRule,
  AlertChannel,
  ConsoleAlertChannel,
  WebhookAlertChannel,
  AlertManager,
  getAlertManager,
  initializeAlerting,
} from './alerting';

// Dashboard
export {
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
