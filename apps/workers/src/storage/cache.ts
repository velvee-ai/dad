import type { SavedDiagram, Diagram } from '@dad/shared-types';

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export enum CacheKeyPrefix {
  DIAGRAM = 'diagram',
  SESSION = 'session',
  EXPORT = 'export',
}

export enum CacheTTL {
  DIAGRAM = 604800,
  SESSION = 604800,
  EXPORT = 604800,
  DEFAULT = 604800,
}

export class CacheManager {
  private kv: KVNamespace;
  private metrics: CacheMetrics;
  private enabled: boolean;

  constructor(kv: KVNamespace, enabled: boolean = true) {
    this.kv = kv;
    this.enabled = enabled;
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
    };
  }

  private buildKey(prefix: CacheKeyPrefix, id: string): string {
    return `${prefix}:${id}`;
  }

  private updateMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }

  async get<T>(prefix: CacheKeyPrefix, id: string): Promise<T | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const key = this.buildKey(prefix, id);
      const cached = await this.kv.get<CacheEntry<T>>(key, 'json');

      if (!cached) {
        this.metrics.misses++;
        this.updateMetrics();
        return null;
      }

      const now = Date.now();
      if (cached.timestamp + cached.ttl * 1000 < now) {
        await this.delete(prefix, id);
        this.metrics.misses++;
        this.updateMetrics();
        return null;
      }

      this.metrics.hits++;
      this.updateMetrics();
      return cached.data;
    } catch (error) {
      console.error(`Cache get error for key ${prefix}:${id}:`, error);
      this.metrics.misses++;
      this.updateMetrics();
      return null;
    }
  }

  async set<T>(
    prefix: CacheKeyPrefix,
    id: string,
    data: T,
    ttl: number = CacheTTL.DEFAULT
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const key = this.buildKey(prefix, id);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };

      await this.kv.put(key, JSON.stringify(entry), {
        expirationTtl: ttl,
      });

      this.metrics.sets++;
    } catch (error) {
      console.error(`Cache set error for key ${prefix}:${id}:`, error);
    }
  }

  async delete(prefix: CacheKeyPrefix, id: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const key = this.buildKey(prefix, id);
      await this.kv.delete(key);
      this.metrics.deletes++;
    } catch (error) {
      console.error(`Cache delete error for key ${prefix}:${id}:`, error);
    }
  }

  async invalidatePattern(prefix: CacheKeyPrefix): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const listResult = await this.kv.list({ prefix: `${prefix}:` });

      for (const key of listResult.keys) {
        await this.kv.delete(key.name);
        this.metrics.deletes++;
      }
    } catch (error) {
      console.error(`Cache invalidate pattern error for prefix ${prefix}:`, error);
    }
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
    };
  }
}

export async function getWithCache<T>(
  cache: CacheManager,
  prefix: CacheKeyPrefix,
  id: string,
  fetcher: () => Promise<T | null>,
  ttl: number = CacheTTL.DEFAULT
): Promise<T | null> {
  const cached = await cache.get<T>(prefix, id);
  if (cached !== null) {
    return cached;
  }

  const data = await fetcher();
  if (data !== null) {
    await cache.set(prefix, id, data, ttl);
  }

  return data;
}

export async function invalidateCache(
  cache: CacheManager,
  prefix: CacheKeyPrefix,
  id?: string
): Promise<void> {
  if (id) {
    await cache.delete(prefix, id);
  } else {
    await cache.invalidatePattern(prefix);
  }
}

export function createCacheManager(kv: KVNamespace, enabled: boolean = true): CacheManager {
  return new CacheManager(kv, enabled);
}
