/**
 * Focusmate-style 3-day calendar view.
 *
 * Replaces the old list-style SessionsPage. Shows:
 *   - Active community sessions (positioned by start_time)
 *   - Upcoming scheduled sessions (positioned by scheduled_at)
 *   - Click empty slot → DeclareSessionModal prefilled with that time (creates scheduled session)
 *   - Click filled cell → SessionDetailSheet
 *
 * Solo sessions are NOT shown on the grid (always private). The sidebar has a
 * separate "Solo session" button that opens the modal with forceSoloMode=true.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, ChevronLeft, ChevronRight, Calendar as CalIcon,
  Users, UserPlus, User, MicOff, Loader2, X, Clock, StopCircle, Plus,
} from 'lucide-react';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { useAuth } from '../../auth/AuthProvider';
import { DeclareSessionModal } from './DeclareSessionModal';
import { useCommunitySessionsSubscription } from './useCommunitySessionsSubscription';
import {
  fetchUpcomingScheduledSessions,
  joinOneOnOneSession,
  type ScheduledSessionWithProfile,
} from '../../services/SessionService';
import type { CommunitySession } from '../../../lib/sessions/focusTypes';

// ── Grid constants ──────────────────────────────────────────────

const START_HOUR = 6;          // 6am
const END_HOUR = 23;           // 11pm
const SLOT_MINUTES = 30;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * SLOTS_PER_HOUR;
const SLOT_PX = 30;            // height of one 30-min row
const HOUR_PX = SLOT_PX * SLOTS_PER_HOUR;

const DAY_COUNT_DESKTOP = 3;
const DAY_COUNT_MOBILE = 1;

// ── Helpers ─────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function minutesFromStart(d: Date): number {
  const h = d.getHours();
  const m = d.getMinutes();
  return (h - START_HOUR) * 60 + m;
}

function snapToSlot(d: Date): Date {
  const snapped = new Date(d);
  const m = snapped.getMinutes();
  snapped.setMinutes(m - (m % SLOT_MINUTES), 0, 0);
  return snapped;
}

function avatarHashClass(name: string): string {
  const colors = [
    'from-violet-400 to-fuchsia-500',
    'from-cyan-400 to-blue-500',
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
    'from-rose-400 to-pink-500',
    'from-indigo-400 to-purple-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ── Unified session row (active OR scheduled) ───────────────────

type GridSession = {
  id: string;
  user_id: string;
  partner_user_id?: string | null;
  display_name: string;
  avatar_url?: string | null;
  session_goal?: string | null;
  session_title?: string | null;
  session_mode: 'group' | 'one_on_one' | 'solo';
  quiet_mode: boolean;
  intended_duration_minutes: number;
  startsAt: Date;
  status: 'active' | 'scheduled';
};

function toGridSession(s: CommunitySession): GridSession {
  return {
    id: s.id,
    user_id: s.user_id,
    partner_user_id: s.partner_user_id ?? null,
    display_name: s.display_name,
    avatar_url: s.avatar_url ?? null,
    session_goal: s.session_goal,
    session_mode: (s.session_mode as any) ?? 'group',
    quiet_mode: !!s.quiet_mode,
    intended_duration_minutes: s.intended_duration_minutes ?? 50,
    startsAt: new Date(s.start_time),
    status: 'active',
  };
}

function toGridScheduled(s: ScheduledSessionWithProfile): GridSession {
  return {
    id: s.id,
    user_id: s.user_id,
    partner_user_id: (s as any).partner_user_id ?? null,
    display_name: s.display_name,
    avatar_url: s.avatar_url ?? null,
    session_goal: s.session_goal,
    session_title: s.session_title,
    session_mode: ((s as any).session_mode as any) ?? 'group',
    quiet_mode: !!(s as any).quiet_mode,
    intended_duration_minutes: s.intended_duration_minutes ?? 50,
    startsAt: new Date(s.scheduled_at ?? s.start_time),
    status: 'scheduled',
  };
}

// ── Main view ───────────────────────────────────────────────────

export function CalendarView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeSession, sessionGoal, timerSecondsRemaining } = useFocusSession();

  const { sessions: active } = useCommunitySessionsSubscription();
  const [scheduled, setScheduled] = useState<ScheduledSessionWithProfile[]>([]);
  const [dayCount, setDayCount] = useState<number>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? DAY_COUNT_MOBILE : DAY_COUNT_DESKTOP
  );
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [modalState, setModalState] = useState<
    | { kind: 'closed' }
    | { kind: 'free' }
    | { kind: 'solo' }
    | { kind: 'schedule'; at: Date }
  >({ kind: 'closed' });
  const [detail, setDetail] = useState<GridSession | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());

  // tick "now" every minute for the red current-time line
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // responsive day count
  useEffect(() => {
    const handler = () => setDayCount(window.innerWidth < 768 ? DAY_COUNT_MOBILE : DAY_COUNT_DESKTOP);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // load scheduled
  useEffect(() => {
    fetchUpcomingScheduledSessions().then(setScheduled).catch(() => {});
  }, [modalState.kind]);

  // visible day window
  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => addDays(anchor, i)),
    [anchor, dayCount]
  );

  // sessions for the visible window
  const sessionsByDay = useMemo(() => {
    const all: GridSession[] = [
      ...active.filter((s) => s.session_mode !== 'solo').map(toGridSession),
      ...scheduled.filter((s) => (s as any).session_mode !== 'solo').map(toGridScheduled),
    ];
    return days.map((day) => all.filter((s) => sameDay(s.startsAt, day)));
  }, [active, scheduled, days]);

  // auto-scroll grid to current hour on mount
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!scrollRef.current) return;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = START_HOUR * 60;
    if (nowMinutes < startMinutes) return;
    const top = ((nowMinutes - startMinutes) / 60) * HOUR_PX - HOUR_PX;
    scrollRef.current.scrollTop = Math.max(0, top);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function nudgeAnchor(deltaDays: number) {
    setAnchor((prev) => addDays(prev, deltaDays));
  }

  function goToToday() {
    setAnchor(startOfDay(new Date()));
  }

  function handleSlotClick(day: Date, slotIndex: number) {
    const at = new Date(day);
    at.setHours(START_HOUR, 0, 0, 0);
    at.setMinutes(slotIndex * SLOT_MINUTES);
    // Past slots → ignore (or could start now). For simplicity: refuse past.
    if (at.getTime() < Date.now() - 60_000) return;
    setModalState({ kind: 'schedule', at: snapToSlot(at) });
  }

  function handleSessionClick(s: GridSession, e: React.MouseEvent) {
    e.stopPropagation();
    setDetail(s);
  }

  // Header label: month range
  const headerLabel = useMemo(() => {
    const last = days[days.length - 1];
    if (anchor.getMonth() === last.getMonth()) {
      return anchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    }
    return `${anchor.toLocaleDateString('en-GB', { month: 'short' })} – ${last.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
  }, [anchor, days]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 min-h-[600px]">

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className="w-full lg:w-72 shrink-0 space-y-3">
        {/* Active session rejoin banner */}
        {activeSession && (
          <ActiveSessionBanner
            goal={sessionGoal}
            timerSecondsRemaining={timerSecondsRemaining}
            durationMin={activeSession.intended_duration_minutes ?? 50}
            onRejoin={() => navigate(`/session/${activeSession.id}`)}
            onEnd={() => navigate(`/session/${activeSession.id}/summary`)}
          />
        )}

        {/* Primary "Book session" CTA */}
        {!activeSession && (
          <button
            type="button"
            onClick={() => setModalState({ kind: 'free' })}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl stitch-btn--primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all"
          >
            <Play size={16} />
            Book a session
          </button>
        )}

        {/* Solo session (separate flow) */}
        <button
          type="button"
          onClick={() => setModalState({ kind: 'solo' })}
          disabled={!!activeSession}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-surface-container-low stitch-text-primary text-sm font-bold hover:bg-surface-container active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <User size={15} />
          Solo session
        </button>

        {/* Schedule info card */}
        <div className="rounded-2xl bg-surface-container-low p-4">
          <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">
            How it works
          </p>
          <ul className="space-y-2 text-xs stitch-text-secondary leading-relaxed">
            <li className="flex gap-2">
              <span className="text-primary font-bold">1.</span>
              Tap an empty slot to book a session at that time.
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">2.</span>
              Tap someone else's session to join.
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">3.</span>
              Show up, declare your goal, finish it together.
            </li>
          </ul>
        </div>

        {/* Legend */}
        <div className="rounded-2xl bg-surface-container-low p-4">
          <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">
            Legend
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-emerald-400 shrink-0" />
              <span className="stitch-text-secondary">Live now</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-cyan-400 shrink-0" />
              <span className="stitch-text-secondary">Scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <UserPlus size={12} className="text-violet-500 shrink-0" />
              <span className="stitch-text-secondary">1-on-1 partner slot</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Calendar ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 rounded-3xl bg-surface-container-low overflow-hidden flex flex-col">

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToToday}
              className="px-3 py-1.5 rounded-full bg-surface-container text-xs font-bold stitch-text-primary hover:bg-surface-container-high transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => nudgeAnchor(-dayCount)}
              className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors"
              aria-label="Previous days"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => nudgeAnchor(dayCount)}
              className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors"
              aria-label="Next days"
            >
              <ChevronRight size={14} />
            </button>
            <p className="ml-2 text-sm font-bold stitch-text-primary">{headerLabel}</p>
          </div>
        </div>

        {/* Day-of-week column headers */}
        <div className="shrink-0 grid border-b border-surface-container" style={{ gridTemplateColumns: `60px repeat(${dayCount}, minmax(0, 1fr))` }}>
          <div /> {/* time column gutter */}
          {days.map((d, i) => {
            const isToday = sameDay(d, new Date());
            return (
              <div
                key={i}
                className={`px-3 py-2.5 text-center border-l border-surface-container ${isToday ? 'bg-primary/5' : ''}`}
              >
                <p className={`text-[10px] font-bold tracking-widest uppercase ${isToday ? 'text-primary' : 'stitch-text-secondary'}`}>
                  {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                </p>
                <p className={`text-lg font-extrabold leading-tight ${isToday ? 'text-primary' : 'stitch-text-primary'}`}>
                  {d.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Scrollable grid */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="relative grid" style={{ gridTemplateColumns: `60px repeat(${dayCount}, minmax(0, 1fr))` }}>

            {/* Time gutter */}
            <div className="border-r border-surface-container">
              {Array.from({ length: END_HOUR - START_HOUR }, (_, h) => (
                <div
                  key={h}
                  style={{ height: HOUR_PX }}
                  className="relative"
                >
                  <span className="absolute -top-1.5 right-2 text-[10px] stitch-text-secondary tabular-nums">
                    {String(START_HOUR + h).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day, dayIdx) => {
              const dayIsToday = sameDay(day, new Date());
              const nowOffsetPx =
                dayIsToday
                  ? Math.max(0, (minutesFromStart(now) / 60) * HOUR_PX)
                  : null;
              const daySessions = sessionsByDay[dayIdx];

              return (
                <div key={dayIdx} className="relative border-l border-surface-container">
                  {/* Hour cells (clickable slots, 2 per hour) */}
                  {Array.from({ length: TOTAL_SLOTS }, (_, slotIdx) => {
                    const slotDate = new Date(day);
                    slotDate.setHours(START_HOUR, 0, 0, 0);
                    slotDate.setMinutes(slotIdx * SLOT_MINUTES);
                    const isPast = slotDate.getTime() < Date.now() - 60_000;
                    return (
                      <button
                        key={slotIdx}
                        type="button"
                        disabled={isPast}
                        onClick={() => handleSlotClick(day, slotIdx)}
                        style={{ height: SLOT_PX }}
                        className={`block w-full border-b border-surface-container/40 text-left group transition-colors ${
                          isPast
                            ? 'cursor-default'
                            : 'cursor-pointer hover:bg-primary/5'
                        }`}
                        aria-label={`Book session at ${slotDate.toLocaleString()}`}
                      >
                        {!isPast && (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 pt-0.5 text-[10px] font-bold text-primary">
                            <Plus size={10} /> Book
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Now line */}
                  {nowOffsetPx != null && nowOffsetPx <= TOTAL_SLOTS * SLOT_PX && (
                    <div
                      className="absolute left-0 right-0 pointer-events-none z-10"
                      style={{ top: nowOffsetPx }}
                    >
                      <div className="relative">
                        <div className="absolute -left-1 -top-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 shadow-md shadow-rose-500/50" />
                        <div className="h-[2px] bg-rose-500" />
                      </div>
                    </div>
                  )}

                  {/* Sessions */}
                  {daySessions.map((s) => (
                    <SessionBlock
                      key={s.id}
                      session={s}
                      isMine={s.user_id === user?.id}
                      onClick={(e) => handleSessionClick(s, e)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────── */}
      {modalState.kind === 'free' && (
        <DeclareSessionModal onClose={() => setModalState({ kind: 'closed' })} />
      )}
      {modalState.kind === 'solo' && (
        <DeclareSessionModal onClose={() => setModalState({ kind: 'closed' })} forceSoloMode />
      )}
      {modalState.kind === 'schedule' && (
        <DeclareSessionModal
          onClose={() => setModalState({ kind: 'closed' })}
          initialScheduledAt={modalState.at}
        />
      )}

      {/* ── Detail sheet ─────────────────────────────────── */}
      {detail && (
        <SessionDetailSheet
          session={detail}
          isMine={detail.user_id === user?.id}
          onClose={() => setDetail(null)}
          onJoined={(navigatedId) => {
            setDetail(null);
            navigate(`/session/${navigatedId}`);
          }}
        />
      )}
    </div>
  );
}

// ── Session block (positioned absolutely within a day column) ───

function SessionBlock({
  session,
  isMine,
  onClick,
}: {
  session: GridSession;
  isMine: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const startMins = minutesFromStart(session.startsAt);
  // Clamp visible portion to grid range
  if (startMins + session.intended_duration_minutes < 0) return null;
  if (startMins >= (END_HOUR - START_HOUR) * 60) return null;

  const topClamped = Math.max(0, startMins);
  const bottom = Math.min(startMins + session.intended_duration_minutes, (END_HOUR - START_HOUR) * 60);
  const heightMins = Math.max(15, bottom - topClamped);

  const top = (topClamped / 60) * HOUR_PX;
  const height = (heightMins / 60) * HOUR_PX;

  const isActive = session.status === 'active';
  const isOneOnOne = session.session_mode === 'one_on_one';
  const partnerOpen = isOneOnOne && !session.partner_user_id;

  const baseBg = isActive
    ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40'
    : 'bg-cyan-500/12 hover:bg-cyan-500/22 border-cyan-500/40';

  const mineRing = isMine ? 'ring-2 ring-primary/50' : '';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute left-0.5 right-0.5 rounded-lg border ${baseBg} ${mineRing} px-1.5 py-1 text-left overflow-hidden transition-colors active:scale-[0.99] z-20`}
      style={{ top, height }}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        {session.avatar_url ? (
          <img src={session.avatar_url} alt={session.display_name} className="w-4 h-4 rounded-md object-cover shrink-0" />
        ) : (
          <div className={`w-4 h-4 rounded-md bg-gradient-to-br ${avatarHashClass(session.display_name)} flex items-center justify-center text-[8px] font-bold text-white shrink-0`}>
            {session.display_name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-[10px] font-bold stitch-text-primary truncate flex-1 min-w-0">
          {session.display_name}
        </span>
        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
      </div>
      <p className="text-[10px] stitch-text-secondary leading-tight line-clamp-2">
        {session.session_goal ?? session.session_title ?? 'Working on something'}
      </p>
      {height > 50 && (
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {isOneOnOne ? (
            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider text-violet-700">
              <UserPlus size={8} />1-on-1
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider stitch-text-secondary">
              <Users size={8} />Group
            </span>
          )}
          {session.quiet_mode && (
            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider stitch-text-secondary">
              <MicOff size={8} />Quiet
            </span>
          )}
          {partnerOpen && (
            <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-600">
              Slot open
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ── Active session banner (sidebar) ─────────────────────────────

function ActiveSessionBanner({
  goal, timerSecondsRemaining, durationMin, onRejoin, onEnd,
}: {
  goal: string | null;
  timerSecondsRemaining: number;
  durationMin: number;
  onRejoin: () => void;
  onEnd: () => void;
}) {
  const totalSeconds = durationMin * 60;
  const progress = totalSeconds > 0 ? Math.max(0, 1 - timerSecondsRemaining / totalSeconds) : 0;
  const mins = Math.max(0, Math.ceil(timerSecondsRemaining / 60));

  return (
    <div className="rounded-2xl stitch-card--accent p-4">
      <button type="button" onClick={onRejoin} className="w-full text-left">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-white/70 animate-pulse" />
          <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest">
            In session — tap to rejoin
          </p>
        </div>
        {goal && (
          <p className="text-sm font-bold text-white line-clamp-2 leading-snug mb-2">
            {goal}
          </p>
        )}
        <div className="h-1 bg-white/20 rounded-full overflow-hidden mb-1">
          <div className="h-full bg-white/70 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="text-[10px] text-white/70">
          {mins}m left of {durationMin}m
        </p>
      </button>
      <button
        type="button"
        onClick={onEnd}
        className="mt-3 w-full flex items-center justify-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-2 rounded-full transition-all active:scale-95"
      >
        <StopCircle size={13} />
        End session
      </button>
    </div>
  );
}

// ── Session detail sheet ────────────────────────────────────────

function SessionDetailSheet({
  session, isMine, onClose, onJoined,
}: {
  session: GridSession;
  isMine: boolean;
  onClose: () => void;
  onJoined: (id: string) => void;
}) {
  const [joining, setJoining] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setActiveSession } = useFocusSession();

  const isActive = session.status === 'active';
  const isOneOnOne = session.session_mode === 'one_on_one';
  const partnerOpen = isOneOnOne && !session.partner_user_id;

  async function handleJoin1on1() {
    setJoining(true);
    setErr(null);
    try {
      const joined = await joinOneOnOneSession(session.id);
      setActiveSession(joined);
      onJoined(joined.id);
    } catch (e: any) {
      setErr(e?.message ?? 'Could not join.');
      setJoining(false);
    }
  }

  function handleRejoin() {
    navigate(`/session/${session.id}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {session.avatar_url ? (
              <img src={session.avatar_url} alt="" className="w-12 h-12 rounded-2xl object-cover shrink-0" />
            ) : (
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarHashClass(session.display_name)} flex items-center justify-center text-white font-extrabold shrink-0`}>
                {session.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-base font-extrabold stitch-text-primary truncate">{session.display_name}</p>
              <p className="text-xs stitch-text-secondary flex items-center gap-1 mt-0.5">
                <Clock size={10} />
                {session.startsAt.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                {' · '}
                {session.intended_duration_minutes}m
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container shrink-0">
            <X size={15} className="stitch-text-secondary" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-cyan-100 text-cyan-700'
          }`}>
            {isActive ? 'Live now' : 'Scheduled'}
          </span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            isOneOnOne ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {isOneOnOne ? <UserPlus size={9} /> : <Users size={9} />}
            {isOneOnOne ? '1-on-1' : 'Group'}
          </span>
          {session.quiet_mode && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-100 text-slate-700">
              <MicOff size={9} /> Quiet
            </span>
          )}
        </div>

        <p className="text-sm stitch-text-primary leading-snug mb-4">
          {session.session_goal ?? session.session_title ?? 'Working on something'}
        </p>

        {err && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{err}</p>
        )}

        <div className="space-y-2">
          {isMine && isActive && (
            <button
              type="button"
              onClick={handleRejoin}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl stitch-btn--primary text-white text-sm font-bold"
            >
              <Play size={14} /> Rejoin your session
            </button>
          )}
          {!isMine && isActive && isOneOnOne && partnerOpen && (
            <button
              type="button"
              onClick={handleJoin1on1}
              disabled={joining}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl stitch-btn--primary text-white text-sm font-bold disabled:opacity-60"
            >
              {joining ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              {joining ? 'Joining…' : 'Take the partner slot'}
            </button>
          )}
          {!isMine && !isActive && (
            <div className="rounded-xl bg-surface-container-low px-3 py-2.5 text-xs stitch-text-secondary text-center">
              This session starts {session.startsAt.toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}. Come back then to join.
            </div>
          )}
          {!isMine && isActive && !isOneOnOne && (
            <div className="rounded-xl bg-surface-container-low px-3 py-2.5 text-xs stitch-text-secondary text-center">
              Group sessions are open — start your own session at the same time to join the room.
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-bold hover:bg-surface-container"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Empty-state helper export (unused locally but useful for marketing mirror) ──
export { CalIcon };
