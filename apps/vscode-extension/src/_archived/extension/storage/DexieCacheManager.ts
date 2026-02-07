if (typeof (globalThis as any).self === 'undefined') {
  (globalThis as any).self = globalThis;
}
import 'fake-indexeddb/auto';

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { Blob } from 'buffer';

import Dexie, { Table } from 'dexie';
import { exportDB, importInto } from 'dexie-export-import';

import { FlowChartData } from '@dad/shared-types';

export interface CachedFlowChart {
  id: string;
  filePath: string;
  fileHash: string;
  codeHash: string;
  language: string;
  startLine?: number;
  endLine?: number;
  flowChart?: FlowChartData;
  chartId?: string;
  codeSnippet: string;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  cacheHits: number;
  cacheMisses: number;
  uniqueFiles: number;
}

interface FlowCacheRecord {
  id: string;
  filePath: string; // stored relative to workspace root
  fileHash: string;
  codeHash: string;
  language: string;
  startLine?: number;
  endLine?: number;
  flowChart?: FlowChartData;
  chartId?: string;
  codeSnippet: string;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
}

class DadCacheDB extends Dexie {
  flowCache!: Table<FlowCacheRecord, string>;

  constructor() {
    super('DADCache');
    this.version(1).stores({
      flowCache: '&id, filePath, fileHash, codeHash, [filePath+codeHash], lastAccessed, createdAt'
    });
  }
}

/**
 * Cache manager backed by Dexie (IndexedDB wrapper).
 * We persist the IndexedDB database to disk after each mutation.
 */
export class DexieCacheManager {
  private static readonly CACHE_FILE = 'cache.dexie.json';

  private readonly db: DadCacheDB;
  private readonly cacheFilePath: string;
  private cacheHits = 0;
  private cacheMisses = 0;
  private persistPromise: Promise<void> | null = null;
  private persistTimer: NodeJS.Timeout | null = null;
  private readonly serializer = (flowChart: FlowChartData): FlowChartData =>
    JSON.parse(JSON.stringify(flowChart ?? { nodes: [], edges: [] }));
  private readonly toRelative = (filePath: string): string => {
    if (!filePath) {
      return filePath;
    }
    if (!path.isAbsolute(filePath)) {
      return path.normalize(filePath);
    }
    const relative = path.relative(this.workspaceRoot, filePath);
    if (!relative || relative.startsWith('..')) {
      return path.normalize(filePath);
    }
    return path.normalize(relative);
  };
  private readonly mapRecordToCached = (record: FlowCacheRecord): CachedFlowChart => ({
    ...record,
    filePath: this.toAbsolute(record.filePath),
    flowChart: record.flowChart ? this.serializer(record.flowChart) : undefined,
    chartId: record.chartId
  });
  private readonly toAbsolute = (filePath: string): string => {
    if (!filePath) {
      return filePath;
    }
    if (path.isAbsolute(filePath)) {
      return path.normalize(filePath);
    }
    return path.normalize(path.join(this.workspaceRoot, filePath));
  };

  private constructor(private readonly workspaceRoot: string, db: DadCacheDB, cacheFilePath: string) {
    this.db = db;
    this.cacheFilePath = cacheFilePath;
  }

  static async create(workspaceRoot: string): Promise<DexieCacheManager> {
    if (!workspaceRoot) {
      throw new Error('DexieCacheManager requires a valid workspace root path');
    }

    const cacheDir = path.join(workspaceRoot, '.dad');
    await fs.mkdir(cacheDir, { recursive: true });
    const cacheFilePath = path.join(cacheDir, DexieCacheManager.CACHE_FILE);

    const db = new DadCacheDB();
    await db.open();

    const manager = new DexieCacheManager(workspaceRoot, db, cacheFilePath);
    await manager.loadFromDisk();
    return manager;
  }

