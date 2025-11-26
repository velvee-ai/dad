# Diagram Storage Architecture Plan

## Overview

This document outlines the architecture for the DAAD diagram storage service, supporting two distinct use cases:
1. **CI/CD Pipeline Storage**: Local `.dad` folder storage for merged code
2. **IDE Preview Storage**: Cloudflare R2 storage for uncommitted changes

---

## Use Case 1: CI/CD Pipeline Storage (Local)

### Trigger
- GitHub Action workflow on merge to `main`/`master` branch
- Runs CLI tool against codebase

### Storage Strategy
- **Location**: `.dad/` folder in repository root
- **Format**: JSON files with diagram metadata
- **Versioning**: Git-tracked, versioned with codebase
- **No API Required**: Direct file system operations

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  GitHub Action Workflow                  │
│                                                           │
│  on:                                                      │
│    push:                                                  │
│      branches: [main, master]                            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│                   DAAD CLI Process                       │
│                                                           │
│  1. Scan codebase for supported files                    │
│  2. Generate diagrams for changed/new files              │
│  3. Write to .dad/ folder                                │
│  4. Commit changes if any                                │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              Local File System (.dad/)                   │
│                                                           │
│  .dad/                                                    │
│  ├── manifest.json                                       │
│  ├── diagrams/                                           │
│  │   ├── src_services_auth.json                         │
│  │   ├── src_services_auth.d2                           │
│  │   ├── src_services_auth.mermaid                      │
│  │   └── ...                                             │
│  └── index/                                              │
│      ├── by-file.json                                    │
│      └── by-complexity.json                              │
└─────────────────────────────────────────────────────────┘
```

### File Structure

```
.dad/
├── manifest.json              # Index of all diagrams, metadata
├── diagrams/                  # All diagram files
│   ├── {normalized_path}.json      # Diagram schema
│   ├── {normalized_path}.d2        # D2 format
│   ├── {normalized_path}.mermaid   # Mermaid format
│   └── {normalized_path}.svg       # Rendered SVG (optional)
└── .gitkeep                   # Ensure folder is tracked
```

### Manifest Schema

```json
{
  "version": "1.0.0",
  "generated_at": "2025-11-26T10:30:00Z",
  "commit": "da26907abc...",
  "diagrams": [
    {
      "id": "src_services_auth",
      "file_path": "src/services/auth.ts",
      "language": "typescript",
      "complexity": 5,
      "node_count": 12,
      "generated_at": "2025-11-26T10:30:00Z",
      "formats": ["json", "d2", "mermaid", "svg"]
    }
  ],
  "statistics": {
    "total_diagrams": 42,
    "total_files": 38,
    "languages": ["typescript", "go", "python"]
  }
}
```

### Implementation Components

#### 1. GitHub Action Workflow
**File**: `.github/workflows/generate-diagrams.yml`

```yaml
name: Generate Diagrams

on:
  push:
    branches:
      - main
      - master

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for git diff

      - name: Install DAAD CLI
        run: |
          # Download/install CLI binary
          curl -L https://releases.daad.dev/cli/latest/daad-linux -o /usr/local/bin/daad
          chmod +x /usr/local/bin/daad

      - name: Generate Diagrams
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
        run: |
          daad generate --output .dad --format all --incremental

      - name: Commit Diagrams
        run: |
          git config user.name "DAAD Bot"
          git config user.email "bot@daad.dev"
          git add .dad/
          git diff --quiet && git diff --staged --quiet || \
            git commit -m "chore: update diagrams [skip ci]"
          git push
```

#### 2. CLI Storage Module
**File**: `apps/cli/internal/storage/local.go`

```go
type LocalStorage struct {
    basePath    string
    manifest    *Manifest
}

func NewLocalStorage(basePath string) (*LocalStorage, error) {
    // Initialize .dad folder if not exists
    // Load or create manifest
}

func (s *LocalStorage) Save(diagram *Diagram) error {
    // Save JSON, D2, Mermaid formats
    // Update manifest
    // Write manifest.json
}

func (s *LocalStorage) SaveBatch(diagrams []*Diagram) error {
    // Batch save with single manifest write
}

func (s *LocalStorage) List() ([]*DiagramMetadata, error) {
    // Read from manifest
}

