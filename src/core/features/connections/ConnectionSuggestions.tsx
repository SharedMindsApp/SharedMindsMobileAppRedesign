/**
 * ConnectionSuggestions — "you two keep working together — connect?"
 *
 * Surfaces pairs who've matched into each other's sessions 3+ times (see the
 * get_connection_suggestions RPC). Repeated co-sessions is the signal; shared
 * skills / work-types just sharpen the reason line. Each card reuses
 * ConnectButton for the full request/pending/accept lifecycle, plus a Dismiss
 * that persists so it won't re-nag.
 */

import { useCallback, useEffect, useState } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import {
  fetchConnectionSuggestions,
  dismissConnectionSuggestion,
  type ConnectionSuggestion,
} from '../../services/ConnectionService';
import { ConnectButton } from './ConnectButton';

/** "You've worked together 4 times · both into Design, Writing" */
export function suggestionReason(s: ConnectionSuggestion): string {
  const times = `You've worked together ${s.co_sessions} times`;
  const shared = [...(s.shared_skills ?? []), ...(s.shared_work_types ?? [])];
  if (shared.length === 0) return times;
  const top = shared.slice(0, 2).join(', ');
  return `${times} · both into ${top}`;
}

export function ConnectionSuggestionCard({
  suggestion,
  onDismiss,
}: {
  suggestion: ConnectionSuggestion;
  onDismiss: (otherUserId: string) => void;
}) {
  const [dismissing, setDismissing] = useState(false);
  const initial = (suggestion.display_name ?? '?').charAt(0).toUpperCase();

  async function handleDismiss() {
    if (dismissing) return;
    setDismissing(true);
    try {
      await dismissConnectionSuggestion(suggestion.other_user_id);
      onDismiss(suggestion.other_user_id);
    } catch {
      setDismissing(false);
    }
  }

  return (
    <div className="relative flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-50 to-blue-50 ring-1 ring-violet-200/60 px-3.5 py-3">
      {suggestion.avatar_url ? (
        <img src={suggestion.avatar_url} alt={suggestion.display_name ?? 'member'} className="w-11 h-11 rounded-full object-cover shrink-0 ring-1 ring-violet-200" />
      ) : (
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-400 to-blue-500 grid place-items-center text-white font-bold shrink-0">{initial}</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold stitch-text-primary leading-tight truncate">{suggestion.display_name ?? 'Someone'}</p>
        <p className="text-[11px] stitch-text-secondary leading-snug mt-0.5">{suggestionReason(suggestion)}</p>
      </div>
      <div className="shrink-0 flex items-center gap-1.5">
        <ConnectButton otherUserId={suggestion.other_user_id} />
        <button
          type="button"
          onClick={handleDismiss}
          disabled={dismissing}
          aria-label="Dismiss suggestion"
          className="w-7 h-7 rounded-full grid place-items-center stitch-text-secondary hover:bg-white/60 transition-colors disabled:opacity-50"
        >
          {dismissing ? <Loader2 size={12} className="animate-spin" /> : <X size={13} />}
        </button>
      </div>
    </div>
  );
}

/** Full list of co-session connect suggestions. Renders nothing when empty. */
export function ConnectionSuggestions({ heading = 'People you click with' }: { heading?: string }) {
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchConnectionSuggestions()
      .then((s) => { if (alive) setSuggestions(s); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.other_user_id !== id));
  }, []);

  if (loading || suggestions.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 px-0.5">
        <Sparkles size={13} className="text-violet-500" />
        <h3 className="text-xs font-extrabold tracking-wide uppercase stitch-text-secondary">{heading}</h3>
      </div>
      <div className="space-y-2">
        {suggestions.map((s) => (
          <ConnectionSuggestionCard key={s.other_user_id} suggestion={s} onDismiss={handleDismiss} />
        ))}
      </div>
    </section>
  );
}
