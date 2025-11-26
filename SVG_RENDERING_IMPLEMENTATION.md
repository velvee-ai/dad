# SVG Rendering Implementation

This document describes the server-side SVG rendering implementation for D2 and Mermaid diagrams in the DAAD (Diagram as a Delivery) project.

## Overview

Server-side SVG rendering has been implemented across three main components:
1. **Cloudflare Workers API** - REST endpoints for SVG rendering
2. **VSCode Extension Storage** - Local file storage for rendered SVGs
3. **CLI Tool** - Command-line SVG rendering using D2 and Mermaid CLI

## Architecture

### 1. Cloudflare Workers (apps/workers)

#### New Files Created

**`apps/workers/src/renderers/svg.ts`**
- Main SVG rendering orchestrator
- Exports `renderDiagramToSVG()` function
- Supports both D2 and Mermaid formats
- Includes SVGO integration for optimization

**`apps/workers/src/renderers/d2-renderer.ts`**
- D2-specific SVG rendering
- Converts Diagram objects to D2 source code
- Generates placeholder SVGs for testing
- Configuration for external D2 rendering service

**`apps/workers/src/renderers/mermaid-renderer.ts`**
- Mermaid-specific SVG rendering
- Converts Diagram objects to Mermaid source code
- Supports mermaid.ink public service integration
- Generates placeholder SVGs for development

**`apps/workers/src/handlers/render.ts`**
- HTTP handlers for render endpoints
- Request validation with Zod schemas
- Error handling and response formatting

#### API Endpoints

**POST /api/render/svg**
```typescript
Request Body:
{
  diagram: Diagram,
  format: 'd2' | 'mermaid',
  options?: {
    theme?: string,
    layout?: string,
    optimize?: boolean
  }
}

Response:
{
  success: boolean,
  format: 'd2' | 'mermaid',
  svg?: string,
  error?: string
}
```

**GET /api/render/formats**
```typescript
Response:
{
  formats: [
    {
      name: 'd2' | 'mermaid',
      description: string,
      features: string[],
      themes: string[],
      layouts: string[]
    }
  ]
}
```

#### Implementation Options

The workers implementation supports three deployment strategies:

1. **External Rendering Service** (Recommended for Production)
   - Call a dedicated service with D2/Mermaid CLI installed
   - Scalable and secure
   - Example configuration in `d2-renderer.ts` and `mermaid-renderer.ts`

2. **Mermaid.ink Public Service** (Quick Start)
   - Use public mermaid.ink for Mermaid diagrams
   - Function: `renderWithMermaidInk()` in `mermaid-renderer.ts`
   - Limited to Mermaid only

3. **Placeholder SVG** (Development/Testing)
   - Generates basic SVG representations
   - No external dependencies required
   - Currently active implementation

### 2. VSCode Extension Storage (apps/vscode-extension)

#### Updated Files

**`apps/vscode-extension/src/extension/storage/FlowChartStorage.ts`**

Extended the `SavedFlowChart` interface to include rendered outputs:

```typescript
interface SavedFlowChart {
  // ... existing fields
  renderedOutputs?: {
    svg?: {
      d2?: string;        // Path to D2 SVG file
      mermaid?: string;   // Path to Mermaid SVG file
      lastRendered?: number;
    };
    d2Source?: string;     // Path to D2 source file
    mermaidSource?: string; // Path to Mermaid source file
  };
}
```

#### New Methods

- `saveSVGOutput(id, svgContent, format)` - Save rendered SVG to .daad/ folder
- `saveDiagramSource(id, sourceContent, format)` - Save D2/Mermaid source files
- `getSVGPath(id, format)` - Get path to saved SVG
- `loadSVGContent(id, format)` - Load SVG content
- `getDiagramSourcePath(id, format)` - Get path to source file
- `loadDiagramSourceContent(id, format)` - Load source content

#### File Storage Structure

```
.daad/
├── {id}.daad.json          # Diagram metadata
├── {id}.d2.svg             # D2 rendered SVG
├── {id}.mermaid.svg        # Mermaid rendered SVG
├── {id}.d2                 # D2 source file
└── {id}.mmd                # Mermaid source file
```

### 3. CLI Tool (apps/cli)

#### New Files

