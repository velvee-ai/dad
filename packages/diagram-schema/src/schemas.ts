import { z } from 'zod';

// Node schema
export const NodeTypeSchema = z.enum(['start', 'process', 'decision', 'loop', 'call', 'return', 'end']);

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const DiagramNodeSchema = z.object({
  id: z.string(),
  type: NodeTypeSchema,
  label: z.string(),
  description: z.string().optional(),
  codeLines: z.string().optional(),
  position: PositionSchema.optional(),
});

// Edge schema
export const EdgeTypeSchema = z.enum(['default', 'conditional', 'loop', 'error']);

export const DiagramEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  type: EdgeTypeSchema.optional(),
  condition: z.string().optional(),
});

// Diagram schema
export const DiagramMetadataSchema = z.object({
  language: z.string(),
  complexity: z.number().optional(),
  summary: z.string().optional(),
  filename: z.string().optional(),
  timestamp: z.string().optional(),
});

export const DiagramSchema = z.object({
  nodes: z.array(DiagramNodeSchema),
  edges: z.array(DiagramEdgeSchema),
  metadata: DiagramMetadataSchema.optional(),
});
