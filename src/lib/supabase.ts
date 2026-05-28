import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = '[supabase] Missing required environment variables. Please check your .env file.';
  console.error(errorMsg);
  
  if (import.meta.env.DEV) {
    console.error(
      'Make sure you have VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    );
  }
}

/**
 * Resilient auth lock.
 *
 * supabase-js serialises access-token reads/refreshes through the Web Locks
 * API so multiple tabs don't refresh the token at once. The DEFAULT lock waits
 * indefinitely (`acquireTimeout = -1`) — so a lock left dangling by a crashed
 * tab, a backgrounded tab, or rapid dev hot-reloads will DEADLOCK every
 * authenticated query: they hang forever with no error and spinners never
 * resolve (home dashboard, "this week's sessions", templates, etc.).
 *
 * This wrapper caps the wait: if the lock can't be acquired within a few
 * seconds it proceeds WITHOUT it rather than hanging the whole app. The only
 * downside is a rare concurrent token refresh across tabs, which GoTrue
 * tolerates. When the lock is free (the normal case) behaviour is unchanged.
 */
async function resilientAuthLock<R>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  if (typeof navigator === 'undefined' || !navigator.locks?.request) {
    return fn();
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    return await navigator.locks.request(name, { signal: controller.signal }, () => fn());
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') {
      console.warn('[supabase] auth lock timed out — proceeding without it to avoid a deadlock');
      return fn();
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Create a fully configured Supabase client with connection resilience
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,        // Keep user logged in after refresh
      autoRefreshToken: true,      // Refresh JWT automatically
      detectSessionInUrl: true,    // Needed for OAuth callback redirect
      storage: localStorage,       // Use browser localStorage for session
      storageKey: 'sharedminds.core.auth.token', // Explicit storage key
      flowType: 'pkce',           // Use PKCE flow for better security
      lock: resilientAuthLock,    // Never deadlock on a stale Web Lock
    },
    global: {
      headers: {
        'X-Client-Info': 'shared-minds-v1-web',
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    db: {
      schema: 'public',
    },
  }
);
