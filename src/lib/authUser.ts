/**
 * Cached current-user accessor — no network round-trip.
 *
 * `supabase.auth.getUser()` validates the JWT against the auth server on EVERY
 * call (a `/auth/v1/user` request). Many components and services each ask
 * "who am I?" on mount, so a single page load fires a burst of identical
 * round-trips — wasteful, and rough on a throttled/free-tier backend.
 *
 * This reads the locally-persisted session instead (`getSession()` is local,
 * no network) and caches the user, keeping it fresh via `onAuthStateChange`.
 * Identity from the local session is safe for data access because every query
 * is still RLS-enforced server-side with the JWT — a revoked/expired token is
 * rejected at the data layer regardless. Use `getUser()` directly only when
 * you specifically need server-side token re-validation.
 */
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

let cachedUser: User | null = null;
let primed = false;

// Keep the cache in sync with login / logout / token refresh. This also fires
// an INITIAL_SESSION event on startup, which primes the cache.
supabase.auth.onAuthStateChange((_event, session) => {
  cachedUser = session?.user ?? null;
  primed = true;
});

/** Current signed-in user from the local session (cached, no network). */
export async function getAuthedUser(): Promise<User | null> {
  if (primed) return cachedUser;
  const { data } = await supabase.auth.getSession();
  cachedUser = data.session?.user ?? null;
  primed = true;
  return cachedUser;
}

/** Synchronous read of the cached user (null until the first async prime). */
export function getCachedUser(): User | null {
  return cachedUser;
}
