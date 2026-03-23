/**
 * App Version Tracking
 * 
 * Manages app version detection and comparison for update notifications.
 * Uses version.json served from public folder for deployed version tracking.
 */

// Current app version (injected at build time via vite.config or from version.json)
// Fallback to '1.0.0' if not available
export const CURRENT_APP_VERSION = 
  (import.meta.env.VITE_APP_VERSION as string) || 
  '1.0.0';

interface VersionInfo {
  version: string;
  timestamp?: string;
}

let cachedVersion: VersionInfo | null = null;
let lastCheckTime = 0;
const VERSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the latest version from the server
 */
export async function getLatestVersion(): Promise<string | null> {
  try {
    // Use cache if available and recent
    const now = Date.now();
    if (cachedVersion && (now - lastCheckTime) < VERSION_CACHE_TTL) {
      return cachedVersion.version;
    }

    // FIXED: Fetch version.json with cache-busting timestamp and no-cache headers
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      console.warn('[AppVersion] Failed to fetch version.json:', response.status);
      return null;
    }

    const data: VersionInfo = await response.json();
    cachedVersion = data;
    lastCheckTime = now;

    return data.version;
  } catch (error) {
    console.warn('[AppVersion] Error fetching version:', error);
    return null;
  }
}

/**
 * Compare two version strings
 * Returns true if latestVersion > currentVersion
 */
export function isVersionNewer(latestVersion: string, currentVersion: string): boolean {
  // Simple semantic version comparison
  const latestParts = latestVersion.split('.').map(Number);
  const currentParts = currentVersion.split('.').map(Number);

  for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
    const latest = latestParts[i] || 0;
    const current = currentParts[i] || 0;

    if (latest > current) return true;
    if (latest < current) return false;
  }

  return false; // Versions are equal
}

/**
 * Check if an update is available
 */
export async function checkForUpdate(): Promise<boolean> {
  try {
    const latestVersion = await getLatestVersion();
    if (!latestVersion) return false;

    return isVersionNewer(latestVersion, CURRENT_APP_VERSION);
  } catch (error) {
    console.warn('[AppVersion] Error checking for update:', error);
    return false;
  }
}

