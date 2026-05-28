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
 * In-memory auth lock (process-local, NOT the Web Locks API).
 *
 * supabase-js's default lock coordinates token refreshes across tabs via
 * `navigator.locks` — but it waits indefinitely to acquire. A lock left
 * dangling by another tab, a crashed/zombie context, or rapid dev hot-reloads
 * then DEADLOCKS every authenticated query: home dashboard, "this week's
 * sessions", templates, etc. hang forever with no error and spinners never
 * resolve. (Observed: every getSession/getUser stuck waiting on
 * `lock:sharedminds.core.auth.token`.)
 *
 * We swap in a promise-chain lock scoped to THIS tab. It still serialises auth
 * operations within the tab (so we don't fire concurrent token refreshes that
 * race the refresh-token rotation), but it can't be blocked by a stale
 * cross-tab lock, and it falls through after the acquire timeout so it can
 * never hang. Worst case is a rare concurrent refresh across tabs, which
 * GoTrue tolerates.
 */
const AUTH_LOCK_CHAIN: Record<string, Promise<unknown>> = {};
async function inMemoryAuthLock<R>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  const previous = AUTH_LOCK_CHAIN[name] ?? Promise.resolve();
  // Wait for the previous op to finish, but never longer than the acquire
  // timeout (supabase passes a negative value for "wait forever" — cap it).
  const timeoutMs = acquireTimeout >= 0 ? acquireTimeout : 5000;
  const ready = Promise.race([
    previous.catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
  const run = ready.then(() => fn());
  // Keep the chain alive (swallow errors so one failure doesn't poison it).
  AUTH_LOCK_CHAIN[name] = run.then(() => undefined, () => undefined);
  return run;
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
      lock: inMemoryAuthLock,     // Process-local lock — never deadlock on a stale Web Lock
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
