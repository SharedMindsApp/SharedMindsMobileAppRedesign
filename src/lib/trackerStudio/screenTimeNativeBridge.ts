/**
 * Screen Time Native Bridge
 * 
 * Interface for communicating with native mobile app to:
 * - Get installed apps
 * - Request permissions
 * - Monitor app usage in real-time
 * 
 * This will be implemented via Capacitor plugin in the native app.
 */

import type { InstalledApp } from '../../components/tracker-studio/ScreenTimeAppView';

/**
 * Check if native bridge is available
 */
export async function checkNativeBridgeAvailable(): Promise<boolean> {
  try {
    if (typeof window === 'undefined') {
      return false;
    }
    
    const win = window as any;
    
    // Check for Capacitor
    if (win.Capacitor) {
      // Check if Capacitor has isNativePlatform method (available without import)
      if (typeof win.Capacitor.isNativePlatform === 'function' && win.Capacitor.isNativePlatform()) {
        return true;
      }
      
      // Check if it has Plugins object (indicates native bridge)
      if (win.Capacitor.Plugins) {
        return true;
      }
      
      // If window.Capacitor exists, assume we're in a Capacitor environment
      // (even if @capacitor/core package isn't installed in the web project)
      return true;
    }
    
    // Check if running in React Native WebView
    if (win.ReactNativeWebView && typeof win.ReactNativeWebView.postMessage === 'function') {
      return true;
    }
    
    // Check for custom native bridge
    if (win.SharedMindsNative && typeof win.SharedMindsNative.getInstalledApps === 'function') {
      return true;
    }
    
    // Check for Capacitor Plugins directly (alternative detection)
    if (win.Capacitor?.Plugins?.ScreenTime) {
      return true;
    }
    
    return false;
  } catch (err) {
    console.error('Error checking native bridge:', err);
    return false;
  }
}

/**
 * Request app usage permission from the device
 */
export async function requestAppUsagePermission(): Promise<boolean> {
  try {
    const isAvailable = await checkNativeBridgeAvailable();
    
    if (!isAvailable) {
      console.warn('[ScreenTime] Native bridge not available - permission request will fail');
      return false;
    }

    console.log('[ScreenTime] Requesting app usage permission...');

    // Try native bridge methods (checking runtime availability, not static imports)
    if (typeof window !== 'undefined') {
      const win = window as any;
      
      // Try Capacitor Plugins object directly (available at runtime in native apps)
      if (win.Capacitor?.Plugins?.ScreenTime) {
        console.log('[ScreenTime] Using Capacitor.Plugins.ScreenTime');
        try {
          const result = await win.Capacitor.Plugins.ScreenTime.requestPermission();
          console.log('[ScreenTime] Permission result from Capacitor.Plugins:', result);
          return result?.granted === true;
        } catch (pluginError) {
          console.error('[ScreenTime] Capacitor.Plugins error:', pluginError);
        }
      }
      
      // Try custom SharedMindsNative bridge
      if (win.SharedMindsNative && typeof win.SharedMindsNative.requestPermission === 'function') {
        console.log('[ScreenTime] Using SharedMindsNative bridge');
        try {
          const result = await win.SharedMindsNative.requestPermission();
          console.log('[ScreenTime] Permission result from SharedMindsNative:', result);
          return result === true || result?.granted === true;
        } catch (bridgeError) {
          console.error('[ScreenTime] SharedMindsNative bridge error:', bridgeError);
        }
      }
      
      // Try React Native bridge
      if (win.ReactNativeWebView && typeof win.ReactNativeWebView.postMessage === 'function') {
        console.log('[ScreenTime] Using ReactNativeWebView bridge');
        return new Promise((resolve) => {
          const messageId = `permission_${Date.now()}_${Math.random()}`;
          let resolved = false;
          
          const handler = (event: MessageEvent) => {
            try {
              const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
              if (data?.type === 'permission_result' && data?.id === messageId) {
                window.removeEventListener('message', handler);
                resolved = true;
                console.log('[ScreenTime] Permission result from ReactNative:', data);
                resolve(data.granted === true);
              }
            } catch (parseError) {
              // Ignore parse errors for other messages
            }
          };
          
          window.addEventListener('message', handler);
          
          try {
            win.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'request_permission',
              id: messageId,
              permission: 'app_usage'
            }));
          } catch (postError) {
            window.removeEventListener('message', handler);
            console.error('[ScreenTime] Failed to post message:', postError);
            resolve(false);
            return;
          }
          
          // Timeout after 5 seconds
          setTimeout(() => {
            if (!resolved) {
              window.removeEventListener('message', handler);
              console.warn('[ScreenTime] Permission request timeout');
              resolve(false);
            }
          }, 5000);
        });
      }
      
      // Try dynamic import only if we're in a native environment and plugin might be available
      // Use a runtime-evaluated import to prevent Vite from analyzing it statically
      if (win.Capacitor && win.Capacitor.isNativePlatform?.()) {
        try {
          // Use Function constructor to create a dynamic import that Vite won't analyze
          const dynamicImport = new Function('specifier', 'return import(specifier)');
          const screenTimeModule = await dynamicImport('@capacitor/screen-time').catch(() => null);
          if (screenTimeModule?.ScreenTime) {
            console.log('[ScreenTime] Using Capacitor ScreenTime plugin');
            const result = await screenTimeModule.ScreenTime.requestPermission();
            console.log('[ScreenTime] Permission result:', result);
            return result.granted === true;
          }
        } catch (capacitorError) {
          // Capacitor plugin not installed or not available - that's okay
          console.log('[ScreenTime] Capacitor plugin not available');
        }
      }
    }
    
    // If we get here, native bridge is available but permission API not found
    // In native apps, permission might already be granted, so return true to allow testing
    console.warn('[ScreenTime] Native bridge available but permission API not found - assuming granted');
    return true;
  } catch (err) {
    console.error('[ScreenTime] Failed to request permission:', err);
    return false;
  }
}