func (s *LocalStorage) Get(id string) (*Diagram, error) {
    // Read specific diagram
}
```

#### 3. Incremental Generation
**File**: `apps/cli/internal/generator/incremental.go`

```go
type IncrementalGenerator struct {
    storage  Storage
    analyzer Analyzer
}

func (g *IncrementalGenerator) GenerateChanges(
    baseBranch string,
) ([]*Diagram, error) {
    // Git diff to find changed files
    // Filter for supported languages
    // Generate only for changed files
    // Compare with existing diagrams (hash-based)
    // Skip if identical
}
```

---

## Use Case 2: IDE Preview Storage (Cloudflare R2)

### Trigger
- User clicks "Visualize Changes" in IDE
- Analyzes uncommitted/unstaged changes
- Creates ephemeral preview diagrams

### Storage Strategy
- **Location**: Cloudflare R2 bucket
- **Namespace**: `previews/{commit_sha}/`
- **TTL**: 7 days (auto-expire)
- **Access**: Pre-signed URLs or public bucket with random IDs
- **API**: Cloudflare Workers backend

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                VSCode Extension (IDE)                    │
│                                                           │
│  User Action: "Visualize Changes"                        │
│  1. Detect changed files (git diff)                      │
│  2. Extract code for changed functions/classes           │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ HTTP POST /api/preview/analyze
                  ▼
┌─────────────────────────────────────────────────────────┐
│             Cloudflare Workers API                       │
│                                                           │
│  POST /api/preview/analyze                               │
│  - Receives: code snippets + git context                 │
│  - Generates diagrams (AI analysis)                      │
│  - Stores in R2                                          │
│  - Returns: preview URLs                                 │
│                                                           │
│  GET /api/preview/{commit_sha}/{file_id}                │
│  - Retrieves diagram from R2                             │
│  - Returns JSON/D2/Mermaid                               │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ R2 API
                  ▼
┌─────────────────────────────────────────────────────────┐
│                Cloudflare R2 Bucket                      │
│                                                           │
│  diagrams-preview/                                       │
│  └── {commit_sha}/                                       │
│      ├── manifest.json                                   │
│      ├── files/                                          │
│      │   ├── {file_hash}.json                           │
│      │   ├── {file_hash}.d2                             │
│      │   └── {file_hash}.mermaid                        │
│      └── metadata.json                                   │
└─────────────────────────────────────────────────────────┘
```

### R2 Storage Structure

```
Bucket: daad-preview-diagrams
├── {commit_sha_1}/
│   ├── manifest.json           # Index for this preview session
│   ├── metadata.json           # Session metadata
│   └── diagrams/
│       ├── {file_hash_1}.json
│       ├── {file_hash_1}.d2
│       ├── {file_hash_2}.json
│       └── {file_hash_2}.d2
├── {commit_sha_2}/
│   └── ...
└── .cleanup-metadata/          # For TTL tracking
    └── index.json
```

### Preview Manifest Schema

```json
{
  "version": "1.0.0",
  "session_id": "abc123",
  "commit_sha": "uncommitted-2025-11-26-103000",
  "created_at": "2025-11-26T10:30:00Z",
  "expires_at": "2025-12-03T10:30:00Z",
  "base_branch": "main",
  "changed_files": [
    "src/services/auth.ts",
    "src/utils/validation.ts"
  ],
  "diagrams": [
    {
      "id": "file_hash_abc",
      "file_path": "src/services/auth.ts",
      "language": "typescript",
      "preview_url": "https://r2.daad.dev/preview/abc123/file_hash_abc.json",
      "formats": ["json", "d2", "mermaid"]
    }
  ]
}
```

### Implementation Components

#### 1. VSCode Extension Command
**File**: `apps/vscode-extension/src/extension/commands/visualizeChanges.ts`

```typescript
export async function visualizeChanges(context: vscode.ExtensionContext) {
  // 1. Get git status and changed files
  const changes = await getGitChanges();

  // 2. Extract code from changed files
  const codeSnippets = await extractCodeSnippets(changes);

  // 3. Call Workers API for preview
  const session = await createPreviewSession({
    commitSha: await getCommitSha() || generateTempSha(),
    changes: codeSnippets,
    baseBranch: await getBaseBranch()
  });

  // 4. Show preview panel with diagrams
  await showPreviewPanel(session);
}

async function getCommitSha(): Promise<string | null> {
  const git = simpleGit();
  try {
    const log = await git.log({ maxCount: 1 });
    return log.latest?.hash || null;
  } catch {
    return null;
  }
}

function generateTempSha(): string {
  // For uncommitted changes: "uncommitted-{timestamp}-{random}"
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `uncommitted-${timestamp}-${random}`;
}
```

