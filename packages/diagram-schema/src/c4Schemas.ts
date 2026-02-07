import { z } from 'zod';

// ============================================================
// DAD (Diagram as a Delivery) - C4 Zod Validation Schemas
// Mirrors packages/shared-types/src/c4.ts
// ============================================================

// --- Enums ---

export const C4LevelSchema = z.enum(['landscape', 'context', 'container', 'component', 'code']);

export const DadNodeTypeSchema = z.enum([
  'landscape',
  'group',
  'softwareSystem',
  'person',
  'externalSystem',
  'container',
  'dataStore',
  'component',
  'codeUnit',
]);

// --- Source Mapping ---

export const SourceMappingSchema = z.object({
  filePath: z.string(),
  startLine: z.number().int().nonnegative().optional(),
  endLine: z.number().int().nonnegative().optional(),
  language: z.string().optional(),
});

// --- Position (C4) ---

export const C4PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

// --- Node ---

export const DadNodeSchema = z.object({
  id: z.string().min(1),
  c4Level: C4LevelSchema,
  name: z.string().min(1),
  type: DadNodeTypeSchema,

  // Embedded content
  designSpec: z.string(),          // YAML string (validated separately if needed)
  documentation: z.string(),       // Markdown string

  // Source mapping
  sourceMapping: SourceMappingSchema.optional(),

  // Hierarchy
  parentId: z.string().nullable().optional(),
  childIds: z.array(z.string()),

  // Visual
  position: C4PositionSchema.optional(),
  collapsed: z.boolean().optional(),

  // Classification
  technology: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

// --- Edge ---

export const DadEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string(),
  technology: z.string().optional(),
  c4Level: C4LevelSchema,
  tags: z.array(z.string()).optional(),
});

// --- File Metadata ---

export const DadFileMetadataSchema = z.object({
  projectName: z.string().min(1),
  generatedAt: z.string(),         // ISO 8601
  generatedBy: z.string(),
  sourceCommit: z.string().optional(),
  totalNodes: z.number().int().nonnegative(),
  totalEdges: z.number().int().nonnegative(),
});

// --- Views ---

export const DadAutoLayoutSchema = z.object({
  direction: z.enum(['tb', 'lr', 'bt', 'rl']),
  rankSeparation: z.number().optional(),
  nodeSeparation: z.number().optional(),
});

export const DadViewSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  scopeId: z.string().min(1),
  include: z.array(z.string()),
  exclude: z.array(z.string()).optional(),
  autoLayout: DadAutoLayoutSchema,
});

export const DadViewsSchema = z.object({
  systemLandscape: DadViewSchema,
  systemContext: z.array(DadViewSchema),
  container: z.array(DadViewSchema),
  component: z.array(DadViewSchema),
});

// --- Styles ---

export const DadElementShapeSchema = z.enum([
  'Box', 'RoundedBox', 'Person', 'Cylinder',
  'Pipe', 'WebBrowser', 'Hexagon', 'Component', 'Folder',
]);

export const DadElementStyleSchema = z.object({
  tag: z.string().min(1),
  shape: DadElementShapeSchema.optional(),
  background: z.string().optional(),
  color: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  border: z.enum(['solid', 'dashed', 'dotted']).optional(),
  fontSize: z.number().optional(),
  opacity: z.number().min(0).max(100).optional(),
  icon: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const DadRelationshipStyleSchema = z.object({
  tag: z.string().min(1),
  color: z.string().optional(),
  dashed: z.boolean().optional(),
  strokeWidth: z.number().optional(),
  opacity: z.number().optional(),
});

export const DadStylesSchema = z.object({
  elements: z.array(DadElementStyleSchema),
  relationships: z.array(DadRelationshipStyleSchema),
});

// --- Top-Level File ---

export const DadFileSchema = z.object({
  version: z.literal('1.0'),
  metadata: DadFileMetadataSchema,
  nodes: z.array(DadNodeSchema),
  edges: z.array(DadEdgeSchema),
  views: DadViewsSchema.optional(),
  styles: DadStylesSchema.optional(),
});

// --- Inferred Types (for use without importing shared-types) ---

export type C4LevelZ = z.infer<typeof C4LevelSchema>;
export type DadNodeTypeZ = z.infer<typeof DadNodeTypeSchema>;
export type DadNodeZ = z.infer<typeof DadNodeSchema>;
export type DadEdgeZ = z.infer<typeof DadEdgeSchema>;
export type DadFileZ = z.infer<typeof DadFileSchema>;

// --- Validation Helpers ---

/**
 * Validates a parsed .dad.json object. Returns the validated data or throws.
 */
export function validateDadFile(data: unknown): DadFileZ {
  return DadFileSchema.parse(data);
}

/**
 * Safe validation that returns success/error instead of throwing.
 */
export function safeParseDadFile(data: unknown): z.SafeParseReturnType<unknown, DadFileZ> {
  return DadFileSchema.safeParse(data);
}

/**
 * Validates a single node.
 */
export function validateDadNode(data: unknown): DadNodeZ {
  return DadNodeSchema.parse(data);
}

/**
 * Validates a single edge.
 */
export function validateDadEdge(data: unknown): DadEdgeZ {
  return DadEdgeSchema.parse(data);
}

/**
 * Validates that a node's type is consistent with its c4Level.
 * Returns an error message if inconsistent, or null if valid.
 */
export function validateNodeTypeLevel(node: DadNodeZ): string | null {
  const validTypes: Record<string, string[]> = {
    landscape: ['landscape'],
    context: ['softwareSystem', 'person', 'externalSystem'],
    container: ['container', 'dataStore'],
    component: ['component'],
    code: ['codeUnit'],
  };

  const allowed = validTypes[node.c4Level];
  if (!allowed || !allowed.includes(node.type)) {
    return `Node "${node.id}": type "${node.type}" is not valid at c4Level "${node.c4Level}". Expected one of: ${allowed?.join(', ')}`;
  }
  return null;
}

/**
 * Validates referential integrity of a DadFile:
 * - All parentId references exist
 * - All childIds references exist
 * - All edge source/target references exist
 * Returns an array of error messages (empty = valid).
 */
export function validateDadFileIntegrity(file: DadFileZ): string[] {
  const errors: string[] = [];
  const nodeIds = new Set(file.nodes.map(n => n.id));

  for (const node of file.nodes) {
    // Check parentId
    if (node.parentId && !nodeIds.has(node.parentId)) {
      errors.push(`Node "${node.id}": parentId "${node.parentId}" does not exist`);
    }

    // Check childIds
    for (const childId of node.childIds) {
      if (!nodeIds.has(childId)) {
        errors.push(`Node "${node.id}": childId "${childId}" does not exist`);
      }
    }

    // Check type/level consistency
    const typeError = validateNodeTypeLevel(node);
    if (typeError) errors.push(typeError);
  }

  for (const edge of file.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge "${edge.id}": source "${edge.source}" does not exist`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge "${edge.id}": target "${edge.target}" does not exist`);
    }
  }

  return errors;
}