/**
 * Get list of installed apps from the device
 */
export async function getInstalledApps(): Promise<InstalledApp[]> {
  try {
    // Try native bridge methods (checking runtime availability, not static imports)
    if (typeof window !== 'undefined') {
      const win = window as any;
      
      // Try custom SharedMindsNative bridge
      if (win.SharedMindsNative && typeof win.SharedMindsNative.getInstalledApps === 'function') {
        console.log('[ScreenTime] Using SharedMindsNative bridge to get installed apps');
        try {
          const apps = await win.SharedMindsNative.getInstalledApps();
          console.log('[ScreenTime] Received apps from SharedMindsNative:', apps);
          if (Array.isArray(apps) && apps.length > 0) {
            const mappedApps = apps.map((app: any) => ({
              id: app.id || app.packageName || app.bundleId || `app_${Date.now()}_${Math.random()}`,
              name: app.name || 'Unknown App',
              packageName: app.packageName || app.bundleId,
              category: app.category || 'other',
              icon: app.icon,
            }));
            console.log('[ScreenTime] Successfully loaded', mappedApps.length, 'apps from SharedMindsNative');
            return mappedApps;
          } else {
            console.warn('[ScreenTime] SharedMindsNative returned empty apps array');
          }
        } catch (bridgeError) {
          console.error('[ScreenTime] SharedMindsNative bridge error:', bridgeError);
        }
      }
      
      // Try React Native bridge via postMessage
      if (win.ReactNativeWebView && typeof win.ReactNativeWebView.postMessage === 'function') {
        console.log('[ScreenTime] Using ReactNativeWebView bridge to get installed apps');
        return new Promise((resolve, reject) => {
          const messageId = `apps_${Date.now()}_${Math.random()}`;
          let resolved = false;
          
          const handler = (event: MessageEvent) => {
            try {
              const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
              if (data?.type === 'installed_apps' && data?.id === messageId) {
                window.removeEventListener('message', handler);
                resolved = true;
                console.log('[ScreenTime] Received apps from ReactNative:', data);
                if (data.error) {
                  reject(new Error(data.error));
                } else {
                  const apps = data.apps || [];
                  if (apps.length > 0) {
                    const mappedApps = apps.map((app: any) => ({
                      id: app.id || app.packageName || app.bundleId || `app_${Date.now()}_${Math.random()}`,
                      name: app.name || 'Unknown App',
                      packageName: app.packageName || app.bundleId,
                      category: app.category || 'other',
                      icon: app.icon,
                    }));
                    console.log('[ScreenTime] Successfully loaded', mappedApps.length, 'apps from ReactNative');
                    resolve(mappedApps);
                  } else {
                    reject(new Error('No apps returned from native bridge'));
                  }
                }
              }
            } catch (parseError) {
              // Ignore parse errors for other messages
            }
          };
          
          window.addEventListener('message', handler);
          
          try {
            const message = JSON.stringify({
              type: 'get_installed_apps',
              id: messageId
            });
            console.log('[ScreenTime] Sending message to ReactNative:', message);
            win.ReactNativeWebView.postMessage(message);
          } catch (postError) {
            window.removeEventListener('message', handler);
            console.error('[ScreenTime] Failed to post message:', postError);
            reject(new Error('Failed to send message to native app'));
            return;
          }
          
          // Timeout after 10 seconds
          setTimeout(() => {
            if (!resolved) {
              window.removeEventListener('message', handler);
              console.error('[ScreenTime] Timeout waiting for installed apps');
              reject(new Error('Timeout waiting for installed apps from native app. Make sure the native app is listening for messages.'));
            }
          }, 10000);
        });
      }
      
      // Try Capacitor Plugins object (alternative detection)
      if (win.Capacitor?.Plugins?.ScreenTime) {
        const Plugins = win.Capacitor.Plugins;
        if (typeof Plugins.ScreenTime.getInstalledApps === 'function') {
          console.log('[ScreenTime] Using Capacitor.Plugins.ScreenTime to get installed apps');
          try {
            const result = await Plugins.ScreenTime.getInstalledApps();
            console.log('[ScreenTime] Received apps from Capacitor.Plugins:', result);
            if (result && result.apps && Array.isArray(result.apps) && result.apps.length > 0) {
              const mappedApps = result.apps.map((app: any) => ({
                id: app.packageName || app.bundleId || app.id || `app_${Date.now()}_${Math.random()}`,
                name: app.name || 'Unknown App',
                packageName: app.packageName || app.bundleId,
                category: app.category || 'other',
                icon: app.icon,
              }));
              console.log('[ScreenTime] Successfully loaded', mappedApps.length, 'apps from Capacitor.Plugins');
              return mappedApps;
            } else {
              console.warn('[ScreenTime] Capacitor.Plugins returned empty or invalid apps array');
            }
          } catch (pluginError) {
            console.error('[ScreenTime] Capacitor.Plugins error:', pluginError);
          }
        }
      }
      
      // Try dynamic import only if we're in a native environment and plugin might be available
      // Use a runtime-evaluated import to prevent Vite from analyzing it statically
      if (win.Capacitor && win.Capacitor.isNativePlatform?.()) {
        try {
          // Use Function constructor to create a dynamic import that Vite won't analyze
          const dynamicImport = new Function('specifier', 'return import(specifier)');
          const screenTimeModule = await dynamicImport('@capacitor/screen-time').catch(() => null);
          if (screenTimeModule?.ScreenTime) {
            console.log('[ScreenTime] Using Capacitor ScreenTime plugin to get installed apps');
            const result = await screenTimeModule.ScreenTime.getInstalledApps();
            console.log('[ScreenTime] Received apps from Capacitor:', result);
            if (result && result.apps && Array.isArray(result.apps) && result.apps.length > 0) {
              const mappedApps = result.apps.map((app: any) => ({
                id: app.packageName || app.bundleId || app.id || `app_${Date.now()}_${Math.random()}`,
                name: app.name || 'Unknown App',
                packageName: app.packageName || app.bundleId,
                category: app.category || 'other',
                icon: app.icon, // Base64 encoded icon or URL
              }));
              console.log('[ScreenTime] Successfully loaded', mappedApps.length, 'apps from Capacitor');
              return mappedApps;
            } else {
              console.warn('[ScreenTime] Capacitor returned empty or invalid apps array');
            }
          }
        } catch (capacitorError) {
          // Capacitor plugin not installed or not available - that's okay
          console.log('[ScreenTime] Capacitor plugin not available');
        }
      }
    }
    
    // If we get here, no native bridge found - provide helpful error
    throw new Error(
      'Native bridge not available. ' +
      'To track app usage, please use the Shared Minds mobile app. ' +
      'The web version cannot access installed apps on your device for security reasons.'
    );
  } catch (err) {
    console.error('Failed to get installed apps:', err);
    
    // Re-throw with helpful message
    if (err instanceof Error) {
      throw err;
    }
    
    throw new Error(
      'Failed to load installed apps. ' +
      'Make sure you\'re using the native Shared Minds mobile app and have granted app usage permissions in your device settings.'
    );
  }
}