  /**
   * Load persisted database content from disk, if present.
   */
  private async loadFromDisk(): Promise<void> {
    if (!fsSync.existsSync(this.cacheFilePath)) {
      return;
    }

    try {
      const buffer = await fs.readFile(this.cacheFilePath);
      if (buffer.length === 0) {
        return;
      }

      const blob = new Blob([buffer]);
      await importInto(this.db, blob, { clearTablesBeforeImport: true });
      console.log('DexieCacheManager loaded cache from disk');
      await this.normalizeStoredPaths();
    } catch (error) {
      console.error('DexieCacheManager failed to load cache, starting fresh:', error);
      await this.db.delete();
      await this.db.open();
    }
  }

  /**
   * Export the current database to disk. Dedupes concurrent calls.
   */
  private async persistToDisk(): Promise<void> {
    if (this.persistPromise) {
      await this.persistPromise;
      return;
    }

    this.persistPromise = (async () => {
      try {
        const exported = await exportDB(this.db, { prettyJson: true });
        const arrayBuffer = await exported.arrayBuffer();
        await fs.writeFile(this.cacheFilePath, Buffer.from(arrayBuffer));
      } catch (error) {
        console.error('DexieCacheManager failed to persist cache:', error);
      }
    })().finally(() => {
      this.persistPromise = null;
    });

    await this.persistPromise;
  }

  private async normalizeStoredPaths(): Promise<void> {
    const entries = await this.db.flowCache.toArray();
    let updated = false;
    for (const entry of entries) {
      if (path.isAbsolute(entry.filePath)) {
        const relative = this.toRelative(entry.filePath);
        if (relative !== entry.filePath) {
          await this.db.flowCache.update(entry.id, { filePath: relative });
          updated = true;
        }
      }
    }
    if (updated) {
      await this.persistToDisk();
    }
  }

