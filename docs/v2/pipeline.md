# DAD Pipeline — `@dad/pipeline`

The analysis pipeline that scans source code projects and produces C4 architecture diagrams as structured `DadFile` JSON. This is the backend engine behind the DAD VS Code extension.

## What It Does

Given a project root directory, the pipeline:

1. **Scans** the filesystem to discover services, databases, and external integrations
2. **Analyzes** source files via VS Code language services (LSP) to extract symbols and relationships
3. **Groups** code into architectural components by directory patterns, class structure, and exports
4. **Assembles** a complete 5-level C4 model (`DadFile` per level) with inferred edges
5. **Enriches** descriptions and design specs via LLM (optional)

The output is a `DadFileSet` — one `DadFile` per C4 level (landscape, context, container, component, code) plus a combined file containing everything.

## Architecture

```
Source Code Project
        │
        ▼
┌──────────────────────┐
│  Stage 1: SCAN       │  FilesystemScanner
│  Walks filesystem,   │  ContainerDetector, DataStoreDetector,
│  detects services    │  ExternalServiceRegistry
│  Output: ScanResult  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Stage 2: ANALYZE    │  CodeAnalyzer + LanguageServiceAdapter
│  Queries VS Code     │  LSP calls: documentSymbol, callHierarchy,
│  language servers    │  references, definition, hover
│  Output:             │
│  AnalyzedFile[]      │  (Skipped when no adapter is provided)
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Stage 3: GROUP      │  ComponentGrouper
│  Groups code units   │  Rules: directory pattern (controllers/,
│  into components     │  services/), class-as-component, file-as-component
│  Output:             │
│  ComponentGroup[]    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Stage 4: ASSEMBLE   │  DadFileAssembler + EdgeInference
│  Builds DadNode /    │  Infers edges from env var URLs, DATABASE_URL,
│  DadEdge per level   │  REDIS_URL, KAFKA_BROKERS, package dependencies
│  Output: DadFileSet  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Stage 5: ENRICH     │  LLMEnricher + PromptBuilder
│  LLM-generated       │  Rich Markdown descriptions, designSpec YAML,
│  descriptions        │  actor detection, edge label refinement
│  Output: DadFileSet  │  (Skipped when no LLM provider is configured)
└──────────────────────┘
```

## Package Structure

```
packages/pipeline/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts                          # Public API exports
│   ├── types.ts                          # All pipeline types (+ inlined C4 types)
│   │
│   ├── scanner/                          # Stage 1
│   │   ├── FilesystemScanner.ts          # Orchestrator: reads workspace.json, coordinates detectors
│   │   ├── ContainerDetector.ts          # Finds package.json / requirements.txt → containers
│   │   ├── DataStoreDetector.ts          # Parses docker-compose.yml → data stores + env vars
│   │   └── ExternalServiceRegistry.ts    # Maps known packages/env vars → external systems
│   │
│   ├── analyzer/                         # Stage 2
│   │   ├── CodeAnalyzer.ts               # Uses LanguageServiceAdapter to extract symbols/imports
│   │   └── LanguageServiceAdapter.ts     # MockLanguageServiceAdapter for testing
│   │
│   ├── grouper/                          # Stage 3
│   │   └── ComponentGrouper.ts           # Directory/class/file-based component grouping
│   │
│   ├── assembler/                        # Stage 4
│   │   ├── DadFileAssembler.ts           # Builds DadNode/DadEdge per C4 level
│   │   ├── EdgeInference.ts              # Derives edges from env vars, deps, Kafka
│   │   └── IdGenerator.ts               # Deterministic "prefix:slug" ID generation
│   │
│   ├── enrichment/                       # Stage 5
│   │   ├── LLMEnricher.ts               # Orchestrates LLM calls
│   │   ├── PromptBuilder.ts             # Prompt templates per enrichment type
│   │   └── LLMProvider.ts               # MockLLMProvider, ClaudeProvider, OpenRouterProvider
│   │
│   └── pipeline/
│       └── Pipeline.ts                   # Main entry: scan → analyze → group → assemble → enrich
│
└── __tests__/
    ├── scanner/FilesystemScanner.test.ts
    ├── analyzer/TypeScriptAnalyzer.test.ts
    ├── grouper/ComponentGrouper.test.ts
    ├── assembler/DadFileAssembler.test.ts
    ├── assembler/EdgeInference.test.ts
    └── pipeline/Pipeline.integration.test.ts
```

