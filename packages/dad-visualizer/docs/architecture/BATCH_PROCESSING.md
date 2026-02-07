# Batch Diagram Generation

This document describes the batch processing capabilities for generating diagrams from multiple files efficiently.

## Overview

The batch processing system enables parallel diagram generation with the following features:

- **Parallel Processing**: Process up to 5 files concurrently
- **Rate Limiting**: Respects API rate limits using token bucket algorithm
- **Retry Logic**: Exponential backoff for failed requests
- **Progress Tracking**: Real-time progress updates for long operations
- **Single Manifest Write**: All results saved in one R2 operation
- **Graceful Failure Handling**: Failed items don't block the entire batch

## Performance Targets

- Process 10 files in < 15 seconds
- Reduce API calls through intelligent batching
- Handle failures without blocking other files
- Automatic retry for transient errors

## Architecture

### Workers API (TypeScript)

**Endpoint**: `POST /api/batch/analyze`

**Request**:
```json
{
  "files": [
    {
      "id": "file-1",
      "code": "function hello() { ... }",
      "language": "javascript",
      "filename": "hello.js"
    }
  ],
  "options": {
    "includeComments": true,
    "maxDepth": 5
  }
}
```

**Response**:
```json
{
  "results": [
    {
      "id": "file-1",
      "filename": "hello.js",
      "diagram": { "nodes": [...], "edges": [...] },
      "success": true,
      "attempts": 1
    }
  ],
  "manifestId": "manifest-1234567890-abc123",
  "totalItems": 1,
  "successCount": 1,
  "failureCount": 0,
  "timestamp": 1234567890000
}
```

### CLI (Go)

**Command**: `dad batch analyze <directory>`

**Flags**:
- `-p, --pattern`: File pattern to match (default: `*.go`)
- `-o, --output`: Output directory (default: `./diagrams`)
- `--progress`: Show progress bar (default: `true`)
- `--timeout`: Timeout in seconds (default: `300`)

**Example**:
```bash
# Analyze all TypeScript files in src directory
dad batch analyze ./src -p "*.ts" -o ./output/diagrams

# Analyze with custom timeout
dad batch analyze ./src --timeout 600
```

**Output**:
```
Found 15 files to analyze
Progress: 15/15 (100.0%) - Elapsed: 12s - ETA: 0s
✓ Completed file-0
✓ Completed file-1
...

Batch processing complete!
Total: 15, Success: 14, Failed: 1
Manifest saved to: ./output/diagrams/manifest.json
```

## Core Components

### 1. Batch Utilities (`apps/workers/src/utils/batch.ts`)

#### `processBatch<T, R>(items, processor, options)`

Process items in parallel with concurrency control.

**Parameters**:
- `items`: Array of items to process
- `processor`: Function to process each item
- `options`: Configuration options

**Options**:
```typescript
{
  maxConcurrent: 5,           // Max parallel operations
  retryAttempts: 3,           // Number of retry attempts
  retryDelayMs: 1000,         // Initial retry delay
  retryBackoffMultiplier: 2,  // Exponential backoff multiplier
  onProgress: (completed, total) => {},
  onItemComplete: (result) => {}
}
```

**Example**:
```typescript
import { processBatch } from './utils/batch';

const items = [
  { id: '1', data: 'file1.js' },
  { id: '2', data: 'file2.js' }
];

const results = await processBatch(
  items,
  async (item) => analyzeDiagram(item.data),
  { maxConcurrent: 5 }
);
```

#### `withRetry<T>(fn, options)`

Retry a function with exponential backoff.

**Example**:
```typescript
import { withRetry } from './utils/batch';

const result = await withRetry(
  () => apiCall(),
  {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
    onRetry: (attempt, error) => console.log(`Retry ${attempt}:`, error)
  }
);
```

#### `RateLimiter`

Token bucket rate limiter for API rate limiting.

**Example**:
```typescript
import { RateLimiter } from './utils/batch';

const limiter = new RateLimiter({
  maxTokens: 10,        // Max tokens in bucket
  refillRate: 2,        // Tokens added per interval
  refillInterval: 1000  // Refill interval in ms
});

await limiter.acquire(1); // Wait for token
const success = limiter.tryAcquire(1); // Non-blocking
```

#### `ProgressTracker`

Track progress of batch operations.

**Example**:
```typescript
import { ProgressTracker } from './utils/batch';

const tracker = new ProgressTracker(100);

tracker.onChange((progress) => {
  console.log(`${progress.percentage}% complete`);
  console.log(`ETA: ${progress.estimatedTimeRemaining}ms`);
});

tracker.increment(); // Update progress
```

### 2. Storage Manager (`apps/workers/src/utils/storage.ts`)

#### `StorageManager`

Manages R2 and KV storage with optimized batch operations.

**Example**:
```typescript
import { StorageManager } from './utils/storage';

const storage = new StorageManager({
  r2Bucket: env.DAD_BUCKET,
  kvNamespace: env.DAD_KV
});

// Save batch with manifest
await storage.saveBatchWithManifest(manifestId, results);

// Retrieve manifest
const manifest = await storage.getManifest(manifestId);
```

### 3. Go Batch Package (`apps/cli/internal/batch`)

#### `ProcessBatch(ctx, items, processor, opts)`

Go implementation of parallel batch processing.

**Example**:
```go
import "github.com/yourorg/dad/apps/cli/internal/batch"

items := []*batch.Item{
    {ID: "1", Data: file1},
    {ID: "2", Data: file2},
}

processor := func(ctx context.Context, item *batch.Item) (interface{}, error) {
    return analyzeDiagram(item.Data)
}

results, err := batch.ProcessBatch(ctx, items, processor, batch.DefaultOptions())
```

