/**
 * Insights Cache Utility
 * 
 * Manages caching of tracker insights to make dashboard loading instant.
 */

const CACHE_PREFIX = 'tracker-insights-';
const CACHE_DURATION_MS = 60000; // 60 seconds

export function getCachedInsights(trackerIds: string[]): any | null {
  const cacheKey = `${CACHE_PREFIX}${trackerIds.sort().join('-')}`;
  const cacheTimestampKey = `${cacheKey}-timestamp`;
  
  const cached = localStorage.getItem(cacheKey);
  const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
  
  if (!cached || !cachedTimestamp) {
    return null;
  }
  
  const age = Date.now() - parseInt(cachedTimestamp, 10);
  if (age >= CACHE_DURATION_MS) {
    // Cache expired
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(cacheTimestampKey);
    return null;
  }
  
  try {
    return JSON.parse(cached);
  } catch (e) {
    // Invalid cache data
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(cacheTimestampKey);
    return null;
  }
}

export function setCachedInsights(trackerIds: string[], insights: any): void {
  const cacheKey = `${CACHE_PREFIX}${trackerIds.sort().join('-')}`;
  const cacheTimestampKey = `${cacheKey}-timestamp`;
  
  try {
    localStorage.setItem(cacheKey, JSON.stringify(insights));
    localStorage.setItem(cacheTimestampKey, Date.now().toString());
  } catch (e) {
    // Storage quota exceeded or other error
    console.warn('[InsightsCache] Failed to cache insights:', e);
  }
}

export function invalidateInsightsCache(): void {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(CACHE_PREFIX)) {
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}-timestamp`);
    }
  });
}

export function invalidateInsightsCacheForTracker(trackerId: string): void {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(CACHE_PREFIX) && key.includes(trackerId)) {
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}-timestamp`);
    }
  });
}
