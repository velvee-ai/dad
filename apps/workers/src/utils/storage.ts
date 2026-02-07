/**
 * Storage utilities for R2 and KV
 * Handles diagram and manifest storage with optimized batch operations
 */

import type { BatchManifest, SavedDiagram, Diagram } from '@dad/shared-types';

export interface StorageConfig {
  r2Bucket?: R2Bucket;
  kvNamespace?: KVNamespace;
}

/**
 * R2 Storage Manager for diagrams and manifests
 */
export class R2StorageManager {
  constructor(private bucket: R2Bucket) {}

  async saveDiagram(id: string, diagram: SavedDiagram): Promise<void> {
    const key = `diagrams/${id}.json`;
    await this.bucket.put(key, JSON.stringify(diagram), {
      httpMetadata: {
        contentType: 'application/json',
      },
      customMetadata: {
        filename: diagram.filename || '',
        timestamp: diagram.timestamp.toString(),
      },
    });
  }

  async getDiagram(id: string): Promise<SavedDiagram | null> {
    const key = `diagrams/${id}.json`;
    const object = await this.bucket.get(key);

    if (!object) {
      return null;
    }

    const content = await object.text();
    return JSON.parse(content) as SavedDiagram;
  }

  async deleteDiagram(id: string): Promise<void> {
    const key = `diagrams/${id}.json`;
    await this.bucket.delete(key);
  }

  async listDiagrams(prefix: string = 'diagrams/'): Promise<string[]> {
    const list = await this.bucket.list({ prefix });
    return list.objects.map(obj => obj.key.replace(prefix, '').replace('.json', ''));
  }

  async saveManifest(manifest: BatchManifest): Promise<void> {
    const key = `manifests/${manifest.id}.json`;
    await this.bucket.put(key, JSON.stringify(manifest), {
      httpMetadata: {
        contentType: 'application/json',
      },
      customMetadata: {
        timestamp: manifest.timestamp.toString(),
        totalItems: manifest.totalItems.toString(),
        successCount: manifest.successCount.toString(),
        failureCount: manifest.failureCount.toString(),
      },
    });
  }

  async getManifest(id: string): Promise<BatchManifest | null> {
    const key = `manifests/${id}.json`;
    const object = await this.bucket.get(key);

    if (!object) {
      return null;
    }

    const content = await object.text();
    return JSON.parse(content) as BatchManifest;
  }

  async saveBatchResults(manifestId: string, results: Array<{ id: string; diagram: SavedDiagram }>): Promise<void> {
    const promises = results.map(({ id, diagram }) => this.saveDiagram(id, diagram));
    await Promise.all(promises);
  }
}

/**
 * KV Storage Manager for metadata and quick lookups
 */
export class KVStorageManager {
  constructor(private namespace: KVNamespace) {}

  async saveDiagramMetadata(
    id: string,
    metadata: {
      filename?: string;
      language: string;
      timestamp: number;
    }
  ): Promise<void> {
    await this.namespace.put(`diagram:${id}`, JSON.stringify(metadata), {
      metadata: {
        filename: metadata.filename || '',
        language: metadata.language,
      },
    });
  }

  async getDiagramMetadata(id: string): Promise<any | null> {
    const value = await this.namespace.get(`diagram:${id}`, 'json');
    return value;
  }

  async deleteDiagramMetadata(id: string): Promise<void> {
    await this.namespace.delete(`diagram:${id}`);
  }

  async saveManifestMetadata(
    id: string,
    metadata: {
      totalItems: number;
      successCount: number;
      failureCount: number;
      timestamp: number;
    }
  ): Promise<void> {
    await this.namespace.put(`manifest:${id}`, JSON.stringify(metadata));
  }

  async getManifestMetadata(id: string): Promise<any | null> {
    const value = await this.namespace.get(`manifest:${id}`, 'json');
    return value;
  }

  async listManifests(limit: number = 100): Promise<string[]> {
    const list = await this.namespace.list({ prefix: 'manifest:', limit });
    return list.keys.map(key => key.name.replace('manifest:', ''));
  }
}

/**
 * Combined storage manager with both R2 and KV
 */
export class StorageManager {
  private r2?: R2StorageManager;
  private kv?: KVStorageManager;

  constructor(config: StorageConfig) {
    if (config.r2Bucket) {
      this.r2 = new R2StorageManager(config.r2Bucket);
    }
    if (config.kvNamespace) {
      this.kv = new KVStorageManager(config.kvNamespace);
    }
  }

  async saveDiagram(id: string, diagram: SavedDiagram): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.r2) {
      promises.push(this.r2.saveDiagram(id, diagram));
    }

    if (this.kv && diagram.diagram.metadata) {
      promises.push(
        this.kv.saveDiagramMetadata(id, {
          filename: diagram.filename,
          language: diagram.diagram.metadata.language,
          timestamp: diagram.timestamp,
        })
      );
    }

    await Promise.all(promises);
  }

  async getDiagram(id: string): Promise<SavedDiagram | null> {
    if (this.r2) {
      return this.r2.getDiagram(id);
    }
    return null;
  }

  async deleteDiagram(id: string): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.r2) {
      promises.push(this.r2.deleteDiagram(id));
    }

    if (this.kv) {
      promises.push(this.kv.deleteDiagramMetadata(id));
    }

    await Promise.all(promises);
  }

  async saveBatchWithManifest(
    manifestId: string,
    results: Array<{
      id: string;
      diagram: Diagram;
      code: string;
      filename?: string;
    }>
  ): Promise<void> {
    const timestamp = Date.now();

    const savedDiagrams = results.map(r => ({
      id: r.id,
      diagram: r.diagram,
      code: r.code,
      timestamp,
      filename: r.filename,
    }));

    const manifest: BatchManifest = {
      id: manifestId,
      timestamp,
      totalItems: results.length,
      successCount: results.length,
      failureCount: 0,
      results: results.map(r => ({
        id: r.id,
        filename: r.filename,
        diagram: r.diagram,
        success: true,
        error: undefined,
        attempts: 1,
      })),
    };

    const promises: Promise<void>[] = [];

    if (this.r2) {
      promises.push(
        this.r2.saveBatchResults(
          manifestId,
          savedDiagrams.map(d => ({ id: d.id, diagram: d }))
        )
      );
      promises.push(this.r2.saveManifest(manifest));
    }

    if (this.kv) {
      promises.push(
        this.kv.saveManifestMetadata(manifestId, {
          totalItems: manifest.totalItems,
          successCount: manifest.successCount,
          failureCount: manifest.failureCount,
          timestamp: manifest.timestamp,
        })
      );
    }

    await Promise.all(promises);
  }

  async getManifest(id: string): Promise<BatchManifest | null> {
    if (this.r2) {
      return this.r2.getManifest(id);
    }
    return null;
  }

  async saveManifest(manifest: BatchManifest): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.r2) {
      promises.push(this.r2.saveManifest(manifest));
    }

    await Promise.all(promises);
  }

  async saveManifestMetadata(
    manifestId: string,
    metadata: {
      totalItems: number;
      successCount: number;
      failureCount: number;
      timestamp: number;
    }
  ): Promise<void> {
    if (this.kv) {
      await this.kv.saveManifestMetadata(manifestId, metadata);
    }
  }

  async listManifests(limit: number = 100): Promise<string[]> {
    if (this.kv) {
      return this.kv.listManifests(limit);
    }
    return [];
  }
}