#### 2. Workers API Handler
**File**: `apps/workers/src/handlers/preview.ts`

```typescript
import { Hono } from 'hono';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

app.post('/api/preview/analyze', async (c) => {
  const { commitSha, changes, baseBranch } = await c.req.json();

  // 1. Validate input
  if (!commitSha || !changes?.length) {
    return c.json({ error: 'Invalid request' }, 400);
  }

  // 2. Generate diagrams
  const diagrams = await Promise.all(
    changes.map(change => analyzeDiagram(change, c.env))
  );

  // 3. Store in R2
  const session = await storePreviewSession(
    c.env.DAAD_PREVIEW_BUCKET,
    commitSha,
    diagrams
  );

  // 4. Return preview URLs
  return c.json({
    sessionId: session.id,
    commitSha,
    expiresAt: session.expiresAt,
    diagrams: session.diagrams.map(d => ({
      id: d.id,
      filePath: d.filePath,
      previewUrl: `/api/preview/${commitSha}/${d.id}`,
    }))
  });
});

app.get('/api/preview/:sha/:fileId', async (c) => {
  const { sha, fileId } = c.req.param();
  const format = c.req.query('format') || 'json';

  // 1. Fetch from R2
  const key = `${sha}/diagrams/${fileId}.${format}`;
  const object = await c.env.DAAD_PREVIEW_BUCKET.get(key);

  if (!object) {
    return c.json({ error: 'Not found' }, 404);
  }

  // 2. Return diagram
  const content = await object.text();
  return c.json(JSON.parse(content));
});

export default app;
```

#### 3. R2 Storage Module
**File**: `apps/workers/src/storage/r2.ts`

```typescript
export class R2PreviewStorage {
  constructor(private bucket: R2Bucket) {}

  async storeSession(
    commitSha: string,
    diagrams: Diagram[]
  ): Promise<PreviewSession> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Store manifest
    const manifest = this.createManifest(commitSha, diagrams, expiresAt);
    await this.bucket.put(
      `${commitSha}/manifest.json`,
      JSON.stringify(manifest),
      {
        customMetadata: {
          expiresAt: expiresAt.toISOString()
        }
      }
    );

    // Store each diagram in multiple formats
    for (const diagram of diagrams) {
      await this.storeDiagram(commitSha, diagram);
    }

    return { id: commitSha, diagrams, expiresAt };
  }

  async storeDiagram(commitSha: string, diagram: Diagram): Promise<void> {
    const fileHash = this.hashFilePath(diagram.filePath);

    // Store JSON
    await this.bucket.put(
      `${commitSha}/diagrams/${fileHash}.json`,
      JSON.stringify(diagram)
    );

    // Store D2
    await this.bucket.put(
      `${commitSha}/diagrams/${fileHash}.d2`,
      toD2(diagram)
    );

    // Store Mermaid
    await this.bucket.put(
      `${commitSha}/diagrams/${fileHash}.mermaid`,
      toMermaid(diagram)
    );
  }

  async cleanup(): Promise<void> {
    // List all objects with expired metadata
    // Delete expired preview sessions
    // Called by scheduled worker (daily cron)
  }

  private hashFilePath(path: string): string {
    // Simple hash for file path
    return path.replace(/[^a-zA-Z0-9]/g, '_');
  }
}
```

#### 4. Cleanup Worker
**File**: `apps/workers/src/scheduled/cleanup.ts`

```typescript
export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ) {
    const storage = new R2PreviewStorage(env.DAAD_PREVIEW_BUCKET);

    // List all objects
    const listed = await env.DAAD_PREVIEW_BUCKET.list();
    const now = new Date();

    for (const object of listed.objects) {
      const expiresAt = object.customMetadata?.expiresAt;

      if (expiresAt && new Date(expiresAt) < now) {
        // Delete entire folder
        const commitSha = object.key.split('/')[0];
        await deleteFolder(env.DAAD_PREVIEW_BUCKET, commitSha);
      }
    }
  }
};

async function deleteFolder(bucket: R2Bucket, prefix: string) {
  const listed = await bucket.list({ prefix });

  await Promise.all(
    listed.objects.map(obj => bucket.delete(obj.key))
  );
}
```

