# Plan: Add Pyrefly LSP Support to DAD Extension

## Overview
Add the Pyrefly (Meta's Python type checker and language server) LSP client to the existing DAD VS Code extension at `apps/vscode-extension`. Pyrefly is chosen over ty (Astral) because it supports **call hierarchy** — the critical LSP capability for flowchart generation.

## Why Pyrefly over ty

| Capability | ty (Astral) | Pyrefly (Meta) | Impact on Flowcharts |
|---|---|---|---|
| Call Hierarchy | Not supported | **Supported** | Critical — enables call graph extraction without manual parsing |
| Go to Implementation | Not supported | **Supported** | Resolves method overrides for accurate OOP flow tracing |
| Go to Definition | Yes | Yes | Resolves function calls to source |
| Find References | Yes | Yes | Finds all callers of a function |
| Document Symbols | Yes | Yes | Lists functions/classes in a file |
| Workspace Symbols | Yes | Yes | Cross-project symbol search |
| Semantic Tokens | Yes | Yes | Token classification |
| Hover / Types | Yes | Yes | Type signatures and docs |
| Speed | ~2-3x faster | Slightly slower | Negligible — few LSP requests per visualization |

Key decision: `callHierarchy/outgoingCalls` lets us ask "what does this function call?" directly, instead of parsing source code and resolving each call expression manually.

## Current State
- Extension: DAD - Diagram as a Delivery
- Location: `apps/vscode-extension`
- Bundler: webpack
- Activation: `onStartupFinished`
- Current analysis: AI-powered (Claude CLI / OpenRouter)

## Implementation Steps

### Step 1: Add Dependencies
**File:** `apps/vscode-extension/package.json`

Add to dependencies:
```json
"vscode-languageclient": "^9.0.1"
```

### Step 2: Create Pyrefly LSP Client Module
**New File:** `apps/vscode-extension/src/extension/pyrefly/PyreflyLanguageClient.ts`

```typescript
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

export class PyreflyLanguageClient {
  private client: LanguageClient | undefined;

  async start(): Promise<void> {
    const serverOptions: ServerOptions = {
      command: 'pyrefly',
      args: ['lsp'],
      transport: TransportKind.stdio
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [
        { scheme: 'file', language: 'python' },
        { scheme: 'untitled', language: 'python' }
      ]
    };

    this.client = new LanguageClient(
      'pyrefly',
      'Pyrefly Language Server',
      serverOptions,
      clientOptions
    );

    await this.client.start();
  }

  async stop(): Promise<void> {
    await this.client?.stop();
  }

  getClient(): LanguageClient | undefined {
    return this.client;
  }
}
```

### Step 3: Create Flow Extraction Service
**New File:** `apps/vscode-extension/src/extension/pyrefly/FlowExtractor.ts`

This service uses Pyrefly's LSP capabilities to extract flow information for diagram generation:

```typescript
import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

interface CallNode {
  name: string;
  uri: string;
  range: vscode.Range;
  outgoing: CallNode[];
  incoming: CallNode[];
}

export class FlowExtractor {
  constructor(private client: LanguageClient) {}

  /**
   * Get all symbols in a document (functions, classes, methods)
   */
  async getDocumentSymbols(uri: vscode.Uri): Promise<vscode.DocumentSymbol[]> {
    return this.client.sendRequest('textDocument/documentSymbol', {
      textDocument: { uri: uri.toString() }
    });
  }

  /**
   * Build outgoing call graph from a function using callHierarchy
   */
  async getOutgoingCalls(uri: vscode.Uri, position: vscode.Position): Promise<CallNode[]> {
    // Step 1: Prepare call hierarchy item
    const items = await this.client.sendRequest('textDocument/prepareCallHierarchy', {
      textDocument: { uri: uri.toString() },
      position
    });

    if (!items || items.length === 0) return [];

    // Step 2: Get outgoing calls
    const outgoing = await this.client.sendRequest('callHierarchy/outgoingCalls', {
      item: items[0]
    });

    return outgoing;
  }

  /**
   * Build incoming call graph (who calls this function?)
   */
  async getIncomingCalls(uri: vscode.Uri, position: vscode.Position): Promise<CallNode[]> {
    const items = await this.client.sendRequest('textDocument/prepareCallHierarchy', {
      textDocument: { uri: uri.toString() },
      position
    });

    if (!items || items.length === 0) return [];

    const incoming = await this.client.sendRequest('callHierarchy/incomingCalls', {
      item: items[0]
    });

    return incoming;
  }

  /**
   * Resolve a symbol to its definition (cross-file navigation)
   */
  async getDefinition(uri: vscode.Uri, position: vscode.Position) {
    return this.client.sendRequest('textDocument/definition', {
      textDocument: { uri: uri.toString() },
      position
    });
  }

  /**
   * Get all implementations of a method (for OOP flows)
   */
  async getImplementations(uri: vscode.Uri, position: vscode.Position) {
    return this.client.sendRequest('textDocument/implementation', {
      textDocument: { uri: uri.toString() },
      position
    });
  }
}
```

### Step 4: Integrate into Extension Activation
**File:** `apps/vscode-extension/src/extension.ts`

Changes:
1. Import `PyreflyLanguageClient`
2. Add global variable for the client
3. Start client in `activate()` when Python files are present
4. Stop client in `deactivate()`
5. Wire `FlowExtractor` into the visualization pipeline

### Step 5: Update Activation Events
**File:** `apps/vscode-extension/package.json`

Add `onLanguage:python` to activation events (already has `onStartupFinished` which covers it).

### Step 6: Add Configuration
Add settings for:
- `dad.pyrefly.enabled` - Enable/disable Pyrefly integration (default: `true`)
- `dad.pyrefly.path` - Custom path to pyrefly executable

## Architecture: LSP + Tree-sitter for Complete Flowcharts

Pyrefly handles **inter-procedural** flow (between functions). For **intra-procedural** flow (control flow within a function), pair with tree-sitter:

```
Source Code (Python)
    │
    ├──► Pyrefly LSP
    │       ├── callHierarchy/outgoingCalls → what this function calls
    │       ├── callHierarchy/incomingCalls → what calls this function
    │       ├── textDocument/implementation → method overrides
    │       ├── textDocument/documentSymbol → all symbols in file
    │       └── textDocument/hover → type signatures
    │
    └──► Tree-sitter (future)
            └── Parse AST → if/else branches, loops, try/except, returns
                    │
                    ▼
              Intra-function control flow graph
    │
    ▼
DAD Diagram Generator
    │
    ▼
React Flow Visualization
```

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | Add `vscode-languageclient` dependency |
| `src/extension.ts` | Import and start PyreflyLanguageClient |
| `src/extension/pyrefly/PyreflyLanguageClient.ts` | **NEW** - Pyrefly LSP client wrapper |
| `src/extension/pyrefly/FlowExtractor.ts` | **NEW** - Flow extraction using LSP |

## Verification
1. Install Pyrefly: `pip install pyrefly` or `uv pip install pyrefly`
2. Run `pnpm install` in the extension directory
3. Run `pnpm run compile` to build
4. Press F5 to launch Extension Development Host
5. Open any Python file
6. Check Output panel > "Pyrefly Language Server" for connection status
7. Verify hover information and diagnostics work
8. Test call hierarchy on a Python function (right-click > "Show Call Hierarchy")

## Dependencies
- `pyrefly` must be installed and available in PATH (`which pyrefly` should work)
- `vscode-languageclient` v9.x for latest LSP features
- Python workspace with typed or partially typed code for best results

## References
- [Pyrefly Documentation](https://pyrefly.org/)
- [Pyrefly IDE Features](https://pyrefly.org/en/docs/IDE-features/)
- [Pyrefly GitHub](https://github.com/facebook/pyrefly)
- [LSP Specification - Call Hierarchy](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#callHierarchy_incomingCalls)
