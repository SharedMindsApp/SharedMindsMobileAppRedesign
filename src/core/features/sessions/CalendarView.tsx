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
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Play, ChevronLeft, ChevronRight, Calendar as CalIcon,
  Users, UserPlus, User, Loader2, X, Clock, StopCircle, Plus,
  CalendarPlus, List as ListIcon, LayoutGrid, Pencil, Trash2, Check,
} from 'lucide-react';
import { SessionsListView, type ListSession } from './SessionsListView';
import { QuickTimerButton } from '../dashboard/QuickTimerButton';
import { SessionTagPills } from './SessionTagPills';
import { downloadIcs } from '../../../lib/sessions/icsExport';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { useAuth } from '../../auth/AuthProvider';
import { DeclareSessionModal } from './DeclareSessionModal';
import { useCommunitySessionsSubscription } from './useCommunitySessionsSubscription';
import {
  fetchUpcomingScheduledSessions,
  joinOneOnOneSession,
  markSessionEnded,
  updateScheduledSession,
  deleteScheduledSession,
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
  project_id?: string | null;
  project_title?: string | null;
  project_color?: string | null;
  is_quick_timer?: boolean;
};

const PROJECT_DOT_HEX: Record<string, string> = {
  cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
  emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
};
function projectDot(token: string | null | undefined): string {
  return PROJECT_DOT_HEX[token ?? ''] ?? PROJECT_DOT_HEX.blue;
}

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
    project_id: s.project_id ?? null,
    project_title: s.project?.title ?? null,
    project_color: s.project?.color ?? null,
    is_quick_timer: !!(s as any).is_quick_timer,
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
    project_id: s.project_id ?? null,
    project_title: s.project?.title ?? null,
    project_color: s.project?.color ?? null,
    is_quick_timer: !!(s as any).is_quick_timer,
  };
}

// ── Main view ───────────────────────────────────────────────────

