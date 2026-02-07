# R2 Bucket Setup Guide

This guide covers the setup and configuration of Cloudflare R2 buckets for DAD preview diagram storage.

## Prerequisites

- Cloudflare account with R2 enabled
- Wrangler CLI installed (`npm install -g wrangler`)
- Authenticated with Cloudflare (`wrangler login`)

## Creating R2 Buckets

### Production Bucket

```bash
wrangler r2 bucket create dad-preview-diagrams
```

### Development Bucket

```bash
wrangler r2 bucket create dad-preview-diagrams-dev
```

## CORS Configuration

R2 buckets need CORS policies configured to allow IDE extension requests.

### Setting CORS Policy via Wrangler

Create a `cors-policy.json` file:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Apply the CORS policy:

```bash
# For production bucket
wrangler r2 bucket cors put dad-preview-diagrams --file=cors-policy.json

# For development bucket
wrangler r2 bucket cors put dad-preview-diagrams-dev --file=cors-policy.json
```

### Verify CORS Configuration

```bash
# Check production bucket
wrangler r2 bucket cors get dad-preview-diagrams

# Check development bucket
wrangler r2 bucket cors get dad-preview-diagrams-dev
```

## Environment Variables and Secrets

### Setting API Keys

Store sensitive API keys as Wrangler secrets (not in wrangler.toml):

```bash
# OpenRouter API Key
wrangler secret put OPENROUTER_API_KEY

# Claude API Key
wrangler secret put CLAUDE_API_KEY
```

For development environment:

```bash
wrangler secret put OPENROUTER_API_KEY --env development
wrangler secret put CLAUDE_API_KEY --env development
```

### Local Development

For local testing, create a `.dev.vars` file in `apps/workers/`:

```env
OPENROUTER_API_KEY=your-openrouter-api-key
CLAUDE_API_KEY=your-claude-api-key
ENVIRONMENT=development
CORS_ORIGINS=*
```

**Important:** Never commit `.dev.vars` to version control. It's already in `.gitignore`.

## Testing R2 Connectivity

Run the test script to verify R2 bucket connectivity:

```bash
cd apps/workers
npm run test:r2
```

Or manually test with Wrangler:

```bash
# Start local development server with R2 bindings
wrangler dev

# In another terminal, test the API endpoints
curl http://localhost:8787/api/test/r2
```

## Deployment

### Deploy to Development

```bash
wrangler deploy --env development
```

### Deploy to Production

```bash
wrangler deploy --env production
```

## R2 Bucket Structure

Diagrams are stored with the following structure:

```
dad-preview-diagrams/
├── diagrams/
│   ├── {uuid-1}.json
│   ├── {uuid-2}.json
│   └── {uuid-3}.json
```

Each diagram object includes:
- `httpMetadata.contentType`: `application/json`
- `customMetadata.createdAt`: ISO timestamp
- `customMetadata.type`: `preview-diagram`

## Monitoring and Limits

### R2 Storage Limits

- Free tier: 10 GB storage
- Requests: Class A (writes) and Class B (reads) operations

### Checking Usage

```bash
# List objects in bucket
wrangler r2 bucket list dad-preview-diagrams

# Get bucket info
wrangler r2 bucket info dad-preview-diagrams
```

## Troubleshooting

### Common Issues

1. **Bucket not found**: Ensure buckets are created and names match `wrangler.toml`
2. **CORS errors**: Verify CORS policy is applied to the bucket
3. **Permission errors**: Check Cloudflare API token has R2 permissions
4. **Local dev errors**: Ensure `.dev.vars` file exists with required keys

### Debug Mode

Enable debug logging:

```bash
wrangler dev --log-level debug
```

## Security Best Practices

1. Never commit API keys or secrets to version control
2. Use Wrangler secrets for production credentials
3. Restrict CORS origins in production (update `cors-policy.json`)
4. Regularly rotate API keys
5. Monitor R2 access logs for suspicious activity

## Next Steps

After R2 setup is complete:

1. Test diagram save/retrieve operations
2. Configure IDE extension to use Workers API
3. Implement diagram preview functionality
4. Set up monitoring and alerting
