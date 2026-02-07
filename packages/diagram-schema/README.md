# @dad/diagram-schema

Diagram schema validation and format conversion utilities for DAD.

## Installation

```bash
pnpm add @dad/diagram-schema@workspace:*
```

## Features

- Zod schemas for runtime validation
- Type-safe validators
- Format converters (D2, Mermaid, JSON)
- Type guards

## Usage

### Validation

```typescript
import { validateDiagram, isDiagram } from '@dad/diagram-schema';

const result = validateDiagram(data);
if (result.success) {
  console.log('Valid diagram:', result.data);
} else {
  console.error('Validation error:', result.error);
}

// Type guard
if (isDiagram(data)) {
  // data is now typed as Diagram
}
```

### Format Conversion

```typescript
import { toD2, toMermaid, toJSON, fromJSON } from '@dad/diagram-schema';

// Convert to D2 format
const d2Code = toD2(diagram);

// Convert to Mermaid format
const mermaidCode = toMermaid(diagram);

// Convert to JSON
const json = toJSON(diagram);

// Parse from JSON
const diagram = fromJSON(jsonString);
```

## Exported Functions

- `validateDiagram(data)` - Validate diagram structure
- `validateNode(data)` - Validate node structure
- `validateEdge(data)` - Validate edge structure
- `isDiagram(data)` - Type guard for Diagram
- `isNode(data)` - Type guard for DiagramNode
- `isEdge(data)` - Type guard for DiagramEdge
- `toD2(diagram)` - Convert to D2 format
- `toMermaid(diagram)` - Convert to Mermaid format
- `toJSON(diagram)` - Convert to JSON string
- `fromJSON(json)` - Parse from JSON string
