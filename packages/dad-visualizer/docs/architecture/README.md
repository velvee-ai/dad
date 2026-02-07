# Architecture Documentation

This directory contains architectural documentation for the DAAD monorepo.

## Documents

### System Architecture

- **[MONOREPO_MIGRATION_PLAN.md](./MONOREPO_MIGRATION_PLAN.md)**
  - Complete monorepo architecture
  - Package structure and dependencies
  - Migration strategy from single-repo to monorepo

### Storage & Data

- **[DIAGRAM_STORAGE_ARCHITECTURE.md](./DIAGRAM_STORAGE_ARCHITECTURE.md)**
  - Diagram storage design using Cloudflare R2
  - Data models and schemas
  - Storage patterns and best practices

### API Specifications

- **[PREVIEW_API_SPEC.md](./PREVIEW_API_SPEC.md)**
  - Preview API endpoints
  - Request/response formats
  - Integration patterns

### Processing

- **[BATCH_PROCESSING.md](./BATCH_PROCESSING.md)**
  - Batch diagram generation architecture
  - Performance optimization strategies
  - Scalability considerations

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  DAAD Monorepo                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │   VSCode     │  │     CLI      │  │ Workers  │ │
│  │  Extension   │  │     Tool     │  │   API    │ │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘ │
│         │                 │                │       │
│         └─────────────────┴────────────────┘       │
│                          │                         │
│                  ┌───────▼────────┐               │
│                  │ Shared Packages │               │
│                  │  - Types        │               │
│                  │  - Schema       │               │
│                  │  - Config       │               │
│                  └───────┬────────┘               │
└──────────────────────────┼────────────────────────┘
                           │
                  ┌────────▼────────┐
                  │   Cloudflare    │
                  │  Infrastructure │
                  │  - R2 Storage   │
                  │  - KV Cache     │
                  │  - Workers      │
                  └─────────────────┘
```

## Key Design Decisions

### Monorepo Structure
- **Why**: Share code between VSCode extension, CLI, and Workers
- **How**: Turborepo with PNPM workspaces
- **Benefits**: Type safety, code reuse, unified versioning

### Cloudflare Infrastructure
- **R2 Storage**: Diagram persistence with S3-compatible API
- **KV Cache**: Performance optimization for frequently accessed data
- **Workers**: Serverless API with global edge deployment

### Diagram Generation
- **Client-side** (VSCode): Direct AI integration for immediate feedback
- **Server-side** (Workers): API-based generation for CLI and web
- **Batch Processing**: Efficient handling of multiple diagrams

## Related Documentation

- [Complete Setup Guide](../setup/SETUP.md)
- [Workers API Documentation](../../apps/workers/README.md)
- [VSCode Extension](../../apps/vscode-extension/README.md)
- [CLI Tool](../../apps/cli/README.md)
