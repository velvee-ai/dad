import { Diagram } from '@dad/shared-types';
import {
  StorageError,
  PreviewSession,
  StoredDiagram,
  SessionManifest,
  StoreDiagramOptions,
  GetDiagramOptions,
  DiagramFormat,
  PreviewDiagramReference,
} from './types';

/**
 * R2 storage abstraction for managing preview diagram sessions
 */
export class R2PreviewStorage {
  constructor(private readonly bucket: R2Bucket) {}

  /**
   * Store a new preview session with initial metadata
   */
  async storeSession(
    sessionId: string,
    commitSha: string
  ): Promise<PreviewSession> {
    const session: PreviewSession = {
      id: sessionId,
      commitSha,
      createdAt: new Date().toISOString(),
      diagrams: [],
    };

    await this.updateManifest(session);

    return session;
  }

  /**
   * Store a diagram in multiple formats (JSON, D2, Mermaid)
   */
  async storeDiagram(options: StoreDiagramOptions): Promise<StoredDiagram> {
    const { sessionId, filePath, diagram, d2, mermaid } = options;

    // Generate file ID from path hash
    const fileId = this.hashFilePath(filePath);

    // Store JSON format (required)
    const jsonKey = this.getStorageKey(sessionId, fileId, 'json');
    await this.bucket.put(jsonKey, JSON.stringify(diagram, null, 2), {
      httpMetadata: {
        contentType: 'application/json',
      },
      customMetadata: {
        sessionId,
        fileId,
        filePath,
        format: 'json',
      },
    });

    const formats: DiagramFormat[] = ['json'];

    // Store D2 format if provided
    if (d2) {
      const d2Key = this.getStorageKey(sessionId, fileId, 'd2');
      await this.bucket.put(d2Key, d2, {
        httpMetadata: {
          contentType: 'text/plain',
        },
        customMetadata: {
          sessionId,
          fileId,
          filePath,
          format: 'd2',
        },
      });
      formats.push('d2');
    }

    // Store Mermaid format if provided
    if (mermaid) {
      const mermaidKey = this.getStorageKey(sessionId, fileId, 'mermaid');
      await this.bucket.put(mermaidKey, mermaid, {
        httpMetadata: {
          contentType: 'text/plain',
        },
        customMetadata: {
          sessionId,
          fileId,
          filePath,
          format: 'mermaid',
        },
      });
      formats.push('mermaid');
    }

    // Update session manifest
    await this.addDiagramToManifest(sessionId, {
      fileId,
      filePath,
      formats,
    });

    return {
      fileId,
      filePath,
      json: diagram,
      d2,
      mermaid,
    };
  }

  /**
   * Retrieve a preview session by ID
   */
  async getSession(sessionId: string): Promise<PreviewSession> {
    const manifestKey = this.getManifestKey(sessionId);
    const object = await this.bucket.get(manifestKey);

    if (!object) {
      throw new StorageError(
        `Session not found: ${sessionId}`,
        'NOT_FOUND',
        { sessionId }
      );
    }

    const manifest: SessionManifest = await object.json();

    return {
      id: manifest.sessionId,
      commitSha: manifest.commitSha,
      createdAt: manifest.createdAt,
      diagrams: manifest.diagrams,
    };
  }

  /**
   * Retrieve a diagram by session ID and file ID in the specified format
   */
  async getDiagram(options: GetDiagramOptions): Promise<string | Diagram> {
    const { sessionId, fileId, format } = options;

    const key = this.getStorageKey(sessionId, fileId, format);
    const object = await this.bucket.get(key);

    if (!object) {
      throw new StorageError(
        `Diagram not found: ${fileId} in format ${format}`,
        'NOT_FOUND',
        { sessionId, fileId, format }
      );
    }

    if (format === 'json') {
      return await object.json<Diagram>();
    }

    return await object.text();
  }

