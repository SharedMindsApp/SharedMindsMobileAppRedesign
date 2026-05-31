/**
 * HomeHero — full-bleed atmospheric header for the dashboard home screen.
 *
 * Inspired by FLOWN's "see the platform is alive" home philosophy:
 * the very first thing you see answers "who is focusing right now?"
 * and gives you a one-tap way to join them or start your own session.
 *
 * Design decisions:
 *  - Dark gradient (slate-900 → indigo-950 → violet-950) with blurred
 *    colour orbs for depth — no external images needed.
 *  - Live session list in a glass card updates via realtime subscription,
 *    so the count/names are always fresh without a page reload.
 *  - "Start a focus session" CTA is in the hero so the primary action is
 *    above the fold on every viewport.
 *  - Full-bleed: negative margins cancel the Layout's px-3/sm:px-4 padding
 *    so the gradient bleeds to the screen edges.
 *  - No load gate: firstName comes from the cached auth profile and
 *    liveSessions from the realtime hook — both are ready immediately.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, Zap, Loader2, Users, UserPlus, User, ArrowRight } from 'lucide-react';
import type { CommunitySession } from '../../../lib/sessions/focusTypes';
import { fetchOpenSessions, claimOpenSession, type ScheduledSessionWithProfile } from '../../services/SessionService';
import { supabase } from '../../../lib/supabase';
import { SessionTagPills } from '../sessions/SessionTagPills';

// ── Helpers ────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDuration(startIso: string): string {
  const mins = Math.floor((Date.now() - new Date(startIso).getTime()) / 60000);
  if (mins < 1) return 'just started';
  if (mins < 60) return `${mins}m in`;
  return `${Math.floor(mins / 60)}h in`;
}

const AVATAR_GRADS = [
  'from-violet-400 to-fuchsia-500',
  'from-cyan-400 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-indigo-400 to-purple-500',
];
function gradFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADS[Math.abs(h) % AVATAR_GRADS.length];
}

// ── Component ──────────────────────────────────────────────────────

export function HomeHero({
  firstName,
  liveSessions,
  onSchedule,
  onMatch,
  onFind,
  onViewAllLive,
  matchBusy = false,
  quickTimerSlot,
  nextUpcoming,
  joinableSession,
  onJoin,
  excludeSessionId,
}: {
  firstName: string;
  liveSessions: CommunitySession[];
  /** The viewer's own active session id, so their own open door isn't
   *  listed as something to drop into. */
  excludeSessionId?: string;
  /** Opens DeclareSessionModal — picks mode + time for a future session. */
  onSchedule: () => void;
  /** "Match me now" — instant 1-on-1 matchmaking. Caller handles the
   *  waiting room + navigation; the hero just owns the trigger. */
  onMatch: () => void;
  /** Browse the marketplace of joinable sessions. */
  onFind: () => void;
  /** Optional: view all live sessions. Defaults to onFind if omitted. */
  onViewAllLive?: () => void;
  /** Showing the match spinner state — disables the button + shows loader. */
  matchBusy?: boolean;
  /** Optional Quick Timer slot. Passed in by the parent so the hero
   *  doesn't have to know about activity state. Rendered as a footer
   *  strip inside the hero — replaces the previously-floating timer
   *  pill that lived awkwardly between the hero and the page body. */
  quickTimerSlot?: ReactNode;
  /** Next upcoming scheduled session — shown as a compact "Up next"
   *  pill in the hero header so the user knows what's coming without
   *  scrolling. The full countdown card below the hero still renders
   *  for richer detail / actions. */
  nextUpcoming?: ScheduledSessionWithProfile | null;
  /** Scheduled session whose start window is NOW (or within 5 min).
   *  When set, the hero replaces all the start-a-new-session CTAs +
   *  Quick Timer with a single focused "Join your session" button —
   *  the user shouldn't be encouraged to start something new when
   *  they're meant to be in something already. */
  joinableSession?: ScheduledSessionWithProfile | null;
  /** Called when the user clicks the "Join your session" CTA. Caller
   *  navigates / activates the session. */
  onJoin?: (session: ScheduledSessionWithProfile) => void;
}) {
  const navigate = useNavigate();

  // ── Open "drop-in" doors (open-to-match solo sessions) ──────────────
  // These are NOT in liveSessions (which excludes solo), so the hero fetches
  // them itself and folds them into the live list with a "Drop in" button —
  // a single live surface (replaces the old separate drop-in strip).
  const [openDoors, setOpenDoors] = useState<CommunitySession[]>([]);
  const [joining, setJoining] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      fetchOpenSessions()
        .then((d) => { if (alive) setOpenDoors(d.filter((s) => s.id !== excludeSessionId)); })
        .catch(() => {});
    };
    refresh();
    const channel = supabase
      .channel('home-hero-open-doors')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_sessions' }, refresh)
      .subscribe();
    const poll = window.setInterval(refresh, 15_000); // fallback if realtime lags
    return () => { alive = false; supabase.removeChannel(channel); window.clearInterval(poll); };
  }, [excludeSessionId]);

  async function handleDropIn(sessionId: string) {
    if (joining) return;
    setJoining(sessionId);
    try {
      const claimed = await claimOpenSession(sessionId);
      if (claimed) navigate(`/session/${claimed.id}`);
      else setOpenDoors((prev) => prev.filter((s) => s.id !== sessionId)); // slot gone
    } catch { /* swallow — stale card just disappears on next refresh */ }
    finally { setJoining(null); }
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Merge open doors (droppable) + live sessions (focusing), de-duped.
  const allLive: CommunitySession[] = [
    ...openDoors,
    ...liveSessions.filter((s) => !openDoors.some((d) => d.id === s.id)),
  ];
  // Show up to 3 in the panel; note the overflow count
  const visible = allLive.slice(0, 3);
  const overflow = allLive.length - visible.length;

  return (
    /* Negative margins cancel Layout's px-3 sm:px-4 md:px-6 lg:px-8 so
       the gradient bleeds edge-to-edge. The outer div clips the orbs. */
    <div className="-mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8 overflow-hidden">
      <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 px-4 sm:px-6 pt-5 pb-5">

        {/* Ambient colour orbs — pure CSS, no images */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-[-10%] left-[35%] w-72 h-72 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="absolute bottom-[-20%] right-[5%] w-56 h-56 rounded-full bg-indigo-500/15 blur-3xl" />
          <div className="absolute top-[40%] left-[-8%] w-44 h-44 rounded-full bg-fuchsia-600/10 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">

          {/* ── Greeting + Up Next pill ────────────────────────
              The pill sits to the right of the greeting on desktop
              (sm+) so "what's coming up?" is visible without scrolling.
              On mobile it stacks below the H1 — the H1 is the visual
              anchor and we don't want to squeeze it. */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between sm:gap-4 mb-4">
            <div>
              <p className="text-indigo-300/60 text-[11px] font-semibold tracking-wide mb-1 uppercase">
                {dateStr}
              </p>
              <h1 className="text-white text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                {greeting()}, {firstName} 👋
              </h1>
            </div>
            {nextUpcoming && (
              <UpNextPill session={nextUpcoming} onClick={() => navigate('/sessions')} />
            )}
          </div>

          {/* ── Live panel + CTA ───────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3">

            {/* Live now glass card — the header is click-through to the
                full sessions surface, and so is the "View all" footer
                when there's overflow. Individual peer rows stay
                independently clickable (Join button). */}
            <div className="flex-1 bg-white/[0.07] backdrop-blur-sm rounded-2xl border border-white/[0.12] px-4 py-3">

              {/* Header row — clickable when populated */}
              <button
                type="button"
                onClick={() => (onViewAllLive ?? onFind)()}
                className={`w-full flex items-center gap-2 mb-3 rounded-md transition-colors text-left ${
                  liveSessions.length > 0 ? 'hover:opacity-80' : ''
                }`}
              >
                {allLive.length > 0 ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                      {allLive.length} live now
                    </span>
                    <ArrowRight size={11} className="text-emerald-300/70 ml-auto" />
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-slate-500/70 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Room is open
                    </span>
                  </>
                )}
              </button>

              {/* Sessions list — capped at 3 (visible); rest live behind
                  the "View all" footer below. */}
              {visible.length > 0 ? (
                <div className="space-y-2.5">
                  {visible.map((s) => (
                    <div key={s.id} className="flex items-center gap-2.5">
                      {/* Avatar */}
                      {s.avatar_url ? (
                        <img
                          src={s.avatar_url}
                          alt=""
                          className="w-7 h-7 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradFor(s.display_name)} flex items-center justify-center text-white text-[11px] font-extrabold shrink-0`}
                        >
                          {s.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Goal + name + at-a-glance attribute pills */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-semibold truncate leading-tight">
                          {s.session_goal ?? 'Deep focus'}
                        </p>
                        <p className="text-white/50 text-[10px]">
                          {s.display_name} · {formatDuration(s.start_time)}
                        </p>
                        <div className="mt-1">
                          <SessionTagPills
                            size="sm"
                            // An open-to-match solo door becomes a 1-on-1 when
                            // claimed — show the type it'll be, not "Solo".
                            mode={s.open_to_match && s.session_mode === 'solo' ? 'one_on_one' : (s.session_mode ?? 'group')}
                            quietMode={!!s.quiet_mode}
                            bodyDouble={!!s.body_double}
                            partnerOpen={!!s.open_to_match}
                          />
                        </div>
                      </div>

                      {/* Drop in (open-to-match door) takes priority; else
                          Join (sessions with a join code). */}
                      {s.open_to_match ? (
                        <button
                          type="button"
                          onClick={() => void handleDropIn(s.id)}
                          disabled={joining === s.id}
                          className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 active:scale-95 px-2.5 py-1 rounded-lg transition-all disabled:opacity-60"
                        >
                          {joining === s.id ? <Loader2 size={11} className="animate-spin" /> : null}
                          Drop in
                        </button>
                      ) : s.join_code ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/join/${s.join_code}`)}
                          className="shrink-0 text-[10px] font-bold text-indigo-950 bg-white/90 hover:bg-white active:scale-95 px-2.5 py-1 rounded-lg transition-all"
                        >
                          Join
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/45 text-xs leading-snug">
                  No one's focusing yet today.<br />
                  Open the room and others will follow.
                </p>
              )}

              {/* Footer link — appears whenever there's at least one
                  live session. Shows "+X more focusing — view all" when
                  overflowed, or "View all sessions today" when 1-3 fit.
                  Replaces the old plain-text "+X more" line. */}
              {liveSessions.length > 0 && (
                <button
                  type="button"
                  onClick={() => (onViewAllLive ?? onFind)()}
                  className="mt-3 -mx-2 px-3 py-1.5 w-[calc(100%+1rem)] flex items-center justify-between gap-2 rounded-lg text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <span>
                    {overflow > 0
                      ? <>+{overflow} more focusing — view all</>
                      : <>View all sessions today</>}
                  </span>
                  <ArrowRight size={11} className="opacity-70" />
                </button>
              )}
            </div>

            {/* CTA column — branches based on whether the user is
                "meant to be in a session right now". If a scheduled
                session is in (or within 5 min of) its window, hide the
                normal start-a-new-session options and show a single
                focused Join CTA. Otherwise: the three normal start
                lanes (Match / Schedule / Find). */}
            {joinableSession ? (
              <div className="sm:w-[170px] flex flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onJoin?.(joinableSession)}
                  className="w-full flex sm:flex-col items-center justify-start sm:justify-center gap-2.5 sm:gap-2 bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold text-sm sm:text-[13px] py-3 sm:py-4 px-3 rounded-2xl hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/25 animate-pulse-slow"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Zap size={14} className="text-white" />
                  </div>
                  <span className="sm:text-center sm:leading-snug">Join your session</span>
                </button>
                <p className="text-[10px] text-white/60 leading-snug px-1 hidden sm:block">
                  {joinableSession.session_title ?? joinableSession.session_goal ?? 'Your scheduled session'}
                </p>
              </div>
            ) : (
            <div className="sm:w-[170px] flex flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={onMatch}
                disabled={matchBusy}
                className="w-full flex sm:flex-col items-center justify-start sm:justify-center gap-2.5 sm:gap-2 bg-gradient-to-br from-amber-400 to-rose-500 text-white font-bold text-sm sm:text-[13px] py-2.5 sm:py-3 px-3 rounded-2xl hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  {matchBusy ? <Loader2 size={14} className="text-white animate-spin" /> : <Zap size={14} className="text-white" />}
                </div>
                <span className="sm:text-center sm:leading-snug">Match me now</span>
              </button>
              <button
                type="button"
                onClick={onSchedule}
                className="w-full flex sm:flex-col items-center justify-start sm:justify-center gap-2.5 sm:gap-2 bg-white text-indigo-950 font-bold text-sm sm:text-[13px] py-2.5 sm:py-3 px-3 rounded-2xl hover:bg-white/90 active:scale-[0.98] transition-all shadow-lg"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <Calendar size={14} className="text-indigo-700" />
                </div>
                <span className="sm:text-center sm:leading-snug">Schedule a session</span>
              </button>
              <button
                type="button"
                onClick={onFind}
                className="w-full flex sm:flex-col items-center justify-start sm:justify-center gap-2.5 sm:gap-2 bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold text-sm sm:text-[13px] py-2.5 sm:py-3 px-3 rounded-2xl hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/20"
              >
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Search size={14} className="text-white" />
                </div>
                <span className="sm:text-center sm:leading-snug">Find a session</span>
              </button>
            </div>
            )}
          </div>

          {/* ── Quick Timer strip ───────────────────────────────
              Hidden when there's a joinable session — the user
              shouldn't be offered "one-tap timer" when they're meant
              to be in a scheduled session that's already started. */}
          {quickTimerSlot && !joinableSession && (
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 px-3 py-3 rounded-xl bg-white/[0.14] ring-1 ring-white/25 backdrop-blur-md shadow-inner shadow-black/10">
              <p className="text-[11px] text-white/80 leading-snug">
                Already know what you want? <span className="text-white font-semibold">One-tap timer →</span>
              </p>
              <div className="shrink-0 self-start sm:self-auto">
                {quickTimerSlot}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Up Next pill ──────────────────────────────────────────────────
//
// Compact glass pill showing the soonest upcoming scheduled session.
// Ticks every 30s — we only display "in 3h 40m" / "in 12m" / "starts
// at 19:00" granularity, so a second-by-second tick would burn CPU
// for no visible benefit. The full `UpcomingSessionCountdown` card
// below the hero still ticks every second when it's < 1h away.

const MODE_ICON_PILL = { solo: User, one_on_one: UserPlus, group: Users } as const;

function UpNextPill({
  session,
  onClick,
}: {
  session: ScheduledSessionWithProfile;
  onClick: () => void;
}) {
  const startMs = new Date(session.scheduled_at ?? session.start_time).getTime();
  const [now, setNow] = useState(() => Date.now());

  // Always tick at 1s — the pill displays seconds in both M:SS and
  // H:MM:SS modes, so a coarser interval would make the seconds digit
  // jump in chunks (which looks broken, not lazy). One setInterval per
  // second on the home page is cheap; React's batching collapses any
  // simultaneous updates anyway.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const diffMs = startMs - now;

  // Big-number countdown — H:MM:SS when far out, M:SS when under an
  // hour, with a separate qualitative label ("Starting now" / "soon")
  // for edge states. The big number is the visual hero of the pill so
  // the user actually feels time advancing.
  let bigTime: string;        // the headline countdown
  let smallLabel: string;     // contextual label above the number
  let tone: 'idle' | 'soon' | 'live';

  if (diffMs <= 0 && diffMs > -10 * 60_000) {
    bigTime = 'now';
    smallLabel = 'Starting';
    tone = 'live';
  } else if (diffMs <= 0) {
    return null;
  } else if (diffMs < 60 * 60_000) {
    // < 1h: full M:SS ticking down every second.
    const totalSecs = Math.floor(diffMs / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    bigTime = `${m}:${String(s).padStart(2, '0')}`;
    smallLabel = 'Up next in';
    tone = diffMs < 15 * 60_000 ? 'soon' : 'idle';
  } else if (diffMs < 24 * 60 * 60_000) {
    // ≥ 1h: H:MM:SS so the seconds are still visibly counting.
    const totalSecs = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    bigTime = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    smallLabel = 'Up next in';
    tone = 'idle';
  } else {
    bigTime = new Date(startMs).toLocaleDateString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    smallLabel = 'Up next';
    tone = 'idle';
  }

  const mode = (session.session_mode ?? 'solo') as keyof typeof MODE_ICON_PILL;
  const ModeIcon = MODE_ICON_PILL[mode] ?? User;
  const title = session.session_title ?? session.session_goal ?? 'Session';

  const toneClasses =
    tone === 'live'
      ? 'bg-emerald-500/25 ring-emerald-400/40 text-emerald-100'
      : tone === 'soon'
      ? 'bg-amber-500/20 ring-amber-400/40 text-amber-100'
      : 'bg-white/10 ring-white/15 text-white/85';

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Next: ${title}`}
      className={`inline-flex items-center gap-3 max-w-full sm:max-w-[480px] mt-2 sm:mt-0 px-3.5 py-2.5 rounded-xl backdrop-blur-sm ring-1 hover:bg-white/15 active:scale-[0.98] transition-all text-left ${toneClasses}`}
    >
      {/* Countdown — the visual hero. tabular-nums so the digits don't
          shift width as the seconds tick (otherwise the whole pill
          would jitter once a second). Size scales up on mobile where
          the pill is full-width and has the room to breathe. */}
      <div className="flex flex-col items-start leading-none shrink-0">
        <span className="text-[9px] font-extrabold uppercase tracking-widest opacity-65 whitespace-nowrap">
          {smallLabel}
        </span>
        <span className="text-3xl sm:text-2xl font-extrabold tabular-nums mt-1 tracking-tight">
          {bigTime}
        </span>
      </div>
      {/* Vertical divider */}
      <span className="h-10 w-px bg-current opacity-20 shrink-0" />
      {/* Session details */}
      <div className="flex flex-col leading-tight min-w-0">
        <span className="text-[9px] font-extrabold uppercase tracking-widest opacity-60 flex items-center gap-1">
          <ModeIcon size={9} className="opacity-80" />
          {mode === 'one_on_one' ? '1-on-1' : mode === 'group' ? 'Group' : 'Solo'}
        </span>
        <span className="text-sm sm:text-sm font-bold truncate mt-0.5">
          {title}
        </span>
      </div>
    </button>
  );
}
