/**
 * MatchMeNowSheet — the "Match me now" entry point.
 *
 * Purpose-first: the first decision is WHAT you're here to do (deep work,
 * plan, connect, meditate). That single choice is the spine of the sheet:
 *
 *   1. Pick a purpose → we show the people working on the SAME purpose with
 *      their door open, so you pair same-with-same (tap to drop straight in
 *      via claim_open_session).
 *   2. The purpose also seeds the door YOU open — "Open a Plan door" carries
 *      that purpose into the session, instead of the old disconnected filter.
 *
 * Realtime-subscribed so new open doors appear without a manual refresh.
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, DoorOpen, Users, MessageCircle, Volume2, Zap, Check, Video, Mic, Lock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { fetchOpenSessions, claimOpenSession, skipMatchDoors, fetchActiveMatchSkipCount, getVideoAllowance, startCommunitySession } from '../../services/SessionService';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import type { CommunitySession } from '../../../lib/sessions/focusTypes';
import { SESSION_INTENTS, intentMeta, DURATIONS_BY_INTENT, fmtDuration, type SessionIntent } from '../../../lib/sessionIntent';

/** Purpose → room social vibe. Meditate is silent (sit together, no talk);
 *  chat is chatty (being social is the point); work/plan get the balanced
 *  default. Mirrors the logic that used to live in DeclareSessionModal. */
function vibeForIntent(intent: SessionIntent): 'silent' | 'brief_hi' | 'chatty' {
  if (intent === 'meditate') return 'silent';
  if (intent === 'connect') return 'chatty';
  return 'brief_hi';
}

function vibeMeta(vibe: string | null | undefined) {
  if (vibe === 'silent')  return { Icon: Volume2,       label: 'Silent',   bg: 'bg-slate-100',   text: 'text-slate-700'   };
  if (vibe === 'chatty')  return { Icon: Users,         label: 'Chatty',   bg: 'bg-amber-100',   text: 'text-amber-700'   };
  return                         { Icon: MessageCircle, label: 'Brief hi', bg: 'bg-emerald-100', text: 'text-emerald-700' };
}

