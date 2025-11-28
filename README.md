# DAAD Monorepo - Diagram as a Delivery

> Transform code into understanding. Instantly.

A monorepo containing all DAAD tools for AI-powered code visualization and diagram generation.

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

- **[Complete Setup Guide](./docs/setup/SETUP.md)** - Full system setup (CLI, Workers, R2, KV)
- **[Installation Guide](./INSTALLATION.md)** - Quick VSCode extension installation
- **[Quick Start](./QUICK_START.md)** - Common commands and workflows

### Application Documentation

- **[VSCode Extension](./apps/vscode-extension/README.md)** - Interactive code visualization
- **[CLI Tool](./apps/cli/README.md)** - Command-line diagram generation
- **[Workers API](./apps/workers/README.md)** - Backend API documentation

### Infrastructure & Deployment

- **[R2 Storage Setup](./docs/setup/R2_SETUP.md)** - Cloudflare R2 configuration
- **[Caching Layer](./docs/setup/CACHING.md)** - KV cache implementation
- **[Monitoring](./docs/setup/MONITORING.md)** - Performance metrics and monitoring
- **[Deployment Checklist](./docs/setup/DEPLOYMENT_CHECKLIST.md)** - Production deployment steps

### Architecture & Guides

- **[Architecture Overview](./docs/architecture/)** - System architecture and design
- **[Testing Guide](./docs/guides/TESTING.md)** - Testing strategies and examples
- **[Project Plan](./docs/guides/PROJECT_PLAN.md)** - Development roadmap

## 🏗️ Project Structure

```
daad-monorepo/
├── apps/
│   ├── vscode-extension/    # VSCode plugin (TypeScript + React)
│   ├── cli/                  # CLI tool (Go + D2)
│   └── workers/              # Backend API (TypeScript + Cloudflare)
├── packages/
│   ├── shared-types/        # Shared TypeScript types
│   ├── diagram-schema/      # Diagram validation & schemas
│   └── config/              # Shared configs (ESLint, etc.)
├── turbo.json               # Build pipeline config
├── pnpm-workspace.yaml     # Workspace configuration
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