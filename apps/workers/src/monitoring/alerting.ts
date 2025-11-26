/**
 * Error Tracking and Alerting System
 *
 * Provides error aggregation, alerting, and notification capabilities.
 */

import { StructuredLogger } from './logger';
import { MetricsSummary } from './metrics';

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  context: Record<string, any>;
  acknowledged: boolean;
}

export interface AlertRule {
  name: string;
  condition: (metrics: MetricsSummary) => boolean;
  severity: AlertSeverity;
  message: string;
  cooldownMs: number; // Minimum time between alerts
}

export interface AlertChannel {
  send(alert: Alert): Promise<void>;
}

/**
 * Console alert channel - logs alerts to console
 */
export class ConsoleAlertChannel implements AlertChannel {
  private logger: StructuredLogger;

  constructor() {
    this.logger = new StructuredLogger({ component: 'alerting' });
  }

  async send(alert: Alert): Promise<void> {
    const logMethod = alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.ERROR
      ? 'error'
      : alert.severity === AlertSeverity.WARNING
      ? 'warn'
      : 'info';

    this.logger[logMethod](`ALERT: ${alert.message}`, {
      alertId: alert.id,
      severity: alert.severity,
      ...alert.context,
    });
  }
}

/**
 * Webhook alert channel - sends alerts to external webhook
 */
export class WebhookAlertChannel implements AlertChannel {
  constructor(
    private webhookUrl: string,
    private headers: Record<string, string> = {}
  ) {}

  async send(alert: Alert): Promise<void> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
        },
        body: JSON.stringify({
          severity: alert.severity,
          message: alert.message,
          timestamp: alert.timestamp.toISOString(),
          context: alert.context,
          alert_id: alert.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send alert to webhook:', error);
      // Don't throw - we don't want alerting failures to break the app
    }
  }
}

/**
 * Alert manager - evaluates rules and sends alerts
 */
export class AlertManager {
  private rules: AlertRule[] = [];
  private channels: AlertChannel[] = [];
  private lastAlertTimes: Map<string, number> = new Map();
  private logger: StructuredLogger;

  constructor() {
    this.logger = new StructuredLogger({ component: 'alert_manager' });
    this.initializeDefaultRules();
  }

  /**
   * Add an alert channel
   */
  addChannel(channel: AlertChannel): void {
    this.channels.push(channel);
  }

  /**
   * Add an alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  /**
   * Evaluate all rules against current metrics
   */
  async evaluateRules(metrics: MetricsSummary): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const now = Date.now();

    for (const rule of this.rules) {
      try {
        if (rule.condition(metrics)) {
          // Check cooldown
          const lastAlertTime = this.lastAlertTimes.get(rule.name) || 0;
          if (now - lastAlertTime < rule.cooldownMs) {
            continue; // Still in cooldown
          }

          const alert: Alert = {
            id: `${rule.name}-${now}`,
            severity: rule.severity,
            message: rule.message,
            timestamp: new Date(),
            context: { metrics, ruleName: rule.name },
            acknowledged: false,
          };

          alerts.push(alert);
          this.lastAlertTimes.set(rule.name, now);

          // Send to all channels
          await this.sendAlert(alert);
        }
      } catch (error) {
        this.logger.error(
          'Failed to evaluate alert rule',
          error instanceof Error ? error : new Error(String(error)),
          { ruleName: rule.name }
        );
      }
    }

    return alerts;
  }

  /**
   * Send alert to all channels
   */
  private async sendAlert(alert: Alert): Promise<void> {
    this.logger.info('Sending alert', {
      alertId: alert.id,
      severity: alert.severity,
      message: alert.message,
    });

    await Promise.all(
      this.channels.map(async (channel) => {
        try {
          await channel.send(alert);
        } catch (error) {
          this.logger.error(
            'Failed to send alert to channel',
            error instanceof Error ? error : new Error(String(error)),
            { alertId: alert.id }
          );
        }
      })
    );
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    // High error rate alert
    this.addRule({
      name: 'high_error_rate',
      condition: (metrics) => metrics.errors.rate > 0.01, // > 1% error rate
      severity: AlertSeverity.ERROR,
      message: 'Error rate exceeded 1%',
      cooldownMs: 5 * 60 * 1000, // 5 minutes
    });

    // Critical error rate alert
    this.addRule({
      name: 'critical_error_rate',
      condition: (metrics) => metrics.errors.rate > 0.05, // > 5% error rate
      severity: AlertSeverity.CRITICAL,
      message: 'Error rate exceeded 5% - immediate action required',
      cooldownMs: 2 * 60 * 1000, // 2 minutes
    });

    // Slow response time alert
    this.addRule({
      name: 'slow_response_p95',
      condition: (metrics) => metrics.api.p95ResponseTime > 500,
      severity: AlertSeverity.WARNING,
      message: 'P95 response time exceeded 500ms',
      cooldownMs: 10 * 60 * 1000, // 10 minutes
    });

    // Very slow response time alert
    this.addRule({
      name: 'very_slow_response_p95',
      condition: (metrics) => metrics.api.p95ResponseTime > 1000,
      severity: AlertSeverity.ERROR,
      message: 'P95 response time exceeded 1000ms',
      cooldownMs: 5 * 60 * 1000, // 5 minutes
    });

    // Low cache hit rate alert
    this.addRule({
      name: 'low_cache_hit_rate',
      condition: (metrics) =>
        metrics.storage.kvCacheHitRate < 0.5 && metrics.api.totalCalls > 100,
      severity: AlertSeverity.WARNING,
      message: 'KV cache hit rate below 50%',
      cooldownMs: 15 * 60 * 1000, // 15 minutes
    });

    // AI API failure alert
    this.addRule({
      name: 'ai_api_failures',
      condition: (metrics) =>
        metrics.ai.successRate < 0.95 && metrics.ai.totalCalls > 10,
      severity: AlertSeverity.ERROR,
      message: 'AI API success rate below 95%',
      cooldownMs: 5 * 60 * 1000, // 5 minutes
    });

    // High AI cost alert
    this.addRule({
      name: 'high_ai_cost',
      condition: (metrics) => metrics.ai.estimatedCost > 10, // > $10 per hour
      severity: AlertSeverity.WARNING,
      message: 'AI API costs exceeding $10/hour',
      cooldownMs: 30 * 60 * 1000, // 30 minutes
    });
  }
}

// Singleton instance
let alertManagerInstance: AlertManager | null = null;

export function getAlertManager(): AlertManager {
  if (!alertManagerInstance) {
    alertManagerInstance = new AlertManager();
    // Add default console channel
    alertManagerInstance.addChannel(new ConsoleAlertChannel());
  }
  return alertManagerInstance;
}

/**
 * Initialize alert manager with custom configuration
 */
export function initializeAlerting(webhookUrl?: string, headers?: Record<string, string>): AlertManager {
  const manager = getAlertManager();

  // Add webhook channel if URL provided
  if (webhookUrl) {
    manager.addChannel(new WebhookAlertChannel(webhookUrl, headers));
  }

  return manager;
}
