# DAAD Cloudflare Worker

A Rust-based Cloudflare Worker for the DAAD (Diagram as a Delivery) project. This worker can be used to handle diagram data, provide API endpoints, and scale diagram processing.

## Prerequisites

- [Rust](https://rustup.rs/) installed
- `wasm32-unknown-unknown` target: `rustup target add wasm32-unknown-unknown`
- Node.js and npm installed
- Cloudflare account (for deployment)

## Project Structure

```
worker/
├── src/
│   └── lib.rs          # Main worker code
├── Cargo.toml          # Rust dependencies
├── wrangler.toml       # Cloudflare Worker configuration
└── README.md           # This file
```

## Available Endpoints

- `GET /` - Health check endpoint
- `GET /api/health` - Detailed health status with version info
- `POST /api/diagram` - Endpoint for processing diagram data
- `GET /worker-version` - Get worker version information

## Local Development

1. **Install worker-build** (if not already installed):
   ```bash
   cargo install worker-build
   ```

2. **Start the development server**:
   ```bash
   npx wrangler dev
   ```

   This will:
   - Build your Rust code to WebAssembly
   - Start a local development server at `http://localhost:8787`
   - Watch for changes and automatically rebuild

3. **Test the endpoints**:
   ```bash
   # Health check
   curl http://localhost:8787/

   # Detailed health status
   curl http://localhost:8787/api/health

   # Post diagram data
   curl -X POST http://localhost:8787/api/diagram \
     -H "Content-Type: application/json" \
     -d '{"type": "flowchart", "nodes": []}'
   ```

## Building for Production

Build the worker for production:

```bash
npx wrangler build
```

This creates an optimized WebAssembly build in the `build/` directory.

## Deployment

1. **Login to Cloudflare**:
   ```bash
   npx wrangler login
   ```

2. **Deploy the worker**:
   ```bash
   npx wrangler deploy
   ```

   Your worker will be available at:
   `https://daad-worker.<YOUR_SUBDOMAIN>.workers.dev`

## Configuration

Edit `wrangler.toml` to customize:

- Worker name
- Environment variables
- KV namespaces
- Routes and domains
- Build settings

## KV Storage

The worker is configured with a KV namespace binding called `DIAGRAMS` for storing diagram data. To use it in production:

1. Create a KV namespace:
   ```bash
   npx wrangler kv:namespace create "DIAGRAMS"
   ```

2. Update the `id` in `wrangler.toml` with the namespace ID returned

3. Use the KV in your code:
   ```rust
   let kv = ctx.kv("DIAGRAMS")?;
   kv.put("key", "value")?.execute().await?;
   ```

## Development Tips

- Use `console_log!()` macro for debugging
- Check logs with `npx wrangler tail`
- Test different routes using curl or Postman
- Modify `src/lib.rs` to add new endpoints

## Resources

- [Cloudflare Workers Rust Documentation](https://developers.cloudflare.com/workers/languages/rust/)
- [workers-rs GitHub Repository](https://github.com/cloudflare/workers-rs)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
