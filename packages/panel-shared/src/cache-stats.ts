import { LRUCache } from './lru-cache.js';

export interface CacheStatsEntry {
  hits: number;
  misses: number;
  hitRatio: number;
  size: number;
}

class CacheStatsCollector {
  private caches = new Map<string, LRUCache<unknown, unknown>>();

  register<V>(name: string, cache: LRUCache<unknown, V>): void {
    this.caches.set(name, cache as LRUCache<unknown, unknown>);
  }

  getStats(name: string): CacheStatsEntry | undefined {
    const cache = this.caches.get(name);
    return cache?.stats;
  }

  getAllStats(): Record<string, CacheStatsEntry> {
    const result: Record<string, CacheStatsEntry> = {};
    for (const [name, cache] of this.caches) {
      result[name] = cache.stats;
    }
    return result;
  }

  resetAll(): void {
    for (const cache of this.caches.values()) {
      cache.resetStats();
    }
  }
}

export const cacheStats = new CacheStatsCollector();
