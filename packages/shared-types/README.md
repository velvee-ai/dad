# @dad/shared-types

Shared TypeScript types and interfaces used across all DAD packages.

## Installation

```bash
pnpm add @dad/shared-types@workspace:*
```

## Usage

```typescript
import { DiagramNode, DiagramEdge, Diagram } from '@dad/shared-types';

const node: DiagramNode = {
  id: '1',
  type: 'start',
  label: 'Start',
};

const edge: DiagramEdge = {
  id: 'e1',
  source: '1',
  target: '2',
};

const diagram: Diagram = {
  nodes: [node],
  edges: [edge],
  metadata: {
    language: 'typescript',
  },
};
```

## Exported Types

- `DiagramNode` - Node in a flow diagram
- `DiagramEdge` - Edge connecting nodes
- `Diagram` - Complete diagram structure
- `AnalyzeRequest/Response` - API request/response for code analysis
- `ExportRequest/Response` - API request/response for diagram export
- `SavedDiagram` - Saved diagram structure
- `AIProviderConfig` - AI provider configuration
