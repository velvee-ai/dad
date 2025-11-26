import { Diagram } from '@daad/shared-types';

/**
 * Format types for storing diagrams
 */
export type DiagramFormat = 'json' | 'd2' | 'mermaid';

/**
 * Preview session metadata
 */
export interface PreviewSession {
  id: string;
  commitSha: string;
  createdAt: string;
  diagrams: PreviewDiagramReference[];
}

/**
 * Reference to a diagram within a preview session
 */
export interface PreviewDiagramReference {
  fileId: string;
  filePath: string;
  formats: DiagramFormat[];
}

/**
 * Complete diagram data with all formats
 */
export interface StoredDiagram {
  fileId: string;
  filePath: string;
  json: Diagram;
  d2?: string;
  mermaid?: string;
}

/**
 * Manifest file structure for a preview session
 */
export interface SessionManifest {
  sessionId: string;
  commitSha: string;
  createdAt: string;
  diagrams: {
    fileId: string;
    filePath: string;
    formats: DiagramFormat[];
  }[];
}

/**
 * Options for storing a diagram
 */
export interface StoreDiagramOptions {
  sessionId: string;
  filePath: string;
  diagram: Diagram;
  d2?: string;
  mermaid?: string;
}

/**
 * Options for retrieving a diagram
 */
export interface GetDiagramOptions {
  sessionId: string;
  fileId: string;
  format: DiagramFormat;
}

/**
 * Error types for storage operations
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'INVALID_FORMAT' | 'STORAGE_ERROR',
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'StorageError';
  }
}