  /**
   * Generate MD5 hash for content.
   */
  private generateHash(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Generate unique ID.
   */
  private generateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}_${random}`;
  }

  async findCachedByCode(code: string, filePath: string): Promise<CachedFlowChart | null> {
    const codeHash = this.generateHash(code);
    const relativePath = this.toRelative(filePath);

    const row = await this.db.flowCache
      .where('[filePath+codeHash]')
      .equals([relativePath, codeHash])
      .first();

    if (row) {
      await this.updateAccessStats(row.id, row.accessCount);
      this.cacheHits++;
      return this.mapRecordToCached(row);
    }

    this.cacheMisses++;
    return null;
  }

  async findByFileHash(filePath: string, fileHash: string): Promise<CachedFlowChart | null> {
    const relativePath = this.toRelative(filePath);
    const row = await this.db.flowCache
      .where('filePath')
      .equals(relativePath)
      .filter(entry => entry.fileHash === fileHash)
      .first();

    if (row) {
      await this.updateAccessStats(row.id, row.accessCount);
      this.cacheHits++;
      return this.mapRecordToCached(row);
    }

    this.cacheMisses++;
    return null;
  }

  async saveToCache(
    code: string,
    filePath: string,
    language: string,
    flowChart: FlowChartData,
    startLine?: number,
    endLine?: number,
    chartId?: string
  ): Promise<string> {
    const id = this.generateId();
    const codeHash = this.generateHash(code);
    const fileHash = this.generateHash(code);
    const now = Date.now();

    const record: FlowCacheRecord = {
      id,
      filePath: this.toRelative(filePath),
      fileHash,
      codeHash,
      language,
      startLine,
      endLine,
      chartId,
      flowChart: chartId ? undefined : this.serializer(flowChart),
      codeSnippet: code,
      createdAt: now,
      lastAccessed: now,
      accessCount: 1
    };

    await this.db.transaction('rw', this.db.flowCache, async () => {
      const existing = await this.db.flowCache
        .where('[filePath+codeHash]')
        .equals([this.toRelative(filePath), codeHash])
        .first();

      if (existing) {
        const update: Partial<FlowCacheRecord> = {
          fileHash,
          codeSnippet: code,
          lastAccessed: now
        };
        if (chartId) {
          update.chartId = chartId;
          update.flowChart = undefined;
        } else {
          update.flowChart = this.serializer(flowChart);
        }
        await this.db.flowCache.update(existing.id, update);
      } else {
        await this.db.flowCache.put(record);
      }
    });

    await this.evictIfNeeded();
    await this.persistToDisk();
    return id;
  }

  private async updateAccessStats(id: string, currentCount: number): Promise<void> {
    const updatedCount = (currentCount ?? 0) + 1;
    await this.db.flowCache.update(id, {
      lastAccessed: Date.now(),
      accessCount: updatedCount
    });
    this.schedulePersist();
  }

  async getCacheStats(): Promise<CacheStats> {
    const entries = await this.db.flowCache.toArray();
    const totalEntries = entries.length;
    const totalSize = entries.reduce((sum, entry) => {
      const chartSize = entry.flowChart
        ? Buffer.byteLength(JSON.stringify(entry.flowChart), 'utf8')
        : 0;
      const snippetSize = Buffer.byteLength(entry.codeSnippet, 'utf8');
      return sum + chartSize + snippetSize;
    }, 0);
    const uniqueFiles = new Set(entries.map(entry => this.toAbsolute(entry.filePath))).size;
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? Math.round((this.cacheHits / totalRequests) * 1000) / 10 : 0;

    return {
      totalEntries,
      totalSize,
      hitRate,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      uniqueFiles
    };
  }

  private async evictIfNeeded(): Promise<void> {
    const totalCount = await this.db.flowCache.count();
    const MAX_CACHE_SIZE = 1000;

    if (totalCount <= MAX_CACHE_SIZE) {
      return;
    }

    const toDelete = totalCount - MAX_CACHE_SIZE;
    const oldestEntries = await this.db.flowCache
      .orderBy('lastAccessed')
      .limit(toDelete)
      .toArray();

    if (oldestEntries.length > 0) {
      await this.db.flowCache.bulkDelete(oldestEntries.map(entry => entry.id));
      await this.persistToDisk();
      console.log(`DexieCacheManager evicted ${oldestEntries.length} old cache entries (LRU)`);
    }
  }

  async cleanupOldEntries(maxAgeDays = 30): Promise<void> {
    const maxAge = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const oldEntries = await this.db.flowCache.where('createdAt').below(maxAge).toArray();
    if (oldEntries.length > 0) {
      await this.db.flowCache.bulkDelete(oldEntries.map(entry => entry.id));
      await this.persistToDisk();
      console.log(`DexieCacheManager cleaned ${oldEntries.length} old cache entries`);
    }
  }

  async clearFileCache(filePath: string): Promise<number> {
    const relative = this.toRelative(filePath);
    const entries = await this.db.flowCache.where('filePath').equals(relative).toArray();
    if (entries.length > 0) {
      await this.db.flowCache.bulkDelete(entries.map(entry => entry.id));
      await this.persistToDisk();
    }
    return entries.length;
  }

  async clearAllCache(): Promise<number> {
    const total = await this.db.flowCache.count();
    await this.db.flowCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    await this.persistToDisk();
    console.log(`DexieCacheManager cleared entire cache (${total} entries)`);
    return total;
  }

  async getFileEntries(filePath: string): Promise<CachedFlowChart[]> {
    const relative = this.toRelative(filePath);
    const rows = await this.db.flowCache.where('filePath').equals(relative).toArray();
    return rows
      .map(row => this.mapRecordToCached(row))
      .sort((a, b) => b.lastAccessed - a.lastAccessed);
  }

  async close(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    await this.persistToDisk();
    this.db.close();
  }

  private schedulePersist(): void {
    if (this.persistTimer) {
      return;
    }
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.persistToDisk();
    }, 250);
  }
}