  /**
   * List all diagrams in a session
   */
  async listDiagrams(sessionId: string): Promise<PreviewDiagramReference[]> {
    const session = await this.getSession(sessionId);
    return session.diagrams;
  }

  /**
   * Delete a specific diagram from a session
   */
  async deleteDiagram(sessionId: string, fileId: string): Promise<void> {
    const session = await this.getSession(sessionId);

    const diagram = session.diagrams.find((d) => d.fileId === fileId);
    if (!diagram) {
      throw new StorageError(
        `Diagram not found: ${fileId}`,
        'NOT_FOUND',
        { sessionId, fileId }
      );
    }

    // Delete all format variants
    const deletePromises = diagram.formats.map((format) => {
      const key = this.getStorageKey(sessionId, fileId, format);
      return this.bucket.delete(key);
    });

    await Promise.all(deletePromises);

    // Update manifest
    session.diagrams = session.diagrams.filter((d) => d.fileId !== fileId);
    await this.updateManifest(session);
  }

  /**
   * Delete an entire session and all its diagrams
   */
  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);

    // Delete all diagrams
    const deletePromises = session.diagrams.flatMap((diagram) =>
      diagram.formats.map((format) => {
        const key = this.getStorageKey(sessionId, diagram.fileId, format);
        return this.bucket.delete(key);
      })
    );

    // Delete manifest
    const manifestKey = this.getManifestKey(sessionId);
    deletePromises.push(this.bucket.delete(manifestKey));

    await Promise.all(deletePromises);
  }

  /**
   * Generate a consistent file ID from a file path using hashing
   */
  private hashFilePath(filePath: string): string {
    // Simple hash function for file paths
    // In production, consider using a crypto hash for better distribution
    let hash = 0;
    for (let i = 0; i < filePath.length; i++) {
      const char = filePath.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert to base36 string for compact representation
    const hashStr = Math.abs(hash).toString(36);

    // Sanitize path for use as ID: replace special chars with dashes
    const sanitized = filePath
      .replace(/[^a-zA-Z0-9_.-]/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();

    // Combine hash and sanitized path for uniqueness and readability
    return `${hashStr}-${sanitized}`;
  }

  /**
   * Get the R2 storage key for a diagram file
   */
  private getStorageKey(
    sessionId: string,
    fileId: string,
    format: DiagramFormat
  ): string {
    return `sessions/${sessionId}/diagrams/${fileId}.${format}`;
  }

  /**
   * Get the R2 storage key for a session manifest
   */
  private getManifestKey(sessionId: string): string {
    return `sessions/${sessionId}/manifest.json`;
  }

  /**
   * Update the session manifest file
   */
  private async updateManifest(session: PreviewSession): Promise<void> {
    const manifest: SessionManifest = {
      sessionId: session.id,
      commitSha: session.commitSha,
      createdAt: session.createdAt,
      diagrams: session.diagrams,
    };

    const manifestKey = this.getManifestKey(session.id);
    await this.bucket.put(manifestKey, JSON.stringify(manifest, null, 2), {
      httpMetadata: {
        contentType: 'application/json',
      },
      customMetadata: {
        type: 'manifest',
        sessionId: session.id,
      },
    });
  }

  /**
   * Add a diagram reference to the session manifest
   */
  private async addDiagramToManifest(
    sessionId: string,
    diagramRef: PreviewDiagramReference
  ): Promise<void> {
    try {
      const session = await this.getSession(sessionId);

      // Remove existing reference if present (for updates)
      session.diagrams = session.diagrams.filter(
        (d) => d.fileId !== diagramRef.fileId
      );

      // Add new reference
      session.diagrams.push(diagramRef);

      await this.updateManifest(session);
    } catch (error) {
      if (error instanceof StorageError && error.code === 'NOT_FOUND') {
        // Session doesn't exist, create a new one
        throw new StorageError(
          `Session must be created before storing diagrams: ${sessionId}`,
          'INVALID_FORMAT',
          { sessionId }
        );
      }
      throw error;
    }
  }
}
