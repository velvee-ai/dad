# @dad/diagram-schema

Diagram schema validation and format conversion utilities for DAD.

## Installation

```bash
pnpm add @dad/diagram-schema@workspace:*
```

## Features

- Zod schemas for runtime validation
- Type-safe validators
- Format converters (JSON)
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
import { toJSON, fromJSON } from '@dad/diagram-schema';

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
- `toJSON(diagram)` - Convert to JSON string
- `fromJSON(json)` - Parse from JSON string
