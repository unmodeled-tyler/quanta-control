interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class SimpleCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private ttlMs: number;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

const GIT_CACHE = new SimpleCache<unknown>(2000);

export async function cachedGitCall<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = GIT_CACHE.get(key);
  if (cached !== undefined) return cached as T;
  const result = await fn();
  GIT_CACHE.set(key, result);
  return result;
}