---

## Configuration

### Environment Variables

```bash
# For CLI (GitHub Actions)
OPENROUTER_API_KEY=sk-or-v1-...
CLAUDE_API_KEY=sk-ant-...
DAAD_OUTPUT_DIR=.dad

# For Workers (Cloudflare)
OPENROUTER_API_KEY=sk-or-v1-...
CLAUDE_API_KEY=sk-ant-...
```

### wrangler.toml Updates

```toml
name = "daad-workers"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
name = "daad-workers-prod"

[[r2_buckets]]
binding = "DAAD_PREVIEW_BUCKET"
bucket_name = "daad-preview-diagrams"
preview_bucket_name = "daad-preview-diagrams-dev"

[triggers]
crons = ["0 2 * * *"]  # Daily at 2 AM UTC for cleanup
```

---

## Comparison: Local vs Cloud Storage

| Aspect | Local (.dad) | Cloud (R2) |
|--------|--------------|------------|
| **Trigger** | GitHub Action on merge | IDE "Visualize Changes" |
| **Content** | Merged code diagrams | Uncommitted changes |
| **Versioning** | Git-tracked | Ephemeral (7-day TTL) |
| **Access** | Repository files | HTTP API |
| **Cost** | Free (git storage) | Cloudflare R2 pricing |
| **Persistence** | Permanent | Temporary |
| **API** | Not required | Workers API |
| **Format** | JSON, D2, Mermaid, SVG | JSON, D2, Mermaid |

---

## Security Considerations

### Local Storage (.dad)
- Public repository: All diagrams are public
- Private repository: Follows repo access controls
- No sensitive data in diagrams (code structure only)
- Commit signing for audit trail

### Cloud Storage (R2)
- Random commit SHA for uncommitted changes (hard to guess)
- Optional: Pre-signed URLs with expiration
- Rate limiting on API endpoints
- CORS policies for IDE extension only
- No PII or secrets in diagram content

---

## Migration Path

### Phase 1: CLI Local Storage (Current Priority)
1. Implement `LocalStorage` in CLI
2. Create GitHub Action workflow
3. Add manifest generation
4. Add incremental detection

### Phase 2: Workers API Foundation
1. Set up Cloudflare Workers
2. Implement R2 storage module
3. Create preview API endpoints
4. Add cleanup scheduled worker

### Phase 3: IDE Integration
1. Add "Visualize Changes" command
2. Implement git diff detection
3. Call Workers API
4. Display preview panel

### Phase 4: Optimization
1. Add caching layer (KV namespace)
2. Implement batch operations
3. Add SVG rendering
4. Performance monitoring

---

## Open Questions

1. **Commit SHA for uncommitted changes**:
   - Use `uncommitted-{timestamp}-{random}` format
   - Or use `git rev-parse HEAD` + dirty flag?
   - **Decision**: Use temp SHA format for clarity

2. **R2 Bucket naming**:
   - Single bucket with prefixes vs. multiple buckets?
   - **Recommendation**: Single bucket with `{commit_sha}/` prefixes

3. **Preview URL sharing**:
   - Should users be able to share preview URLs?
   - **Recommendation**: Yes, with 7-day expiration

4. **Diagram comparison**:
   - Should we show diffs between current and base branch diagrams?
   - **Recommendation**: Phase 4 feature

5. **Authentication**:
   - Should preview API require authentication?
   - **Recommendation**: Not initially, use random SHAs for security

---

## Success Metrics

### Local Storage (.dad)
- Diagram generation success rate > 95%
- CI/CD workflow duration < 5 minutes
- Storage size < 1MB per 100 files

### Cloud Storage (R2)
- API response time < 500ms (p95)
- Preview generation < 10 seconds
- R2 storage costs < $1/month (estimate)
- Cleanup success rate 100%

---

## Next Steps

1. ✅ Review and approve architecture plan
2. ⬜ Implement `LocalStorage` module in CLI
3. ⬜ Create GitHub Action workflow template
4. ⬜ Set up Cloudflare R2 bucket
5. ⬜ Implement Workers preview API
6. ⬜ Add VSCode "Visualize Changes" command
7. ⬜ Deploy and test end-to-end
