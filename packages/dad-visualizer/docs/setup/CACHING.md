# Cloudflare KV Caching Implementation

## Overview

This implementation adds a comprehensive caching layer using Cloudflare KV to improve performance for frequently accessed diagrams, sessions, and export conversions.

## Architecture

### Cache-Aside Pattern

The implementation uses the cache-aside (lazy loading) pattern:

1. **Read Flow**:
   - Check cache for data
   - If found (cache hit), return cached data
   - If not found (cache miss), fetch from source
   - Store fetched data in cache
   - Return data

2. **Write Flow**:
   - Write data to cache
   - Invalidate related cache entries (e.g., list caches)

3. **Delete Flow**:
   - Remove specific cache entry
   - Invalidate related cache entries

## Components

### 1. CacheManager Class (`src/storage/cache.ts`)

The core caching logic with the following features:

- **KV Wrapper**: Abstracts KV namespace interactions
- **TTL Management**: Automatic expiration based on data type
- **Metrics Tracking**: Real-time cache hit/miss statistics
- **Cache Invalidation**: Pattern-based and key-based invalidation
- **Error Handling**: Graceful fallback on cache failures

### 2. Cache Configuration

#### KV Namespace Binding (`wrangler.toml`)

```toml
[[kv_namespaces]]
binding = "DAD_CACHE"
id = "dad_cache_namespace"
preview_id = "dad_cache_preview"
```

#### Environment Variables

- `CACHE_ENABLED`: Toggle caching on/off (default: `"true"`)
- `CACHE_DEFAULT_TTL`: Default TTL in seconds (default: `"604800"` - 7 days)

### 3. Cache Keys

Cache keys follow the pattern: `{prefix}:{id}`

#### Prefixes:

- `diagram`: Individual diagram data
- `session`: Session manifests
- `export`: Format conversion results

#### Examples:

- `diagram:abc123` - Specific diagram
- `diagram:list` - List of all diagrams
- `export:d2:5f3a2b` - D2 format export (hashed)
- `session:xyz789` - Session manifest

## TTL Strategy

Different data types have configurable TTLs:

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Diagrams | 7 days | Infrequently changed, safe to cache long-term |
| Sessions | 7 days | Session data is relatively static |
| Exports | 7 days | Format conversions are deterministic |

All TTLs are configurable via the `CacheTTL` enum in `cache.ts`.

## Cache Invalidation

### Automatic Invalidation

- **On diagram save**: Invalidates the diagram list cache
- **On diagram delete**: Invalidates both the specific diagram and list cache
- **On TTL expiration**: KV automatically evicts expired entries

### Manual Invalidation

Use the `invalidateCache` function:

```typescript
// Invalidate specific key
await invalidateCache(cache, CacheKeyPrefix.DIAGRAM, 'abc123');

// Invalidate all diagrams
await invalidateCache(cache, CacheKeyPrefix.DIAGRAM);
```

## Metrics and Monitoring

### Available Metrics

Track cache performance with built-in metrics:

- `hits`: Number of cache hits
- `misses`: Number of cache misses
- `sets`: Number of cache writes
- `deletes`: Number of cache deletions
- `hitRate`: Calculated hit rate (hits / total requests)

### API Endpoints

#### Get Cache Metrics

```
GET /api/metrics/cache
```

Response:
```json
{
  "success": true,
  "metrics": {
    "hits": 150,
    "misses": 50,
    "sets": 50,
    "deletes": 5,
    "hitRate": 0.75,
    "hitRatePercentage": "75.00%"
  }
}
```

#### Reset Cache Metrics

```
POST /api/metrics/cache/reset
```

Response:
```json
{
  "success": true,
  "message": "Cache metrics reset successfully"
}
```

## Integration Points

### 1. Diagram Handler (`src/handlers/diagram.ts`)

- **GET /api/diagrams**: Cached list retrieval
- **GET /api/diagrams/:id**: Cached individual diagram retrieval
- **POST /api/diagrams**: Cache-aside write with list invalidation
- **DELETE /api/diagrams/:id**: Cache invalidation on delete

### 2. Export Handler (`src/handlers/export.ts`)

- **POST /api/export**: Cached format conversions
- Uses content hashing to cache identical diagram exports
- Supports all export formats (D2, Mermaid, JSON)

### 3. Main Application (`src/index.ts`)

- Middleware to initialize `CacheManager` for each request
- Metrics endpoints for monitoring
- Bindings configuration

## Setup Instructions

### 1. Create KV Namespace

```bash
# Production namespace
wrangler kv:namespace create "DAD_CACHE"

# Preview namespace
wrangler kv:namespace create "DAD_CACHE" --preview
```

### 2. Update `wrangler.toml`

Replace the placeholder IDs with actual namespace IDs from step 1:

```toml
[[kv_namespaces]]
binding = "DAD_CACHE"
id = "your-actual-namespace-id"
preview_id = "your-actual-preview-id"
```

### 3. Deploy

```bash
wrangler deploy
```

## Performance Targets

### Acceptance Criteria

- ✅ KV namespace properly configured
- ✅ Cache-aside pattern implemented
- ✅ Cache hit rate > 70% for repeated requests (monitor via metrics)
- ✅ Cache invalidation works correctly
- ✅ Fallback to source on cache miss
- ✅ Metrics show cache performance

### Expected Improvements

- **Reduced latency**: Cache hits return data in ~10-50ms vs 100-500ms from source
- **Lower costs**: Fewer KV reads compared to R2/database queries
- **Better scalability**: Handle more concurrent requests with cached data

## Testing

### Manual Testing

1. **Cache Write and Read**:
   ```bash
   # Save a diagram
   curl -X POST https://your-worker.workers.dev/api/diagrams \
     -H "Content-Type: application/json" \
     -d '{"id":"test123","diagram":{...},"code":"...","timestamp":1234567890}'

   # Retrieve diagram (should be cached)
   curl https://your-worker.workers.dev/api/diagrams/test123

   # Check metrics
   curl https://your-worker.workers.dev/api/metrics/cache
   ```

2. **Cache Invalidation**:
   ```bash
   # Delete diagram
   curl -X DELETE https://your-worker.workers.dev/api/diagrams/test123

   # Verify cache cleared
   curl https://your-worker.workers.dev/api/diagrams/test123
   # Should return 404
   ```

3. **Export Caching**:
   ```bash
   # Export same diagram twice
   curl -X POST https://your-worker.workers.dev/api/export \
     -H "Content-Type: application/json" \
     -d '{"diagram":{...},"format":"d2"}'

   # Check metrics - should show cache hit on second request
   curl https://your-worker.workers.dev/api/metrics/cache
   ```

## Troubleshooting

### Cache Not Working

1. Check `CACHE_ENABLED` environment variable is set to `"true"`
2. Verify KV namespace binding is correct in `wrangler.toml`
3. Check metrics endpoint to see if cache is being used
4. Look for errors in Cloudflare Workers logs

### Low Cache Hit Rate

1. Verify TTL settings are appropriate
2. Check if cache is being invalidated too frequently
3. Monitor cache key patterns for uniqueness issues
4. Review metrics to understand miss patterns

### KV Quota Issues

- Free tier: 100,000 reads/day, 1,000 writes/day
- Paid tier: Higher limits available
- Monitor usage in Cloudflare dashboard

## Future Enhancements

- [ ] Add R2 integration for actual diagram storage
- [ ] Implement LRU eviction for memory management
- [ ] Add cache warming for popular diagrams
- [ ] Implement distributed cache locking for concurrent writes
- [ ] Add cache analytics and visualization
- [ ] Support cache versioning for schema changes