export function MatchMeNowSheet({
  onClose,
}: {
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { setActiveSession } = useFocusSession();
  const [opening, setOpening] = useState(false);
  const [sessions, setSessions] = useState<CommunitySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Purpose is the spine — nothing is shown until you pick what you're here
  // for. Pairs you same-with-same and seeds the door you open.
  const [purpose, setPurpose] = useState<SessionIntent | null>(null);
  // When someone's already waiting and you tap "open my own door", we nudge
  // once: join them, or start your own (which honours the pass — see below).
  const [confirmOwnDoor, setConfirmOwnDoor] = useState(false);
  // How many people the user recently passed on (hidden from the lists for a
  // cooldown) — shown as a footnote so a thinned-out sheet doesn't read as dead.
  const [skippedCount, setSkippedCount] = useState(0);
  // Video vs audio-only for the door YOU open. Free tier gets a weekly video
  // allowance; once spent, the toggle locks to audio-only (with an upgrade nudge).
  const [audioOnly, setAudioOnly] = useState(false);
  const [videoBlocked, setVideoBlocked] = useState(false);
  const [videoRemaining, setVideoRemaining] = useState<number | null>(null);
  // Paid users unlock the longer per-purpose lengths (deep work 90, chat 50).
  const [isPaid, setIsPaid] = useState(false);
  // Session length — purpose-derived. Defaults to the first option for the
  // chosen purpose (always the free length).
  const [durationMin, setDurationMin] = useState<number>(DURATIONS_BY_INTENT.plan[0].value);

  const visible = purpose
    ? sessions.filter((s) => (s.session_intent ?? 'work') === purpose)
    : [];

  // Video allowance — once spent, lock the toggle to audio-only. The tier also
  // gates which session lengths are available.
  useEffect(() => {
    let alive = true;
    getVideoAllowance()
      .then((a) => {
        if (!alive) return;
        setIsPaid(a.tier === 'paid');
        setVideoRemaining(Number.isFinite(a.remaining) ? a.remaining : null);
        if (a.blocked) { setVideoBlocked(true); setAudioOnly(true); }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // When the purpose changes, snap the duration to that purpose's free default
  // so a 25-min purpose can never carry a deep-work length (and vice versa).
  useEffect(() => {
    if (!purpose) return;
    setDurationMin(DURATIONS_BY_INTENT[purpose][0].value);
  }, [purpose]);

  const durationOptions = purpose ? DURATIONS_BY_INTENT[purpose] : [];

  const refresh = useCallback(async () => {
    try {
      const [open, skipped] = await Promise.all([
        fetchOpenSessions(),
        fetchActiveMatchSkipCount().catch(() => 0),
      ]);
      setSessions(open);
      setSkippedCount(skipped);
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

  // Open your own door directly — no second screen. We have everything we need
  // here (purpose, camera mode, length); the goal is collected in-session once
  // someone drops in (the door starts goal-less by design).
  async function handleOpenDoor() {
    if (!purpose || opening) return;
    setOpening(true);
    setError(null);
    try {
      const session = await startCommunitySession({
        goalText: '',
        durationMinutes: durationMin as 25 | 50 | 90,
        sessionMode: 'solo',
        quietMode: false,
        audioOnly,
        bodyDouble: false,
        isOffline: false,
        openToMatch: true,
        vibe: vibeForIntent(purpose),
        sessionIntent: purpose,
        sessionKind: intentMeta(purpose).kind,
      });
      setActiveSession(session);
      onClose();
      navigate(`/session/${session.id}`, { state: { session } });
    } catch (e: any) {
      setError(e?.message ?? 'Could not open the door. Try again.');
      setOpening(false);
    }
  }

  // Honour "start my own anyway": pass on everyone currently waiting for this
  // purpose (bidirectional cooldown), then open the user's own door.
  async function handleStartOwnAnyway() {
    if (!purpose) return;
    await skipMatchDoors(visible.map((v) => v.user_id));
    await handleOpenDoor();
  }

  // How many doors match each purpose — shown as a live count on each card so
  // people gravitate to where the activity is.
  function countFor(intent: SessionIntent) {
    return sessions.filter((s) => (s.session_intent ?? 'work') === intent).length;
  }

  const selectedMeta = purpose ? intentMeta(purpose) : null;

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
            <p className="text-[11px] stitch-text-secondary">Pick what you're here for — we'll pair you up.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 w-8 h-8 rounded-full grid place-items-center stitch-text-secondary hover:bg-surface-container-low"><X size={16} /></button>
        </div>

        <div className="px-4 sm:px-5 pb-5 space-y-4">
          {error && (
            <p className="text-[11px] font-semibold text-rose-700 bg-rose-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Mode — video vs audio-only, with the weekly video allowance.
              Always visible: it's the first decision and applies to whatever
              door you open. */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-extrabold tracking-widest uppercase stitch-text-secondary">Camera</p>
              {videoBlocked ? (
                <span className="text-[10px] font-semibold text-amber-700">Out of video this week</span>
              ) : videoRemaining != null ? (
                <span className="text-[10px] stitch-text-secondary">{videoRemaining} video {videoRemaining === 1 ? 'session' : 'sessions'} left</span>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container">
              <button
                type="button"
                onClick={() => { if (!videoBlocked) setAudioOnly(false); }}
                disabled={videoBlocked}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  !audioOnly ? 'bg-surface shadow-sm stitch-text-primary' : 'stitch-text-secondary hover:stitch-text-primary'
                } ${videoBlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Video size={13} /> Video
              </button>
              <button
                type="button"
                onClick={() => setAudioOnly(true)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  audioOnly ? 'bg-surface shadow-sm stitch-text-primary' : 'stitch-text-secondary hover:stitch-text-primary'
                }`}
              >
                <Mic size={13} /> Audio only
              </button>
            </div>
            {videoBlocked ? (
              <p className="text-[10px] text-amber-700 mt-1.5 px-0.5 leading-snug">
                You've used your free video sessions this week — audio-only until they reset.{' '}
                <button type="button" onClick={() => { onClose(); navigate('/upgrade'); }} className="underline font-semibold">Upgrade for unlimited video →</button>
              </p>
            ) : (
              <p className="text-[10px] stitch-text-secondary/80 mt-1.5 px-0.5">Audio-only is always free and matches faster.</p>
            )}
          </section>

          {/* Step 1 — purpose. The hero decision. */}
          <section>
            <p className="text-[10px] font-extrabold tracking-widest uppercase stitch-text-secondary mb-2">What do you want to do?</p>
            <div className="grid grid-cols-2 gap-2">
              {SESSION_INTENTS.map((m) => {
                const active = purpose === m.intent;
                const live = countFor(m.intent);
                return (
                  <button
                    key={m.intent}
                    type="button"
                    onClick={() => { setConfirmOwnDoor(false); setPurpose(active ? null : m.intent); }}
                    className={`relative text-left rounded-2xl p-3 ring-1 transition-all active:scale-[0.98] ${
                      active
                        ? 'ring-violet-400 bg-gradient-to-br from-violet-50 to-blue-50 shadow-sm'
                        : 'ring-surface-container bg-surface-container-low hover:ring-surface-container-high'
                    }`}
                  >
                    {active && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-violet-600 grid place-items-center">
                        <Check size={11} className="text-white" strokeWidth={3} />
                      </span>
                    )}
                    <div className="text-xl leading-none mb-1.5">{m.emoji}</div>
                    <p className="text-sm font-bold stitch-text-primary leading-tight">{m.label}</p>
                    <p className="text-[10px] stitch-text-secondary leading-snug mt-0.5">{m.hint}</p>
                    {live > 0 && (
                      <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700">
                        <span className="relative flex w-1.5 h-1.5">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
                          <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        </span>
                        {live} waiting
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {skippedCount > 0 && (
              <p className="text-[10px] stitch-text-secondary/70 mt-2 px-1">
                {skippedCount} {skippedCount === 1 ? 'person you' : 'people you'} recently passed on {skippedCount === 1 ? 'is' : 'are'} hidden for a bit.
              </p>
            )}
          </section>

          {/* Step 2 — appears once a purpose is chosen: who's open for it + the
              CTA to open your own door of that purpose. */}
          {!purpose ? (
            <p className="text-xs stitch-text-secondary italic leading-snug px-1">
              {loading
                ? 'Looking for who\'s around…'
                : sessions.length > 0
                  ? `${sessions.length} ${sessions.length === 1 ? 'person is' : 'people are'} working right now. Pick a purpose to see who's a match.`
                  : 'Pick a purpose and you\'ll be the first door open — the next person looking to match drops straight in.'}
            </p>
          ) : (
            <>
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
                    <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                  </span>
                  <p className="text-[10px] font-extrabold tracking-widest uppercase text-emerald-700">{selectedMeta!.label} · open now</p>
                  {!loading && <span className="text-[10px] stitch-text-secondary">{visible.length} {visible.length === 1 ? 'door' : 'doors'}</span>}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-6"><Loader2 size={20} className="animate-spin stitch-text-secondary" /></div>
                ) : visible.length === 0 ? (
                  <p className="text-xs stitch-text-secondary italic px-1 py-1 leading-snug">
                    No {selectedMeta!.label.toLowerCase()} doors open right now — open yours below and same-purpose folks drop in.
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

              {/* Length — purpose-derived, tier-gated. Deep work: 50 free /
                  1h30 paid; Chat: 25 free / 50 paid; others fixed-short (no
                  2-hour meditations). Only affects the door YOU open. */}
              <section className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-extrabold tracking-widest uppercase stitch-text-secondary">Length</p>
                {durationOptions.length > 1 ? (
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container">
                    {durationOptions.map((d) => {
                      const locked = !!d.paid && !isPaid;
                      const active = durationMin === d.value;
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => { if (locked) { onClose(); navigate('/upgrade'); } else setDurationMin(d.value); }}
                          title={locked ? 'Upgrade to unlock longer sessions' : undefined}
                          className={`inline-flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            active ? 'bg-surface shadow-sm stitch-text-primary'
                            : locked ? 'stitch-text-secondary/60 hover:stitch-text-secondary'
                            : 'stitch-text-secondary hover:stitch-text-primary'
                          }`}
                        >
                          {locked && <Lock size={10} />}
                          {fmtDuration(d.value)}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-surface-container text-xs font-bold stitch-text-primary">
                    {fmtDuration(durationMin)}
                  </span>
                )}
              </section>

              {/* Open your own door — primary when no one's open for this
                  purpose, demoted under an "or" when matches exist. Tapping it
                  while someone's waiting raises a one-time nudge to join first;
                  starting your own anyway honours the pass (mutual cooldown). */}
              <section className="pt-1">
                {confirmOwnDoor && visible.length > 0 ? (
                  <div className="rounded-2xl ring-1 ring-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-bold stitch-text-primary leading-snug">
                      {visible.length === 1
                        ? `${visible[0].display_name ?? 'Someone'} is already waiting for ${selectedMeta!.label.toLowerCase()}.`
                        : `${visible.length} people are already waiting for ${selectedMeta!.label.toLowerCase()}.`}
                    </p>
                    <p className="text-[11px] stitch-text-secondary leading-snug mt-0.5">
                      Joining them is quicker than spinning up a second door. Start your own and you won't be matched with {visible.length === 1 ? 'them' : 'them'} for a while.
                    </p>
                    <div className="flex gap-2 mt-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmOwnDoor(false);
                          if (visible.length === 1) void handleDropIn(visible[0].id);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[13px] font-bold active:scale-[0.98] transition-transform"
                      >
                        <DoorOpen size={13} />
                        {visible.length === 1 ? `Join ${visible[0].display_name ?? 'them'}` : 'See who\'s waiting'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleStartOwnAnyway()}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg ring-1 ring-amber-300 stitch-text-primary text-[13px] font-bold hover:bg-amber-100 active:scale-[0.98] transition-all"
                      >
                        Start my own
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {!loading && visible.length > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="flex-1 h-px bg-surface-container" />
                        <span className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary">or</span>
                        <span className="flex-1 h-px bg-surface-container" />
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={opening}
                      onClick={() => {
                        if (!loading && visible.length > 0) setConfirmOwnDoor(true);
                        else void handleOpenDoor();
                      }}
                      className={
                        (!loading && visible.length > 0
                          ? 'w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl ring-1 ring-surface-container stitch-text-primary text-sm font-bold hover:bg-surface-container-low active:scale-[0.98] transition-all'
                          : 'w-full inline-flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 text-white text-sm font-bold shadow-md shadow-violet-500/25 active:scale-[0.98] transition-transform')
                        + (opening ? ' opacity-70 cursor-wait' : '')
                      }
                    >
                      {opening ? <Loader2 size={15} className="animate-spin" /> : <DoorOpen size={15} />}
                      {opening ? 'Opening…' : `Open a ${selectedMeta!.label.toLowerCase()} door · ${fmtDuration(durationMin)}`}
                    </button>
                    {(loading || visible.length === 0) && (
                      <p className="text-[10px] stitch-text-secondary/80 text-center mt-2 leading-snug">
                        Start a 1-on-1 with the door open — the next person looking to match drops straight in. Only one of you needs to start it.
                      </p>
                    )}
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
