# Monitoring and Performance Metrics

Comprehensive monitoring and performance tracking system for the DAD Workers API.

## Overview

The monitoring system provides:
- Real-time metrics collection
- Performance tracking (p50, p95, p99)
- Error tracking and alerting
- Storage and cache metrics
- AI API usage and cost tracking
- Automated cleanup with metrics
- Cloudflare Analytics integration

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    API Endpoints                         │
│  /api/analyze, /api/export, /api/diagrams/*            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│             Analytics Middleware                         │
│  - Request tracking                                     │
│  - Performance timing                                   │
│  - Error capture                                        │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│             Metrics Collector                           │
│  - In-memory aggregation                               │
│  - Cloudflare Analytics Engine                         │
│  - Percentile calculations                             │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│             Alert Manager                               │
│  - Rule evaluation                                      │
│  - Alert channels (console, webhook)                   │
│  - Cooldown management                                 │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Enable Analytics

The monitoring system is enabled by default. Metrics are automatically collected for all API requests.

### 2. View Metrics

Access metrics via the `/metrics` endpoint:

```bash
curl https://your-worker.workers.dev/metrics
```

Response includes:
- API metrics (total calls, success rate, response times)
- Storage metrics (R2 operations, KV cache hit rate)
- AI metrics (total calls, success rate, estimated cost)
- Error metrics (total errors, error rate)
- Prometheus-formatted metrics

### 3. Health Check

The root endpoint (`/`) now includes health metrics:

```bash
curl https://your-worker.workers.dev/
```

Returns:
- Overall health status (healthy/degraded)
- Error rate and response time checks
- Current metrics summary

## Metrics Tracked

### API Metrics
- **Total Calls**: Count of all API requests
- **Success Rate**: Percentage of successful requests (2xx status)
- **Response Times**:
  - P50 (median): 50th percentile response time
  - P95: 95th percentile response time
  - P99: 99th percentile response time

### Storage Metrics
- **R2 Operations**: Count of R2 bucket operations (get/put/delete)
- **KV Cache Hit Rate**: Percentage of cache hits vs misses

### AI Metrics
- **Total Calls**: Count of AI API calls
- **Success Rate**: Percentage of successful AI calls
- **Estimated Cost**: Running cost estimate based on usage

### Error Metrics
- **Total Errors**: Count of all errors
- **Error Rate**: Errors per request

## Alerting

### Default Alert Rules

The system includes these pre-configured alert rules:

| Rule | Threshold | Severity | Cooldown |
|------|-----------|----------|----------|
| High Error Rate | > 1% | ERROR | 5 min |
| Critical Error Rate | > 5% | CRITICAL | 2 min |
| Slow Response (P95) | > 500ms | WARNING | 10 min |
| Very Slow Response (P95) | > 1000ms | ERROR | 5 min |
| Low Cache Hit Rate | < 50% | WARNING | 15 min |
| AI API Failures | Success < 95% | ERROR | 5 min |
| High AI Cost | > $10/hour | WARNING | 30 min |

### Alert Channels

#### Console Channel (Default)
Alerts are logged to console with structured format.

#### Webhook Channel
Configure webhook alerts via environment variable:

```toml
# wrangler.toml
[vars]
ALERT_WEBHOOK_URL = "https://your-webhook-url.com"
```

Webhook payload format:
```json
{
  "severity": "error",
  "message": "Error rate exceeded 1%",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "context": {
    "metrics": { ... }
  },
  "alert_id": "high_error_rate-1234567890"
}
```

### Custom Alert Rules

Add custom rules in your code:

```typescript
import { getAlertManager, AlertSeverity } from './monitoring/alerting';

const alertManager = getAlertManager();

alertManager.addRule({
  name: 'custom_rule',
  condition: (metrics) => metrics.api.totalCalls > 10000,
  severity: AlertSeverity.INFO,
  message: 'Traffic threshold exceeded',
  cooldownMs: 15 * 60 * 1000, // 15 minutes
});
```

## Structured Logging

### Logger Usage

```typescript
import { createRequestLogger } from './monitoring/logger';

const logger = createRequestLogger(requestId, endpoint);

logger.info('Processing request', { userId: '123' });
logger.warn('Rate limit approaching', { current: 90, max: 100 });
logger.error('Operation failed', error, { operation: 'save' });
```

### Log Levels
- **DEBUG**: Detailed diagnostic information
- **INFO**: General informational messages
- **WARN**: Warning messages for concerning events
- **ERROR**: Error messages for failures

Set log level via environment variable:

```toml
# wrangler.toml
[vars]
LOG_LEVEL = "INFO"  # DEBUG, INFO, WARN, ERROR
```

### Performance Timing

```typescript
import { PerformanceTimer } from './monitoring/logger';

const timer = new PerformanceTimer();
timer.mark('operation_start');

// ... do work ...

timer.mark('operation_complete');
const duration = timer.getDurationBetween('operation_start', 'operation_complete');
```

## Cleanup Worker

Scheduled cleanup job runs daily at 2 AM UTC to remove old diagrams.

### Configuration

```typescript
// Default configuration
{
  maxAgeMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  batchSize: 100
}
```

### Metrics Tracked
- Diagrams deleted
- Bytes freed
- Execution duration
- Errors encountered

### Manual Trigger

Test cleanup locally:

```bash
wrangler dev
# Then trigger via curl or test script
```

## Cloudflare Analytics Integration

### Setup

Analytics Engine is automatically configured in `wrangler.toml`:

```toml
[[analytics_engine_datasets]]
binding = "ANALYTICS"
```

### Query Analytics

Use Cloudflare dashboard or GraphQL API to query historical data:

```graphql
query {
  viewer {
    accounts(filter: { accountTag: "YOUR_ACCOUNT_ID" }) {
      analyticsEngine {
        dataset(name: "ANALYTICS") {
          # Your query here
        }
      }
    }
  }
}
```

## Dashboard Integration

### Dashboard Data Format

```typescript
import { getMetrics } from './monitoring/metrics';
import { transformToDashboardData } from './monitoring/dashboard';

const metrics = getMetrics().getMetrics();
const dashboardData = transformToDashboardData(metrics);
```

### Dashboard Utilities

```typescript
import {
  formatBytes,
  formatCurrency,
  formatPercentage,
  formatDuration,
  calculateSLA,
  DEFAULT_SLA_TARGETS
} from './monitoring/dashboard';

// Format values
console.log(formatBytes(1024 * 1024)); // "1.00 MB"
console.log(formatCurrency(0.0123)); // "$0.0123"
console.log(formatPercentage(0.9567)); // "95.67%"
console.log(formatDuration(1234)); // "1.23s"

// Check SLA compliance
const sla = calculateSLA(metrics, DEFAULT_SLA_TARGETS);
console.log(sla.availability.compliant); // true/false
```

## Performance Targets

### Acceptance Criteria
- ✅ Error rate < 1%
- ✅ P95 response time < 500ms
- ✅ All API endpoints tracked
- ✅ Metrics exported to Cloudflare Analytics
- ✅ Real-time metrics available
- ✅ Alerts for error rate spikes
- ✅ Cost tracking for R2 and AI APIs

### SLA Targets
- **Availability**: 99.9%
- **P95 Response Time**: < 500ms
- **Error Rate**: < 1%

## Troubleshooting

### High Response Times

1. Check P95/P99 metrics to identify slow endpoints
2. Review AI API call durations
3. Check R2 operation latency
4. Examine cache hit rates

### High Error Rates

1. Check error logs for patterns
2. Review recent alerts
3. Verify AI API health
4. Check R2/KV availability

### Low Cache Hit Rates

1. Review cache key strategy
2. Check TTL settings
3. Analyze access patterns
4. Consider cache warming

## API Reference

### Metrics Endpoints

#### GET /metrics
Returns current metrics and Prometheus-formatted data.

**Response:**
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "metrics": {
    "api": { ... },
    "storage": { ... },
    "ai": { ... },
    "errors": { ... }
  },
  "prometheus": "# HELP api_requests_total..."
}
```

#### GET /
Health check with metrics.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "checks": {
    "errorRate": { "status": "pass", "value": 0.005 },
    "responseTime": { "status": "pass", "value": 234 }
  },
  "metrics": { ... }
}
```

## Best Practices

1. **Monitor Regularly**: Check metrics dashboard daily
2. **Set Up Alerts**: Configure webhook notifications for critical alerts
3. **Review Costs**: Track AI API usage and R2 storage costs
4. **Optimize Cache**: Maintain > 80% cache hit rate
5. **Performance Budget**: Keep P95 < 500ms
6. **Error Budget**: Maintain < 1% error rate

## Next Steps

1. Configure webhook alerting
2. Set up Cloudflare Analytics dashboard
3. Integrate with external monitoring (Datadog, Grafana, etc.)
4. Customize alert thresholds for your needs
5. Implement endpoint-specific metrics tracking