## Rate Limiting Strategy

### Token Bucket Algorithm

The rate limiter uses a token bucket algorithm:

1. **Bucket**: Holds up to `maxTokens` tokens
2. **Refill**: Adds `refillRate` tokens every `refillInterval`
3. **Acquisition**: Each API call consumes 1 token
4. **Blocking**: If no tokens available, wait for refill

**Configuration**:
```typescript
const rateLimiter = new RateLimiter({
  maxTokens: 10,        // Burst capacity
  refillRate: 2,        // Sustained rate (2 requests/second)
  refillInterval: 1000  // 1 second
});
```

This allows:
- Burst of 10 requests immediately
- Sustained rate of 2 requests/second
- Smooth rate limiting without hard cutoffs

## Retry Strategy

### Exponential Backoff

Failed requests are retried with exponential backoff:

1. **First Retry**: Wait `retryDelayMs` (1000ms)
2. **Second Retry**: Wait `retryDelayMs * backoffMultiplier` (2000ms)
3. **Third Retry**: Wait `retryDelayMs * backoffMultiplier^2` (4000ms)

**Example Timeline**:
```
Attempt 1: 0ms    [FAIL]
Wait: 1000ms
Attempt 2: 1000ms [FAIL]
Wait: 2000ms
Attempt 3: 3000ms [SUCCESS]
```

**Benefits**:
- Reduces load during outages
- Gives transient errors time to resolve
- Prevents thundering herd

## Storage Architecture

### R2 Structure

```
diagrams/
  {id}.json              # Individual diagram files
manifests/
  {manifestId}.json      # Batch manifest files
```

### KV Metadata

```
diagram:{id}             # Quick metadata lookup
manifest:{manifestId}    # Manifest metadata
```

### Batch Manifest Format

```json
{
  "id": "manifest-1234567890-abc123",
  "timestamp": 1234567890000,
  "totalItems": 10,
  "successCount": 9,
  "failureCount": 1,
  "results": [
    {
      "id": "file-1",
      "filename": "hello.js",
      "diagram": { ... },
      "success": true,
      "attempts": 1
    },
    {
      "id": "file-2",
      "filename": "error.js",
      "success": false,
      "error": "Parse error",
      "attempts": 3
    }
  ]
}
```

## Testing

### Unit Tests

Run unit tests for batch utilities:

```bash
# Workers tests
cd apps/workers
pnpm test src/utils/__tests__/batch.test.ts

# CLI tests
cd apps/cli
go test ./internal/batch/...
```

### Integration Tests

Test full batch processing:

```bash
# Create test files
mkdir -p test-files
echo 'function test() {}' > test-files/test1.js
echo 'function test2() {}' > test-files/test2.js

# Run batch analysis
dad batch analyze test-files -p "*.js" -o ./output
```

### Performance Tests

Test with 10+ files:

```bash
# Generate test files
for i in {1..15}; do
  echo "function test$i() { return $i; }" > test-files/test$i.js
done

# Time batch processing
time dad batch analyze test-files -p "*.js"
```

Expected: < 15 seconds for 10 files

## Error Handling

### Graceful Failure

Failed items don't block the batch:

```typescript
const results = await processBatch(items, processor, options);

const successful = results.filter(r => r.status === 'success');
const failed = results.filter(r => r.status === 'failed');

console.log(`Success: ${successful.length}/${items.length}`);
console.log(`Failed: ${failed.length}/${items.length}`);
```

### Error Types

1. **Transient Errors**: Automatically retried
   - Network timeouts
   - Rate limit errors
   - Temporary service unavailability

2. **Permanent Errors**: Not retried
   - Invalid syntax
   - Unsupported language
   - File not found

## Performance Optimization

### Concurrency Tuning

Adjust `maxConcurrent` based on:
- API rate limits
- Available memory
- Network bandwidth

**Recommendations**:
- Local development: 3-5
- Production: 5-10
- High-performance: 10-20

### Memory Management

For large batches:
```typescript
// Process in chunks
const CHUNK_SIZE = 100;
for (let i = 0; i < items.length; i += CHUNK_SIZE) {
  const chunk = items.slice(i, i + CHUNK_SIZE);
  await processBatch(chunk, processor, options);
}
```

## Monitoring

### Progress Tracking

```typescript
const tracker = new ProgressTracker(total);

tracker.onChange((progress) => {
  console.log(JSON.stringify({
    completed: progress.completed,
    total: progress.total,
    percentage: progress.percentage,
    eta: progress.estimatedTimeRemaining
  }));
});
```

### Metrics

Track key metrics:
- Throughput (items/second)
- Success rate
- Average retry count
- Total processing time

## API Reference

See individual component documentation:
- [Batch Utilities](../apps/workers/src/utils/batch.ts)
- [Storage Manager](../apps/workers/src/utils/storage.ts)
- [Go Batch Package](../apps/cli/internal/batch/batch.go)
- [CLI Commands](../apps/cli/cmd/dad/main.go)

## Troubleshooting

### Slow Processing

1. Check concurrency limit
2. Verify rate limiter settings
3. Monitor network latency
4. Check API response times

### High Failure Rate

1. Increase retry attempts
2. Increase retry delay
3. Check API error messages
4. Verify input data quality

### Memory Issues

1. Reduce batch size
2. Process in chunks
3. Clear completed results
4. Monitor memory usage

## Future Enhancements

- WebSocket progress streaming
- Distributed processing across workers
- Smart batching based on file similarity
- Caching of common patterns
- Priority queue for urgent requests
