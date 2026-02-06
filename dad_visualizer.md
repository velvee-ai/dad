# DAD Visualizer: Diagram as a Delivery

> From code to architecture — in your IDE, in minutes.

DAD turns your codebase into living, editable system diagrams you can talk to. Generate architecture from a repo or prompt, edit on a free-form canvas, and round-trip changes back into code or PRs using your existing AI code engines.

---

## Table of Contents

1. [Vision & Problem Statement](#vision--problem-statement)
2. [Core Concepts](#core-concepts)
3. [The 5-Level Hierarchy (Extended C4)](#the-5-level-hierarchy-extended-c4)
4. [The `.dad` File Format](#the-dad-file-format)
5. [Design Decisions & Rationale](#design-decisions--rationale)
6. [Architecture Overview](#architecture-overview)
7. [End-to-End Flow](#end-to-end-flow)
8. [Implementation Guide](#implementation-guide)
9. [VS Code Canvas & Interaction Model](#vs-code-canvas--interaction-model)
10. [LLM Generation Pipeline](#llm-generation-pipeline)
11. [API Reference](#api-reference)
12. [Glossary](#glossary)

---

## Vision & Problem Statement

### The Problem

Software teams struggle to maintain up-to-date architecture documentation. Diagrams rot within weeks of being drawn. Engineers draw boxes on whiteboards, take photos, and never update them. Architecture decision records exist in wikis nobody reads. New team members spend weeks understanding how systems connect.

### The DAD Solution

DAD solves this by making architecture diagrams **code-derived, living, and editable**:

1. **Code-first**: Point DAD at any codebase and it generates architecture diagrams automatically using LLM analysis
2. **Living**: Diagrams stay in sync with code — regenerate on demand or on git changes
3. **Editable**: Edit diagrams on a free-form canvas inside VS Code/Cursor, not in a separate tool
4. **Round-trippable**: Changes on the canvas can be pushed back as code changes or PRs
5. **Hierarchical**: Zoom from org-wide landscape down to individual function flow charts seamlessly

### What DAD Is NOT

- Not a static diagram generator (Mermaid, PlantUML) — DAD is interactive
- Not an architecture-first tool (Structurizr) — DAD is code-first
- Not a code visualization tool only (CodeSee, Sourcegraph) — DAD includes design language and documentation per element

---

## Core Concepts

### Diagram as a Delivery (DAD)

The central idea: architecture diagrams should be **deliverables**, not artifacts. They are generated from code, stored alongside code, versioned with code, and used to drive code changes.

### The `.dad` File

A `.dad.json` file is the primary output — a graph with nodes and edges representing the entire architecture of a codebase. Each node contains:
- **Structure** (JSON): ID, type, hierarchy, position, connections
- **Design specification** (YAML): C4-inspired design language describing responsibilities, interfaces, dependencies
- **Documentation** (Markdown): Human-readable description, rendered in a detail panel

### Nodes and Edges

- **Nodes** represent entities: software systems, containers (services), components (modules/classes), code units (functions)
- **Edges** represent relationships: "calls", "reads from", "publishes events to" — with protocol/technology labels
- **Nodes at the same level** are visualized together on the canvas
- **Child nodes** are revealed on double-click or zoom-in (hierarchical drill-down)

---

## The 5-Level Hierarchy (Extended C4)

DAD extends the industry-standard [C4 model](https://c4model.com/) with a 5th level for org-wide visibility.

### Level Overview

```
Level 0: Landscape
  └── Level 1: System Context
        └── Level 2: Container
              └── Level 3: Component
                    └── Level 4: Code
```

### Detailed Level Definitions

| Level | Name | What It Represents | Example | Typical Count |
|-------|------|--------------------|---------|---------------|
| 0 | **Landscape** | The entire software ecosystem of an org or workspace | "Acme Corp Engineering" | 1 per workspace |
| 1 | **System Context** | A single software system + its external actors (people, external services) | "E-Commerce Platform", "Customer", "Stripe" | 2-10 systems |
| 2 | **Container** | A deployable/runnable unit within a system — a service, database, queue, web app | api-gateway, user-service, PostgreSQL, Redis, Kafka | 3-20 per system |
| 3 | **Component** | A logical grouping within a container — a module, controller, service class | UserController, OrderService, AuthMiddleware | 5-30 per container |
| 4 | **Code** | Individual functions, methods, classes — the implementation level | `registerUser()`, `validateJWT()`, `class User` | 5-50 per component |

### Why 5 Levels Instead of C4's Standard 4?

Standard C4 starts at "System Context" — it assumes you're looking at one system at a time. DAD adds the **Landscape** level because:

- Engineering teams manage multiple systems, not just one
- Understanding where a system fits in the org is critical context
- Multi-repo visibility helps with cross-team dependencies
- The landscape view answers "what do we even have?" before "how does this system work?"

### Why Not Collapse to 3 Levels?

A simplified Service > Class > Function model loses the architectural context that makes DAD different from a code browser:

- The **Container/Component distinction** matters: "this is independently deployable" vs "this is a logical grouping inside a deployment"
- Without Container-level thinking, you can't reason about deployment topology, scaling, or inter-service communication
- The C4 levels map to real organizational concerns: architects care about containers, developers care about components

### Node Types Per Level

| Level | Node Types | Structurizr Equivalent |
|-------|-----------|----------------------|
| 0 - Landscape | `landscape` | `systemLandscape` (view only, not a model element) |
| 1 - Context | `softwareSystem`, `person`, `externalSystem` | `softwareSystem`, `person` |
| 2 - Container | `container`, `dataStore` | `container` |
| 3 - Component | `component` | `component` |
| 4 - Code | `codeUnit` | (not modeled in Structurizr) |

---

## The `.dad` File Format

### Format Philosophy: Hybrid (JSON + YAML + Markdown)

The `.dad.json` file uses three formats, each matched to its purpose:

| Layer | Format | Purpose | Who Reads/Writes It |
|-------|--------|---------|-------------------|
| **Structure** | JSON | Graph backbone (nodes, edges, hierarchy, IDs) | LLM generates, Zod validates, canvas renders |
| **Design Spec** | YAML (embedded string) | C4-inspired design language per node | Architects read/edit, LLM generates |
| **Documentation** | Markdown (embedded string) | Human-readable description per node | Everyone reads, LLM generates |

### File Location

```
<workspace-root>/
  .dad/
    landscape.dad.json       # Primary file: full 5-level graph
    manifest.json            # Index of all .dad files
```

### Top-Level Schema

```typescript
interface DadFile {
  version: '1.0';
  metadata: {
    projectName: string;        // "Acme Corp Engineering"
    generatedAt: string;        // ISO 8601 timestamp
    generatedBy: string;        // "daad-vscode/0.0.1"
    sourceCommit?: string;      // Git commit hash at generation time
    totalNodes: number;
    totalEdges: number;
  };
  nodes: DadNode[];
  edges: DadEdge[];
}
```

### Node Schema

```typescript
type C4Level = 'landscape' | 'context' | 'container' | 'component' | 'code';

type DadNodeType =
  | 'landscape'        // Level 0: Org/workspace ecosystem
  | 'softwareSystem'   // Level 1: A complete software system
  | 'person'           // Level 1: A user/actor
  | 'externalSystem'   // Level 1: External dependency (Stripe, SendGrid, etc.)
  | 'container'        // Level 2: Deployable service/app
  | 'dataStore'        // Level 2: Database, cache, queue
  | 'component'        // Level 3: Module, controller, service class
  | 'codeUnit';        // Level 4: Function, method, class

interface DadNode {
  id: string;                    // Namespaced: "landscape:acme", "container:api-gateway"
  c4Level: C4Level;              // Which hierarchy level
  name: string;                  // Display name
  type: DadNodeType;             // Element type

  // --- Embedded content ---
  designSpec: string;            // YAML string: C4-inspired design language
  documentation: string;         // Markdown string: human-readable docs

  // --- Source code mapping (enables round-tripping) ---
  sourceMapping?: {
    filePath: string;            // Relative path from workspace root
    startLine?: number;          // First line of this entity in source
    endLine?: number;            // Last line
    language?: string;           // "typescript", "python", "go", etc.
  };

  // --- Hierarchy ---
  parentId?: string;             // Parent node ID (e.g., container's parent is a system)
  childIds: string[];            // Direct children IDs

  // --- Visual metadata ---
  position?: { x: number; y: number };  // Canvas position
  collapsed?: boolean;                    // UI state: collapsed in tree?
  technology?: string;                    // e.g., "TypeScript/Express", "Python/FastAPI"
  tags?: string[];                        // For styling: ["critical", "external", "database"]
}
```

### Edge Schema

```typescript
interface DadEdge {
  id: string;                    // Unique edge ID
  source: string;                // Source node ID
  target: string;                // Target node ID
  label: string;                 // Relationship description: "Makes API calls to"
  technology?: string;           // Protocol/tech: "REST/HTTPS", "gRPC", "Kafka events"
  c4Level: C4Level;              // Level at which this relationship exists
  tags?: string[];               // For styling: ["async", "critical-path"]
}
```

### YAML Design Spec (per node)

Each node's `designSpec` field contains a YAML string following a C4-inspired domain-specific language:

#### Landscape Node
```yaml
element:
  type: landscape
  name: "Acme Corp Engineering"
  description: "All software systems maintained by the engineering org"
  systems:
    - "ecommerce-platform"
    - "internal-tools"
  teams:
    - name: "Platform Team"
      owns: ["ecommerce-platform"]
    - name: "Internal Tools Team"
      owns: ["internal-tools"]
```

#### Software System Node
```yaml
element:
  type: softwareSystem
  name: "E-Commerce Platform"
  description: "Online shopping platform serving 10M+ users"
  technology: "TypeScript, Python, PostgreSQL, Redis, Kafka"
  responsibilities:
    - "Product catalog and search"
    - "User authentication and profiles"
    - "Order processing and fulfillment"
    - "Payment processing via Stripe"
  external_actors:
    - name: "Customer"
      type: person
      interaction: "Browses products, places orders"
    - name: "Stripe"
      type: externalSystem
      interaction: "Processes credit card payments"
```

#### Container Node
```yaml
element:
  type: container
  name: "API Gateway"
  description: "Routes and authenticates all incoming API requests"
  technology: "TypeScript, Express.js"
  responsibilities:
    - "Route HTTP requests to appropriate microservices"
    - "Authenticate and authorize requests via JWT"
    - "Rate limiting and request throttling"
  interfaces:
    - name: "REST API"
      protocol: "HTTPS"
      port: 3000
  dependencies:
    - target: "container:user-service"
      description: "Authenticates users"
      protocol: "gRPC"
    - target: "container:order-service"
      description: "Forwards order requests"
      protocol: "REST/HTTP"
  deployment:
    instances: 3
    infrastructure: "AWS ECS Fargate"
```

#### Component Node
```yaml
element:
  type: component
  name: "UserController"
  description: "Handles HTTP endpoints for user CRUD operations"
  technology: "TypeScript class, Express Router"
  responsibilities:
    - "Parse and validate request parameters"
    - "Delegate to UserService for business logic"
    - "Format and return HTTP responses"
  exports:
    - "registerUser(req, res)"
    - "loginUser(req, res)"
    - "getUserProfile(req, res)"
    - "updateUser(req, res)"
  dependencies:
    - target: "component:user-service:userService"
      description: "Delegates business logic"
```

#### Code Unit Node
```yaml
element:
  type: codeUnit
  name: "registerUser()"
  description: "Handles user registration with email validation and password hashing"
  signature: "(req: Request, res: Response) => Promise<void>"
  complexity: 8
  lineCount: 45
  patterns:
    - "try-catch error handling"
    - "async/await"
    - "input validation with Zod"
    - "bcrypt password hashing"
  calls:
    - "userService.createUser()"
    - "emailService.sendWelcome()"
```

### Markdown Documentation (per node)

Each node's `documentation` field contains Markdown:

```markdown
# API Gateway

The API Gateway serves as the single entry point for all client requests
to the E-Commerce Platform. It handles cross-cutting concerns before
routing requests to the appropriate internal microservice.

## Key Responsibilities

- **Authentication**: Validates JWT tokens on every request using RS256
- **Routing**: Maps external URLs to internal service endpoints
- **Rate Limiting**: Per-IP throttling (100 req/min default, 1000 for authenticated)
- **CORS**: Manages cross-origin policies for the web frontend

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 20 LTS |
| Framework | Express.js | 4.18 |
| Auth | jsonwebtoken | 9.x |
| Rate Limit | express-rate-limit | 7.x |

## API Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|--------------|
| POST | /api/auth/login | User authentication | No |
| POST | /api/auth/register | User registration | No |
| GET | /api/users/me | Get current user profile | Yes |
| GET | /api/orders | List user orders | Yes |
| POST | /api/orders | Create new order | Yes |

## Notes

- Gateway timeout is 30s; long-running operations use async patterns
- All responses are JSON with consistent error format
- Health check at GET /health (no auth, used by ALB)
```

### Complete `.dad.json` Example

```json
{
  "version": "1.0",
  "metadata": {
    "projectName": "Acme Corp Engineering",
    "generatedAt": "2026-02-06T10:30:00Z",
    "generatedBy": "daad-vscode/0.0.1",
    "sourceCommit": "abc123def456",
    "totalNodes": 4,
    "totalEdges": 2
  },
  "nodes": [
    {
      "id": "landscape:acme",
      "c4Level": "landscape",
      "name": "Acme Corp Engineering",
      "type": "landscape",
      "designSpec": "element:\n  type: landscape\n  name: \"Acme Corp Engineering\"\n  description: \"All software systems\"\n  systems:\n    - \"ecommerce-platform\"",
      "documentation": "# Acme Corp Engineering\n\nThe complete software ecosystem.",
      "parentId": null,
      "childIds": ["system:ecommerce"],
      "technology": null,
      "tags": ["org"]
    },
    {
      "id": "system:ecommerce",
      "c4Level": "context",
      "name": "E-Commerce Platform",
      "type": "softwareSystem",
      "designSpec": "element:\n  type: softwareSystem\n  name: \"E-Commerce Platform\"\n  description: \"Online shopping platform\"\n  technology: \"TypeScript, Python\"",
      "documentation": "# E-Commerce Platform\n\nServes 10M+ users worldwide.",
      "parentId": "landscape:acme",
      "childIds": ["container:api-gateway", "container:user-service"],
      "technology": "TypeScript, Python, PostgreSQL",
      "tags": ["critical"]
    },
    {
      "id": "container:api-gateway",
      "c4Level": "container",
      "name": "API Gateway",
      "type": "container",
      "designSpec": "element:\n  type: container\n  name: API Gateway\n  technology: \"TypeScript, Express.js\"\n  responsibilities:\n    - \"Route HTTP requests\"\n    - \"JWT authentication\"",
      "documentation": "# API Gateway\n\nSingle entry point for all client requests.",
      "sourceMapping": {
        "filePath": "services/api-gateway/src/index.ts",
        "language": "typescript"
      },
      "parentId": "system:ecommerce",
      "childIds": [],
      "technology": "TypeScript/Express",
      "tags": ["backend", "api"]
    },
    {
      "id": "container:user-service",
      "c4Level": "container",
      "name": "User Service",
      "type": "container",
      "designSpec": "element:\n  type: container\n  name: User Service\n  technology: \"TypeScript\"\n  responsibilities:\n    - \"User CRUD\"\n    - \"Authentication\"",
      "documentation": "# User Service\n\nManages user accounts and authentication.",
      "sourceMapping": {
        "filePath": "services/user-service/src/index.ts",
        "language": "typescript"
      },
      "parentId": "system:ecommerce",
      "childIds": [],
      "technology": "TypeScript",
      "tags": ["backend"]
    }
  ],
  "edges": [
    {
      "id": "edge:gateway-to-user",
      "source": "container:api-gateway",
      "target": "container:user-service",
      "label": "Authenticates users via",
      "technology": "gRPC",
      "c4Level": "container",
      "tags": ["sync"]
    },
    {
      "id": "edge:customer-to-gateway",
      "source": "person:customer",
      "target": "container:api-gateway",
      "label": "Makes API requests to",
      "technology": "REST/HTTPS",
      "c4Level": "context",
      "tags": ["external"]
    }
  ]
}
```

---

## Design Decisions & Rationale

### Decision 1: Extended 5-Level C4 Hierarchy

**Chosen:** Landscape (L0) > System Context (L1) > Container (L2) > Component (L3) > Code (L4)

**Why not standard C4 (4 levels)?**
- Standard C4 starts at System Context — assumes you're looking at one system at a time
- DAD needs org-wide visibility: "where does this system live?"
- Multi-repo/multi-system view is critical for real engineering teams

**Why not simplified 3-level?**
- Losing Container/Component distinction loses architectural value
- "This is a deployable unit" vs "this is a logical grouping inside it" matters for ops

### Decision 2: Hybrid File Format (JSON + YAML + Markdown)

**Chosen:** `.dad.json` with JSON structure, YAML in `designSpec`, Markdown in `documentation`

| Format | LLM Reliability | Human Readability | Parse Complexity | Failure Isolation |
|--------|----------------|-------------------|-----------------|-------------------|
| Pure JSON | ~98% | Poor | Zero | Whole-file |
| Pure YAML | ~93% | Good | Low | Whole-file |
| Custom DSL | ~70% | Best | High (build parser) | Whole-file |
| **Hybrid** | **~95%** | **Good where it matters** | **Low** | **Per-node** |

**Key insight: failure isolation.** If the LLM generates broken YAML in one node's `designSpec`, the entire `.dad.json` still parses fine — only that one node's design spec is degraded. With pure YAML or a custom DSL, one syntax error corrupts the entire file.

**Three concerns, three formats:**
- **JSON** for structure — must never break, LLMs get it right 98%+
- **YAML** for design specs — human-readable, architects can edit directly
- **Markdown** for docs — renders beautifully, universally understood

**Why not pure JSON?** `designSpec` as nested JSON is unreadable. Compare:
```json
{"element":{"type":"container","responsibilities":["Route HTTP","JWT auth"]}}
```
vs YAML:
```yaml
element:
  type: container
  responsibilities:
    - Route HTTP
    - JWT auth
```

**Why not a custom DSL?** Requires building a parser (PEG.js / tree-sitter). LLMs hallucinate custom syntax ~30% of the time. Structurizr's DSL works because humans write it; DAD's files are LLM-generated.

### Decision 3: Structurizr Vocabulary

**Chosen:** Reuse Structurizr/C4 naming (`person`, `softwareSystem`, `container`, `component`) with DAD additions

**Why:** Zero learning curve for architects, community familiarity, enables future Structurizr DSL export.

**What DAD adds that Structurizr lacks:**

| DAD Addition | Why |
|-------------|-----|
| `landscape` as model element | Structurizr only has it as a view type, not a drillable node |
| `codeUnit` type | Structurizr stops at Component; DAD goes to function level |
| `dataStore` type | Structurizr uses `container` for databases; we separate for visual clarity |
| `sourceMapping` | Structurizr is architecture-first; DAD is code-first with round-tripping |

### Decision 4: Structurizr DSL Export as Future Feature

**Why later:** Core value is the canvas, not file format interop. Export is a straightforward tree-walk once the schema stabilizes. Follows existing pattern in `packages/diagram-schema/src/converters.ts` (already exports to D2 and Mermaid).

---

## Architecture Overview

### Monorepo Structure

```
dad_Dad_Visualizer/
├── apps/
│   ├── vscode-extension/          # VS Code/Cursor extension (TypeScript + React)
│   │   ├── src/
│   │   │   ├── extension.ts                    # Extension entry point
│   │   │   ├── extension/
│   │   │   │   ├── claude/client.ts            # Claude AI integration
│   │   │   │   ├── openrouter/client.ts        # OpenRouter API integration
│   │   │   │   ├── c4/                         # NEW: C4 generation pipeline
│   │   │   │   │   ├── C4Generator.ts          # Multi-pass orchestrator
│   │   │   │   │   ├── C4AnalysisClient.ts     # LLM prompt wrapper
│   │   │   │   │   └── promptTemplates.ts      # Prompt templates per level
│   │   │   │   ├── providers/
│   │   │   │   │   ├── FlowVisualizerProvider.ts   # Main webview provider
│   │   │   │   │   └── SavedChartsProvider.ts      # Sidebar tree view
│   │   │   │   ├── storage/
│   │   │   │   │   ├── FlowChartStorage.ts     # .daad.json storage
│   │   │   │   │   └── DadStorage.ts           # NEW: .dad.json storage
│   │   │   │   └── utils/
│   │   │   │       ├── codeAnalyzer.ts         # Code parsing
│   │   │   │       ├── layoutEngine.ts         # Dagre + ELK layouts
│   │   │   │       ├── HierarchyBuilder.ts     # Build hierarchical trees
│   │   │   │       └── projectScanner.ts       # NEW: FS walker for C4 detection
│   │   │   ├── webview/
│   │   │   │   ├── App.tsx                     # React Flow canvas
│   │   │   │   ├── components/
│   │   │   │   │   ├── CustomNode.tsx          # Flow chart nodes
│   │   │   │   │   ├── HierarchicalNode.tsx    # Collapsible hierarchy nodes
│   │   │   │   │   ├── C4LandscapeNode.tsx     # NEW: Landscape level
│   │   │   │   │   ├── C4SystemNode.tsx        # NEW: System Context level
│   │   │   │   │   ├── C4ContainerNode.tsx     # NEW: Container level
│   │   │   │   │   ├── C4ComponentNode.tsx     # NEW: Component level
│   │   │   │   │   ├── C4CodeNode.tsx          # NEW: Code level
│   │   │   │   │   ├── NodeDetailPanel.tsx     # NEW: YAML/MD detail panel
│   │   │   │   │   └── C4Breadcrumbs.tsx       # NEW: Navigation breadcrumbs
│   │   │   │   └── utils/
│   │   │   │       └── zoomManager.ts          # Zoom-based LOD
│   │   │   └── shared/
│   │   │       └── types.ts                    # Shared type definitions
│   │   └── package.json
│   ├── cli/                        # CLI tool (Go)
│   └── workers/                    # Backend API (Cloudflare Workers)
├── packages/
│   ├── shared-types/
│   │   └── src/
│   │       ├── index.ts            # Existing flow chart types
│   │       └── c4.ts               # NEW: C4/DAD types
│   ├── diagram-schema/
│   │   └── src/
│   │       ├── schemas.ts          # Existing Zod schemas
│   │       ├── c4Schemas.ts        # NEW: C4 Zod validation
│   │       └── converters.ts       # D2/Mermaid export (future: Structurizr)
│   └── config/                     # Shared ESLint/TS configs
├── examples/
│   └── mock-microservices/         # NEW: Demo e-commerce codebase
└── docs/
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Canvas | React Flow 11.11.4 | Interactive node-edge graph visualization |
| Layout | Dagre + ELKjs | Automatic graph layout algorithms |
| Extension | VS Code Extension API | IDE integration, commands, webview |
| AI | Claude CLI / OpenRouter API | LLM-powered code analysis |
| Validation | Zod | Runtime type checking for `.dad.json` |
| Storage | File system (`.dad/`) + IndexedDB (Dexie) | Persistence + caching |
| Backend | Hono on Cloudflare Workers | API for rendering, batch analysis |
| Build | Turborepo + pnpm + Webpack | Monorepo build pipeline |

---

## End-to-End Flow

### Generation Flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌──────────────┐
│  User runs   │────>│  ProjectScanner  │────>│  C4Generator    │────>│  DadStorage  │
│  Cmd+Shift+A │     │  walks file      │     │  multi-pass LLM │     │  saves .dad  │
│              │     │  system           │     │  analysis       │     │  .json       │
└─────────────┘     └──────────────────┘     └─────────────────┘     └──────────────┘
                                                                            │
                                                                            v
                    ┌──────────────────┐     ┌─────────────────┐     ┌──────────────┐
                    │  React Flow      │<────│  FlowVisualizer │<────│  Canvas      │
                    │  renders C4      │     │  Provider sends │     │  loads view  │
                    │  nodes           │     │  to webview     │     │              │
                    └──────────────────┘     └─────────────────┘     └──────────────┘
```

### Step-by-Step

1. **User triggers** "DAD: Generate Architecture Diagram" (`Cmd+Shift+A`)
2. **ProjectScanner** walks the workspace file system:
   - Detects containers via `package.json`, `Dockerfile`, `go.mod`, `requirements.txt`
   - Detects components via directory patterns (`controllers/`, `services/`, `models/`)
   - Detects code units via source files
   - Outputs a structural skeleton (node IDs + parent-child hierarchy)
3. **C4Generator** orchestrates multi-pass LLM analysis:
   - Pass 1 (no LLM): Structure scan → skeleton
   - Pass 2 (1 LLM call): Landscape + system context descriptions
   - Pass 3 (N calls): Container descriptions per service
   - Pass 4 (N calls): Component descriptions per container
   - Pass 5 (on demand): Code-level detail when user drills down
4. **DadStorage** saves the assembled `DadFile` to `.dad/landscape.dad.json`
5. **FlowVisualizerProvider** sends the Landscape-level view to the React Flow webview
6. **Canvas** renders C4LandscapeNodes with edges showing system relationships
7. **User double-clicks** a system node → canvas transitions to Container view
8. **User double-clicks** a container → Component view
9. **User double-clicks** a component → Code view (reuses existing flow chart pipeline)
10. **Single-click** any node → detail panel shows YAML design spec + Markdown docs

### Drill-Down Interaction Model

```
Landscape ──double-click──> System Context ──double-click──> Containers
    ^                            ^                              │
    │                            │                    double-click
    └───── breadcrumb ───────────┘                              v
                                                          Components
                                                              │
                                                    double-click
                                                              v
                                                          Code Units
                                                              │
                                                    double-click
                                                              v
                                                    Existing Flow Chart
                                                    (start/process/decision/end)
```

---

## Implementation Guide

### Phase 1: Mock Microservice Codebase

Create `examples/mock-microservices/` with a realistic e-commerce platform:

- **4 services**: api-gateway (TS), user-service (TS), order-service (TS), notification-service (Python)
- **2 systems**: ecommerce-platform + internal-tools (for Landscape demo)
- **Communication patterns**: REST, gRPC, event-driven (Kafka)
- **Shared code**: proto definitions, event schemas

### Phase 2: Type System & Validation

- `packages/shared-types/src/c4.ts` — TypeScript interfaces for DadNode, DadEdge, DadFile
- `packages/diagram-schema/src/c4Schemas.ts` — Zod schemas mirroring the types
- Re-export from package index files

### Phase 3: Project Scanner

- `apps/vscode-extension/src/extension/utils/projectScanner.ts`
- Walks file system, detects C4 entities by file markers:
  - `package.json` / `Dockerfile` / `go.mod` / `requirements.txt` → Container
  - `controllers/` / `services/` / `models/` / `middleware/` dirs → Component patterns
  - `.ts` / `.py` / `.go` source files → Code units
- Outputs structural skeleton: node IDs + hierarchy, no descriptions yet

### Phase 4: LLM Generation Pipeline

- `apps/vscode-extension/src/extension/c4/promptTemplates.ts` — prompt templates per C4 level
- `apps/vscode-extension/src/extension/c4/C4AnalysisClient.ts` — wraps existing Claude/OpenRouter clients
- `apps/vscode-extension/src/extension/c4/C4Generator.ts` — orchestrates multi-pass generation
- `apps/vscode-extension/src/extension/storage/DadStorage.ts` — reads/writes `.dad.json`

### Phase 5: Canvas C4 Nodes

- 5 new React components: `C4LandscapeNode`, `C4SystemNode`, `C4ContainerNode`, `C4ComponentNode`, `C4CodeNode`
- Register in `App.tsx` nodeTypes map
- Extend `handleToggleCollapse` with C4-level drill-down
- Extend `ZoomManager` with 5-level zoom thresholds
- Add `C4Breadcrumbs` component for navigation
- Add `NodeDetailPanel` for YAML/MD viewing

### Phase 6: Integration

- Register `daad.generateC4` and `daad.openC4` commands in `extension.ts`
- Add webview message protocol: `updateC4View`, `drillDown`, `drillUp`, `requestNodeDetail`
- Ensure backward compatibility: all existing commands unchanged

---

## VS Code Canvas & Interaction Model

### Node Visual Design

| Node Type | Shape | Color | Size | Content |
|-----------|-------|-------|------|---------|
| Landscape | Extra-large rounded box | Dark blue | 400x200 | Org name, system count |
| System | Large rounded box | Blue | 300x150 | System name, description, tech |
| Container | Medium colored box | Teal/Green | 250x120 | Name, technology badge, port |
| Component | Standard box | Light blue | 200x100 | Name, responsibilities |
| Code | Small box | Gray | 150x60 | Function name, signature |
| Person | Person shape (oval + head) | Purple | 120x140 | Actor name, role |
| External System | Dashed box | Gray | 200x100 | System name, "(External)" |
| Data Store | Cylinder shape | Orange | 200x100 | Name, technology |

### Edge Visual Design

| Edge Type | Style | Color | Label |
|-----------|-------|-------|-------|
| Sync call | Solid line, arrow | Dark gray | "Calls via REST/HTTPS" |
| Async event | Dashed line, arrow | Blue | "Publishes OrderCreated" |
| Data flow | Solid line, diamond | Orange | "Reads from" |
| External | Dotted line, arrow | Gray | "Integrates with" |

### Zoom-Based Level of Detail

```typescript
const C4_ZOOM_LEVELS = [
  { level: 0, name: 'Landscape',      minZoom: 0,    maxZoom: 0.25 },
  { level: 1, name: 'System Context', minZoom: 0.25, maxZoom: 0.5  },
  { level: 2, name: 'Containers',     minZoom: 0.5,  maxZoom: 1.0  },
  { level: 3, name: 'Components',     minZoom: 1.0,  maxZoom: 2.0  },
  { level: 4, name: 'Code',           minZoom: 2.0,  maxZoom: Infinity },
];
```

As users zoom in, nodes at deeper levels appear; as they zoom out, detail collapses. Double-click provides explicit drill-down regardless of zoom level.

### Layout Algorithms Per Level

| Level | Algorithm | Rationale |
|-------|-----------|-----------|
| Landscape | `elk-radial` | Systems arranged in a circle around the org center |
| System Context | `elk-force` | Central system with actors/externals distributed around |
| Containers | `elk-layered` | Services arranged by dependency flow (top-to-bottom) |
| Components | `dagre` / `elk-box` | Standard hierarchical layout within a container |
| Code | Existing flow chart layout | Reuses current dagre-based positioning |

---

## LLM Generation Pipeline

### Multi-Pass Strategy

Generation is staged by C4 level, with each pass building on the previous:

| Pass | C4 Level | LLM Calls | Input | Output |
|------|----------|-----------|-------|--------|
| 1 | Scan | 0 | File system | Structural skeleton |
| 2 | L0 + L1 | 1 | Skeleton + README + docker-compose | Landscape + system descriptions |
| 3 | L2 | N (per container) | Top-level files per service | Container descriptions + edges |
| 4 | L3 | N (per container) | Module code per container | Component descriptions + edges |
| 5 | L4 | On demand | Function code | Reuses existing `analyzeCode()` |

### Prompt Template Structure

Each prompt follows a consistent pattern:

```
You are a software architect analyzing a codebase to produce C4 model documentation.

CONTEXT:
{project structure / parent node info}

CODE TO ANALYZE:
{relevant source files}

OUTPUT FORMAT:
Return ONLY valid JSON matching this schema:
{expected JSON structure}

RULES:
- designSpec must be valid YAML
- documentation must be valid Markdown
- Use Structurizr vocabulary for element types
- Be specific about technologies and protocols
```

### Error Handling

- JSON parse failure → retry with simplified prompt (up to 3 attempts)
- YAML validation failure in designSpec → store raw string, flag as `needsReview`
- Network/LLM timeout → save partial results, allow incremental regeneration
- Per-node isolation means one bad generation doesn't corrupt the whole file

---

## API Reference

### VS Code Commands

| Command ID | Title | Keybinding | Description |
|-----------|-------|-----------|-------------|
| `daad.generateC4` | DAD: Generate Architecture Diagram | `Cmd+Shift+A` | Full multi-pass generation from codebase |
| `daad.openC4` | DAD: Open Architecture View | — | Open existing `.dad.json` in canvas |
| `daad.visualize` | DAAD: Visualize Selected Code | — | Existing: flow chart from selection |
| `daad.visualizeFile` | DAAD: Visualize File | — | Existing: flow chart from file |
| `daad.visualizeSmart` | DAAD: Smart Visualize | `Cmd+Shift+V` | Existing: auto-detect function at cursor |
| `daad.visualizeProject` | DAAD: Visualize Project | — | Existing: hierarchical project view |
| `daad.visualizeChanges` | DAAD: Visualize Changes | `Cmd+Shift+G` | Existing: git diff visualization |

### Webview Message Protocol

**Extension → Webview:**

| Message | Payload | Description |
|---------|---------|-------------|
| `updateC4View` | `{ nodes: DadNode[], edges: DadEdge[], level: C4Level }` | Send filtered graph for current drill-down level |
| `showNodeDetail` | `{ node: DadNode }` | Show YAML/MD detail panel for selected node |
| `updateBreadcrumbs` | `{ path: Array<{id, name, level}> }` | Update navigation breadcrumb trail |
| `showLoading` | `{}` | Show loading spinner |
| `showError` | `{ error: string }` | Show error state |

**Webview → Extension:**

| Message | Payload | Description |
|---------|---------|-------------|
| `drillDown` | `{ nodeId: string }` | User double-clicked a node to see children |
| `drillUp` | `{ toLevel: C4Level }` | User clicked breadcrumb to go up |
| `requestNodeDetail` | `{ nodeId: string }` | User single-clicked, wants YAML/MD |
| `ready` | `{}` | Webview initialized and ready |

### Configuration

```json
{
  "daad.apiProvider": "claude | openrouter",
  "daad.openRouterApiKey": "sk-...",
  "daad.openRouterModel": "qwen/qwen-2.5-coder-32b-instruct",
  "daad.c4.excludePaths": ["node_modules", ".git", "dist", "build"],
  "daad.c4.containerDetection": "auto | manual"
}
```

---

## Glossary

| Term | Definition |
|------|-----------|
| **DAD** | Diagram as a Delivery — the project name and philosophy |
| **DAAD** | The VS Code extension name (legacy, used in command prefixes) |
| **C4 Model** | Software architecture visualization model with 4 levels: Context, Container, Component, Code |
| **Extended C4** | DAD's 5-level variant adding Landscape (L0) above System Context |
| **`.dad.json`** | The hybrid file format storing the architecture graph (JSON + YAML + MD) |
| **`.daad.json`** | Legacy format for function-level flow charts (still supported) |
| **Landscape** | Level 0: The entire software ecosystem of an org/workspace |
| **System Context** | Level 1: A single software system and its external relationships |
| **Container** | Level 2: A deployable/runnable unit (service, database, web app) |
| **Component** | Level 3: A logical grouping within a container (module, controller, service class) |
| **Code Unit** | Level 4: An individual function, method, or class |
| **Design Spec** | YAML content per node describing responsibilities, interfaces, dependencies |
| **Source Mapping** | Metadata linking a node back to its source file and line numbers |
| **Drill-down** | Navigation action: double-click a node to see its children at the next level |
| **Structurizr** | Industry tool for C4 model documentation; DAD uses its vocabulary but not its DSL format |
| **React Flow** | The graph visualization library powering the VS Code canvas |
| **ELK** | Eclipse Layout Kernel — layout algorithms for automatic node positioning |
| **ProjectScanner** | Component that walks the file system to detect C4 entities from code structure |
| **C4Generator** | Orchestrator that runs multi-pass LLM analysis to produce a `.dad.json` file |
| **Round-tripping** | The ability to go from code → diagram → code changes (DAD's core value prop) |
