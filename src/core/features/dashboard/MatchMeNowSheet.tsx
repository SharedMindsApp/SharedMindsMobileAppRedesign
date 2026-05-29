/**
 * MatchMeNowSheet — the "Match me now" entry point.
 *
 * The old behaviour just opened the declare modal and made YOU available,
 * ignoring everyone who already had a door open — so it never actually
 * matched you to anyone. This sheet fixes the logic:
 *
 *   1. Show the people working RIGHT NOW with their door open → tap to
 *      drop straight into their session (instant match via claim_open_session).
 *   2. If nobody's open (or you'd rather host), "Open my own door" starts your
 *      own session that others can drop into.
 *
 * Realtime-subscribed so new open doors appear without a manual refresh.
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, DoorOpen, Users, MessageCircle, Volume2, Zap } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { fetchOpenSessions, claimOpenSession } from '../../services/SessionService';
import type { CommunitySession } from '../../../lib/sessions/focusTypes';
import { SESSION_INTENTS, intentMeta, type SessionIntent } from '../../../lib/sessionIntent';

function vibeMeta(vibe: string | null | undefined) {
  if (vibe === 'silent')  return { Icon: Volume2,       label: 'Silent',   bg: 'bg-slate-100',   text: 'text-slate-700'   };
  if (vibe === 'chatty')  return { Icon: Users,         label: 'Chatty',   bg: 'bg-amber-100',   text: 'text-amber-700'   };
  return                         { Icon: MessageCircle, label: 'Brief hi', bg: 'bg-emerald-100', text: 'text-emerald-700' };
}

export function MatchMeNowSheet({
  onOpenOwnDoor,
  onClose,
}: {
  /** Fired when the user chooses to host their own open-to-match session. */
  onOpenOwnDoor: () => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<CommunitySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Purpose filter — pairs same-with-same. 'all' shows every open door.
  const [purpose, setPurpose] = useState<SessionIntent | 'all'>('all');

  const visible = purpose === 'all'
    ? sessions
    : sessions.filter((s) => (s.session_intent ?? 'work') === purpose);

  const refresh = useCallback(async () => {
    try {
      const open = await fetchOpenSessions();
      setSessions(open);
    } catch (e) {
      console.warn('[MatchMeNowSheet] fetchOpenSessions failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // Realtime: re-fetch on any focus_sessions change (cheap, ≤12 rows).
  useEffect(() => {
    const channel = supabase
      .channel('match-me-now-open')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_sessions' }, () => void refresh())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refresh]);

  // ESC to close + lock body scroll while open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  async function handleDropIn(sessionId: string) {
    if (joining) return;
    setJoining(sessionId);
    setError(null);
    try {
      const claimed = await claimOpenSession(sessionId);
      if (!claimed) {
        setError('That one just filled up — try another, or open your own door.');
        await refresh();
        return;
      }
      onClose();
      navigate(`/session/${claimed.id}`);
    } catch (e: any) {
      setError(e?.message ?? 'Could not drop in. Try again.');
      await refresh();
    } finally {
      setJoining(null);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-surface shadow-2xl"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1"><span className="w-9 h-1 rounded-full bg-surface-container" /></div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-3 pb-3 sticky top-0 bg-surface z-10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
            <Zap size={15} className="text-white" strokeWidth={2.5} fill="currentColor" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-extrabold stitch-text-primary leading-tight">Match me now</h2>
            <p className="text-[11px] stitch-text-secondary">Drop into someone working now — or open your own door.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 w-8 h-8 rounded-full grid place-items-center stitch-text-secondary hover:bg-surface-container-low"><X size={16} /></button>
        </div>

        <div className="px-4 sm:px-5 pb-5 space-y-4">
          {error && (
            <p className="text-[11px] font-semibold text-rose-700 bg-rose-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Purpose filter — pair same-with-same. */}
          <div className="flex flex-wrap gap-1.5">
            <PurposeChip label="All" active={purpose === 'all'} onClick={() => setPurpose('all')} />
            {SESSION_INTENTS.map((m) => (
              <PurposeChip key={m.intent} label={`${m.emoji} ${m.label}`} active={purpose === m.intent} onClick={() => setPurpose(m.intent)} />
            ))}
          </div>

          {/* Live open doors */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
              </span>
              <p className="text-[10px] font-extrabold tracking-widest uppercase text-emerald-700">Open right now</p>
              {!loading && <span className="text-[10px] stitch-text-secondary">{visible.length} {visible.length === 1 ? 'door' : 'doors'}</span>}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin stitch-text-secondary" /></div>
            ) : visible.length === 0 ? (
              <p className="text-xs stitch-text-secondary italic px-1 py-2 leading-snug">
                {purpose === 'all'
                  ? "Nobody's open this second. Open your door below and you'll be the one others drop into."
                  : `No ${intentMeta(purpose).label.toLowerCase()} doors open right now. Open your own below — same-purpose folks will drop in.`}
              </p>
            ) : (
              <div className="space-y-2">
                {visible.map((o) => {
                  const initial = (o.display_name ?? '?').charAt(0).toUpperCase();
                  const startedMs = new Date(o.start_time).getTime();
                  const elapsedMin = Math.max(0, Math.round((Date.now() - startedMs) / 60000));
                  const totalMin = o.intended_duration_minutes ?? 50;
                  const remainMin = Math.max(0, totalMin - elapsedMin);
                  const vm = vibeMeta(o.vibe);
                  return (
                    <div key={o.id} className="relative rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 ring-1 ring-emerald-200/60 overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-500" />
                      <div className="flex items-center gap-3 pl-4 pr-3 py-3">
                        {o.avatar_url ? (
                          <img src={o.avatar_url} alt={o.display_name ?? 'host'} className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-emerald-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold shrink-0">{initial}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold stitch-text-primary leading-tight truncate">{o.display_name ?? 'Someone'} · {elapsedMin} min in</p>
                          {o.session_goal && (
                            <p className="text-[11px] stitch-text-secondary truncate italic">"{o.session_goal}"</p>
                          )}
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            {o.session_intent && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">
                                {intentMeta(o.session_intent).emoji} {intentMeta(o.session_intent).label}
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${vm.bg} ${vm.text}`}>
                              <vm.Icon size={9} />{vm.label}
                            </span>
                            <span className="text-[10px] stitch-text-secondary tabular-nums">{remainMin} min left</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDropIn(o.id)}
                          disabled={joining === o.id}
                          className="inline-flex items-center gap-1 text-[11px] font-extrabold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 px-3 py-1.5 rounded-lg shadow-sm transition-opacity disabled:opacity-60"
                        >
                          {joining === o.id ? <Loader2 size={11} className="animate-spin" /> : <DoorOpen size={11} />}
                          Drop in
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Open your own door — primary when there's no one to match with,
              demoted to a secondary action when matches are available so
              joining (the cheaper path: only one person hosts) wins. */}
          <section className="pt-1">
            {loading ? null : visible.length > 0 ? (
              <>
                <div className="flex items-center gap-2 my-1">
                  <span className="flex-1 h-px bg-surface-container" />
                  <span className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary">or</span>
                  <span className="flex-1 h-px bg-surface-container" />
                </div>
                <button
                  type="button"
                  onClick={onOpenOwnDoor}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl ring-1 ring-surface-container stitch-text-primary text-sm font-bold hover:bg-surface-container-low active:scale-[0.98] transition-all"
                >
                  <DoorOpen size={14} />
                  Open my own door instead
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onOpenOwnDoor}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 text-white text-sm font-bold shadow-md shadow-violet-500/25 active:scale-[0.98] transition-transform"
                >
                  <DoorOpen size={15} />
                  Open my own door
                </button>
                <p className="text-[10px] stitch-text-secondary/80 text-center mt-2 leading-snug">
                  Start a 1-on-1 with the door open — the next person looking to match drops straight in. Only one of you needs to start it.
                </p>
              </>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PurposeChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
        active ? 'stitch-btn--primary text-white' : 'bg-surface-container-low stitch-text-secondary hover:bg-surface-container'
      }`}
    >
      {label}
    </button>
  );
}
