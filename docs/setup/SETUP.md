# Complete Setup Guide for DAD Monorepo

This guide walks you through setting up the entire DAD monorepo from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Repository Setup](#initial-repository-setup)
3. [VSCode Extension Setup](#vscode-extension-setup)
4. [Verification](#verification)
5. [Troubleshooting](#troubleshooting)

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
- **Git** for version control
- **VSCode** 1.74.0+ (for VSCode extension development)

### Optional

- **API Keys** (for AI features):
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
- VSCode extension
- All shared packages (shared-types, diagram-schema, generation, pipeline, visualizer, config)

### 2. Verify Installation

```bash
# Build all packages
pnpm build

# Run tests
pnpm test

# Check for issues
pnpm lint
```

## VSCode Extension Setup

### 1. Build the Extension

```bash
cd apps/vscode-extension

# Build in watch mode for development
pnpm watch

# OR build once
pnpm compile
```

### 2. Run in Development Mode

1. Open `apps/vscode-extension` in VSCode
2. Press `F5` to launch Extension Development Host
3. A new VSCode window will open with the extension loaded

### 3. Package for Distribution

```bash
# Package as VSIX
pnpm package

# Install locally
code --install-extension dad-0.0.1.vsix
```

### 4. Verify Installation

1. Open any code file in VSCode
2. Right-click on a folder or file
3. Select "Analyze Project" or "Visualize Code Flow"
4. Should see interactive flow chart via React Flow

## Verification

### 1. Verify Monorepo Build

```bash
# From root directory
turbo build

# Should build:
# - @dad/shared-types
# - @dad/diagram-schema
# - @dad/generation
# - @dad/pipeline
# - @dad/visualizer
# - @dad/config
# - @dad/vscode-extension
```

### 2. Verify VSCode Extension

1. Install the extension (see VSCode Extension Setup)
2. Open a project folder
3. Right-click a folder -> "Analyze Project"
4. Should see interactive flow chart

### 3. Run Tests

```bash
# Run all tests
pnpm test
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
# Rebuild all TypeScript packages
turbo build --filter=./packages/*

# Check for type errors
turbo run type-check
```

## Next Steps

After completing setup:

1. **Read the Quick Start Guide**: [QUICK_START.md](../guides/QUICK_START.md)
2. **Review Architecture**: [docs/architecture/](../architecture/)

## Getting Help

- **Documentation**: Check `docs/` directory
- **Package-specific help**: See README.md in each app/package
- **Issues**: Open an issue on GitHub

## Summary Checklist

Use this checklist to track your setup progress:

### Prerequisites
- [ ] Node.js 18+ installed
- [ ] PNPM 8+ installed
- [ ] Turborepo installed
- [ ] VSCode 1.74.0+ installed

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

Congratulations! Your DAD monorepo is now fully set up.
