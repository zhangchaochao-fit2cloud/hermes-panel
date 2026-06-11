export interface LRUCacheOptions {
  maxSize: number;
  maxAge?: number;
}

interface CacheEntry<V> {
  value: V;
  expires?: number;
}

export class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private maxSize: number;
  private maxAge: number;
  public hits = 0;
  public misses = 0;

  constructor(opts: LRUCacheOptions) {
    this.maxSize = opts.maxSize;
    this.maxAge = opts.maxAge ?? Infinity;
  }

  get size(): number {
    return this.cache.size;
  }

  get hitRatio(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  get stats() {
    return { hits: this.hits, misses: this.misses, hitRatio: this.hitRatio, size: this.size };
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (entry.expires !== undefined && Date.now() > entry.expires) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.value;
  }

  set(key: K, value: V, ttl?: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    const age = ttl ?? this.maxAge;
    this.cache.set(key, {
      value,
      expires: age < Infinity ? Date.now() + age : undefined,
    });
  }

  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.expires !== undefined && Date.now() > entry.expires) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }
}
