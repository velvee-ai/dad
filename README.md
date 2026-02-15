# DAD Monorepo - Diagram as a Delivery

> Transform code into understanding. Instantly.

A monorepo containing all DAD tools for AI-powered code visualization and diagram generation.

**[View Complete Feature List](./FEATURES.md)** - Detailed implementation status of all features

## Philosophy

- **D**iagram **a**s **a** **D**elivery - Ship understanding, not just code
- **D**esign **a**s **a** **D**iagram - Think visually, code better
- **D**ata **a**s **a** **D**iagram - See the flow, grasp the logic

## Packages

### Applications

- **[@dad/vscode-extension](./apps/vscode-extension)** - VSCode extension for interactive code visualization
  - AI-powered flow chart generation
  - React Flow visualization
  - Works with any language

### Shared Packages

- **[@dad/shared-types](./packages/shared-types)** - TypeScript types and interfaces
- **[@dad/diagram-schema](./packages/diagram-schema)** - Schema validation & format conversion
- **[@dad/generation](./packages/generation)** - DadStorage, C4Generator, ProjectScanner
- **[@dad/pipeline](./packages/pipeline)** - LSP/AST analysis engine
- **[@dad/visualizer](./packages/visualizer)** - React Flow visualization components
- **[@dad/config](./packages/config)** - Shared configuration files

## Quick Start

### Prerequisites

- Node.js 18+ and PNPM 8+

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

## Documentation

### Getting Started

- **[Complete Setup Guide](./docs/setup/SETUP.md)** - Full system setup
- **[Quick Start Guide](./docs/guides/QUICK_START.md)** - Get up and running quickly
- **[Installation Guide](./docs/guides/INSTALLATION.md)** - VSCode extension installation

### Development Guides

- **[Testing Guide](./docs/guides/TESTING.md)** - How to test the applications
- **[Editing Guide](./docs/guides/EDITING_GUIDE.md)** - Code contribution guidelines

### Package-Specific Documentation

- [VSCode Extension README](./apps/vscode-extension/README.md)

### Historical Documentation

Archived planning and migration documents can be found in [docs/archive](./docs/archive/)

## Project Structure

```
dad-monorepo/
├── apps/
│   └── vscode-extension/    # VSCode plugin (TypeScript + React)
├── packages/
│   ├── shared-types/        # Shared TypeScript types
│   ├── diagram-schema/      # Schema validation & format conversion
│   ├── generation/          # DadStorage, C4Generator, ProjectScanner
│   ├── pipeline/            # LSP/AST analysis engine
│   ├── visualizer/          # React Flow visualization components
│   └── config/              # Shared ESLint and TypeScript configs
├── docs/
│   ├── guides/              # User guides and tutorials
│   ├── architecture/        # Implementation and architecture docs
│   └── archive/             # Historical planning documents
├── turbo.json               # Turborepo build pipeline config
├── pnpm-workspace.yaml      # PNPM workspace configuration
└── package.json             # Root package.json
```

## Development Workflow

### Adding Dependencies

```bash
# Add to specific package
pnpm add <package> --filter=@dad/vscode-extension

# Add to workspace root
pnpm add -w <package>
```

### Working with Specific Packages

```bash
# Build VSCode extension
turbo build --filter=@dad/vscode-extension

# Build all shared packages
turbo build --filter=./packages/*
```

## Benefits

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

Built with:
- [Claude AI](https://claude.ai) for code analysis
- [React Flow](https://reactflow.dev) for visualization
- [VSCode Extension API](https://code.visualstudio.com/api)

---

**DAD** - Making code visual, one diagram at a time.