**`apps/cli/internal/renderer/svg.go`**

Complete Go implementation for SVG rendering:

**Key Functions:**
- `RenderToSVG(diagram, format, options)` - Main rendering function
- `renderD2ToSVG(diagram, options)` - D2 CLI integration
- `renderMermaidToSVG(diagram, options)` - Mermaid CLI integration
- `toD2(diagram)` - Convert Diagram to D2 source
- `toMermaid(diagram)` - Convert Diagram to Mermaid source
- `optimizeSVG(svg)` - SVGO integration for optimization
- `LoadDiagramFromJSON(path)` - Load diagram from JSON
- `SaveSVGToFile(svg, path)` - Save SVG to file

**Types:**
```go
type Diagram struct {
    Nodes    []Node
    Edges    []Edge
    Metadata *DiagramMetadata
}

type RenderOptions struct {
    Theme      string
    Layout     string
    Optimize   bool
    Sketch     bool
    Pad        int
    OutputPath string
}
```

#### Updated Files

**`apps/cli/cmd/daad/main.go`**

Enhanced `export` command with SVG rendering:

```bash
# Export to SVG using D2
daad export diagram.json --format svg --svg-format d2 -o output.svg

# Export to SVG using Mermaid with dark theme
daad export diagram.json --format svg --svg-format mermaid --theme dark -o output.svg

# Export with optimization
daad export diagram.json --format svg --optimize -o output.svg

# Output to stdout
daad export diagram.json --format svg -o -
```

**Command Flags:**
- `--format` - Export format (svg, d2, mermaid)
- `--svg-format` - SVG renderer (d2 or mermaid)
- `--theme` - Rendering theme
- `--layout` - Layout algorithm (dagre or elk)
- `--optimize` - Enable SVG optimization (requires svgo)
- `-o, --output` - Output file path (use '-' for stdout)

## Dependencies

### Workers (TypeScript)

Added to `apps/workers/package.json`:
```json
{
  "dependencies": {
    "svgo": "^3.0.0"
  }
}
```

### CLI (Go)

Required external tools (must be installed separately):
- **D2 CLI** - https://d2lang.com/tour/install
- **Mermaid CLI** - `npm install -g @mermaid-js/mermaid-cli`
- **svgo** (optional) - `npm install -g svgo` (for --optimize flag)

## Usage Examples

### Workers API

```typescript
// Render D2 diagram to SVG
const response = await fetch('http://localhost:8787/api/render/svg', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    diagram: {
      nodes: [
        { id: 'start', type: 'start', label: 'Start' },
        { id: 'process', type: 'process', label: 'Process Data' },
        { id: 'end', type: 'end', label: 'End' }
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'process' },
        { id: 'e2', source: 'process', target: 'end' }
      ],
      metadata: {
        language: 'typescript',
        summary: 'Example Flow'
      }
    },
    format: 'd2',
    options: {
      theme: 'dark',
      layout: 'dagre',
      optimize: true
    }
  })
});

const { svg, success, error } = await response.json();
```

### VSCode Extension

```typescript
import { FlowChartStorage } from './storage/FlowChartStorage';

const storage = new FlowChartStorage(workspaceRoot);

// Save SVG output
await storage.saveSVGOutput(diagramId, svgContent, 'd2');
await storage.saveSVGOutput(diagramId, svgContent, 'mermaid');

// Save diagram source
await storage.saveDiagramSource(diagramId, d2Source, 'd2');
await storage.saveDiagramSource(diagramId, mermaidSource, 'mermaid');

// Load SVG content
const svgContent = await storage.loadSVGContent(diagramId, 'd2');

// Load source content
const d2Source = await storage.loadDiagramSourceContent(diagramId, 'd2');
```

### CLI

```bash
# Render using D2 with dark theme
daad export diagram.json --format svg --svg-format d2 --theme dark -o output.svg

# Render using Mermaid with forest theme
daad export diagram.json --format svg --svg-format mermaid --theme forest -o diagram.svg

# Render with custom layout and optimization
daad export diagram.json --format svg --layout elk --optimize -o optimized.svg

# Print to stdout
daad export diagram.json --format svg -o - > diagram.svg
```

## Rendering Strategies

### Production Deployment

