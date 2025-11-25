import { DiagramSchema, DiagramNodeSchema, DiagramEdgeSchema } from './schemas';
import type { Diagram, DiagramNode, DiagramEdge } from '@daad/shared-types';

export function validateDiagram(data: unknown): { success: true; data: Diagram } | { success: false; error: string } {
  const result = DiagramSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as Diagram };
  }
  return { success: false, error: result.error.message };
}

export function validateNode(data: unknown): { success: true; data: DiagramNode } | { success: false; error: string } {
  const result = DiagramNodeSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as DiagramNode };
  }
  return { success: false, error: result.error.message };
}

export function validateEdge(data: unknown): { success: true; data: DiagramEdge } | { success: false; error: string } {
  const result = DiagramEdgeSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as DiagramEdge };
  }
  return { success: false, error: result.error.message };
}

export function isDiagram(data: unknown): data is Diagram {
  return DiagramSchema.safeParse(data).success;
}

export function isNode(data: unknown): data is DiagramNode {
  return DiagramNodeSchema.safeParse(data).success;
}

export function isEdge(data: unknown): data is DiagramEdge {
  return DiagramEdgeSchema.safeParse(data).success;
}
