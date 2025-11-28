# @daad/workers

Cloudflare Workers backend API for DAAD.

## Features

- Code analysis API
- Diagram export API
- Diagram storage (R2/KV)
- CORS enabled
- TypeScript with Hono framework
- **Scheduled cleanup worker** for expired preview sessions

## Development

### Install dependencies

```bash
pnpm install
```

### Start development server

```bash
pnpm dev
```

The server will start at `http://localhost:8787`

### Deploy to Cloudflare

```bash
pnpm deploy
```

## API Endpoints

### POST /api/analyze

Analyze code and generate flow diagram.

**Request:**
```json
{
  "code": "function example() { ... }",
  "language": "javascript",
  "options": {}
}
```

**Response:**
```json
{
  "diagram": { ... },
  "success": true
}
```

### POST /api/export

Export diagram to various formats.

**Request:**
```json
{
  "diagram": { ... },
  "format": "d2"
}
```

**Response:**
```json
{
  "content": "...",
  "format": "d2",
  "success": true
}
```

### GET /api/diagrams

List all saved diagrams.

### POST /api/diagrams

Save a diagram.

### GET /api/diagrams/:id

Get a specific diagram.

### DELETE /api/diagrams/:id

Delete a diagram.

## Environment Variables

Create `.dev.vars` file for local development:

```bash
OPENROUTER_API_KEY=your_key
CLAUDE_API_KEY=your_key
```

For production, use Wrangler secrets:

```bash
wrangler secret put OPENROUTER_API_KEY
wrangler secret put CLAUDE_API_KEY
```

## Scheduled Workers

### Cleanup Worker

Automatically cleans up expired preview sessions from R2 storage.

**Configuration:**
- Runs daily at 2 AM UTC (configurable in `wrangler.toml`)
- 7-day TTL for preview sessions
- Supports dry-run mode for testing

**Testing:**

```bash
# Dry-run mode (no actual deletions)
./scripts/test-cleanup.sh dry-run

# Live mode (actual deletions)
./scripts/test-cleanup.sh live
```

**Manual trigger via Cloudflare dashboard:**
1. Go to Workers & Pages
2. Select your worker
3. Go to "Triggers" tab
4. Click "Send Test Event" for the cron trigger

See `src/scheduled/README.md` for detailed documentation.

## Setup and Configuration

For complete setup instructions, see:

- **[Complete Setup Guide](../../docs/setup/SETUP.md)** - Full system setup including Workers
- **[R2 Storage Setup](../../docs/setup/R2_SETUP.md)** - Detailed R2 configuration
- **[Caching Setup](../../docs/setup/CACHING.md)** - KV cache configuration
- **[Monitoring Setup](../../docs/setup/MONITORING.md)** - Metrics and monitoring

### Quick R2 Setup

The worker requires an R2 bucket for preview sessions:

```bash
# Create R2 bucket
wrangler r2 bucket create daad-diagrams

# For preview environment
wrangler r2 bucket create daad-diagrams-preview
```

Update `wrangler.toml` with your bucket names.

See [R2 Setup Guide](../../docs/setup/R2_SETUP.md) for CORS configuration and advanced setup.

## Additional Documentation

- **[Deployment Checklist](../../docs/setup/DEPLOYMENT_CHECKLIST.md)** - Production deployment
- **[API Specification](../../docs/architecture/PREVIEW_API_SPEC.md)** - Detailed API docs
- **[Architecture](../../docs/architecture/)** - System architecture

## TODO

- [ ] Implement actual AI code analysis
- [x] Set up R2 bucket for diagram storage
- [x] Set up KV for caching
- [ ] Add authentication
- [ ] Add rate limiting
- [ ] Add tests
- [x] Implement scheduled cleanup worker
- [x] Implement caching layer
- [x] Add monitoring and metrics