## Usage

### Basic (scanner-only mode)

When no `LanguageServiceAdapter` is provided, the pipeline uses filesystem scanning and file path heuristics to build the C4 model. This works without VS Code.

```typescript
import { Pipeline } from '@dad/pipeline';

const pipeline = new Pipeline({
  rootPath: '/path/to/project',
});

const result = await pipeline.run();
// result.landscape, result.context, result.container,
// result.component, result.code, result.combined
```

### With VS Code language services

The VS Code extension injects a `LanguageServiceAdapter` wrapping the running language servers (vtsls for TypeScript, Pyrefly for Python). This gives rich symbol extraction and call hierarchy analysis.

```typescript
import { Pipeline } from '@dad/pipeline';

const pipeline = new Pipeline({
  rootPath: workspaceRoot,
  languageServiceAdapter: myVSCodeAdapter, // implements LanguageServiceAdapter
  onProgress: (stage, message, percent) => {
    statusBar.text = `${stage}: ${message} (${percent}%)`;
  },
});

const result = await pipeline.run();
```

### With LLM enrichment

```typescript
import { Pipeline, MockLLMProvider } from '@dad/pipeline';

const pipeline = new Pipeline({
  rootPath: '/path/to/project',
  llmProvider: new MockLLMProvider(), // or ClaudeProvider, OpenRouterProvider
});

const result = await pipeline.run();
```

### Scan-only mode

For quick previews without full assembly:

```typescript
const pipeline = new Pipeline({ rootPath: '/path/to/project' });
const scanResult = await pipeline.scanOnly();
// scanResult.systems, scanResult.containerMeta, scanResult.dataStores, scanResult.externalServices
```

## How Detection Works

### Containers

| Signal | Example | Result |
|--------|---------|--------|
| `package.json` with `express` dep | `services/api-gateway/package.json` | Container: "Api Gateway" (TypeScript/Express) |
| `package.json` with `react` dep | `admin-dashboard/package.json` | Container: "Admin Dashboard" (TypeScript/React) |
| `requirements.txt` with `confluent-kafka` | `notification-service/requirements.txt` | Container: "Notification Service" (Python/Kafka) |

### Data Stores

Parsed from `docker-compose.yml` `image` fields:

| Image | Result |
|-------|--------|
| `postgres:15` | DataStore: "PostgreSQL" (PostgreSQL 15) |
| `redis:7-alpine` | DataStore: "Redis" (Redis 7) |
| `confluentinc/cp-kafka:7.5.0` | DataStore: "Kafka" (Apache Kafka 7.5) |
| `mongo:6` | DataStore: "MongoDB" (MongoDB 6) |

Infrastructure-only services like `zookeeper` are automatically excluded.

### External Services

Detected from package dependencies and environment variables:

| Signal | Result |
|--------|--------|
| `stripe` in deps or `STRIPE_API_KEY` env | ExternalSystem: "Stripe" (REST API) |
| `@sendgrid/mail` or `SMTP_HOST` env | ExternalSystem: "SendGrid" (REST API) |
| `twilio` in deps or `TWILIO_SID` env | ExternalSystem: "Twilio" (REST API) |
| `aws-sdk` in deps or `AWS_*` env | ExternalSystem: "AWS" (AWS SDK) |

### Edges

Inferred automatically from:

| Source | Example | Edge |
|--------|---------|------|
| Env var URL | `USER_SERVICE_URL=http://user-service:4001` | api-gateway → user-service (REST/HTTP) |
| `DATABASE_URL` | `postgresql://...@postgres:5432/users` | user-service → PostgreSQL |
| `REDIS_URL` | `redis://redis:6379` | api-gateway → Redis |
| `KAFKA_BROKERS` | Shared by user-service & notification-service | user-service → notification-service (Kafka events) |
| Package dep | `stripe` in order-service | order-service → Stripe (external) |

### Component Grouping

Files are grouped into components by directory structure:

