# Setup Documentation

This directory contains all setup and deployment guides for the DAAD monorepo.

## Getting Started

### For New Users

Start with the **[Complete Setup Guide](./SETUP.md)** which covers:
- Prerequisites installation
- Repository setup
- All application configuration
- Infrastructure deployment
- Verification steps

### For Quick Install

If you only need the VSCode extension, see:
- **[Installation Guide](../guides/INSTALLATION.md)** - VSCode extension quick install

## Setup Documents

### Core Setup

- **[SETUP.md](./SETUP.md)**
  - Complete system setup from scratch
  - All prerequisites and dependencies
  - Step-by-step configuration
  - Verification and testing

### Infrastructure Setup

- **[R2_SETUP.md](./R2_SETUP.md)**
  - Cloudflare R2 bucket creation
  - CORS configuration
  - Access policies
  - Testing and verification

- **[CACHING.md](./CACHING.md)**
  - Cloudflare KV namespace setup
  - Cache configuration
  - Performance tuning
  - Monitoring cache effectiveness

- **[MONITORING.md](./MONITORING.md)**
  - Performance metrics setup
  - Logging configuration
  - Alerting and dashboards
  - Troubleshooting guides

### Deployment

- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)**
  - Pre-deployment verification
  - Production deployment steps
  - Post-deployment validation
  - Rollback procedures

## Setup Sequence

For first-time setup, follow this sequence:

### 1. Prerequisites
```bash
# Install required tools
npm install -g pnpm
pnpm install -g turbo wrangler
```

### 2. Repository Setup
```bash
# Clone and install
git clone <repo-url>
cd daad-monorepo
pnpm install
```

### 3. Build Everything
```bash
# Build all packages
pnpm build
```

### 4. Application Setup

Choose what you need:

**VSCode Extension Only:**
```bash
cd apps/vscode-extension
pnpm package
code --install-extension daad-0.0.1.vsix
```

**CLI Tool:**
```bash
cd apps/cli
make build
make install
```

**Workers API:**
```bash
cd apps/workers
# Complete infrastructure setup first (see below)
pnpm dev  # For local testing
pnpm deploy  # For production
```

### 5. Infrastructure Setup (for Workers)

1. **Setup R2 Storage**: Follow [R2_SETUP.md](./R2_SETUP.md)
2. **Setup KV Cache**: Follow [CACHING.md](./CACHING.md)
3. **Configure Monitoring**: Follow [MONITORING.md](./MONITORING.md)
4. **Deploy**: Follow [DEPLOYMENT_CHECKLIST.md](../guides/DEPLOYMENT_CHECKLIST.md)

## Environment Configuration

### Development
Each app has its own environment file:

- **VSCode Extension**: Uses VSCode secrets (no file needed)
- **CLI Tool**: Create `apps/cli/.env`
- **Workers**: Create `apps/workers/.dev.vars`

See [SETUP.md](./SETUP.md) for detailed environment configuration.

### Production
Use Cloudflare secrets for Workers:

```bash
wrangler secret put OPENROUTER_API_KEY
wrangler secret put CLAUDE_API_KEY
```

## Troubleshooting

### Common Issues

1. **Build failures**: Check Node.js and Go versions
2. **PNPM errors**: Clear store with `pnpm store prune`
3. **Turbo cache issues**: Force rebuild with `turbo build --force`
4. **Wrangler auth**: Re-login with `wrangler login`

See individual setup guides for specific troubleshooting.

## Quick Reference

### Install Commands
```bash
# Global tools
npm install -g pnpm turbo wrangler

# Project dependencies
pnpm install

# Build everything
pnpm build
```

### Development Commands
```bash
# Run all in dev mode
pnpm dev

# Run specific app
turbo dev --filter=@daad/workers

# Watch mode for package
cd packages/shared-types && pnpm dev
```

### Deployment Commands
```bash
# Deploy Workers
cd apps/workers && pnpm deploy

# Package VSCode extension
cd apps/vscode-extension && pnpm package

# Build CLI for all platforms
cd apps/cli && make build-all
```

## Related Documentation

- [Quick Start Guide](../guides/QUICK_START.md) - Common commands
- [Architecture Documentation](../architecture/) - System design
- [Testing Guide](../guides/TESTING.md) - Testing strategies
- [Main README](../../README.md) - Project overview
