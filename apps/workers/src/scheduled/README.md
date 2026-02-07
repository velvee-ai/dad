# Scheduled Workers

This directory contains scheduled Cloudflare Workers that run on cron triggers.

## Cleanup Worker

The cleanup worker (`cleanup.ts`) automatically deletes expired preview sessions from R2 storage.

### Features

- **Automatic Cleanup**: Runs daily at 2 AM UTC via cron trigger
- **TTL-Based Expiry**: Deletes sessions older than 7 days
- **Batch Processing**: Efficiently handles large numbers of objects
- **Dry-Run Mode**: Test without actual deletions
- **Comprehensive Logging**: Detailed statistics and error reporting
- **Orphaned Session Handling**: Cleans up sessions without metadata

### Configuration

Configure in `wrangler.toml`:

```toml
[triggers]
crons = ["0 2 * * *"]  # Daily at 2 AM UTC

[vars]
DRY_RUN = "false"  # Set to "true" for dry-run mode
```

### Session Structure

Preview sessions are stored with this structure:

```
previews/
  {sessionId}/
    .metadata           # Session metadata with expiry info
    diagram.json        # Diagram data
    preview.html        # Preview HTML
    assets/            # Additional assets
```

### Metadata Format

The `.metadata` file contains:

```json
{
  "sessionId": "abc123",
  "createdAt": "2024-01-15T10:00:00Z",
  "expiresAt": "2024-01-22T10:00:00Z",
  "ttlDays": 7
}
```

### How It Works

1. **List Sessions**: Scans all objects under `previews/` prefix
2. **Check Expiry**: For each session, reads metadata and checks expiry date
3. **Orphaned Sessions**: Sessions without metadata are checked by object age
4. **Batch Delete**: Deletes all objects in expired sessions (up to 1000 per batch)
5. **Report Stats**: Logs summary with sessions cleaned, objects deleted, and storage freed

### Manual Testing

Test the cleanup worker manually:

```bash
# Dry-run mode (no deletions)
wrangler dev --test-scheduled --env=production

# With actual deletions (be careful!)
DRY_RUN=false wrangler dev --test-scheduled --env=production
```

Trigger manually via API:

```bash
curl -X POST "https://dad-workers.your-account.workers.dev/__scheduled?cron=0+2+*+*+*"
```

### Monitoring

The worker logs detailed statistics:

```
Cleanup Summary:
  Duration: 3.45s
  Sessions Scanned: 156
  Sessions Expired: 12
  Objects Deleted: 348
  Storage Freed: 125.34 MB
  Errors: 0
```

### Error Handling

- **Graceful Failures**: Errors logged but don't stop cleanup
- **Retry Logic**: Cloudflare automatically retries failed executions
- **Error Tracking**: All errors collected in stats output

### Performance

- **Batch Size**: 1000 objects per batch (R2 limit)
- **Parallel Deletes**: Uses Promise.all for concurrent deletion
- **Pagination**: Handles large object lists with cursor-based pagination

### TTL Configuration

Modify `PREVIEW_SESSION_TTL_DAYS` in `cleanup.ts`:

```typescript
const PREVIEW_SESSION_TTL_DAYS = 7; // Change to desired days
```

### Best Practices

1. **Always test with DRY_RUN first**
2. Monitor logs after deployment
3. Set up alerts for high error rates
4. Consider analytics integration for cleanup metrics
5. Review TTL settings periodically based on usage patterns
