// usePublicHostingEligibility
//
// Reads whether the current user has earned the right to host public (group)
// sessions. Backed by `public.attended_session_count(uid)` +
// `public.public_hosting_threshold()` RPCs. Admins bypass the gate at the DB
// level — we mirror that in the hook so UI doesn't have to special-case it.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../core/auth/AuthProvider';

export interface PublicHostingEligibility {
  /** True if the user can host a 'group' session right now. */
  eligible: boolean;
  /** How many qualifying sessions the user has attended/completed. */
  attendedCount: number;
  /** Sessions needed to unlock public hosting. Matches DB threshold. */
  threshold: number;
  /** Admins bypass the gate. */
  isAdmin: boolean;
  /** Initial-load flag — true until the first fetch resolves. */
  loading: boolean;
}

const DEFAULT_THRESHOLD = 20;

export function usePublicHostingEligibility(): PublicHostingEligibility {
  const { user, isAdmin } = useAuth();
  const [attendedCount, setAttendedCount] = useState(0);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAttendedCount(0);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Run both RPCs in parallel — threshold is immutable but cheap, and
        // doing both in one await keeps the hook flicker-free.
        const [countRes, thresholdRes] = await Promise.all([
          supabase.rpc('attended_session_count', { uid: user.id }),
          supabase.rpc('public_hosting_threshold'),
        ]);
        if (cancelled) return;
        if (!countRes.error && typeof countRes.data === 'number') {
          setAttendedCount(countRes.data);
        }
        if (!thresholdRes.error && typeof thresholdRes.data === 'number') {
          setThreshold(thresholdRes.data);
        }
      } catch (e) {
        console.error('[usePublicHostingEligibility]', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const eligible = isAdmin || attendedCount >= threshold;
  return { eligible, attendedCount, threshold, isAdmin, loading };
}
