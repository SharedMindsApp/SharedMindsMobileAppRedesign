/**
 * Runtime Environment Detection
 * 
 * Single authoritative helper for detecting runtime environment.
 * Use this instead of scattered platform checks throughout the codebase.
 */

export interface RuntimeEnvironment {
  isBrowser: boolean;
  isMobile: boolean;
  isServer: boolean;
  platform: 'ios' | 'android' | 'web' | 'unknown';
  userAgent: string;
}

/**
 * Get the current runtime environment
 * 
 * @returns RuntimeEnvironment object with platform detection
 */
export function getRuntimeEnvironment(): RuntimeEnvironment {
  const isBrowser = typeof window !== 'undefined';
  const isServer = typeof window === 'undefined';
  
  let isMobile = false;
  let platform: 'ios' | 'android' | 'web' | 'unknown' = 'unknown';
  let userAgent = '';
  
  if (isBrowser && typeof navigator !== 'undefined') {
    userAgent = navigator.userAgent || '';
    const ua = userAgent.toLowerCase();
    
    // Detect mobile devices
    isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    
    // Detect specific platform
    if (/iphone|ipad|ipod/.test(ua)) {
      platform = 'ios';
    } else if (/android/.test(ua)) {
      platform = 'android';
    } else if (isBrowser) {
      platform = 'web';
    }
  }
  
  return {
    isBrowser,
    isMobile,
    isServer,
    platform,
    userAgent,
  };
}

/**
 * Check if the current environment supports browser API calls
 * 
 * @param requiresServerProxy - Whether the provider requires server proxy
 * @param supportsBrowserCalls - Whether the provider supports browser calls
 * @returns true if browser calls are supported, false otherwise
 */
export function canMakeBrowserCalls(
  requiresServerProxy?: boolean,
  supportsBrowserCalls?: boolean
): boolean {
  const env = getRuntimeEnvironment();
  
  // If server proxy is required, never use browser calls
  if (requiresServerProxy === true) {
    return false;
  }
  
  // If browser calls are explicitly not supported, never use browser calls
  if (supportsBrowserCalls === false) {
    return false;
  }
  
  // Must be in browser environment
  if (!env.isBrowser) {
    return false;
  }
  
  // Default to true if not explicitly disabled
  return supportsBrowserCalls !== false;
}
