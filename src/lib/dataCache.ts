/**
 * Simple In-Memory Data Cache
 * 
 * Provides stale-while-revalidate caching pattern for dashboard and widget data.
 * Critical for mobile performance - instant back navigation, reduced network calls.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      // Expired - remove and return null
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached data with TTL
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    // Default 5 minutes TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Check if key exists and is valid (not expired)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate a specific key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get stale data even if expired (for stale-while-revalidate pattern)
   */
  getStale<T>(key: string): T | null {
    const entry = this.cache.get(key);
    return entry ? (entry.data as T) : null;
  }
}

// Singleton instance
export const dataCache = new DataCache();

/**
 * Cache key generators for common data types
 */
export const CacheKeys = {
  dashboard: (userId: string) => `dashboard:${userId}`,
  mealPlanner: (spaceId: string, weekStart: string) => `meal-planner:${spaceId}:${weekStart}`,
  mealLibrary: (spaceId: string) => `meal-library:${spaceId}`,
  favorites: (userId: string, spaceId: string) => `favorites:${userId}:${spaceId}`,
  recipes: (spaceId: string, query?: string) => query 
    ? `recipes:${spaceId}:${query}` 
    : `recipes:${spaceId}`,
};

/**
 * Stale-while-revalidate helper
 * Returns cached data immediately, then fetches fresh data in background
 */
export async function staleWhileRevalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000
): Promise<T> {
  // Return stale data immediately if available
  const stale = dataCache.getStale<T>(key);
  if (stale) {
    // Fetch fresh data in background (don't await)
    fetcher().then(fresh => {
      dataCache.set(key, fresh, ttl);
    }).catch(err => {
      console.warn(`[Cache] Background fetch failed for ${key}:`, err);
      // Keep stale data on error
    });
    return stale;
  }

  // No cache - fetch and cache
  const data = await fetcher();
  dataCache.set(key, data, ttl);
  return data;
}