| Directory Pattern | Component Role |
|-------------------|---------------|
| `controllers/` | controller |
| `routes/` | route |
| `services/` | service |
| `repositories/` | repository |
| `middleware/` | middleware |
| `handlers/` | handler |
| `models/` | model |
| `events/` | event |
| `utils/`, `helpers/` | utility |

## ID Conventions

All node IDs follow a `prefix:slug` pattern:

| Node Type | Prefix | Example |
|-----------|--------|---------|
| Landscape | `landscape:` | `landscape:velvee-ai-inc` |
| Software System | `system:` | `system:ecommerce-platform` |
| Container | `container:` | `container:api-gateway` |
| Data Store | `datastore:` | `datastore:postgresql` |
| Component | `component:` | `component:user-controller` |
| Code Unit | `code:` | `code:register-user` |
| Actor | `actor:` | `actor:customer` |
| External System | `external:` | `external:stripe` |
| Edge | `edge:` | `edge:api-gateway-to-user-service` |

## LanguageServiceAdapter Interface

The contract that the VS Code extension must implement to provide rich code analysis:

```typescript
interface LanguageServiceAdapter {
  // LSP textDocument/documentSymbol
  getDocumentSymbols(uri: string): Promise<DocumentSymbol[]>;

  // LSP callHierarchy
  prepareCallHierarchy(uri: string, position: LSPPosition): Promise<CallHierarchyItem[]>;
  getOutgoingCalls(item: CallHierarchyItem): Promise<CallHierarchyOutgoingCall[]>;
  getIncomingCalls(item: CallHierarchyItem): Promise<CallHierarchyIncomingCall[]>;

  // LSP textDocument/definition and textDocument/references
  getDefinition(uri: string, position: LSPPosition): Promise<LSPLocation[]>;
  getReferences(uri: string, position: LSPPosition): Promise<LSPLocation[]>;

  // LSP textDocument/hover
  getHover(uri: string, position: LSPPosition): Promise<HoverResult | null>;
}
```

Both TypeScript (via vtsls/tsserver) and Python (via Pyrefly) use the same interface — the LSP protocol is identical.

## Test Coverage

58 tests across 6 test files, all running against the `examples/mock-microservices/` fixture:

| Test File | Tests | What It Verifies |
|-----------|-------|-----------------|
| `FilesystemScanner.test.ts` | 11 | System detection, container detection, data store detection, external service detection, env var merging, source file discovery, ID conventions |
| `TypeScriptAnalyzer.test.ts` | 8 | Symbol extraction (classes, functions, interfaces, enums), method members, empty file handling, module filtering, MockLanguageServiceAdapter |
| `ComponentGrouper.test.ts` | 9 | Directory-based grouping, containerId assignment, middleware/route/handler/event detection, class-as-component, name formatting |
| `DadFileAssembler.test.ts` | 9 | 5-level DadFileSet assembly, landscape/context/container node counts, parent-child hierarchy, version/metadata, ID prefix conventions |
| `EdgeInference.test.ts` | 8 | URL-based edges, DATABASE_URL edges, REDIS_URL edges, Kafka async edges, external service edges, context-level edges, deduplication, c4Level assignment |
| `Pipeline.integration.test.ts` | 13 | Full end-to-end pipeline, container/datastore counts, system detection, external services, edge inference, hierarchy validation, ID conventions, component grouping, progress reporting, LLM enrichment, scan-only mode |

Run tests:

```bash
cd packages/pipeline && pnpm test
```

## Dependencies

- `fast-glob` — Filesystem scanning
- `js-yaml` — Docker-compose YAML parsing
- `vitest` — Test runner (dev)

No dependency on `ts-morph` or `vscode` — all code analysis goes through the injected `LanguageServiceAdapter`.

## What's Next

- **VS Code integration**: Implement `LanguageServiceAdapter` in the extension, wrapping vtsls and Pyrefly
- **Python analysis**: The adapter interface already supports Python via Pyrefly — same LSP protocol
- **LLM providers**: Wire up `ClaudeProvider` and `OpenRouterProvider` with real API calls
- **Workspace config**: Support `dad.config.json` for project-specific overrides
- **Incremental updates**: Re-analyze only changed files on save