For production use, implement one of these strategies:

#### Option 1: Dedicated Rendering Service

Create a separate service (Node.js/Docker) with D2 and Mermaid CLI installed:

```typescript
// In d2-renderer.ts
export async function renderD2(diagram: Diagram, options: D2RenderOptions): Promise<string> {
  const d2Source = toD2(diagram);

  const response = await fetch(process.env.D2_RENDER_SERVICE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: d2Source,
      theme: options.theme,
      layout: options.layout,
    }),
  });

  const { svg } = await response.json();
  return svg;
}
```

#### Option 2: Cloudflare Durable Objects

Use Durable Objects with D2/Mermaid binaries:
- Persistent rendering environment
- Isolated execution
- Scalable

#### Option 3: Serverless Functions

Deploy rendering functions on platforms with filesystem access:
- AWS Lambda
- Google Cloud Functions
- Azure Functions

### Development/Testing

Use placeholder SVG generation (already implemented):
- No external dependencies
- Quick testing
- Visual representation of diagram structure

## Optimization

### SVGO Configuration

The SVG optimizer is configured to:
- Remove metadata and comments
- Minify styles and colors
- Optimize transforms and paths
- Preserve viewBox for proper scaling
- Keep IDs for interactivity

### Performance Considerations

1. **Caching**: Implement caching for rendered SVGs
2. **Async Processing**: Use background workers for large diagrams
3. **Rate Limiting**: Protect rendering endpoints
4. **Resource Limits**: Set timeouts and size limits

## Future Enhancements

### Phase 5 Improvements

1. **R2 Storage Integration**
   - Store rendered SVGs in Cloudflare R2
   - CDN distribution
   - Versioning and cache invalidation

2. **VSCode Webview Preview**
   - Display SVG preview in webview
   - Side-by-side comparison (ReactFlow vs SVG)
   - Export buttons in UI

3. **Batch Rendering**
   - Render multiple diagrams in parallel
   - Progress tracking
   - Error handling and retries

4. **Advanced Themes**
   - Custom theme configuration
   - Theme preview
   - CSS variable support

5. **Export Formats**
   - PNG export (via SVG to PNG conversion)
   - PDF export
   - High-resolution outputs

## Testing

### Unit Tests

Create tests for:
- Diagram to D2 conversion
- Diagram to Mermaid conversion
- SVG optimization
- Storage operations

### Integration Tests

Test:
- Full rendering pipeline
- API endpoints
- CLI commands
- Storage persistence

### Example Test Diagram

```json
{
  "nodes": [
    { "id": "n1", "type": "start", "label": "Start" },
    { "id": "n2", "type": "process", "label": "Load Data" },
    { "id": "n3", "type": "decision", "label": "Valid?" },
    { "id": "n4", "type": "process", "label": "Process" },
    { "id": "n5", "type": "end", "label": "End" }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "n2" },
    { "id": "e2", "source": "n2", "target": "n3" },
    { "id": "e3", "source": "n3", "target": "n4", "label": "Yes" },
    { "id": "e4", "source": "n3", "target": "n5", "label": "No", "type": "conditional" },
    { "id": "e5", "source": "n4", "target": "n5" }
  ],
  "metadata": {
    "language": "typescript",
    "summary": "Data Processing Flow"
  }
}
```

## Troubleshooting

### Common Issues

**D2 CLI not found**
```
Error: d2 CLI not found in PATH
Solution: Install D2 - https://d2lang.com/tour/install
```

**Mermaid CLI not found**
```
Error: mmdc not found in PATH
Solution: npm install -g @mermaid-js/mermaid-cli
```

**SVGO optimization fails**
```
Warning: SVG optimization failed
Solution: Install svgo - npm install -g svgo (optional)
```

**Cloudflare Workers deployment**
```
Error: Cannot use subprocess in Workers
Solution: Configure external rendering service or use placeholder mode
```

## Contributing

When adding new features:
1. Update type definitions in `packages/shared-types`
2. Add converter functions in `packages/diagram-schema`
3. Implement renderer in both TypeScript and Go
4. Update API handlers
5. Add CLI commands
6. Write tests
7. Update documentation

## License

Part of the DAAD (Diagram as a Delivery) project.
