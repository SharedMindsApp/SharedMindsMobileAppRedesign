/**
 * FoundingMemberBadge — small identity pill.
 *
 * SharedMinds is brand new — everyone signing up right now is part of the
 * founding cohort. The badge nods to that without needing a global member
 * count query (which would require an RLS-bypassing RPC). Once the product
 * is more established we can swap this for a real "Member #N" backed by a
 * SECURITY DEFINER function over auth.users / profiles.
 *
 * For now: if the user's profile was created in the launch window, show
 * the badge. Cutoff is intentionally generous — better to over-award
 * during the first months than under-award and feel cold.
 */

import { Sparkles } from 'lucide-react';

// First 6 months of SharedMinds — anyone who joins by this date is a founder.
const FOUNDING_CUTOFF = new Date('2026-11-01T00:00:00Z').getTime();

export function FoundingMemberBadge({ createdAt }: { createdAt: string | null | undefined }) {
  if (!createdAt) return null;
  const ts = new Date(createdAt).getTime();
  if (Number.isNaN(ts) || ts > FOUNDING_CUTOFF) return null;

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-gradient-to-r from-amber-400/20 to-rose-400/20 text-amber-700 ring-1 ring-amber-400/30">
      <Sparkles size={9} strokeWidth={2.5} />
      Founding member
    </span>
  );
}
