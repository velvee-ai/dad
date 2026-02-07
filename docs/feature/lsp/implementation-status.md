# Pyrefly LSP Integration — Implementation Status

## Implemented

### Documentation
- **`docs/feature/lsp/pyrefly-integration-plan.md`** — Full plan with Pyrefly vs ty comparison, architecture diagram, and step-by-step guide (replaces `ty-integration-plan.md`)

### New Files

**`src/extension/pyrefly/PyreflyLanguageClient.ts`** — LSP client lifecycle
- Spawns `pyrefly lsp` as a child process over stdio
- Reads `daad.pyrefly.path` config for custom binary location
- Output channel: "DAAD Pyrefly"
- Methods: `start()`, `stop()`, `isRunning()`, `getClient()`, `dispose()`

**`src/extension/pyrefly/FlowExtractor.ts`** — Converts LSP data into flowcharts

Low-level LSP methods (thin wrappers using proper protocol types):
- `getDocumentSymbols()` — lists functions/classes/methods in a file
- `prepareCallHierarchy()` — prepares a call hierarchy item at a position
- `getOutgoingCalls()` — "what does this function call?"
- `getIncomingCalls()` — "what calls this function?"
- `getDefinition()` — resolves symbol to its source
- `getImplementations()` — finds all method overrides (OOP)
- `getHover()` — type signature + docstring

High-level diagram builders:
- `buildCallGraph()` — recursively expands outgoing calls into a tree (with cycle detection, configurable `maxDepth`)
- `buildFlowChart()` — converts a call graph rooted at a cursor position into `FlowChartData` (nodes + edges for React Flow)
- `buildDocumentFlowChart()` — lists all functions in a file, then uses call hierarchy to show which functions call each other

### Modified Files

**`package.json`** — Dependencies + configuration
- Added `vscode-languageclient: ^9.0.1` and `vscode-languageserver-protocol: ^3.17.5`
- Added settings: `daad.pyrefly.enabled` (boolean, default true) and `daad.pyrefly.path` (string, default "pyrefly")

**`src/extension.ts`** — Extension lifecycle integration
- Imports `PyreflyLanguageClient` and `FlowExtractor`
- Global variables: `pyreflyClient` and `flowExtractor`
- On `activate()`: starts Pyrefly if `daad.pyrefly.enabled` is true, catches failures gracefully
- On `deactivate()` + dispose: stops Pyrefly and cleans up

### Tooling
- `pyrefly v0.51.1` installed at `/Users/sathish/.local/bin/pyrefly` via `uv tool install`

### Build Status
- Compiles cleanly with `pnpm run compile`
- 1 benign warning from LSP library UMD pattern (vscode-languageserver-types)

## Not Wired Up Yet

The `flowExtractor` instance is available globally in `extension.ts`, but no command currently uses it. All existing commands (`daad.visualize`, `daad.visualizeFile`, etc.) still go through the AI path (Claude/OpenRouter).

### Next Steps

Option A — **New command**: Add `daad.visualizeLSP` that uses `flowExtractor.buildFlowChart()` for Python files

Option B — **Augment existing commands**: Detect Python files and offer "LSP (Pyrefly)" option alongside AI analysis

Option C — **Hybrid**: Use Pyrefly LSP data to enrich the AI prompt (pass call hierarchy + type info to Claude for better diagrams)
