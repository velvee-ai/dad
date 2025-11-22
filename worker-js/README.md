# DAAD Cloudflare Worker (TypeScript)

A TypeScript-based Cloudflare Worker for the DAAD project. This provides the same API as the Rust version for performance comparison.

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Cloudflare account (for deployment)

## Installation

```bash
npm install
```

## Available Endpoints

Identical to the Rust Worker for fair comparison:

- `GET /` - Health check endpoint
- `GET /api/health` - Detailed health status with version info
- `POST /api/diagram` - Endpoint for processing diagram data
- `GET /worker-version` - Get worker version information

## Local Development

```bash
npm run dev
```

This will start a local development server at `http://localhost:8787`.

Test the endpoints:
```bash
curl http://localhost:8787/
curl http://localhost:8787/api/health
curl -X POST http://localhost:8787/api/diagram -d '{"test": "data"}'
```

## Deployment

1. **Login to Cloudflare**:
   ```bash
   npx wrangler login
   ```

2. **Deploy**:
   ```bash
   npm run deploy
   ```

   Your worker will be available at:
   `https://daad-worker-js.<YOUR_SUBDOMAIN>.workers.dev`

## Performance Comparison

Compare this TypeScript implementation with the Rust version:

```bash
# TypeScript Worker
curl -w "Total: %{time_total}s\n" -o /dev/null -s \
  https://daad-worker-js.<YOUR_SUBDOMAIN>.workers.dev/api/health

# Rust Worker (WASM)
curl -w "Total: %{time_total}s\n" -o /dev/null -s \
  https://daad-worker.sathish-257.workers.dev/api/health
```

### Expected Performance

**TypeScript (JavaScript V8):**
- ✅ Zero cold starts (V8 isolates)
- ✅ Native JavaScript performance
- ✅ Simpler codebase
- ⚠️ Slightly slower than WASM for CPU-intensive tasks

**Rust (WebAssembly):**
- ✅ Zero cold starts (V8 isolates)
- ✅ Better for CPU-intensive operations
- ✅ Smaller bundle size
- ⚠️ More complex build process

For simple API endpoints like these, **performance should be nearly identical** since both run on the same V8 runtime and most time is spent on I/O.

## Configuration

Edit `wrangler.toml` to customize:
- Worker name
- Routes and domains
- KV namespaces
- Environment variables

## Development Tips

- TypeScript provides type safety and better IDE support
- Hot reloading with `npm run dev`
- Use Wrangler CLI for testing and deployment
- Check logs with `npx wrangler tail`

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Workers TypeScript Template](https://github.com/cloudflare/workers-sdk/tree/main/templates/worker-typescript)
