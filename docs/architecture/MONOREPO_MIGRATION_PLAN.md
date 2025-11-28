# DAAD Monorepo Migration Plan

## Overview

Transform the current single VSCode extension repository into a monorepo containing three main tools:
1. VSCode Extension (existing)
2. CLI Tool (Go-based, using D2 for diagram generation)
3. Backend Workers (TypeScript-based Cloudflare Workers)

## Monorepo Structure

```
daad-monorepo/
├── apps/
│   ├── vscode-extension/          # Current VSCode extension
│   ├── cli/                        # Go-based CLI tool
│   └── workers/                    # Cloudflare Workers backend
│
├── packages/
│   ├── shared-types/              # TypeScript types shared across projects
│   ├── diagram-schema/            # Diagram data structures and schemas
│   └── config/                    # Shared configuration (ESLint, etc.)
│
├── turbo.json                     # Turborepo configuration
├── package.json                   # Root package.json
├── pnpm-workspace.yaml           # PNPM workspace config (recommended)
└── README.md                      # Main repository documentation
```

## Phase 1: Initial Monorepo Setup

### 1.1 Create Monorepo Foundation

**Goal**: Set up Turborepo infrastructure without breaking existing code

**Steps**:
1. Initialize Turborepo at repository root
2. Configure PNPM workspaces (faster than npm/yarn for monorepos)
3. Create base directory structure
4. Set up root package.json with workspace configuration

**Commands**:
```bash
# Install Turborepo
pnpm add -g turbo

# Initialize workspace
pnpm init
```

**Files to create**:
- `turbo.json` - Build pipeline configuration
- `pnpm-workspace.yaml` - Workspace definition
- Root `package.json` - Workspace root configuration

### 1.2 Create Package Directories

**Goal**: Establish empty package structure

**Directories to create**:
```
apps/vscode-extension/
apps/cli/
apps/workers/
packages/shared-types/
packages/diagram-schema/
packages/config/
```

## Phase 2: Migrate VSCode Extension

### 2.1 Move Existing Code

**Goal**: Relocate VSCode extension to apps/vscode-extension without breaking functionality

**Steps**:
1. Move all current files to `apps/vscode-extension/`
   - `src/` → `apps/vscode-extension/src/`
   - `package.json` → `apps/vscode-extension/package.json`
   - `tsconfig.json` → `apps/vscode-extension/tsconfig.json`
   - `webpack.config.js` → `apps/vscode-extension/webpack.config.js`
   - All other config files

2. Update package.json:
   - Add `"name": "@daad/vscode-extension"`
   - Update scripts to work within monorepo
   - Update dependencies to use workspace packages

3. Update tsconfig.json:
   - Add path mappings for workspace packages
   - Configure references for shared packages

4. Test build and functionality:
   ```bash
   cd apps/vscode-extension
   pnpm install
   pnpm run compile
   ```

### 2.2 Extract Shared Code

**Goal**: Identify and extract reusable code into shared packages

**Code to extract**:

1. **To `packages/shared-types/`**:
   - Type definitions from `src/shared/types.ts`
   - Interface definitions for diagrams, nodes, edges
   - API response types

2. **To `packages/diagram-schema/`**:
   - Diagram data structures
   - Node type definitions
   - Edge type definitions
   - Validation logic

**Benefits**:
- CLI can use same type definitions
- Workers can validate diagram schemas
- Single source of truth for data structures

## Phase 3: Create CLI Tool

### 3.1 CLI Project Structure

**Goal**: Set up Go-based CLI tool that uses D2 for diagram generation

**Directory structure**:
```
apps/cli/
├── cmd/
│   └── daad/
│       └── main.go              # CLI entry point
├── internal/
│   ├── analyzer/
│   │   └── code_analyzer.go     # Code analysis logic
│   ├── diagram/
│   │   ├── generator.go         # Diagram generation
│   │   └── d2_renderer.go       # D2-specific rendering
│   ├── models/
│   │   └── types.go             # Go types for diagrams
│   └── ai/
│       ├── provider.go          # AI provider interface
│       ├── openrouter.go        # OpenRouter client
│       └── claude.go            # Claude client
├── pkg/                         # Public API (if needed)
├── go.mod
├── go.sum
├── README.md
└── Makefile
```

