# DAAD Monorepo - Diagram as a Delivery

> Transform code into understanding. Instantly.

A monorepo containing all DAAD tools for AI-powered code visualization and diagram generation.

**[📋 View Complete Feature List](./FEATURES.md)** - Detailed implementation status of all features

## 🎯 Philosophy

- **D**iagram **a**s **a** **D**elivery - Ship understanding, not just code
- **D**esign **a**s **a** **D**iagram - Think visually, code better
- **D**ata **a**s **a** **D**iagram - See the flow, grasp the logic

## 📦 Packages

### Applications

- **[@daad/vscode-extension](./apps/vscode-extension)** - VSCode extension for interactive code visualization
  - AI-powered flow chart generation
  - React Flow visualization
  - Works with any language

- **[@daad/cli](./apps/cli)** - Command-line tool for diagram generation (Go + D2)
  - Analyze code from terminal
  - Generate D2 diagrams
  - Export to multiple formats

- **[@daad/workers](./apps/workers)** - Cloudflare Workers backend API
  - Code analysis API
  - Diagram storage
  - Export services

### Shared Packages

- **[@daad/shared-types](./packages/shared-types)** - TypeScript types and interfaces
- **[@daad/diagram-schema](./packages/diagram-schema)** - Schema validation & format conversion
- **[@daad/config](./packages/config)** - Shared configuration files

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and PNPM 8+
- Go 1.21+ (for CLI)
- Cloudflare Wrangler CLI (for Workers)

### Installation

```bash
# Install PNPM globally
npm install -g pnpm

# Install all dependencies
pnpm install
```

### Common Commands

```bash
# Build all packages
pnpm build

# Run in development mode
pnpm dev

# Run tests
pnpm test

# Lint all code
pnpm lint

# Format code
pnpm format
```

## 📚 Documentation

### Getting Started

- **[Complete Setup Guide](./docs/setup/SETUP.md)** - Full system setup (CLI, Workers, R2, KV, Secrets)
- **[Quick Start Guide](./docs/guides/QUICK_START.md)** - Get up and running quickly
- **[Installation Guide](./docs/guides/INSTALLATION.md)** - VSCode extension installation
- **[Deployment Checklist](./docs/guides/DEPLOYMENT_CHECKLIST.md)** - Production deployment guide

### Infrastructure & Setup

- **[R2 Storage Setup](./docs/setup/R2_SETUP.md)** - Cloudflare R2 bucket configuration
- **[KV Cache Setup](./docs/setup/CACHING.md)** - Cache layer configuration
- **[Monitoring Setup](./docs/setup/MONITORING.md)** - Metrics and alerting setup

### Architecture & Implementation

- **[Batch Processing](./docs/BATCH_PROCESSING.md)** - Batch diagram generation architecture
- **[SVG Rendering Implementation](./docs/architecture/SVG_RENDERING_IMPLEMENTATION.md)** - SVG export system
- **[Monitoring Implementation](./docs/architecture/MONITORING_IMPLEMENTATION.md)** - Metrics and alerting
- **[Caching Integration](./docs/architecture/CACHING_INTEGRATION.md)** - KV cache layer
- **[Diagram Storage Architecture](./docs/architecture/DIAGRAM_STORAGE_ARCHITECTURE.md)** - R2 storage system
- **[Cleanup Worker Implementation](./docs/architecture/CLEANUP_WORKER_IMPLEMENTATION.md)** - Scheduled cleanup
- **[Preview Panel Implementation](./docs/architecture/PREVIEW_PANEL_IMPLEMENTATION.md)** - VSCode preview panel

### Development Guides

- **[Testing Guide](./docs/guides/TESTING.md)** - How to test the applications
- **[Editing Guide](./docs/guides/EDITING_GUIDE.md)** - Code contribution guidelines

### Package-Specific Documentation

- [VSCode Extension README](./apps/vscode-extension/README.md)
- [CLI README](./apps/cli/README.md)
- [Workers README](./apps/workers/README.md)

### Historical Documentation

Archived planning and migration documents can be found in [docs/archive](./docs/archive/)

## 🏗️ Project Structure

```
daad-monorepo/
├── apps/
│   ├── vscode-extension/    # VSCode plugin (TypeScript + React) - PRODUCTION READY ✅
│   ├── cli/                  # CLI tool (Go + D2) - PARTIAL (SVG export works)
│   └── workers/              # Backend API (TypeScript + Cloudflare) - PRODUCTION READY ✅
├── packages/
│   ├── shared-types/        # Shared TypeScript types
│   ├── diagram-schema/      # Schema validation & format conversion
│   └── config/              # Shared ESLint and TypeScript configs
├── docs/
│   ├── guides/              # User guides and tutorials
│   ├── architecture/        # Implementation and architecture docs
│   └── archive/             # Historical planning documents
├── examples/                # Example code and usage patterns
├── turbo.json               # Turborepo build pipeline config
├── pnpm-workspace.yaml      # PNPM workspace configuration
└── package.json             # Root package.json
```

## 🛠️ Development Workflow

### Adding Dependencies

```bash
# Add to specific package
pnpm add <package> --filter=@daad/vscode-extension

# Add to workspace root
pnpm add -w <package>
```

### Working with Specific Packages

```bash
# Build VSCode extension
turbo build --filter=@daad/vscode-extension

# Build CLI
turbo build --filter=@daad/cli

# Run Workers in dev mode
turbo dev --filter=@daad/workers
```

## 🎯 Benefits

1. **Code Reuse** - Share types and schemas across all projects
2. **Unified Versioning** - Coordinate releases across packages
3. **Optimized Builds** - Turborepo's caching speeds up development
4. **Type Safety** - Shared types ensure consistency
5. **Scalability** - Easy to add new packages

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

ISC

## Credits

Built with ❤️ using:
- [Claude AI](https://claude.ai) for code analysis
- [React Flow](https://reactflow.dev) for visualization
- [VSCode Extension API](https://code.visualstudio.com/api)

---

**DAAD** - Making code visual, one diagram at a time.