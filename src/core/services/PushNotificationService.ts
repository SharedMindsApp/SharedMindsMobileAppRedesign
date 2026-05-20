/**
 * PushNotificationService — Web Push (VAPID) for SharedMinds
 *
 * Manages push subscription lifecycle:
 *   subscribe()   → requests browser permission, creates a PushSubscription,
 *                   saves it to push_subscriptions table.
 *   unsubscribe() → removes from DB and browser.
 *
 * The Edge Function (dispatch-notifications) reads push_subscriptions to fan
 * out push notifications alongside email.
 *
 * VAPID public key must be set in .env.local:
 *   VITE_VAPID_PUBLIC_KEY=<your-base64url-encoded-public-key>
 *
 * Generate a keypair with:
 *   npx web-push generate-vapid-keys
 * Then set the three secrets in Supabase:
 *   supabase secrets set VAPID_PUBLIC_KEY=<public>
 *   supabase secrets set VAPID_PRIVATE_KEY=<private>
 *   supabase secrets set VAPID_SUBJECT=mailto:hello@sharedminds.app
 */

import { supabase } from '../../lib/supabase';

// Read VAPID public key from Vite env (safe to expose in frontend)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a base64url VAPID public key to a Uint8Array for the browser API */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Returns true if this browser supports Web Push */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Returns the current browser notification permission state */
export function getPushPermission(): NotificationPermission {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Check if this browser has an active push subscription saved in the DB.
 * Fast path: checks the local PushManager, no network request.
 */
export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub !== null;
  } catch {
    return false;
  }
}

/**
 * Subscribe this device to push notifications.
 *
 * Flow:
 *   1. Request Notification permission (browser prompt if not already granted)
 *   2. Subscribe via PushManager with the VAPID public key
 *   3. Upsert the subscription into push_subscriptions (by endpoint)
 *
 * Returns true on success, false if permission denied or VAPID key missing.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  if (!VAPID_PUBLIC_KEY) {
    console.warn('[PushNotificationService] VITE_VAPID_PUBLIC_KEY not set — push disabled');
    return false;
  }

  // 1. Ask for permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  try {
    // 2. Subscribe
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // 3. Persist to Supabase
    const json = sub.toJSON();
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint:   json.endpoint,
          p256dh:     json.keys?.p256dh ?? '',
          auth_key:   json.keys?.auth   ?? '',
          user_agent: navigator.userAgent.slice(0, 250),
        },
        { onConflict: 'user_id,endpoint' },
      );

    if (error) {
      console.error('[PushNotificationService] Failed to save subscription:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[PushNotificationService] Subscribe failed:', err);
    return false;
  }
}

/**
 * Unsubscribe this device from push notifications.
 * Removes from both the browser PushManager and the DB.
 */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;

    // Remove from DB first (so the endpoint is deleted even if browser unsubscribe
    // fails or the user clears their browser data later)
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', sub.endpoint);

    await sub.unsubscribe();
  } catch (err) {
    console.error('[PushNotificationService] Unsubscribe failed:', err);
  }
}