### 3.2 CLI Features

**Core functionality**:
1. Analyze code files and generate diagrams
2. Export to multiple formats (D2, SVG, PNG, JSON)
3. Support multiple languages (same as VSCode extension)
4. CLI-friendly output options

**Commands**:
```bash
daad analyze <file>               # Analyze single file
daad analyze <directory>          # Analyze directory
daad generate <input> -o <output> # Generate diagram
daad visualize <file>             # Interactive visualization
daad export <input> --format d2   # Export to D2 format
```

### 3.3 D2 Integration

**Goal**: Leverage D2's powerful diagram rendering

**Integration points**:
1. Generate D2 syntax from code analysis
2. Use D2 CLI for rendering to SVG/PNG
3. Support D2's layout engines (dagre, elk)
4. Custom themes and styling

**Dependencies**:
- `oss.terrastruct.com/d2` - D2 Go library
- AI client libraries (OpenRouter, Claude API)
- File parsing libraries for multiple languages

### 3.4 Build Configuration

**Files to create**:
- `go.mod` - Go module definition
- `Makefile` - Build automation
- `.goreleaser.yml` - Release automation (optional)

**Turbo integration**:
Update `turbo.json` to include CLI build:
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "bin/**"]
    }
  }
}
```

## Phase 4: Create Cloudflare Workers Backend

### 4.1 Workers Project Structure

**Goal**: Set up TypeScript-based Cloudflare Workers for backend functionality

**Directory structure**:
```
apps/workers/
├── src/
│   ├── index.ts                  # Main worker entry
│   ├── handlers/
│   │   ├── analyze.ts            # Code analysis handler
│   │   ├── diagram.ts            # Diagram generation handler
│   │   └── export.ts             # Export handler
│   ├── services/
│   │   ├── ai-service.ts         # AI provider service
│   │   └── storage-service.ts    # R2/KV storage
│   ├── middleware/
│   │   ├── auth.ts               # Authentication
│   │   └── rate-limit.ts         # Rate limiting
│   └── utils/
│       └── validation.ts         # Request validation
├── wrangler.toml                 # Cloudflare configuration
├── package.json
├── tsconfig.json
└── README.md
```

### 4.2 Worker Functions

**Planned workers**:

1. **Code Analysis Worker** (`/api/analyze`)
   - Accepts code input
   - Calls AI provider (OpenRouter/Claude)
   - Returns diagram JSON
   - Rate limited per user

2. **Diagram Storage Worker** (`/api/diagrams`)
   - Store diagrams in Cloudflare R2
   - List user diagrams
   - Share diagrams via public URLs
   - Use Cloudflare KV for metadata

3. **Export Worker** (`/api/export`)
   - Convert diagrams to various formats
   - Generate static images (SVG, PNG)
   - Call D2 CLI if needed (via Durable Objects)

4. **Authentication Worker** (`/api/auth`)
   - Handle API key validation
   - JWT token generation
   - User session management

### 4.3 Cloudflare Services Integration

**Services to use**:
1. **Workers** - Serverless compute
2. **R2** - Object storage for diagrams
3. **KV** - Fast key-value storage for metadata
4. **Durable Objects** - Stateful operations if needed
5. **Workers Analytics** - Usage tracking

### 4.4 Dependencies

**Add to `apps/workers/package.json`**:
```json
{
  "dependencies": {
    "@daad/shared-types": "workspace:*",
    "@daad/diagram-schema": "workspace:*",
    "hono": "^3.x",
    "zod": "^3.x"
  },
  "devDependencies": {
    "wrangler": "^3.x",
    "typescript": "^5.x",
    "@cloudflare/workers-types": "^4.x"
  }
}
```

## Phase 5: Shared Packages

### 5.1 packages/shared-types

**Purpose**: TypeScript types shared across all projects

**Contents**:
```typescript
// Diagram types
export interface DiagramNode {
  id: string;
  type: NodeType;
  label: string;
  position?: Position;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

// API types
export interface AnalyzeRequest {
  code: string;
  language: string;
  options?: AnalyzeOptions;
}

export interface AnalyzeResponse {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  metadata: DiagramMetadata;
}
```

**package.json**:
```json
{
  "name": "@daad/shared-types",
  "version": "0.0.1",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

### 5.2 packages/diagram-schema

**Purpose**: Diagram schema definitions and validation

**Contents**:
- JSON Schema for diagram format
- Zod schemas for runtime validation
- Conversion utilities
- Validation functions

**Structure**:
```
packages/diagram-schema/
├── src/
│   ├── schemas/
│   │   ├── node.schema.ts
│   │   ├── edge.schema.ts
│   │   └── diagram.schema.ts
│   ├── validators/
│   │   └── validator.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

### 5.3 packages/config

**Purpose**: Shared configuration files

**Contents**:
- ESLint configuration
- TypeScript base configs
- Prettier configuration
- Testing configuration

**Structure**:
```
packages/config/
├── eslint/
│   └── index.js
├── typescript/
│   ├── base.json
│   ├── nextjs.json
│   └── react.json
└── package.json
```

## Phase 6: Turborepo Configuration

### 6.1 turbo.json

**Purpose**: Define build pipeline and caching strategy

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "bin/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "deploy": {
      "dependsOn": ["build", "test"],
      "outputs": []
    }
  }
}
```

### 6.2 Root package.json

```json
{
  "name": "daad-monorepo",
  "version": "0.0.1",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "latest",
    "prettier": "^3.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  },
  "packageManager": "pnpm@8.0.0"
}
```

### 6.3 pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

## Phase 7: Migration Steps

### 7.1 Pre-Migration Checklist

- [ ] Backup current repository
- [ ] Document current build/test commands
- [ ] List all dependencies
- [ ] Identify all environment variables
- [ ] Test current VSCode extension thoroughly

### 7.2 Migration Order

**Step 1: Setup monorepo foundation**
```bash
# Create new branch
git checkout -b monorepo-migration

# Create directory structure
mkdir -p apps/vscode-extension apps/cli apps/workers
mkdir -p packages/shared-types packages/diagram-schema packages/config

# Initialize workspace
pnpm init
```

**Step 2: Move VSCode extension**
```bash
# Move files (preserve git history)
git mv src apps/vscode-extension/src
git mv package.json apps/vscode-extension/package.json
git mv tsconfig.json apps/vscode-extension/tsconfig.json
git mv webpack.config.js apps/vscode-extension/webpack.config.js
# ... move other files
```

**Step 3: Update configurations**
- Update all import paths
- Update package.json dependencies
- Configure Turborepo
- Test builds

**Step 4: Extract shared packages**
- Create packages/shared-types
- Move type definitions
- Update imports in vscode-extension

**Step 5: Create CLI skeleton**
- Initialize Go module
- Create basic structure
- Add to Turbo pipeline

**Step 6: Create Workers skeleton**
- Initialize Worker project
- Create basic structure
- Configure wrangler
- Add to Turbo pipeline

**Step 7: Test everything**
```bash
# Build all projects
turbo build

# Test individually
cd apps/vscode-extension && pnpm test
cd apps/cli && make test
cd apps/workers && pnpm test
```

### 7.3 Post-Migration Tasks

- [ ] Update CI/CD pipelines
- [ ] Update documentation
- [ ] Configure changesets for versioning
- [ ] Set up release automation
- [ ] Update README with new structure

## Phase 8: Development Workflow

### 8.1 Common Commands

```bash
# Install dependencies for all packages
pnpm install

# Build all packages
turbo build

# Run all packages in dev mode
turbo dev

# Build specific package
turbo build --filter=@daad/vscode-extension

# Run tests
turbo test

# Lint all code
turbo lint

# Add dependency to specific package
cd apps/vscode-extension
pnpm add <package>

# Add dependency to workspace
pnpm add -w <package>
```

### 8.2 Package Dependencies

**Cross-package dependencies**:
```json
// apps/vscode-extension/package.json
{
  "dependencies": {
    "@daad/shared-types": "workspace:*",
    "@daad/diagram-schema": "workspace:*"
  }
}

// apps/workers/package.json
{
  "dependencies": {
    "@daad/shared-types": "workspace:*",
    "@daad/diagram-schema": "workspace:*"
  }
}
```

### 8.3 Git Workflow

**Branch strategy**:
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature branches
- `fix/*` - Bug fixes

**Commit convention**:
```
type(scope): description

[optional body]

[optional footer]
```

Types: feat, fix, docs, style, refactor, test, chore

Examples:
- `feat(cli): add D2 export functionality`
- `fix(vscode): resolve diagram rendering issue`
- `docs(workers): update API documentation`

## Phase 9: CI/CD Configuration

### 9.1 GitHub Actions

**.github/workflows/ci.yml**:
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - run: pnpm install
      - run: turbo build
      - run: turbo test
      - run: turbo lint

  deploy-workers:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: cd apps/workers && pnpm run deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### 9.2 Release Workflow

Use Changesets for versioning:
```bash
pnpm add -Dw @changesets/cli
pnpm changeset init
```

**.changeset/config.json**:
```json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

## Phase 10: Documentation Updates

### 10.1 Root README.md

Update to reflect monorepo structure:
```markdown
# DAAD - Diagram as a Delivery Monorepo

A monorepo containing DAAD tools for code visualization and diagram generation.

## Packages

- **apps/vscode-extension** - VSCode extension for code visualization
- **apps/cli** - CLI tool for diagram generation (Go + D2)
- **apps/workers** - Cloudflare Workers backend API
- **packages/shared-types** - Shared TypeScript types
- **packages/diagram-schema** - Diagram schema and validation

## Getting Started

[Installation and usage instructions]

## Development

[Development workflow]
```

### 10.2 Individual READMEs

Each package needs its own README:
- apps/vscode-extension/README.md
- apps/cli/README.md
- apps/workers/README.md

## Benefits of This Structure

1. **Code Reuse**: Share types and schemas across all projects
2. **Unified Versioning**: Coordinate releases across packages
3. **Optimized Builds**: Turborepo's caching speeds up development
4. **Clear Separation**: Each tool has its own scope and dependencies
5. **Scalability**: Easy to add new packages or apps
6. **Type Safety**: Shared types ensure consistency
7. **Monolithic Development**: Work on all tools simultaneously

## Potential Challenges

1. **Initial Setup Complexity**: Monorepo configuration can be tricky
2. **Build Time**: Large monorepos can slow down CI/CD
3. **Dependency Management**: Need to carefully manage workspace dependencies
4. **Git History**: Moving files might complicate git history

## Alternatives Considered

### Alternative 1: Nx Monorepo
- More features but heavier than Turborepo
- Better for Angular/React projects
- Steeper learning curve

### Alternative 2: Separate Repositories
- Simpler individual projects
- Harder to share code
- More complex release coordination
- Duplicate type definitions

### Alternative 3: Rush
- Microsoft's solution
- Good for large enterprises
- More complex configuration

**Recommendation**: Stick with Turborepo - lightweight, fast, and sufficient for this use case.

## Timeline Estimate

Based on complexity of each phase:

- **Phase 1-2** (Monorepo setup + VSCode migration): Core foundation
- **Phase 3** (CLI tool): Go development + D2 integration
- **Phase 4** (Workers): TypeScript + Cloudflare setup
- **Phase 5-6** (Shared packages + Turbo config): Glue everything together
- **Phase 7** (Migration execution): Careful file movement
- **Phase 8-10** (Workflow + CI/CD + Docs): Polish and automation

## Next Steps

1. Review and approve this plan
2. Create backup branch
3. Start with Phase 1: Monorepo foundation
4. Iteratively migrate components
5. Test thoroughly at each phase
6. Update documentation continuously

## Questions to Address

1. **Go CLI**: Should we use cobra for CLI framework?
2. **D2 Version**: Which D2 version to target?
3. **Workers API**: REST or GraphQL?
4. **Authentication**: OAuth, API keys, or both?
5. **Storage**: R2 bucket structure and naming?
6. **Deployment**: Separate or unified CI/CD?
7. **Versioning**: Independent or coordinated versions?

## Resources

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [D2 Language Guide](https://d2lang.com/tour/intro/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [PNPM Workspaces](https://pnpm.io/workspaces)
- [Changesets](https://github.com/changesets/changesets)