export function CalendarView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeSession, sessionGoal, timerSecondsRemaining, clearSession } = useFocusSession();

  // End session directly from the sidebar — writes to DB immediately so the
  // session can't get "stuck" if the user never reaches the summary screen.
  async function handleEndSessionFromSidebar() {
    if (!activeSession) return;
    try {
      await markSessionEnded(activeSession.id);
    } catch {
      // Best-effort — navigate to summary anyway so the user can pick an outcome
    }
    clearSession();
    navigate(`/session/${activeSession.id}/summary`);
  }

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

  // Type filter chips — toggle which session modes / booking status are visible.
  // All on by default. The user can narrow to just solo, just 1-on-1, booked
  // sessions they've joined as partner, etc.
  const [filter, setFilter] = useState<{
    solo: boolean; oneOnOne: boolean; group: boolean; booked: boolean;
  }>({
    solo: true,
    oneOnOne: true,
    group: true,
    booked: true,
  });

  // View toggle — list (default) vs calendar grid. Persisted per user
  // so power users who prefer the grid don't get bounced back to list.
  const LS_VIEW = 'sm.sessions.view';
  const [view, setView] = useState<'list' | 'calendar'>(() => {
    if (typeof window === 'undefined') return 'list';
    const stored = window.localStorage.getItem(LS_VIEW);
    return stored === 'calendar' ? 'calendar' : 'list';
  });
  useEffect(() => {
    try { window.localStorage.setItem(LS_VIEW, view); } catch { /* private mode */ }
  }, [view]);

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

  // load scheduled — scoped to "my sessions" (mine + admin-curated community sessions)
  useEffect(() => {
    fetchUpcomingScheduledSessions(user?.id)
      .then((rows) => {
        setScheduled(rows);
      })
      .catch((err) => {
        console.error('[CalendarView] failed to fetch scheduled sessions:', err);
      });
  }, [modalState.kind, user?.id]);

  // visible day window
  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => addDays(anchor, i)),
    [anchor, dayCount]
  );

  // sessions for the visible window — apply the type filter chips here so the
  // user can narrow the calendar to just solo blocks, just 1-on-1s, booked
  // sessions, etc. Solo sessions belonging to OTHER users are always hidden.
  const sessionsByDay = useMemo(() => {
    /**
     * @param mode        — session_mode value from the DB row
     * @param isMine      — user_id === me (I'm hosting)
     * @param isBooked    — partner_user_id === me (I've joined as partner)
     */
    function passesFilter(
      mode: string | undefined | null,
      isMine: boolean,
      isBooked: boolean,
    ): boolean {
      // Solo sessions are always private — never show another user's solo block
      if (mode === 'solo') return filter.solo && isMine;

      // Sessions where the current user is the booked partner
      if (isBooked) return filter.booked;

      // Regular mode-based filtering for unbooked sessions I'm not hosting
      if (mode === 'one_on_one') return filter.oneOnOne;
      return filter.group; // 'group' or null/unknown
    }
    const all: GridSession[] = [
      ...active
        .filter((s) =>
          passesFilter(s.session_mode, s.user_id === user?.id, (s as any).partner_user_id === user?.id)
        )
        .map(toGridSession),
      ...scheduled
        .filter((s: any) =>
          passesFilter(s.session_mode, s.user_id === user?.id, s.partner_user_id === user?.id)
        )
        .map(toGridScheduled),
    ];
    return days.map((day) => all.filter((s) => sameDay(s.startsAt, day)));
  }, [active, scheduled, days, filter, user?.id]);

  // Flat list of filtered sessions for the list view. Same passesFilter
  // logic as sessionsByDay but unbucketed — the list view groups by day
  // internally based on the user's strip selection.
  const filteredSessions: ListSession[] = useMemo(() => {
    function passesFilter(mode: string | undefined | null, isMine: boolean, isBooked: boolean): boolean {
      if (mode === 'solo') return filter.solo && isMine;
      if (isBooked) return filter.booked;
      if (mode === 'one_on_one') return filter.oneOnOne;
      return filter.group;
    }
    return [
      ...active
        .filter((s) => passesFilter(s.session_mode, s.user_id === user?.id, (s as any).partner_user_id === user?.id))
        .map(toGridSession),
      ...scheduled
        .filter((s: any) => passesFilter(s.session_mode, s.user_id === user?.id, s.partner_user_id === user?.id))
        .map(toGridScheduled),
    ];
  }, [active, scheduled, filter, user?.id]);

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
    // Past slots → ignore
    if (at.getTime() < Date.now() - 60_000) return;
    // Slots more than 4 weeks ahead → ignore (too far out to be useful)
    if (at.getTime() > Date.now() + 28 * 24 * 60 * 60 * 1000) return;
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

  // Total live count (excluding solo and excluding self) for header strip
  const liveCount = active.filter(
    (s) => s.session_mode !== 'solo' && s.user_id !== user?.id
  ).length;

  return (
    <div className="flex flex-col lg:flex-row gap-0 lg:gap-6 min-h-[calc(100vh-8rem)]">

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className="w-full lg:w-64 shrink-0 space-y-3 lg:pt-1">
        {/* Active session rejoin banner */}
        {activeSession && (
          <ActiveSessionBanner
            goal={sessionGoal}
            timerSecondsRemaining={timerSecondsRemaining}
            durationMin={activeSession.intended_duration_minutes ?? 50}
            onRejoin={() => navigate(`/session/${activeSession.id}`)}
            onEnd={handleEndSessionFromSidebar}
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
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-surface-container-low stitch-text-primary text-sm font-semibold hover:bg-surface-container active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <User size={14} />
          Solo session
        </button>

        {/* Quick Timer — lightest-weight focus entry. One tap → 25min
            solo session, no goal, no video. Still logs for momentum. */}
        {!activeSession && (
          <div className="w-full flex justify-center">
            <QuickTimerButton align="left" />
          </div>
        )}

        {/* Type filter — scope the calendar to just solo / 1-on-1 / group */}
        <div className="rounded-2xl bg-surface-container-low/60 ring-1 ring-surface-container/60 px-3 py-3">
          <p className="text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary mb-2">
            Show
          </p>
          <div className="flex flex-wrap gap-1.5">
            {([
              { key: 'solo',     label: 'Solo',    Icon: User,     onCls: 'bg-rose-100 text-rose-700 ring-rose-200' },
              { key: 'oneOnOne', label: '1-on-1',  Icon: UserPlus, onCls: 'bg-violet-100 text-violet-700 ring-violet-200' },
              { key: 'group',    label: 'Group',   Icon: Users,    onCls: 'bg-blue-100 text-blue-700 ring-blue-200' },
              { key: 'booked',   label: 'Booked',  Icon: CalIcon,  onCls: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
            ] as const).map(({ key, label, Icon, onCls }) => {
              const isOn = filter[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full ring-1 transition-all ${
                    isOn
                      ? onCls
                      : 'bg-transparent text-slate-400 ring-surface-container hover:text-slate-600 line-through decoration-1'
                  }`}
                >
                  <Icon size={11} />
                  {label}
                </button>
              );
            })}
          </div>
          {!filter.solo && !filter.oneOnOne && !filter.group && !filter.booked && (
            <button
              type="button"
              onClick={() => setFilter({ solo: true, oneOnOne: true, group: true, booked: true })}
              className="mt-2 text-[10px] font-bold text-primary hover:opacity-70 transition-opacity"
            >
              Show all
            </button>
          )}
        </div>

        {/* Live activity strip */}
        <div className="rounded-2xl bg-surface-container-low px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex w-2 h-2">
              <span className={`absolute inline-flex h-full w-full rounded-full ${liveCount > 0 ? 'bg-emerald-400 opacity-75 animate-ping' : 'bg-slate-400 opacity-50'}`} />
              <span className={`relative inline-flex w-2 h-2 rounded-full ${liveCount > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            </span>
            <p className="text-xs stitch-text-secondary">
              {liveCount === 0
                ? 'Nobody else is working right now'
                : liveCount === 1
                ? <><span className="font-bold stitch-text-primary tabular-nums">1</span> person working now</>
                : <><span className="font-bold stitch-text-primary tabular-nums">{liveCount}</span> people working now</>}
            </p>
          </div>
        </div>

        {/* Tiny inline legend + hint */}
        <p className="text-[11px] stitch-text-secondary leading-relaxed px-1">
          Tap an empty slot to book a time. Tap someone's session to see details or take an open 1-on-1 slot.
        </p>
      </aside>

      {/* ── Calendar ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col mt-4 lg:mt-0">

        {/* Header — this IS the page title */}
        <div className="shrink-0 flex items-center justify-between gap-3 pb-3 mb-3 border-b border-surface-container">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="stitch-headline text-2xl sm:text-3xl font-extrabold tracking-tight truncate">
              {headerLabel}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* View toggle — list vs calendar grid */}
            <div className="inline-flex p-0.5 rounded-full bg-surface-container-low ring-1 ring-surface-container/60">
              <button
                type="button"
                onClick={() => setView('list')}
                aria-label="List view"
                title="List view"
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-colors ${
                  view === 'list' ? 'bg-surface stitch-text-primary shadow-sm' : 'stitch-text-secondary hover:stitch-text-primary'
                }`}
              >
                <ListIcon size={11} /> List
              </button>
              <button
                type="button"
                onClick={() => setView('calendar')}
                aria-label="Calendar view"
                title="Calendar view"
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-colors ${
                  view === 'calendar' ? 'bg-surface stitch-text-primary shadow-sm' : 'stitch-text-secondary hover:stitch-text-primary'
                }`}
              >
                <LayoutGrid size={11} /> Calendar
              </button>
            </div>
            <button
              type="button"
              onClick={goToToday}
              className="px-3 py-1.5 rounded-full bg-surface-container-low text-xs font-bold stitch-text-primary hover:bg-surface-container transition-colors"
            >
              Today
            </button>
            {view === 'calendar' && (
              <>
                <button
                  type="button"
                  onClick={() => nudgeAnchor(-dayCount)}
                  className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container transition-colors"
                  aria-label="Previous days"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => nudgeAnchor(dayCount)}
                  className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container transition-colors"
                  aria-label="Next days"
                >
                  <ChevronRight size={15} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── List view ──────────────────────────────────────── */}
        {view === 'list' && (
          <SessionsListView
            sessions={filteredSessions}
            anchorDay={anchor}
            onPickDay={(d) => setAnchor(startOfDay(d))}
            onSelect={(s) => setDetail(s as GridSession)}
            onBook={(d) => {
              // Open the schedule modal at midday of the chosen day, snapped.
              const at = new Date(d);
              at.setHours(9, 0, 0, 0);
              setModalState({ kind: 'schedule', at });
            }}
          />
        )}

        {/* ── Calendar grid ──────────────────────────────────── */}
        {view === 'calendar' && (
        <>

        {/* Calendar shell */}
        <div className="flex-1 min-h-0 rounded-2xl bg-surface-container-low overflow-hidden flex flex-col border border-surface-container/50">

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
                    const isTooFar = slotDate.getTime() > Date.now() + 28 * 24 * 60 * 60 * 1000;
                    const isDisabled = isPast || isTooFar;
                    return (
                      <button
                        key={slotIdx}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => handleSlotClick(day, slotIdx)}
                        style={{ height: SLOT_PX }}
                        className={`block w-full border-b border-surface-container/40 text-left group transition-colors ${
                          isDisabled
                            ? 'cursor-default'
                            : 'cursor-pointer hover:bg-primary/5'
                        }`}
                        aria-label={`Book session at ${slotDate.toLocaleString()}`}
                      >
                        {!isDisabled && (
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
        </>
        )}
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
          onChanged={() => {
            // Re-fetch the scheduled list so the grid / list view
            // reflects the edit or delete the user just made.
            fetchUpcomingScheduledSessions(user?.id)
              .then(setScheduled)
              .catch((e) => console.warn('[CalendarView] refresh after edit failed', e));
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

  // Pretty time range (e.g. "10:00 – 10:50")
  const endTime = new Date(session.startsAt.getTime() + session.intended_duration_minutes * 60_000);
  const fmtTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const timeRange = `${fmtTime(session.startsAt)} – ${fmtTime(endTime)}`;

  // Hover-popover placement: flip above the block when there's not enough
  // room below the viewport. Measured on mouseenter so it tracks the user's
  // current scroll position.
  const blockRef = useRef<HTMLDivElement | null>(null);
  const [popoverPlacement, setPopoverPlacement] = useState<'below' | 'above'>('below');
  const POPOVER_HEIGHT_PX = 230; // approx — see hover card body below

  function updatePlacement() {
    if (!blockRef.current) return;
    const rect = blockRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < POPOVER_HEIGHT_PX && spaceAbove > spaceBelow) {
      setPopoverPlacement('above');
    } else {
      setPopoverPlacement('below');
    }
  }

  function handleIcsClick(e: React.MouseEvent) {
    e.stopPropagation();
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/session/${session.id}`
      : null;
    downloadIcs({
      id: session.id,
      title: session.session_title ?? session.session_goal ?? 'SharedMinds session',
      description: [
        session.session_goal,
        session.project_title ? `Project: ${session.project_title}` : null,
        url ? `Join: ${url}` : null,
      ].filter(Boolean).join('\n') || null,
      startsAt: session.startsAt,
      durationMins: session.intended_duration_minutes,
      url,
    });
  }

  return (
    // Outer div acts as a button — avoids nested-<button> HTML-spec violation
    // while still allowing an inner <button> for the ICS download icon.
    <div
      ref={blockRef}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(e as any); }}
      onMouseEnter={updatePlacement}
      onFocus={updatePlacement}
      className={`group absolute left-0.5 right-0.5 rounded-lg border ${baseBg} ${mineRing} px-1.5 py-1 text-left overflow-visible transition-all active:scale-[0.99] z-20 hover:z-40 hover:shadow-xl hover:scale-[1.04] hover:border-primary/60 origin-center cursor-pointer select-none`}
      style={{ top, height }}
    >
      {/* Compact body — always visible */}
      <div className="overflow-hidden h-full">
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
        {session.project_title && height > 40 && (
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: projectDot(session.project_color) }}
            />
            <span className="text-[9px] font-bold uppercase tracking-wider stitch-text-secondary truncate">
              {session.project_title}
            </span>
          </div>
        )}
        {height > 50 && (
          <div className="mt-1">
            <SessionTagPills
              mode={session.session_mode}
              quietMode={session.quiet_mode}
              partnerOpen={partnerOpen}
              isQuickTimer={session.is_quick_timer}
              size="sm"
            />
          </div>
        )}
      </div>

      {/* Rich hover popover — flips above when the block is near the bottom of the viewport */}
      <div
        className={`hidden group-hover:block absolute left-1/2 -translate-x-1/2 w-64 rounded-xl bg-white shadow-2xl ring-1 ring-black/5 p-3 z-50 pointer-events-none ${
          popoverPlacement === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
        }`}
      >
        {/* Triangle pointer — sits on the side closest to the block */}
        <span
          className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 ring-1 ring-black/5 ${
            popoverPlacement === 'above' ? '-bottom-1.5' : '-top-1.5'
          }`}
        />

        <div className="relative flex items-center gap-2 mb-2">
          {session.avatar_url ? (
            <img src={session.avatar_url} alt={session.display_name} className="w-8 h-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarHashClass(session.display_name)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
              {session.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold stitch-text-primary truncate">{session.display_name}</p>
            <p className="text-[10px] stitch-text-secondary">
              {isActive ? 'Live now' : 'Scheduled'}
            </p>
          </div>
        </div>

        <p className="relative text-xs font-semibold stitch-text-primary leading-snug mb-2 line-clamp-3">
          {session.session_goal ?? session.session_title ?? 'Working on something'}
        </p>

        <div className="relative space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold uppercase tracking-wider text-[9px] stitch-text-secondary">When</span>
            <span className="tabular-nums font-semibold stitch-text-primary">{timeRange}</span>
          </div>
          <SessionTagPills
            mode={session.session_mode}
            quietMode={session.quiet_mode}
            partnerOpen={partnerOpen}
            isQuickTimer={session.is_quick_timer}
            projectTitle={session.project_title}
            projectColor={session.project_color}
            size="sm"
          />
          <div className="mt-1 pt-2 border-t border-surface-container/60 text-primary font-bold text-[10px] text-center">
            Click for details →
          </div>
        </div>
      </div>

      {/* "Add to calendar" icon — top-right corner, visible on hover */}
      {session.status === 'scheduled' && (
        <button
          type="button"
          title="Add to calendar"
          onClick={handleIcsClick}
          className="absolute top-1 right-1 w-5 h-5 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white text-slate-600 hover:text-primary shadow-sm z-50 pointer-events-auto"
        >
          <CalendarPlus size={11} />
        </button>
      )}
    </div>
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
  session, isMine, onClose, onJoined, onChanged,
}: {
  session: GridSession;
  isMine: boolean;
  onClose: () => void;
  onJoined: (id: string) => void;
  /** Called after the user edits or deletes the session so the
   *  parent can re-fetch the scheduled list and re-render the grid. */
  onChanged?: () => void;
}) {
  const [joining, setJoining] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setActiveSession } = useFocusSession();

  const isActive = session.status === 'active';
  const isScheduled = session.status === 'scheduled';
  const isOneOnOne = session.session_mode === 'one_on_one';
  const partnerOpen = isOneOnOne && !session.partner_user_id;

  // ── Edit state ─────────────────────────────────────────────
  // Only scheduled sessions are editable. Inline form (no separate
  // modal) — quicker for small tweaks like changing the start time.
  const [editing, setEditing] = useState(false);
  const [editGoal, setEditGoal] = useState<string>(session.session_goal ?? session.session_title ?? '');
  const [editMinutes, setEditMinutes] = useState<string>(String(session.intended_duration_minutes));
  const [editDatetime, setEditDatetime] = useState<string>(() => {
    const d = session.startsAt;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function handleSaveEdit() {
    setSaving(true);
    setErr(null);
    try {
      const parsedMinutes = parseInt(editMinutes, 10);
      const minutes = Number.isFinite(parsedMinutes)
        ? Math.min(180, Math.max(5, parsedMinutes))
        : session.intended_duration_minutes;
      const when = new Date(editDatetime);
      if (Number.isNaN(when.getTime())) throw new Error('Pick a valid date and time.');
      await updateScheduledSession(session.id, {
        goalText: editGoal.trim() || null,
        scheduledAt: when,
        durationMinutes: minutes,
      });
      onChanged?.();
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? 'Could not save changes.');
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setErr(null);
    try {
      await deleteScheduledSession(session.id);
      onChanged?.();
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? 'Could not delete.');
      setSaving(false);
    }
  }

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

  function handleAddToCalendar() {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/session/${session.id}`
      : null;
    downloadIcs({
      id: session.id,
      title: session.session_title ?? session.session_goal ?? 'SharedMinds session',
      description: [
        session.session_goal,
        session.project_title ? `Project: ${session.project_title}` : null,
        url ? `Join: ${url}` : null,
      ].filter(Boolean).join('\n') || null,
      startsAt: session.startsAt,
      durationMins: session.intended_duration_minutes,
      url,
    });
  }

  // Lock body scroll while open so the page underneath can't shift.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[12vh] px-4 sm:px-6 pb-6 bg-black/40 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface rounded-3xl p-6 shadow-2xl ring-1 ring-black/5 my-auto animate-in fade-in zoom-in-95 duration-200"
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

        <div className="mb-3">
          <SessionTagPills
            mode={session.session_mode}
            quietMode={session.quiet_mode}
            partnerOpen={partnerOpen}
            status={isActive ? 'active' : 'scheduled'}
            durationMinutes={session.intended_duration_minutes}
            projectTitle={session.project_title}
            projectColor={session.project_color}
            isQuickTimer={session.is_quick_timer}
          />
        </div>

        {/* Edit form for owner-edit on scheduled sessions; otherwise
            just the read-only goal text. */}
        {editing && isMine && isScheduled ? (
          <div className="space-y-2 mb-4">
            <input
              type="text"
              value={editGoal}
              onChange={(e) => setEditGoal(e.target.value)}
              placeholder="What are you working on?"
              className="w-full px-3 py-2 rounded-lg text-sm stitch-text-primary bg-surface-container-low ring-1 ring-surface-container focus:ring-2 focus:ring-primary/30 outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="datetime-local"
                value={editDatetime}
                onChange={(e) => setEditDatetime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs stitch-text-primary bg-surface-container-low ring-1 ring-surface-container focus:ring-2 focus:ring-primary/30 outline-none"
              />
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  min={5}
                  max={180}
                  value={editMinutes}
                  onChange={(e) => setEditMinutes(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg text-xs font-bold stitch-text-primary tabular-nums bg-surface-container-low ring-1 ring-surface-container focus:ring-2 focus:ring-primary/30 outline-none"
                />
                <span className="text-[11px] stitch-text-secondary font-semibold">min</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm stitch-text-primary leading-snug mb-4">
            {session.session_goal ?? session.session_title ?? 'Working on something'}
          </p>
        )}

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
          {/* Edit + Delete — only for the user's own scheduled sessions.
              Active sessions can't be edited (they're running); past
              sessions can't either (they're history). */}
          {isMine && isScheduled && !editing && !confirmingDelete && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-bold hover:bg-surface-container transition-colors"
              >
                <Pencil size={13} /> Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-rose-50 text-rose-700 text-sm font-bold hover:bg-rose-100 transition-colors"
              >
                <Trash2 size={13} /> Cancel
              </button>
            </div>
          )}
          {editing && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-bold stitch-text-secondary bg-surface-container-low hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-xl stitch-btn--primary text-white text-sm font-bold disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save
              </button>
            </div>
          )}
          {confirmingDelete && (
            <div className="space-y-2">
              <p className="text-xs stitch-text-secondary text-center px-2">
                Cancel this scheduled session? It will be removed from your calendar.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={saving}
                  className="w-full py-3 rounded-xl text-sm font-bold stitch-text-secondary bg-surface-container-low hover:bg-surface-container transition-colors disabled:opacity-50"
                >
                  Keep
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition-colors disabled:opacity-60"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Remove
                </button>
              </div>
            </div>
          )}
          {!editing && !confirmingDelete && (
            <>
              <button
                type="button"
                onClick={handleAddToCalendar}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-bold hover:bg-surface-container transition-colors"
              >
                <CalendarPlus size={14} />
                Add to calendar
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl text-sm font-bold stitch-text-secondary hover:stitch-text-primary transition-colors"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Empty-state helper export (unused locally but useful for marketing mirror) ──
export { CalIcon };
