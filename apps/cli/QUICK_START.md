# Monorepo Quick Start Guide

## Pre-requisites

- Node.js 18+ and PNPM 8+
- Go 1.21+ (for CLI)
- Cloudflare Wrangler CLI (for Workers)

## Installation

```bash
# Install PNPM globally
npm install -g pnpm

# Install Turborepo globally
pnpm install -g turbo

# Install dependencies
pnpm install
```

## Project Structure

```
dad-monorepo/
├── apps/
│   ├── vscode-extension/    # VSCode plugin (TypeScript + React)
│   ├── cli/                  # CLI tool (Go + D2)
│   └── workers/              # Backend API (TypeScript + Cloudflare)
├── packages/
│   ├── shared-types/        # Shared TypeScript types
│   ├── diagram-schema/      # Diagram validation & schemas
│   └── config/              # Shared configs (ESLint, etc.)
└── turbo.json               # Build pipeline config
```

## Common Commands

### Development

```bash
# Run everything in development mode
turbo dev

# Run specific app
turbo dev --filter=@dad/vscode-extension
turbo dev --filter=@dad/cli
turbo dev --filter=@dad/workers

# Watch mode for shared packages
cd packages/shared-types && pnpm dev
```

### Building

```bash
# Build everything
turbo build

# Build specific app
turbo build --filter=@dad/vscode-extension

# Build with dependencies
turbo build --filter=@dad/workers...
```

### Testing

```bash
# Run all tests
turbo test

# Test specific package
turbo test --filter=@dad/shared-types

# Watch mode
turbo test --filter=@dad/workers -- --watch
```

### Linting & Formatting

```bash
# Lint all packages
turbo lint

# Format all code
pnpm format

# Fix lint issues
turbo lint -- --fix
```

## Working with Packages

### Adding Dependencies

```bash
# Add to specific package
pnpm add <package> --filter=@dad/vscode-extension

# Add to workspace root
pnpm add -w <package>

# Add workspace package as dependency
cd apps/workers
pnpm add @dad/shared-types@workspace:*
```

### Creating New Package

```bash
# Create directory
mkdir packages/new-package
cd packages/new-package

# Initialize
pnpm init

# Add to workspace (automatic with pnpm-workspace.yaml)
```

## App-Specific Commands

### VSCode Extension

```bash
cd apps/vscode-extension

# Development
pnpm watch

# Build
pnpm compile

# Package extension
pnpm package

# Install locally
code --install-extension dad-0.0.1.vsix
```

### CLI Tool

```bash
cd apps/cli

# Build
make build

# Run locally
./bin/dad analyze <file>

# Install globally
make install

# Run tests
make test
```

### Workers

```bash
cd apps/workers

# Development (local)
pnpm dev

# Deploy to Cloudflare
pnpm deploy

# Tail logs
wrangler tail

# Test locally
pnpm test
```

## Turborepo Features

### Caching

Turborepo caches task outputs. To clear cache:
```bash
turbo run build --force
```

### Remote Caching (Optional)

```bash
# Link to Vercel for remote caching
turbo login
turbo link
```

### Filtering

```bash
# Run command for package and its dependencies
turbo build --filter=@dad/workers...

# Run command for package and its dependents
turbo build --filter=...@dad/shared-types

# Multiple filters
turbo build --filter=@dad/workers --filter=@dad/cli
```

### Parallel Execution

Turborepo automatically runs independent tasks in parallel:
```bash
# Runs all builds in parallel where possible
turbo build
```

## Debugging

### VSCode Extension

1. Open `apps/vscode-extension` in VSCode
2. Press F5 to launch Extension Development Host
3. Set breakpoints in TypeScript files

### CLI Tool

```bash
cd apps/cli
dlv debug cmd/dad/main.go -- analyze <file>
```

### Workers

```bash
cd apps/workers
pnpm dev
# Open http://localhost:8787
```

## Environment Variables

### VSCode Extension

No environment variables needed (uses VSCode secrets API)

### CLI

Create `.env` in `apps/cli/`:
```bash
OPENROUTER_API_KEY=your_key
CLAUDE_API_KEY=your_key
```

### Workers

Create `.dev.vars` in `apps/workers/`:
```bash
OPENROUTER_API_KEY=your_key
CLAUDE_API_KEY=your_key
```

For production, use Wrangler secrets:
```bash
wrangler secret put OPENROUTER_API_KEY
wrangler secret put CLAUDE_API_KEY
```

## Git Workflow

### Branching

```bash
# Create feature branch
git checkout -b feature/your-feature

# Create fix branch
git checkout -b fix/your-fix
```

### Commits

Follow conventional commits:
```bash
git commit -m "feat(cli): add D2 export support"
git commit -m "fix(workers): resolve rate limiting issue"
git commit -m "docs(vscode): update README"
```

### Creating Changesets

```bash
# Add changeset for version bump
pnpm changeset

# Version packages
pnpm changeset version

# Publish (for public packages)
pnpm changeset publish
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

### TypeScript Issues

```bash
# Rebuild TypeScript projects
turbo build --filter=./packages/*

# Check TypeScript errors
turbo run type-check
```

### Go Module Issues

```bash
cd apps/cli
go mod tidy
go mod download
```

## Production Deployment

### VSCode Extension

```bash
cd apps/vscode-extension
pnpm run compile
pnpm run package
# Publish to VSCode Marketplace
vsce publish
```

### CLI

```bash
cd apps/cli
# Build for multiple platforms
make build-all
# Or use goreleaser
goreleaser release
```

### Workers

```bash
cd apps/workers
pnpm run deploy
```

## CI/CD

GitHub Actions automatically:
- Runs on push to main/develop
- Tests all packages
- Builds all apps
- Deploys Workers on main branch

Manual deployment:
```bash
# Trigger deployment
git tag v1.0.0
git push origin v1.0.0
```

## Useful Links

- [Turborepo Docs](https://turbo.build/repo/docs)
- [PNPM Docs](https://pnpm.io/)
- [D2 Docs](https://d2lang.com/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [VSCode Extension API](https://code.visualstudio.com/api)

## Getting Help

- Check existing documentation in each app's README
- Review MONOREPO_MIGRATION_PLAN.md for detailed architecture
- Open an issue on GitHub
- Ask in team chat

## Performance Tips

1. Use `--filter` to work on specific packages
2. Keep shared packages small and focused
3. Use Turborepo's remote caching for faster CI
4. Run tests in parallel: `turbo test --parallel`
5. Use `pnpm` instead of `npm` (faster and more efficient)
