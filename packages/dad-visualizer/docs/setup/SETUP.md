# Complete Setup Guide for DAD Monorepo

This guide walks you through setting up the entire DAD monorepo from scratch, including all applications and infrastructure.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Repository Setup](#initial-repository-setup)
3. [Application-Specific Setup](#application-specific-setup)
   - [VSCode Extension](#vscode-extension-setup)
   - [CLI Tool](#cli-tool-setup)
   - [Cloudflare Workers](#cloudflare-workers-setup)
4. [Infrastructure Setup](#infrastructure-setup)
   - [Cloudflare R2 Storage](#cloudflare-r2-storage)
   - [Cloudflare KV Cache](#cloudflare-kv-cache)
5. [Environment Configuration](#environment-configuration)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **PNPM** 8+ (Package manager)
  ```bash
  npm install -g pnpm
  ```
- **Turborepo** (Build system)
  ```bash
  pnpm install -g turbo
  ```
- **Go** 1.21+ ([Download](https://golang.org/dl/)) - for CLI tool
- **Wrangler CLI** (Cloudflare Workers deployment)
  ```bash
  pnpm install -g wrangler
  ```
- **Git** for version control
- **VSCode** 1.74.0+ (for VSCode extension development)

### Required Accounts

- **Cloudflare Account** with:
  - Workers enabled
  - R2 Storage enabled
  - KV Storage enabled
- **API Keys** (optional, for AI features):
  - OpenRouter API key
  - Claude API key

## Initial Repository Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd dad-monorepo

# Install all dependencies
pnpm install
```

This will install dependencies for:
- Root workspace
- All applications (vscode-extension, cli, workers)
- All shared packages (shared-types, diagram-schema, config)

### 2. Verify Installation

```bash
# Build all packages
pnpm build

# Run tests
pnpm test

# Check for issues
pnpm lint
```

## Application-Specific Setup

### VSCode Extension Setup

#### 1. Build the Extension

```bash
cd apps/vscode-extension

# Build in watch mode for development
pnpm watch

# OR build once
pnpm compile
```

#### 2. Run in Development Mode

1. Open `apps/vscode-extension` in VSCode
2. Press `F5` to launch Extension Development Host
3. A new VSCode window will open with the extension loaded

#### 3. Package for Distribution

```bash
# Package as VSIX
pnpm package

# Install locally
code --install-extension dad-0.0.1.vsix
```

#### 4. Verify Installation

1. Open any code file in VSCode
2. Select some code
3. Right-click → "Visualize Code Flow with Claude"
4. Or use Command Palette: "Claude Flow: Visualize Selection"

### CLI Tool Setup

#### 1. Build the CLI

```bash
cd apps/cli

# Build for your platform
make build

# OR build for all platforms
make build-all
```

The binary will be in `apps/cli/bin/dad`

#### 2. Install Globally (Optional)

```bash
make install
```

This installs the binary to your system PATH.

#### 3. Configure Environment

Create `.env` in `apps/cli/`:

```env
OPENROUTER_API_KEY=your_openrouter_key_here
CLAUDE_API_KEY=your_claude_key_here
```

#### 4. Test the CLI

```bash
# Test with a sample file
./bin/dad analyze examples/sample.js

# Check version
./bin/dad version
```

### Cloudflare Workers Setup

This is the most complex setup as it requires Cloudflare infrastructure.

#### 1. Authenticate with Cloudflare

```bash
wrangler login
```

This will open a browser window to authenticate.

#### 2. Create Required Resources

See the [Infrastructure Setup](#infrastructure-setup) section below.

#### 3. Configure Environment

Create `.dev.vars` in `apps/workers/`:

```env
OPENROUTER_API_KEY=your_openrouter_key
CLAUDE_API_KEY=your_claude_key
ENVIRONMENT=development
CACHE_ENABLED=true
```

**Important:** Never commit `.dev.vars` to git. It's already in `.gitignore`.

#### 4. Run Locally

```bash
cd apps/workers

# Start development server
pnpm dev
```

Server will be available at `http://localhost:8787`

#### 5. Test the API

```bash
# Test health endpoint
curl http://localhost:8787/health

# Test diagram save
curl -X POST http://localhost:8787/api/diagrams \
  -H "Content-Type: application/json" \
  -d '{"id":"test","diagram":{},"code":"test","timestamp":1234567890}'

# Test diagram retrieval
curl http://localhost:8787/api/diagrams/test
```

## Infrastructure Setup

### Cloudflare R2 Storage

R2 is used for storing diagram previews and exports.

#### 1. Create R2 Buckets

```bash
# Production bucket
wrangler r2 bucket create dad-diagrams

# Development bucket
wrangler r2 bucket create dad-diagrams-dev
```

#### 2. Configure CORS

Create `cors-policy.json`:

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

Apply CORS policy:

```bash
# Production
wrangler r2 bucket cors put dad-diagrams --file=cors-policy.json

# Development
wrangler r2 bucket cors put dad-diagrams-dev --file=cors-policy.json
```

#### 3. Verify CORS

```bash
wrangler r2 bucket cors get dad-diagrams
```

#### 4. Update wrangler.toml

Ensure `apps/workers/wrangler.toml` has the correct bucket bindings:

```toml
[[r2_buckets]]
binding = "DAD_DIAGRAMS"
bucket_name = "dad-diagrams"
preview_bucket_name = "dad-diagrams-dev"
```

### Cloudflare KV Cache

KV is used for caching diagram data and exports.

#### 1. Create KV Namespaces

```bash
# Production namespace
wrangler kv:namespace create "DAD_CACHE"

# Preview namespace
wrangler kv:namespace create "DAD_CACHE" --preview
```

Wrangler will output namespace IDs like:
```
{ binding = "DAD_CACHE", id = "abc123..." }
{ binding = "DAD_CACHE", preview_id = "xyz789..." }
```

#### 2. Update wrangler.toml

Replace the placeholder IDs in `apps/workers/wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "DAD_CACHE"
id = "abc123..."  # Use the ID from step 1
preview_id = "xyz789..."  # Use the preview_id from step 1
```

#### 3. Verify KV Setup

```bash
# List namespaces
wrangler kv:namespace list
```

## Environment Configuration

### Production Secrets (Cloudflare)

For production deployment, use Wrangler secrets instead of environment files:

```bash
cd apps/workers

# Set OpenRouter API key
wrangler secret put OPENROUTER_API_KEY
# Enter your key when prompted

# Set Claude API key
wrangler secret put CLAUDE_API_KEY
# Enter your key when prompted
```

### Development Environment

Each application has its own environment configuration:

#### VSCode Extension
- No environment file needed
- Uses VSCode's secret storage API
- Configure API keys through extension settings

#### CLI Tool
- Create `apps/cli/.env`:
  ```env
  OPENROUTER_API_KEY=your_key
  CLAUDE_API_KEY=your_key
  ```

#### Workers
- Create `apps/workers/.dev.vars`:
  ```env
  OPENROUTER_API_KEY=your_key
  CLAUDE_API_KEY=your_key
  ENVIRONMENT=development
  CACHE_ENABLED=true
  DRY_RUN=true
  ```

## Verification

### 1. Verify Monorepo Build

```bash
# From root directory
turbo build

# Should build:
# - @dad/shared-types
# - @dad/diagram-schema
# - @dad/config
# - @dad/vscode-extension
# - @dad/cli
# - @dad/workers
```

### 2. Verify VSCode Extension

1. Install the extension (see VSCode Extension Setup)
2. Open a JavaScript file
3. Select a function
4. Right-click → "Visualize Code Flow"
5. Should see interactive flow chart

### 3. Verify CLI Tool

```bash
cd apps/cli

# Should show help
./bin/dad --help

# Should show version
./bin/dad version
```

### 4. Verify Workers Locally

```bash
cd apps/workers
pnpm dev

# In another terminal:
curl http://localhost:8787/health
# Should return: {"status":"ok"}
```

### 5. Verify R2 Storage

```bash
# List buckets
wrangler r2 bucket list

# Should show:
# - dad-diagrams
# - dad-diagrams-dev
```

### 6. Verify KV Cache

```bash
# List namespaces
wrangler kv:namespace list

# Should show DAD_CACHE namespace
```

### 7. Verify Workers Deployment

```bash
cd apps/workers

# Deploy to production
pnpm deploy

# Test deployed worker
curl https://your-worker.workers.dev/health
```

## Deployment

### Deploy VSCode Extension

```bash
cd apps/vscode-extension

# Package extension
pnpm package

# Publish to VSCode Marketplace (requires publisher account)
vsce publish
```

### Deploy CLI Tool

```bash
cd apps/cli

# Build for all platforms
make build-all

# Use goreleaser for GitHub releases
goreleaser release
```

### Deploy Workers

```bash
cd apps/workers

# Deploy to production
pnpm deploy

# Verify deployment
curl https://your-worker.workers.dev/health
```

## Troubleshooting

### PNPM Issues

```bash
# Clear PNPM cache
pnpm store prune

# Reinstall all dependencies
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### Turborepo Issues

```bash
# Clear Turbo cache
rm -rf .turbo

# Force rebuild
turbo build --force
```

### Cloudflare Workers Issues

```bash
# View worker logs
wrangler tail

# Check deployment status
wrangler deployments list

# Debug locally with verbose logging
wrangler dev --log-level debug
```

### R2 Bucket Issues

```bash
# Verify bucket exists
wrangler r2 bucket list

# Check CORS configuration
wrangler r2 bucket cors get dad-diagrams

# List objects in bucket
wrangler r2 object list dad-diagrams
```

### KV Namespace Issues

```bash
# List all namespaces
wrangler kv:namespace list

# Check if namespace is bound to worker
wrangler kv:key list --namespace-id=<your-namespace-id>
```

### Go Build Issues

```bash
cd apps/cli

# Clean and rebuild
make clean
go mod tidy
go mod download
make build
```

### TypeScript Issues

```bash
# Rebuild all TypeScript packages
turbo build --filter=./packages/*

# Check for type errors
turbo run type-check
```

## Next Steps

After completing setup:

1. **Read the Quick Start Guide**: [QUICK_START.md](../../QUICK_START.md)
2. **Review Architecture**: [docs/architecture/](../architecture/)
3. **Check API Documentation**: [apps/workers/README.md](../../apps/workers/README.md)
4. **Explore Examples**: Try the example files in each app directory

## Getting Help

- **Documentation**: Check `docs/` directory
- **Package-specific help**: See README.md in each app/package
- **Issues**: Open an issue on GitHub
- **Cloudflare Docs**: [developers.cloudflare.com](https://developers.cloudflare.com/)

## Summary Checklist

Use this checklist to track your setup progress:

### Prerequisites
- [ ] Node.js 18+ installed
- [ ] PNPM 8+ installed
- [ ] Turborepo installed
- [ ] Go 1.21+ installed
- [ ] Wrangler CLI installed
- [ ] Cloudflare account created
- [ ] API keys obtained (if needed)

### Initial Setup
- [ ] Repository cloned
- [ ] Dependencies installed (`pnpm install`)
- [ ] Build successful (`pnpm build`)
- [ ] Tests pass (`pnpm test`)

### VSCode Extension
- [ ] Extension built
- [ ] Tested in development mode (F5)
- [ ] Packaged as VSIX
- [ ] Installed and verified

### CLI Tool
- [ ] CLI built
- [ ] Environment configured (`.env`)
- [ ] Tested with sample file
- [ ] Installed globally (optional)

### Cloudflare Workers
- [ ] Authenticated with Cloudflare
- [ ] R2 buckets created
- [ ] CORS configured for R2
- [ ] KV namespaces created
- [ ] wrangler.toml updated with IDs
- [ ] `.dev.vars` created
- [ ] Local development tested
- [ ] Secrets configured for production
- [ ] Deployed to Cloudflare

### Verification
- [ ] All packages build successfully
- [ ] VSCode extension works
- [ ] CLI tool runs
- [ ] Workers API responds
- [ ] R2 storage accessible
- [ ] KV cache functional

Congratulations! Your DAD monorepo is now fully set up.