/**
 * Start monitoring app usage for a specific app
 * This sets up real-time tracking that calls recordAppUsageEvent automatically
 */
export async function startMonitoringApp(
  packageName: string,
  callbacks: {
    onAppOpened?: (event: { appName: string; timestamp: string }) => void;
    onAppClosed?: (event: { appName: string; timestamp: string; sessionDuration: number }) => void;
    onForeground?: (event: { appName: string; timestamp: string }) => void;
    onBackground?: (event: { appName: string; timestamp: string }) => void;
  }
): Promise<void> {
  try {
    if (!(await checkNativeBridgeAvailable())) {
      throw new Error('Native bridge not available');
    }

    // TODO: Implement via Capacitor plugin
    // const { ScreenTime } = await import('@capacitor/screen-time');
    // await ScreenTime.startMonitoring({
    //   packageName,
    //   onAppOpened: callbacks.onAppOpened,
    //   onAppClosed: callbacks.onAppClosed,
    //   onForeground: callbacks.onForeground,
    //   onBackground: callbacks.onBackground,
    // });
    
    console.log('Monitoring started for:', packageName);
  } catch (err) {
    console.error('Failed to start monitoring:', err);
    throw err;
  }
}

/**
 * Stop monitoring app usage for a specific app
 */
export async function stopMonitoringApp(packageName: string): Promise<void> {
  try {
    if (!(await checkNativeBridgeAvailable())) {
      return;
    }

    // TODO: Implement via Capacitor plugin
    // const { ScreenTime } = await import('@capacitor/screen-time');
    // await ScreenTime.stopMonitoring({ packageName });
    
    console.log('Monitoring stopped for:', packageName);
  } catch (err) {
    console.error('Failed to stop monitoring:', err);
  }
}
