/**
 * LiveNowDropInStrip — a passive discovery surface for open-to-match
 * sessions, shown on the home page.
 *
 * The Drop-in lane that lives inside FindSessionsSheet requires user
 * intent (open the sheet). This strip surfaces the same data on the
 * most-visited page so users *passively* notice when someone's working
 * with the door open. Same claim flow + race-safety as the sheet.
 *
 * Hides itself entirely when there are no open sessions — empty state
 * is "don't render," not "show a placeholder." The home page is busy
 * enough without an "Open doors: 0" pill taking up vertical space.
 *
 * Realtime: subscribes to focus_sessions UPDATE/INSERT events so the
 * strip updates as sessions open + close + get claimed. Same channel
 * pattern as useCommunitySessionsSubscription.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoorOpen, MessageCircle, Volume2, Users, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { fetchOpenSessions, claimOpenSession } from '../../services/SessionService';
import type { CommunitySession } from '../../../lib/sessions/focusTypes';

interface Props {
  /** ID of the session the user is currently in (if any). Hide their
   *  own open session from the strip — they'd be confused to see it. */
  excludeSessionId?: string | null;
  /** Hide the strip entirely when a user is already in an active
   *  session OR has a joinable scheduled session in-window. Avoids
   *  competing with the existing "Rejoin" / "Join your session" CTAs. */
  hidden?: boolean;
}

export function LiveNowDropInStrip({ excludeSessionId, hidden }: Props) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<CommunitySession[]>([]);
  const [joining, setJoining] = useState<string | null>(null);
  const [, setError] = useState<string | null>(null);

  // Single refresh fn — used on mount + on every realtime tick. Keeps
  // the subscription handler trivial.
  const refresh = useCallback(async () => {
    try {
      const open = await fetchOpenSessions();
      setSessions(open);
    } catch (e) {
      console.warn('[LiveNowDropInStrip] fetchOpenSessions failed:', e);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: watch any change to focus_sessions rows that *might*
  // affect the open-to-match set. The handler doesn't try to diff —
  // it just re-fetches. The query is cheap (~12 rows max) and this
  // pattern is far more reliable than maintaining a local mirror.
  useEffect(() => {
    const channel = supabase
      .channel('home-live-now-drop-in')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'focus_sessions',
      }, refresh)
      .subscribe();
    // Poll fallback (~15s) so a freshly-opened door still appears without a
    // manual refresh even if realtime delivery lags. Query is cheap (≤12 rows).
    const poll = window.setInterval(refresh, 15_000);
    return () => { supabase.removeChannel(channel); window.clearInterval(poll); };
  }, [refresh]);

  async function handleDropIn(sessionId: string) {
    if (joining) return;
    setJoining(sessionId);
    setError(null);
    try {
      const claimed = await claimOpenSession(sessionId);
      if (!claimed) {
        // Slot gone — refresh + soft error (we'll just refresh; the
        // stale card disappearing IS the feedback).
        await refresh();
        return;
      }
      navigate(`/session/${claimed.id}`, { state: { session: claimed } });
    } catch (e: any) {
      console.warn('[LiveNowDropInStrip] claim failed:', e);
      await refresh();
    } finally {
      setJoining(null);
    }
  }

  // Filter out the user's own session if they happen to be hosting one
  // that's still showing here briefly.
  const visible = sessions.filter((s) => s.id !== excludeSessionId);

  if (hidden || visible.length === 0) return null;

  return (
    <section aria-label="Sessions you can drop into" className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
        </span>
        <p className="text-[10px] font-extrabold tracking-widest uppercase text-emerald-700">
          Drop in · live now
        </p>
        <span className="text-[10px] stitch-text-secondary">
          {visible.length} {visible.length === 1 ? 'door is' : 'doors are'} open
        </span>
      </div>

      {/* Horizontal scroll on mobile, wraps to a grid on desktop. The
          mobile scroll lets us show 5+ live sessions without burning
          200px of vertical space; the desktop grid uses the wider
          surface. */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((o) => (
          <DropInCard
            key={o.id}
            session={o}
            busy={joining === o.id}
            onJoin={() => handleDropIn(o.id)}
          />
        ))}
      </div>
    </section>
  );
}

// ── Card ────────────────────────────────────────────────────────────

function DropInCard({
  session, busy, onJoin,
}: {
  session: CommunitySession;
  busy: boolean;
  onJoin: () => void;
}) {
  const initial = (session.display_name ?? '?').charAt(0).toUpperCase();
  const startedMs = new Date(session.start_time).getTime();
  const elapsedMin = Math.max(0, Math.round((Date.now() - startedMs) / 60000));
  const totalMin   = session.intended_duration_minutes ?? 50;
  const remainMin  = Math.max(0, totalMin - elapsedMin);

  const vibe = session.vibe ?? 'brief_hi';
  const vibeMeta = vibe === 'silent'
    ? { Icon: Volume2,       label: 'Silent' }
    : vibe === 'chatty'
      ? { Icon: Users,         label: 'Chatty' }
      : { Icon: MessageCircle, label: 'Brief hi' };

  return (
    <div className="shrink-0 w-[260px] sm:w-auto relative rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 ring-1 ring-emerald-200/60 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-500" />
      <div className="pl-4 pr-3 py-3 flex flex-col gap-2 h-full">
        {/* Top row — avatar + name + elapsed */}
        <div className="flex items-center gap-2.5">
          {session.avatar_url ? (
            <img
              src={session.avatar_url}
              alt={session.display_name ?? 'host'}
              className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-emerald-200"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold stitch-text-primary leading-tight truncate">
              {session.display_name ?? 'Someone'}
            </p>
            <p className="text-[10px] stitch-text-secondary tabular-nums">
              {elapsedMin} min in · {remainMin} min left
            </p>
          </div>
        </div>

        {/* Goal — italicised, single line, only when present */}
        {session.session_goal && (
          <p className="text-[11px] stitch-text-secondary italic leading-snug line-clamp-2">
            "{session.session_goal}"
          </p>
        )}

        {/* Bottom row — vibe pill + drop-in CTA */}
        <div className="flex items-center justify-between gap-2 mt-auto">
          <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white text-emerald-700 ring-1 ring-emerald-100">
            <vibeMeta.Icon size={9} />
            {vibeMeta.label}
          </span>
          <button
            type="button"
            onClick={onJoin}
            disabled={busy}
            className="inline-flex items-center gap-1 text-[11px] font-extrabold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 px-3 py-1.5 rounded-lg shadow-sm transition-opacity disabled:opacity-60"
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : <DoorOpen size={11} />}
            Drop in
          </button>
        </div>
      </div>
    </div>
  );
}
