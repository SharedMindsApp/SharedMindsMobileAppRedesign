// useSessionLimits
//
// Single seam for every "is this user allowed to do X for this long" check
// in the session flow. Today it returns the same generous limits for
// everyone — we're in beta and scaling users, not monetising. When we're
// ready to introduce paid tiers, this is the ONE place we wire that gate:
// read the user's subscription state, return tighter caps for free users.
//
// Intended future design:
//   - Free tier:  max 60 min sessions (aligns with the 60-min mid-session
//                 recheck — by the time a free user hits the recheck, they
//                 will have completed one full focus loop and the upgrade
//                 prompt becomes a natural conversion moment)
//   - Paid tier:  max 180 min sessions, custom durations enabled
//
// Until the paywall ships, every user gets the paid limits. Beta is for
// learning — we don't want artificial constraints distorting the feedback.

import { useAuth } from '../core/auth/AuthProvider';

export interface SessionLimits {
  /** Maximum session length in minutes the user is allowed to schedule. */
  maxMinutes: number;
  /** Whether the user can use the custom-duration slider (vs only presets). */
  canUseCustomDuration: boolean;
  /** True when the user is on a paid tier. Today: true for everyone (beta). */
  isPaid: boolean;
  /** Convenience: explains the limit ('beta' | 'free' | 'paid'). Helpful
   *  for surfacing copy like "Free plan caps sessions at 60 min". */
  tier: 'beta' | 'free' | 'paid';
}

// During beta, everyone gets paid-tier limits. Flip BETA_OPEN_LIMITS to
// false when paid tiers go live to start enforcing the free/paid split.
const BETA_OPEN_LIMITS = true;

const FREE_TIER_MAX_MINUTES = 60;
const PAID_TIER_MAX_MINUTES = 180;

export function useSessionLimits(): SessionLimits {
  const { profile } = useAuth();
  // Future: read `profile.subscription_tier` (or whatever column we add)
  // and return the correct limits. For now everyone's on the beta plan.
  const isPaid = !!profile; // stub — always true when authenticated

  if (BETA_OPEN_LIMITS) {
    return {
      maxMinutes: PAID_TIER_MAX_MINUTES,
      canUseCustomDuration: true,
      isPaid: true,
      tier: 'beta',
    };
  }

  return isPaid
    ? { maxMinutes: PAID_TIER_MAX_MINUTES, canUseCustomDuration: true,  isPaid: true,  tier: 'paid' }
    : { maxMinutes: FREE_TIER_MAX_MINUTES, canUseCustomDuration: false, isPaid: false, tier: 'free' };
}
