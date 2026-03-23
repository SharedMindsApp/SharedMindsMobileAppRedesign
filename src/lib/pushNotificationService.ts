/**
 * Push Notification Service
 * 
 * Abstract service layer for push notifications.
 * Provider-agnostic architecture that can be extended with Firebase, APNs, etc.
 * 
 * This is the scaffold - actual provider implementation comes later.
 */

import { registerPushToken, removePushToken } from './notifications';
import { isStandaloneApp } from './appContext';

export type PushPermissionState = 'default' | 'granted' | 'denied';

export interface PushNotificationConfig {
  enabled: boolean;
  permission: PushPermissionState;
  token: string | null;
}

// ============================================================================
// Permission Handling
// ============================================================================

/**
 * Check if push notifications are supported on this platform
 */
export function isPushSupported(): boolean {
  // Check for standalone app (PWA installed)
  if (isStandaloneApp()) {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }
  
  // Web push supported in most modern browsers
  return 'Notification' in window;
}

/**
 * Get current push permission state
 */
export function getPushPermission(): PushPermissionState {
  if (!isPushSupported()) {
    return 'denied';
  }
  
  return Notification.permission as PushPermissionState;
}

/**
 * Request push notification permission
 * 
 * This should only be called in response to explicit user action,
 * typically from a settings page or opt-in prompt.
 */
export async function requestPushPermission(): Promise<PushPermissionState> {
  if (!isPushSupported()) {
    console.warn('[pushNotificationService] Push notifications not supported');
    return 'denied';
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission as PushPermissionState;
  } catch (error) {
    console.error('[pushNotificationService] Error requesting permission:', error);
    return 'denied';
  }
}

// ============================================================================
// Token Management
// ============================================================================

/**
 * Get push token for current device
 * 
 * NOTE: This is a scaffold. Actual implementation will depend on:
 * - Firebase Cloud Messaging (mobile)
 * - Web Push API (web)
 * - APNs (iOS native)
 */
export async function getPushToken(): Promise<string | null> {
  if (!isPushSupported() || getPushPermission() !== 'granted') {
    return null;
  }
  
  try {
    // TODO: Implement actual token retrieval based on platform
    // For now, return null as this is scaffold only
    console.log('[pushNotificationService] Token retrieval not yet implemented');
    return null;
  } catch (error) {
    console.error('[pushNotificationService] Error getting token:', error);
    return null;
  }
}

/**
 * Register push token with backend
 */
export async function registerPushNotification(userId: string): Promise<boolean> {
  const permission = getPushPermission();
  
  if (permission !== 'granted') {
    console.warn('[pushNotificationService] Permission not granted');
    return false;
  }
  
  try {
    const token = await getPushToken();
    
    if (!token) {
      console.warn('[pushNotificationService] No token available');
      return false;
    }
    
    // Detect platform
    const platform = detectPlatform();
    const deviceName = getDeviceName();
    
    await registerPushToken(userId, token, platform, deviceName);
    console.log('[pushNotificationService] Token registered successfully');
    return true;
  } catch (error) {
    console.error('[pushNotificationService] Error registering token:', error);
    return false;
  }
}

/**
 * Unregister push token
 */
export async function unregisterPushNotification(): Promise<void> {
  try {
    const token = await getPushToken();
    
    if (!token) {
      return;
    }
    
    await removePushToken(token);
    console.log('[pushNotificationService] Token unregistered successfully');
  } catch (error) {
    console.error('[pushNotificationService] Error unregistering token:', error);
  }
}

// ============================================================================
// Platform Detection
// ============================================================================

function detectPlatform(): 'ios' | 'android' | 'web' {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  }
  
  if (/android/.test(userAgent)) {
    return 'android';
  }
  
  return 'web';
}

function getDeviceName(): string {
  const userAgent = navigator.userAgent;
  const platform = detectPlatform();
  
  if (platform === 'ios') {
    return 'iOS Device';
  }
  
  if (platform === 'android') {
    return 'Android Device';
  }
  
  // Extract browser name for web
  if (/chrome/i.test(userAgent)) return 'Chrome Browser';
  if (/firefox/i.test(userAgent)) return 'Firefox Browser';
  if (/safari/i.test(userAgent)) return 'Safari Browser';
  if (/edge/i.test(userAgent)) return 'Edge Browser';
  
  return 'Web Browser';
}

// ============================================================================
// Test Notification (Development)
// ============================================================================

/**
 * Show a local test notification (for testing UI)
 * Does not use push infrastructure
 */
export async function showTestNotification(title: string, body: string): Promise<void> {
  if (!isPushSupported()) {
    console.warn('[pushNotificationService] Notifications not supported');
    return;
  }
  
  const permission = getPushPermission();
  
  if (permission !== 'granted') {
    console.warn('[pushNotificationService] Permission not granted');
    return;
  }
  
  try {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    });
  } catch (error) {
    console.error('[pushNotificationService] Error showing notification:', error);
  }
}
