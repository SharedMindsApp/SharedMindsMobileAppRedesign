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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Play, ChevronLeft, ChevronRight, Calendar as CalIcon,
  Users, UserPlus, User, Loader2, X, Clock, StopCircle, Plus, Search, Zap, HelpCircle,
  CalendarPlus, List as ListIcon, LayoutGrid, CalendarDays, Pencil, Trash2, Check, CalendarClock,
} from 'lucide-react';
import { SessionsListView, type ListSession } from './SessionsListView';
import { QuickTimerButton } from '../dashboard/QuickTimerButton';
import { FindSessionsSheet } from '../dashboard/FindSessionsSheet';
// MatchWaitingSheet + matchMeNow() retired — Match-me-now now opens
// DeclareSessionModal with startOpenToMatch=true. See handleMatchMeNow
// below and task #175 / migration 20260527000015.
import type { FocusSession } from '../../../lib/sessions/focusTypes';
import { SegmentTimeline } from './SegmentTimeline';
import type { Segment } from '../../services/SessionTemplatesService';
import { SessionTagPills } from './SessionTagPills';
import { downloadIcs } from '../../../lib/sessions/icsExport';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { useAuth } from '../../auth/AuthProvider';
import { DeclareSessionModal } from './DeclareSessionModal';
import { useCommunitySessionsSubscription } from './useCommunitySessionsSubscription';
import {
  fetchUpcomingScheduledSessions,
  fetchSessionOutcomes,
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

/** Layout overlapping sessions so they render side-by-side instead of
 *  stacked on top of each other (Google-Calendar-style column packing).
 *
 *  Algorithm:
 *    1. Sort sessions ascending by start time.
 *    2. Greedy column assignment — each session goes into the first
 *       column whose last session has already ended.
 *    3. Group into "clusters" of contiguous overlapping sessions and
 *       compute the cluster's total column count.
 *
 *  Returns a Map keyed by session id → { col, cols } where:
 *    • col is the 0-indexed column position
 *    • cols is the total columns shared in this overlap cluster
 *
 *  Sessions that don't overlap anything land in `{ col: 0, cols: 1 }`
 *  and render at full column width.
 */
type OverlapLayout = Map<string, { col: number; cols: number }>;
function computeOverlapLayout(
  sessions: Array<{ id: string; startsAt: Date; intended_duration_minutes: number }>,
): OverlapLayout {
  const result: OverlapLayout = new Map();
  if (sessions.length === 0) return result;

  const sorted = [...sessions].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime()
  );
  const items = sorted.map((s) => {
    const start = s.startsAt.getTime();
    const end = start + s.intended_duration_minutes * 60_000;
    return { id: s.id, start, end, col: -1 };
  });

  // Greedy column assignment via running "column end times".
  const columnEnds: number[] = [];
  for (const item of items) {
    let assigned = -1;
    for (let i = 0; i < columnEnds.length; i++) {
      if (columnEnds[i] <= item.start) {
        assigned = i;
        columnEnds[i] = item.end;
        break;
      }
    }
    if (assigned === -1) {
      assigned = columnEnds.length;
      columnEnds.push(item.end);
    }
    item.col = assigned;
  }

  // Sweep clusters — contiguous runs of overlapping sessions share a
  // single `cols` value (max column used in the cluster + 1) so a busy
  // morning's overlaps don't shrink the quiet afternoon sessions.
  let clusterStart = 0;
  let clusterEnd = items[0].end;
  let clusterMaxCol = items[0].col;
  function finalise(from: number, to: number, total: number) {
    for (let j = from; j < to; j++) {
      result.set(items[j].id, { col: items[j].col, cols: total });
    }
  }
  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    if (item.start >= clusterEnd) {
      finalise(clusterStart, i, clusterMaxCol + 1);
      clusterStart = i;
      clusterEnd = item.end;
      clusterMaxCol = item.col;
    } else {
      clusterEnd = Math.max(clusterEnd, item.end);
      clusterMaxCol = Math.max(clusterMaxCol, item.col);
    }
  }
  finalise(clusterStart, items.length, clusterMaxCol + 1);

  return result;
}

function minutesFromStart(d: Date): number {
  const h = d.getHours();
  const m = d.getMinutes();
  return (h - START_HOUR) * 60 + m;
}

/** First day of the calendar GRID for a given month — i.e. the Monday
 *  of the week containing the 1st. Week starts on Monday (en-GB).
 *  Returns 42 cells (6 weeks × 7) so the grid is always rectangular. */
function startOfMonthGrid(d: Date): Date {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  // JS getDay() Sun=0..Sat=6. Convert to Mon=0..Sun=6.
  const dow = (first.getDay() + 6) % 7;
  return addDays(first, -dow);
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
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

export type GridSession = {
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
  status: 'active' | 'scheduled' | 'completed';
  project_id?: string | null;
  project_title?: string | null;
  project_color?: string | null;
  is_quick_timer?: boolean;
  segments?: Segment[] | null;
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
    segments: (s as any).segments ?? null,
  };
}

export function toGridScheduled(s: ScheduledSessionWithProfile): GridSession {
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
    status: ((s as any).status === 'completed' ? 'completed' : 'scheduled'),
    project_id: s.project_id ?? null,
    project_title: s.project?.title ?? null,
    project_color: s.project?.color ?? null,
    is_quick_timer: !!(s as any).is_quick_timer,
    segments: (s as any).segments ?? null,
  };
}

// ── Main view ───────────────────────────────────────────────────

export function CalendarView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeSession, sessionGoal, timerSecondsRemaining, clearSession, setActiveSession } = useFocusSession();

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
    // 'match' = Match-me-now: solo session with the door open. The modal
    // opens with both forceSoloMode + startOpenToMatch flipped on so the
    // user just picks goal + duration. Replaces the old waiting-room flow.
    | { kind: 'match' }
  >({ kind: 'closed' });
  const [detail, setDetail] = useState<GridSession | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  /** Mobile-only: a single "Start a session" CTA replaces the 5-button
   *  sidebar stack and opens this sheet with all options. Desktop
   *  keeps the inline sidebar. */
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  /** Waiting-room state for "Match me now". When set, we render the
   *  MatchWaitingSheet over the calendar. Cleared on match (we redirect)
   *  or cancel (sheet onCancel). */
  // Legacy `waitingSession` + `matchBusy` state removed with the
  // waiting-room flow. `matchError` retained for any failure surfaced
  // by handleMatchMeNow's pre-checks (though the actual session
  // creation now happens inside DeclareSessionModal).
  const [matchError, setMatchError] = useState<string | null>(null);
  /** Dismissible "How sessions work" explainer. Persisted in
   *  localStorage so we never show it twice unless the user pulls it
   *  back up via the (?) icon next to the sidebar header. */
  const LS_INTRO = 'sm.sessions.intro.dismissed';
  const [introOpen, setIntroOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(LS_INTRO) !== '1';
  });
  function dismissIntro() {
    try { window.localStorage.setItem(LS_INTRO, '1'); } catch { /* private */ }
    setIntroOpen(false);
  }
  function reopenIntro() {
    try { window.localStorage.removeItem(LS_INTRO); } catch { /* private */ }
    setIntroOpen(true);
  }
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

  // View toggle — four modes:
  //   • list  — scrollable open-ended list of upcoming sessions
  //   • days  — 3-day time grid (1-day on mobile due to width)
  //   • week  — 7-day agenda, grouped by day (matches the
  //            Google-Calendar-style "Week" reference design)
  //   • month — month-at-a-glance overview grid; cells link into 'days'
  // Persisted per user. Legacy LS value 'calendar' migrates to 'days'.
  const LS_VIEW = 'sm.sessions.view';
  type ViewMode = 'list' | 'days' | 'week' | 'month';
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'list';
    const stored = window.localStorage.getItem(LS_VIEW);
    if (stored === 'days' || stored === 'month' || stored === 'list' || stored === 'week') return stored;
    if (stored === 'calendar') return 'days'; // legacy migration
    return 'list';
  });
  useEffect(() => {
    try { window.localStorage.setItem(LS_VIEW, view); } catch { /* private mode */ }
  }, [view]);

  // tick "now" every minute for the red current-time line
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // If the user already has an open "match me now" waiting row (e.g.
  // they clicked Match again from the summary page and we landed here),
  // surface the waiting sheet so they don't lose their place. Filtered
  // by user_id + status + not expired so we never accidentally re-open
  // a stale row.
  // Waiting-room recovery effect removed: the open-to-match redesign
  // never creates `waiting_for_match` rows. Old waiting rows (if any
  // exist in production from the legacy flow) just expire via their
  // match_expires_at TTL and are harmless.

  // responsive day count
  useEffect(() => {
    const handler = () => setDayCount(window.innerWidth < 768 ? DAY_COUNT_MOBILE : DAY_COUNT_DESKTOP);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Load scheduled sessions — scoped to "my sessions" (mine + booked +
  // admin-curated community sessions). The server-side filter in
  // fetchUpcomingScheduledSessions means we only pay for rows we'll
  // actually render.
  //
  // Deps used to include `modalState.kind` to trigger a refetch after
  // creating/editing — but that fires the query on EVERY modal open/
  // close, including dismissals where nothing changed. Now we only
  // refetch when the user changes or when an explicit mutation
  // callback calls reloadScheduled(). The detail-sheet onChanged
  // handler already wires this for edits/deletes; for create flows
  // we re-fetch when the create modal closes successfully via the
  // modal's own onClose callback.
  const reloadScheduled = useCallback(() => {
    if (!user?.id) return;
    fetchUpcomingScheduledSessions(user.id)
      .then(setScheduled)
      .catch((err) => {
        console.error('[CalendarView] failed to fetch scheduled sessions:', err);
      });
  }, [user?.id]);

  useEffect(() => {
    reloadScheduled();
  }, [reloadScheduled]);

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
     * The Sessions calendar shows only sessions the user is actually part
     * of — hosting, booked into, or solo. Browsing other people's public
     * sessions happens in the dedicated "Find a session" sheet so the
     * calendar stays a clean view of "my commitments".
     *
     * @param mode      — session_mode value from the DB row
     * @param isMine    — user_id === me (I'm hosting)
     * @param isBooked  — partner_user_id === me (I've joined as partner)
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

      // Everything else must be MINE to appear on the calendar.
      // Public/community sessions I haven't joined go to the Find sheet.
      if (!isMine) return false;

      if (mode === 'one_on_one') return filter.oneOnOne;
      return filter.group; // 'group' or null/unknown — mine, hosting
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
      // Same "mine + booked only" rule as sessionsByDay — see comment there.
      if (mode === 'solo') return filter.solo && isMine;
      if (isBooked) return filter.booked;
      if (!isMine) return false;
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

  // Auto-scroll the days grid so the current hour is the FIRST hour
  // visible — past hours stay rendered above (scroll up to see them)
  // but the user doesn't have to scroll down to find the red "now"
  // line. Re-runs whenever the user switches into Days view or
  // navigates dates so the scroll is correct after route changes.
  //
  // Only fires when today falls inside the visible days window. On a
  // future / past anchor we leave the scroll at the top.
  // No more auto-scroll: the past hours are HIDDEN at the render
  // level via viewStartHour, so the grid starts at the previous hour
  // by default. scrollRef is kept (still attached to the inner
  // overflow container) in case future logic wants to nudge the
  // scroll, but the previous rAF-driven scrollIntoView dance is gone.
  const scrollRef = useRef<HTMLDivElement | null>(null);

  /** "Match me now" handler — redesigned to skip the waiting-room model.
   *  Opens DeclareSessionModal with both forceSoloMode + startOpenToMatch
   *  flipped on. The user picks goal + duration; a normal active solo
   *  session starts and appears in the "Drop in · live now" lane for
   *  anyone else online to claim. No more waiting lobby. */
  function handleMatchMeNow() {
    if (activeSession) return;
    setMatchError(null);
    setModalState({ kind: 'match' });
  }

  function goToToday() {
    setAnchor(startOfDay(new Date()));
  }

  function handleSlotClick(day: Date, slotIndex: number) {
    const at = new Date(day);
    // Slot 0 corresponds to viewStartHour when today is in view, or
    // START_HOUR otherwise. Re-derive here from the day being clicked.
    const startHour = sameDay(day, new Date())
      ? Math.max(START_HOUR, new Date().getHours() - 1)
      : START_HOUR;
    at.setHours(startHour, 0, 0, 0);
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

  // Week view always starts on the Monday of the current anchor week so
  // navigation is week-aligned. Computed once and reused for both the
  // header label and the WeekAgendaView's rendered range.
  const weekStart = useMemo(() => {
    const d = new Date(anchor);
    const dow = (d.getDay() + 6) % 7; // Mon = 0
    d.setDate(d.getDate() - dow);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [anchor]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  // Header label: month view always shows "May 2026"; days/list show a
  // range; week shows "24 May – 30 May 2026".
  const headerLabel = useMemo(() => {
    if (view === 'month') {
      return anchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    }
    if (view === 'week') {
      const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
      const sameYear = weekStart.getFullYear() === weekEnd.getFullYear();
      const startFmt: Intl.DateTimeFormatOptions = sameMonth
        ? { day: 'numeric' }
        : sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' };
      const endFmt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
      return `${weekStart.toLocaleDateString('en-GB', startFmt)} – ${weekEnd.toLocaleDateString('en-GB', endFmt)}`;
    }
    const last = days[days.length - 1];
    if (anchor.getMonth() === last.getMonth()) {
      return anchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    }
    return `${anchor.toLocaleDateString('en-GB', { month: 'short' })} – ${last.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
  }, [anchor, days, view, weekStart, weekEnd]);

  /** Single prev/next handler that picks the right unit per view:
   *  days = `dayCount` days; week = 7 days; month = full month. */
  function nudgePrev() {
    if (view === 'month') setAnchor((prev) => addMonths(prev, -1));
    else if (view === 'week') setAnchor((prev) => addDays(prev, -7));
    else setAnchor((prev) => addDays(prev, -dayCount));
  }
  function nudgeNext() {
    if (view === 'month') setAnchor((prev) => addMonths(prev, 1));
    else if (view === 'week') setAnchor((prev) => addDays(prev, 7));
    else setAnchor((prev) => addDays(prev, dayCount));
  }

  /** When today is in the visible day window, the Days grid trims its
   *  rendered hours so the previous hour is the first one shown.
   *  Anything earlier in the day is COMPLETELY HIDDEN — no scroll-up
   *  to see them, no DOM nodes for them. Other anchors render the
   *  full 06:00 → 23:00 grid. Recomputed when `days` or `now` changes
   *  so the view advances as the hour ticks over. */
  const viewStartHour = useMemo(() => {
    const todayInWindow = days.some((d) => sameDay(d, new Date()));
    if (!todayInWindow) return START_HOUR;
    return Math.max(START_HOUR, now.getHours() - 1);
  }, [days, now]);

  // Total live count (excluding solo and excluding self) for header strip
  const liveCount = active.filter(
    (s) => s.session_mode !== 'solo' && s.user_id !== user?.id
  ).length;

  return (
    <div className="flex flex-col lg:flex-row gap-0 lg:gap-6 min-h-[calc(100vh-8rem)]">

      {/* ── Sidebar ──────────────────────────────────────────
          On lg+ this is a true sidebar to the left of the calendar.
          Below lg it's a stack above the calendar, with tighter
          vertical spacing to keep the calendar reachable without
          excessive scrolling. */}
      <aside className="w-full lg:w-64 shrink-0 space-y-2 lg:space-y-3 lg:pt-1">
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

        {/* ── "How sessions work" intro card ────────────────────
            Dismissible. First-time visitors get a 5-line cheat sheet
            explaining each action; the (?) icon next to the header
            on subsequent visits pulls it back up. Hidden on mobile
            because the calendar is the priority — the gradient
            buttons themselves communicate enough. */}
        {!activeSession && introOpen && (
          <div className="hidden lg:block rounded-2xl bg-gradient-to-br from-violet-50 to-blue-50 ring-1 ring-violet-100/80 p-3.5 relative">
            <button
              type="button"
              onClick={dismissIntro}
              aria-label="Dismiss"
              className="absolute top-2 right-2 w-6 h-6 grid place-items-center rounded-full text-violet-700/60 hover:bg-white/60"
            >
              <X size={12} />
            </button>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-violet-700/80 mb-2 pr-6">
              How sessions work
            </p>
            <ul className="space-y-1.5 text-[11px] stitch-text-primary leading-snug">
              <li><span className="font-bold">⚡ Match me now</span> — auto-pair with the next person who's also looking</li>
              <li><span className="font-bold">👤 Solo session</span> — focus alone, optional video room with peers</li>
              <li><span className="font-bold">⏱ Quick timer</span> — tag an activity, one-tap start, no video</li>
              <li><span className="font-bold">📅 Schedule a session</span> — pick a future time + any mode</li>
              <li><span className="font-bold">🔍 Find a session</span> — browse open public + 1-on-1 slots to join</li>
            </ul>
          </div>
        )}

        {/* ── Mobile single CTA — opens the action sheet ──────
            Replaces the 5-button stack on mobile because that stack
            pushes the calendar grid below the fold. A single
            high-affinity button keeps the calendar visible. */}
        {!activeSession && (
          <button
            type="button"
            onClick={() => setActionSheetOpen(true)}
            className="lg:hidden w-full flex items-center justify-center gap-2 py-3 rounded-2xl stitch-btn--primary text-white text-sm font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
          >
            <Plus size={16} />
            Start a session
          </button>
        )}

        {/* ── Desktop sidebar: 5-button stack ──────────────────
            Was `lg:contents` to flatten the wrapper out of layout so
            the aside's space-y could reach the children — but
            display:contents means Tailwind's adjacent-sibling
            space-y selectors don't apply *inside* the wrapper, so
            Match/Solo/Timer ended up flush against each other. Now
            the wrapper is a real flex column on lg+ with its own
            gap-3, which gives internal spacing without depending on
            the parent's space-y. */}
        {!activeSession && (
          <div className="hidden lg:flex lg:flex-col lg:gap-3">
            {/* ── START NOW ──────────────────────────────────
                Section labels are sidebar-only on lg+. On mobile the
                buttons themselves carry enough visual differentiation
                (gradient + icon + label) that the section headers add
                noise without information. */}
            <div className="hidden lg:flex items-center justify-between">
              <p className="text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary px-1">
                Start now
              </p>
              {!introOpen && (
                <button
                  type="button"
                  onClick={reopenIntro}
                  aria-label="How sessions work"
                  title="How sessions work"
                  className="w-5 h-5 grid place-items-center rounded-full stitch-text-secondary hover:bg-surface-container-low transition-colors"
                >
                  <HelpCircle size={11} />
                </button>
              )}
            </div>
            {/* Match me now — visual lead because it's the unique product
                primitive (spontaneous pairing) and the most likely
                first-time delight moment. */}
            <button
              type="button"
              onClick={handleMatchMeNow}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-white text-sm font-bold shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 active:scale-[0.98] transition-all"
            >
              <Zap size={14} />
              Match me now
            </button>
            {matchError && (
              <p className="text-[11px] font-semibold text-rose-700 bg-rose-50 ring-1 ring-rose-100 rounded-lg px-2.5 py-1.5">
                {matchError}
              </p>
            )}
            <button
              type="button"
              onClick={() => setModalState({ kind: 'solo' })}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-bold shadow-md shadow-violet-500/15 hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] transition-all"
            >
              <User size={14} />
              Solo session
            </button>
            <div className="w-full flex justify-center">
              <QuickTimerButton align="left" />
            </div>

            {/* ── PLAN AHEAD ────────────────────────────────── */}
            <p className="hidden lg:block text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary px-1 pt-2 lg:pt-1">
              Plan ahead
            </p>
            <button
              type="button"
              onClick={() => setModalState({ kind: 'free' })}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl stitch-btn--primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all"
            >
              <CalIcon size={15} />
              Schedule a session
            </button>

            {/* ── JOIN OTHERS ───────────────────────────────── */}
            <p className="hidden lg:block text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary px-1 pt-2 lg:pt-1">
              Join others
            </p>
            <button
              type="button"
              onClick={() => setFindOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-bold shadow-md shadow-cyan-500/15 hover:shadow-lg hover:shadow-cyan-500/25 active:scale-[0.98] transition-all"
            >
              <Search size={14} />
              Find a session
            </button>
          </div>
        )}

        {/* Type filter removed — when the calendar showed every public
            session, filtering by mode mattered. Now that we scope to
            mine + booked only, hiding your own sessions by type is a
            niche knob nobody asked for. The `filter` state still
            exists in the component (defaulted to all-true) so
            passesFilter() stays a no-op without a rewrite. */}

        {/* Live activity strip — sidebar-only; on mobile we hide it to
            keep the calendar reachable. Match me now already surfaces
            "who's working" at the moment of action. */}
        <div className="hidden lg:block rounded-2xl bg-surface-container-low px-4 py-3">
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

        {/* Tiny inline legend + hint — hidden on mobile to give the
            calendar grid more vertical room. On lg+ the sidebar has
            the space and the explainer pulls weight for first-time
            visitors who don't see the dismissible intro card. */}
        <p className="hidden lg:block text-[11px] stitch-text-secondary leading-relaxed px-1">
          This calendar shows only sessions you're hosting or booked into.
          Looking for company? Tap <span className="font-bold stitch-text-primary">Find a session</span>.
        </p>
      </aside>

      {/* ── Calendar ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col mt-4 lg:mt-0">

        {/* Header — this IS the page title.
            Mobile layout: title on row 1, view toggle on row 2 (full
            width so labels never wrap), Today+nav on row 3. Desktop
            squashes everything back onto a single row. */}
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 pb-3 mb-3 border-b border-surface-container">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="stitch-headline text-2xl sm:text-3xl font-extrabold tracking-tight truncate">
              {headerLabel}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-start sm:self-auto sm:flex-nowrap">
            {/* View toggle — List / Day / Week / Month.
                Full-width on mobile (forces its own row in the wrapped
                flex parent), inline-flex on sm+ so it sits beside the
                Today/nav cluster. `whitespace-nowrap` on each button
                prevents the labels wrapping mid-word when the row is
                tight. */}
            <div className="w-full sm:w-auto sm:inline-flex flex justify-around p-0.5 rounded-full bg-surface-container-low ring-1 ring-surface-container/60">
              {([
                { id: 'list',  label: 'List',  Icon: ListIcon },
                { id: 'days',  label: 'Day',   Icon: LayoutGrid },
                { id: 'week',  label: 'Week',  Icon: CalIcon },
                { id: 'month', label: 'Month', Icon: CalendarDays },
              ] as const).map(({ id, label, Icon }) => {
                const active = view === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setView(id)}
                    aria-label={`${label} view`}
                    title={`${label} view`}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-[11px] font-extrabold whitespace-nowrap transition-colors ${
                      active ? 'bg-surface stitch-text-primary shadow-sm' : 'stitch-text-secondary hover:stitch-text-primary'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={goToToday}
              className="px-3 py-2 sm:py-1.5 rounded-full bg-surface-container-low text-xs font-bold stitch-text-primary hover:bg-surface-container transition-colors whitespace-nowrap"
            >
              Today
            </button>
            {(view === 'days' || view === 'week' || view === 'month') && (
              <>
                <button
                  type="button"
                  onClick={nudgePrev}
                  className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container transition-colors"
                  aria-label={view === 'month' ? 'Previous month' : 'Previous days'}
                >
                  <ChevronLeft size={16} className="sm:size-[15]" />
                </button>
                <button
                  type="button"
                  onClick={nudgeNext}
                  className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container transition-colors"
                  aria-label={view === 'month' ? 'Next month' : 'Next days'}
                >
                  <ChevronRight size={16} className="sm:size-[15]" />
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

        {/* ── Week view (agenda style) ──────────────────────── */}
        {view === 'week' && (
          <WeekAgendaView
            weekStart={weekStart}
            allSessions={filteredSessions as GridSession[]}
            onSelectSession={(s) => setDetail(s)}
            onBookSlot={(d) => {
              const at = new Date(d);
              at.setHours(9, 0, 0, 0);
              setModalState({ kind: 'schedule', at });
            }}
          />
        )}

        {/* ── Month view ─────────────────────────────────────── */}
        {view === 'month' && (
          <MonthView
            anchor={anchor}
            allSessions={filteredSessions as GridSession[]}
            userId={user?.id}
            onPickDay={(d) => { setAnchor(startOfDay(d)); setView('days'); }}
            onPickSlot={(at) => setModalState({ kind: 'schedule', at })}
            onSelectSession={(s) => setDetail(s)}
          />
        )}

        {/* ── Days grid (3 on desktop, 1 on mobile) ──────────── */}
        {view === 'days' && (
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

            {/* Time gutter — trimmed to viewStartHour..END_HOUR so any
                hours that have already passed today are hidden
                entirely (not just scrolled past). The previous + current
                hours are always the first two rows when today is in
                view; other anchors get the full 06:00–23:00 grid. */}
            <div className="border-r border-surface-container">
              {Array.from({ length: END_HOUR - viewStartHour }, (_, h) => (
                <div
                  key={h}
                  data-hour={viewStartHour + h}
                  style={{ height: HOUR_PX }}
                  className="relative"
                >
                  <span className="absolute -top-1.5 right-2 text-[10px] stitch-text-secondary tabular-nums">
                    {String(viewStartHour + h).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns. Slot count + now-line are rebased on
                viewStartHour so the rendered area exactly matches the
                trimmed time gutter — no phantom rows extending past
                the visible window. */}
            {(() => {
              const viewTotalSlots = (END_HOUR - viewStartHour) * SLOTS_PER_HOUR;
              return days.map((day, dayIdx) => {
              const dayIsToday = sameDay(day, new Date());
              // Now-line position relative to viewStartHour (not the
              // constant START_HOUR), so it lands at the correct row
              // even when the gutter has been trimmed.
              const nowOffsetPx =
                dayIsToday
                  ? Math.max(0, ((now.getHours() * 60 + now.getMinutes()) - viewStartHour * 60) / 60 * HOUR_PX)
                  : null;
              const daySessions = sessionsByDay[dayIdx];
              // Overlap layout — assigns col + cols to each session so
              // simultaneous sessions render side-by-side instead of
              // stacked on top of each other.
              const dayLayout = computeOverlapLayout(daySessions);

              return (
                <div key={dayIdx} className="relative border-l border-surface-container">
                  {/* Hour cells (clickable slots, 2 per hour). Slot 0
                      now corresponds to viewStartHour:00, not 06:00. */}
                  {Array.from({ length: viewTotalSlots }, (_, slotIdx) => {
                    const slotDate = new Date(day);
                    slotDate.setHours(viewStartHour, 0, 0, 0);
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
                        aria-label={`Schedule session at ${slotDate.toLocaleString()}`}
                      >
                        {!isDisabled && (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 pt-0.5 text-[10px] font-bold text-primary">
                            <Plus size={10} /> Schedule session
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Now line */}
                  {nowOffsetPx != null && nowOffsetPx <= viewTotalSlots * SLOT_PX && (
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
                  {daySessions.map((s) => {
                    const lay = dayLayout.get(s.id) ?? { col: 0, cols: 1 };
                    return (
                      <SessionBlock
                        key={s.id}
                        session={s}
                        isMine={s.user_id === user?.id}
                        viewStartHour={viewStartHour}
                        col={lay.col}
                        cols={lay.cols}
                        onClick={(e) => handleSessionClick(s, e)}
                      />
                    );
                  })}
                </div>
              );
            });
            })()}
          </div>
        </div>
        </div>
        </>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────
          Each modal's onClose triggers a single refresh of the
          scheduled list — replaces the old "refetch on every
          modalState.kind change" pattern. Closing without creating
          anything is still safe: reloadScheduled() is one cheap
          server-side-filtered query. */}
      {modalState.kind === 'free' && (
        <DeclareSessionModal
          onClose={() => { setModalState({ kind: 'closed' }); reloadScheduled(); }}
        />
      )}
      {modalState.kind === 'solo' && (
        <DeclareSessionModal
          onClose={() => { setModalState({ kind: 'closed' }); reloadScheduled(); }}
          forceSoloMode
        />
      )}
      {modalState.kind === 'schedule' && (
        <DeclareSessionModal
          onClose={() => { setModalState({ kind: 'closed' }); reloadScheduled(); }}
          initialScheduledAt={modalState.at}
        />
      )}
      {modalState.kind === 'match' && (
        <DeclareSessionModal
          onClose={() => { setModalState({ kind: 'closed' }); reloadScheduled(); }}
          forceSoloMode
          startOpenToMatch
        />
      )}

      {findOpen && (
        <FindSessionsSheet onClose={() => setFindOpen(false)} />
      )}

      {actionSheetOpen && (
        <MobileActionSheet
          matchBusy={false}
          onClose={() => setActionSheetOpen(false)}
          onMatch={() => { setActionSheetOpen(false); handleMatchMeNow(); }}
          onSolo={() => { setActionSheetOpen(false); setModalState({ kind: 'solo' }); }}
          onSchedule={() => { setActionSheetOpen(false); setModalState({ kind: 'free' }); }}
          onFind={() => { setActionSheetOpen(false); setFindOpen(true); }}
        />
      )}

      {/* MatchWaitingSheet retired — see handleMatchMeNow above. */}

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
          onChanged={reloadScheduled}
        />
      )}
    </div>
  );
}

// ── Session block (positioned absolutely within a day column) ───

function SessionBlock({
  session,
  isMine,
  viewStartHour,
  col,
  cols,
  onClick,
}: {
  session: GridSession;
  isMine: boolean;
  /** First hour visible in the grid. When the parent has trimmed past
   *  hours for today, this is currentHour-1 instead of the constant
   *  START_HOUR. Drives the session block's vertical position so it
   *  lands on the right row after the gutter has been re-based. */
  viewStartHour: number;
  /** 0-indexed horizontal column position within its overlap cluster. */
  col: number;
  /** Total columns in the overlap cluster (1 = full width). */
  cols: number;
  onClick: (e: React.MouseEvent) => void;
}) {
  const sH = session.startsAt.getHours();
  const sM = session.startsAt.getMinutes();
  const startMins = (sH - viewStartHour) * 60 + sM;
  const gridMins = (END_HOUR - viewStartHour) * 60;
  // Clamp visible portion to the visible grid range
  if (startMins + session.intended_duration_minutes < 0) return null;
  if (startMins >= gridMins) return null;

  const topClamped = Math.max(0, startMins);
  const bottom = Math.min(startMins + session.intended_duration_minutes, gridMins);
  // True duration in minutes (may be as short as a 5-min Quick Timer).
  const actualHeightMins = bottom - topClamped;

  const top = (topClamped / 60) * HOUR_PX;
  // Visual minimum of 32px — short sessions (15 min = 15px) get
  // visually padded so the mode chip + goal text actually fit. The
  // underlying duration doesn't change; this just guarantees the
  // block is large enough to read.
  const MIN_VISIBLE_PX = 32;
  const naturalHeight = (Math.max(0, actualHeightMins) / 60) * HOUR_PX;
  const height = Math.max(MIN_VISIBLE_PX, naturalHeight);

  // Layout density: ultra-compact when there isn't enough room for two
  // lines stacked. Below ~42px we collapse everything to a single line
  // (mode chip + goal text inline) so the block stays legible without
  // overlapping itself.
  const isUltraCompact = height < 42;

  const isActive = session.status === 'active';
  const isCompleted = session.status === 'completed';
  const isOneOnOne = session.session_mode === 'one_on_one';
  const partnerOpen = isOneOnOne && !session.partner_user_id;

  // Status-aware background — active sessions glow emerald, completed
  // sessions stay visible as muted historical records, scheduled get
  // the default cyan look.
  const baseBg = isActive
    ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40'
    : isCompleted
    ? 'bg-slate-400/10 hover:bg-slate-400/20 border-slate-400/30'
    : 'bg-cyan-500/12 hover:bg-cyan-500/22 border-cyan-500/40';

  const mineRing = isMine ? 'ring-2 ring-primary/50' : '';
  // Completed sessions are de-emphasised to half opacity so live + upcoming
  // sessions read as the primary content. Hovering restores full opacity
  // so the user can interact normally.
  const completedDim = isCompleted ? 'opacity-60 hover:opacity-100' : '';

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
      className={`group absolute rounded-lg border ${baseBg} ${mineRing} ${completedDim} px-1.5 py-1 text-left overflow-visible transition-all active:scale-[0.99] z-20 hover:z-40 hover:shadow-xl hover:scale-[1.04] hover:border-primary/60 origin-center cursor-pointer select-none`}
      style={{
        top,
        height,
        // Side-by-side rendering for overlapping sessions: divide the
        // column width by `cols` and offset by `col`. Each block keeps
        // 2px inset on either side via calc so adjacent blocks have a
        // visible gap rather than touching.
        left: cols > 1 ? `calc(${(col / cols) * 100}% + 2px)` : '2px',
        width: cols > 1 ? `calc(${(1 / cols) * 100}% - 4px)` : 'calc(100% - 4px)',
      }}
    >
      {/* Compact body — always visible */}
      <div className="overflow-hidden h-full">
        {isUltraCompact ? (
          // ── Ultra-compact: single row ───────────────────────
          // <42px tall. Show only the mode chip + goal text on one
          // line so the block stays legible without stacked lines
          // overlapping. Project, time range, and the host avatar
          // are all dropped — they're available in the detail sheet
          // when the user taps the block.
          <div className="flex items-center gap-1 h-full">
            <SessionModeChip
              mode={session.session_mode}
              isQuickTimer={session.is_quick_timer}
              partnerCount={
                session.session_mode === 'one_on_one'
                  ? (session.partner_user_id ? 2 : 1)
                  : null
              }
            />
            <span className={`flex-1 min-w-0 text-[11px] font-bold stitch-text-primary truncate leading-tight ${isCompleted ? 'line-through decoration-1' : ''}`}>
              {session.session_goal ?? session.session_title ?? 'Working on something'}
            </span>
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
            {isCompleted && <Check size={10} className="stitch-text-secondary shrink-0" />}
          </div>
        ) : (
          <>
            {/* Top row: mode chip on the left, host avatar (if not me) +
                live dot on the right. Lead with the mode so the user can
                scan the calendar by session TYPE first. */}
            <div className="flex items-center gap-1 mb-0.5">
              <SessionModeChip
                mode={session.session_mode}
                isQuickTimer={session.is_quick_timer}
                partnerCount={
                  session.session_mode === 'one_on_one'
                    ? (session.partner_user_id ? 2 : 1)
                    : null
                }
              />
              {/* Quiet flag — tiny inline */}
              {session.quiet_mode && (
                <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-500 shrink-0">
                  · Quiet
                </span>
              )}
              {!isMine && (
                session.avatar_url ? (
                  <img
                    src={session.avatar_url}
                    alt={session.display_name}
                    title={session.display_name}
                    className="ml-auto w-3.5 h-3.5 rounded-full object-cover shrink-0 ring-1 ring-white/40"
                  />
                ) : (
                  <div
                    title={session.display_name}
                    className={`ml-auto w-3.5 h-3.5 rounded-full bg-gradient-to-br ${avatarHashClass(session.display_name)} flex items-center justify-center text-[7px] font-bold text-white shrink-0`}
                  >
                    {session.display_name.charAt(0).toUpperCase()}
                  </div>
                )
              )}
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
              {isCompleted && <Check size={11} className="ml-auto stitch-text-secondary shrink-0" />}
            </div>
            {/* Goal / activity title — visual lead at non-compact sizes. */}
            <p className={`text-[11px] font-bold stitch-text-primary leading-tight line-clamp-2 ${isCompleted ? 'line-through decoration-1' : ''}`}>
              {session.session_goal ?? session.session_title ?? 'Working on something'}
            </p>
            {session.project_title && height > 60 && (
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
            {/* Time range on the bottom for taller blocks */}
            {height > 72 && (
              <p className="text-[9px] stitch-text-secondary tabular-nums mt-0.5">
                {timeRange}
              </p>
            )}
          </>
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

/** Debrief outcome → recap label + tone. 'none' covers no-debrief / no_answer. */
const OUTCOME_META: Record<string, { label: string; cls: string }> = {
  finished: { label: '✓ Finished what I set out to do', cls: 'text-emerald-700' },
  partially: { label: '◐ Made partial progress', cls: 'text-amber-700' },
  something_came_up: { label: 'Something came up', cls: 'text-slate-600' },
  no_answer: { label: 'Not recorded', cls: 'text-slate-500' },
  none: { label: 'Not recorded', cls: 'text-slate-500' },
};

export function SessionDetailSheet({
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
  const { activeSession: contextActive, setActiveSession, clearSession } = useFocusSession();

  const { user } = useAuth();
  const isActive = session.status === 'active';
  const isScheduled = session.status === 'scheduled';
  const isOneOnOne = session.session_mode === 'one_on_one';
  const partnerOpen = isOneOnOne && !session.partner_user_id;

  // A session has "happened" if it's flagged completed, or its time window has
  // already passed. Past sessions are a read-only recap — no edit / cancel /
  // add-to-calendar; instead we surface what was recorded.
  const isPast = session.startsAt.getTime() + session.intended_duration_minutes * 60_000 < Date.now();
  const isRecap = !isActive && (session.status === 'completed' || isPast);
  const [recapOutcome, setRecapOutcome] = useState<string | null>(null);
  // Privacy: we keep only the COUNT of participants, never the list of who.
  const [participantCount, setParticipantCount] = useState(0);
  const [recapLoaded, setRecapLoaded] = useState(false);
  useEffect(() => {
    if (!isRecap) return;
    let cancelled = false;
    fetchSessionOutcomes(session.id)
      .then((rows) => {
        if (cancelled) return;
        const mine = rows.find((r) => r.user_id === user?.id) ?? rows[0];
        setRecapOutcome(mine?.outcome ?? null);
        setParticipantCount(rows.length);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setRecapLoaded(true); });
    return () => { cancelled = true; };
  }, [isRecap, session.id, user?.id]);

  // "Missed" = a scheduled session whose time passed with no debrief recorded
  // and no completed flag. Stated plainly, never punitively — and removable.
  const isMissed = isRecap && recapLoaded && session.status !== 'completed' && recapOutcome == null;
  const isGroup = session.session_mode === 'group';

  // ── Edit state ─────────────────────────────────────────────
  // Only scheduled sessions are editable. Inline form (no separate
  // modal) — quicker for small tweaks like changing the start time.
  const [editing, setEditing] = useState(false);
  const [editGoal, setEditGoal] = useState<string>(session.session_goal ?? session.session_title ?? '');
  const [editMode, setEditMode] = useState<'group' | 'one_on_one' | 'solo'>(
    (session.session_mode ?? 'group') as 'group' | 'one_on_one' | 'solo',
  );
  const [editVisibility, setEditVisibility] = useState<'private' | 'presence' | 'public'>(
    (session.visibility ?? (session.session_mode === 'solo' ? 'private' : 'public')) as 'private' | 'presence' | 'public',
  );
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
        sessionMode: editMode,
        visibility: editVisibility,
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
      // If the user just cancelled the session that's CURRENTLY ACTIVE
      // in their floating timer / rejoin banner, clear that context too
      // so the UI doesn't keep pointing at the cancelled row.
      if (contextActive?.id === session.id) {
        clearSession();
      }
      onChanged?.();
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? 'Could not cancel.');
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
            status={isActive ? 'active' : isRecap ? undefined : 'scheduled'}
            durationMinutes={session.intended_duration_minutes}
            projectTitle={session.project_title}
            projectColor={session.project_color}
            isQuickTimer={session.is_quick_timer}
          />
        </div>

        {/* Edit form for owner-edit on scheduled sessions; otherwise
            just the read-only goal text. */}
        {editing && isMine && isScheduled ? (
          <div className="space-y-3 mb-4">
            {/* Goal */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary mb-1">
                Goal
              </label>
              <input
                type="text"
                value={editGoal}
                onChange={(e) => setEditGoal(e.target.value)}
                placeholder="What are you working on?"
                className="w-full px-3 py-2 rounded-lg text-sm stitch-text-primary bg-surface-container-low ring-1 ring-surface-container focus:ring-2 focus:ring-primary/30 outline-none"
              />
            </div>

            {/* Mode picker — lets the host re-classify a scheduled
                session as Solo / 1-on-1 / Group without deleting +
                recreating it. */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary mb-1">
                Mode
              </label>
              <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-surface-container-low ring-1 ring-surface-container">
                {([
                  { id: 'solo',       label: 'Solo',    Icon: User },
                  { id: 'one_on_one', label: '1-on-1',  Icon: UserPlus },
                  { id: 'group',      label: 'Group',   Icon: Users },
                ] as const).map(({ id, label, Icon }) => {
                  const active = editMode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setEditMode(id)}
                      className={`inline-flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
                        active ? 'bg-surface stitch-text-primary shadow-sm' : 'stitch-text-secondary hover:stitch-text-primary'
                      }`}
                    >
                      <Icon size={12} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visibility — three-level: who can see this session at
                all, and whether goal text is shared. group/1-on-1 are
                usually 'public' (discoverable in Find); solo defaults
                to 'private' but can be 'presence' if the host wants
                connections to see "focusing now" without the goal. */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary mb-1">
                Who sees this
              </label>
              <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-surface-container-low ring-1 ring-surface-container">
                {([
                  { id: 'private',  label: 'Private',  desc: 'Only me' },
                  { id: 'presence', label: 'Presence', desc: 'Connections see I\'m focusing' },
                  { id: 'public',   label: 'Public',   desc: 'Anyone can see + join' },
                ] as const).map(({ id, label }) => {
                  const active = editVisibility === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setEditVisibility(id)}
                      className={`inline-flex items-center justify-center py-1.5 rounded-md text-xs font-bold transition-colors ${
                        active ? 'bg-surface stitch-text-primary shadow-sm' : 'stitch-text-secondary hover:stitch-text-primary'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] stitch-text-secondary mt-1 leading-snug">
                {editVisibility === 'private'
                  ? 'Only you see this session. Not in feeds, not joinable.'
                  : editVisibility === 'presence'
                  ? 'Connections see you\'re focusing — but not what you\'re working on.'
                  : 'Goal + start time visible. Others can join (1-on-1/group).'}
              </p>
            </div>

            {/* Date/time — stacked vertically because datetime-local
                inputs need more horizontal room than half-width on
                mobile and the previous 2-col grid was truncating the
                time portion. */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary mb-1">
                When
              </label>
              <input
                type="datetime-local"
                value={editDatetime}
                onChange={(e) => setEditDatetime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm stitch-text-primary bg-surface-container-low ring-1 ring-surface-container focus:ring-2 focus:ring-primary/30 outline-none"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary mb-1">
                Duration
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={5}
                  max={180}
                  value={editMinutes}
                  onChange={(e) => setEditMinutes(e.target.value)}
                  className="w-24 px-3 py-2 rounded-lg text-sm font-bold stitch-text-primary tabular-nums bg-surface-container-low ring-1 ring-surface-container focus:ring-2 focus:ring-primary/30 outline-none"
                />
                <span className="text-xs stitch-text-secondary font-semibold">minutes · 5–180</span>
              </div>
            </div>
          </div>
        ) : isMissed ? (
          <div className="mb-4 rounded-2xl bg-amber-50/70 ring-1 ring-amber-200/60 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2">
              <CalendarClock size={15} className="text-amber-600 shrink-0" />
              <p className="text-sm font-extrabold text-amber-900">This one slipped by</p>
            </div>
            <p className="text-xs text-amber-800/90 leading-snug">
              No worries — it happens. You can leave it as a record or clear it off your calendar.
            </p>
            <div className="pt-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700/80 mb-0.5">Was going to be</p>
              <p className="text-sm font-semibold text-amber-900 leading-snug">
                {session.session_goal ?? session.session_title ?? 'A focus session'}
              </p>
            </div>
          </div>
        ) : isRecap ? (
          <div className="mb-4 rounded-2xl bg-surface-container-low/50 ring-1 ring-surface-container p-3.5 space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary">
              Session recap
            </p>

            {/* Intention */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider stitch-text-secondary mb-0.5">Intention</p>
              <p className="text-sm stitch-text-primary leading-snug">
                {session.session_goal ?? session.session_title ?? 'No intention recorded'}
              </p>
            </div>

            {/* Did you finish? — from the end-of-session debrief */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider stitch-text-secondary mb-0.5">Did you finish?</p>
              {(() => {
                const meta = OUTCOME_META[recapOutcome ?? 'none'] ?? OUTCOME_META.none;
                return <p className={`text-sm font-semibold ${meta.cls}`}>{meta.label}</p>;
              })()}
            </div>

            {/* Participants — group only, COUNT not names (privacy). */}
            {isGroup && participantCount > 1 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider stitch-text-secondary mb-0.5">Focused together</p>
                <p className="text-sm font-semibold stitch-text-primary inline-flex items-center gap-1.5">
                  <Users size={13} className="stitch-text-secondary" />
                  {participantCount} people
                </p>
              </div>
            )}

            {/* Mood — not captured yet; honest placeholder rather than a fake value */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider stitch-text-secondary mb-0.5">State of mind</p>
              <p className="text-xs stitch-text-secondary italic">Mood check-in (start &amp; end) isn't tracked yet — coming soon.</p>
            </div>
          </div>
        ) : (
          <p className="text-sm stitch-text-primary leading-snug mb-4">
            {session.session_goal ?? session.session_title ?? 'Working on something'}
          </p>
        )}

        {/* Segment timeline — only shown when the session has a
            structured template applied. Pure read-only preview. */}
        {session.segments && session.segments.length > 0 && (
          <div className="mb-4 rounded-2xl bg-surface-container-low/40 p-2.5">
            <p className="text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary mb-2 px-1">
              Structure · {session.segments.length} segments
            </p>
            <SegmentTimeline segments={session.segments as Segment[]} />
          </div>
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
          {isMine && isScheduled && !isRecap && !editing && !confirmingDelete && (
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
          {/* Missed session — gently offer to clear it off the calendar. */}
          {isMine && isMissed && !confirmingDelete && (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-rose-50 text-rose-700 text-sm font-bold hover:bg-rose-100 transition-colors"
            >
              <Trash2 size={13} /> Remove from calendar
            </button>
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
                {isMissed
                  ? 'Remove this missed session from your calendar? This just clears the record.'
                  : 'Cancel this scheduled session? It will be removed from your calendar.'}
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
              {/* Add-to-calendar only makes sense for sessions that haven't
                  happened yet — a past session is history. */}
              {!isRecap && (
                <button
                  type="button"
                  onClick={handleAddToCalendar}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-bold hover:bg-surface-container transition-colors"
                >
                  <CalendarPlus size={14} />
                  Add to calendar
                </button>
              )}
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

// ── Month view ──────────────────────────────────────────────────
//
// 6-row × 7-col grid covering the visible month + leading/trailing
// spill days from adjacent months. Each cell shows:
//   • Day number (dimmed if out-of-month)
//   • Up to N session pills (responsive — fewer on mobile)
//   • "+ X more" overflow when a day has more sessions than fit
// Tap a cell → switch to Days view anchored on that day. Tap a pill
// → open SessionDetailSheet directly. Tap the empty area of a future
// cell → open the schedule modal at 9am of that day.

function MonthView({
  anchor,
  allSessions,
  userId,
  onPickDay,
  onPickSlot,
  onSelectSession,
}: {
  anchor: Date;
  allSessions: GridSession[];
  userId: string | undefined;
  onPickDay: (d: Date) => void;
  onPickSlot: (at: Date) => void;
  onSelectSession: (s: GridSession) => void;
}) {
  const today = startOfDay(new Date());
  const gridStart = startOfMonthGrid(anchor);
  // 42 = 6 weeks × 7 days. Always render a full 6-row grid so the
  // layout doesn't jump when months span 5 vs 6 visual weeks.
  const cells = useMemo(
    () => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)),
    [gridStart]
  );
  const targetMonth = anchor.getMonth();

  // Bucket sessions by ISO yyyy-mm-dd of their startsAt for O(1) lookup.
  const byDay = useMemo(() => {
    const m = new Map<string, GridSession[]>();
    for (const s of allSessions) {
      const k = `${s.startsAt.getFullYear()}-${s.startsAt.getMonth()}-${s.startsAt.getDate()}`;
      const arr = m.get(k) ?? [];
      arr.push(s);
      m.set(k, arr);
    }
    // Sort each day's sessions chronologically so the pills read top→bottom.
    for (const arr of m.values()) arr.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    return m;
  }, [allSessions]);

  // Mon-first DOW header (matches en-GB locale convention).
  const dowLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // ── Hover popover (desktop only) ─────────────────────────────
  // Pointer-capable devices get a "peek the full day" popover on
  // hover. Touch devices skip this entirely — tapping a cell still
  // drills into Days view, which is the better interaction there.
  const [canHover, setCanHover] = useState<boolean>(() =>
    typeof window === 'undefined' ? false : window.matchMedia('(hover: hover) and (pointer: fine)').matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(hover: hover) and (pointer: fine)');
    const handler = (e: MediaQueryListEvent) => setCanHover(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const [hoverDay, setHoverDay] = useState<{ day: Date; rect: DOMRect } | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  function scheduleOpen(day: Date, target: HTMLElement) {
    if (!canHover) return;
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (openTimerRef.current != null) window.clearTimeout(openTimerRef.current);
    openTimerRef.current = window.setTimeout(() => {
      setHoverDay({ day, rect: target.getBoundingClientRect() });
    }, 140);
  }
  function scheduleClose() {
    if (openTimerRef.current != null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setHoverDay(null), 120);
  }
  function cancelClose() {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }
  // Clear any pending timers when the view unmounts or the anchor changes.
  useEffect(() => () => {
    if (openTimerRef.current != null) window.clearTimeout(openTimerRef.current);
    if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current);
  }, []);

  const hoverItems = hoverDay
    ? byDay.get(`${hoverDay.day.getFullYear()}-${hoverDay.day.getMonth()}-${hoverDay.day.getDate()}`) ?? []
    : [];

  return (
    <div className="lg:flex-1 lg:min-h-0 rounded-2xl bg-surface-container-low overflow-hidden flex flex-col border border-surface-container/50">
      {/* DOW header row */}
      <div className="shrink-0 grid grid-cols-7 border-b border-surface-container">
        {dowLabels.map((d) => (
          <div key={d} className="px-2 py-2.5 sm:py-2 text-center text-[11px] sm:text-[10px] font-bold tracking-widest uppercase stitch-text-secondary">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d[0]}</span>
          </div>
        ))}
      </div>

      {/* 6×7 grid. Mobile gets a minimum row height so cells aren't
          crushed into 30px tall slivers — the calendar grows downward
          past the viewport when needed, with normal page scroll
          revealing the rest. Desktop keeps the auto-fit behaviour. */}
      <div className="grid grid-cols-7 grid-rows-6 lg:flex-1 lg:min-h-0 auto-rows-[7rem] lg:auto-rows-fr lg:grid-rows-[repeat(6,minmax(0,1fr))]">
        {cells.map((d) => {
          const inMonth = d.getMonth() === targetMonth;
          const isToday = sameDay(d, today);
          const isPast = d.getTime() < today.getTime();
          const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          const dayItems = byDay.get(k) ?? [];
          // Show 2 pills on mobile, 3 on desktop. Overflow becomes a chip.
          const visibleMobile = dayItems.slice(0, 2);
          const visibleDesktop = dayItems.slice(0, 3);
          const overflowMobile = dayItems.length - visibleMobile.length;
          const overflowDesktop = dayItems.length - visibleDesktop.length;

          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                // Empty future cell → schedule; otherwise drill into the day.
                if (dayItems.length === 0 && !isPast) {
                  const at = new Date(d);
                  at.setHours(9, 0, 0, 0);
                  onPickSlot(at);
                } else {
                  onPickDay(d);
                }
              }}
              onMouseEnter={(e) => {
                if (dayItems.length > 0) scheduleOpen(d, e.currentTarget);
              }}
              onMouseLeave={scheduleClose}
              className={`relative text-left p-1 sm:p-1.5 border-r border-b border-surface-container/60 last:border-r-0 overflow-hidden transition-colors ${
                !inMonth
                  ? 'bg-surface-container-low/40'
                  : isPast
                  ? 'bg-surface-container-low/30'
                  : 'bg-surface'
              } ${isToday ? 'ring-2 ring-inset ring-primary/40' : ''} hover:bg-primary/5`}
              aria-label={`${d.toDateString()}, ${dayItems.length} session${dayItems.length === 1 ? '' : 's'}`}
            >
              {/* Date number — emphasised when today, dimmed when out-of-month. */}
              <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                <span
                  className={`inline-flex items-center justify-center text-sm sm:text-xs font-extrabold tabular-nums ${
                    isToday
                      ? 'w-6 h-6 sm:w-6 sm:h-6 rounded-full bg-primary text-white'
                      : !inMonth
                      ? 'stitch-text-secondary opacity-60'
                      : isPast
                      ? 'stitch-text-secondary opacity-70'
                      : 'stitch-text-primary'
                  }`}
                >
                  {d.getDate()}
                </span>
                {dayItems.length > 0 && !isToday && (
                  <span className="text-[9px] font-bold stitch-text-secondary tabular-nums">
                    {dayItems.length}
                  </span>
                )}
              </div>

              {/* Session pills — responsive cap */}
              <div className="space-y-0.5 sm:hidden">
                {visibleMobile.map((s) => (
                  <MonthPill key={s.id} session={s} isMine={s.user_id === userId} onClick={() => onSelectSession(s)} />
                ))}
                {overflowMobile > 0 && (
                  <p className="text-[9px] font-bold stitch-text-secondary leading-none px-1">+{overflowMobile}</p>
                )}
              </div>
              <div className="space-y-0.5 hidden sm:block">
                {visibleDesktop.map((s) => (
                  <MonthPill key={s.id} session={s} isMine={s.user_id === userId} onClick={() => onSelectSession(s)} />
                ))}
                {overflowDesktop > 0 && (
                  <p className="text-[10px] font-bold stitch-text-secondary leading-none px-1">+{overflowDesktop} more</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {hoverDay && hoverItems.length > 0 && (
        <MonthHoverPopover
          day={hoverDay.day}
          rect={hoverDay.rect}
          items={hoverItems}
          userId={userId}
          onPickDay={onPickDay}
          onSelectSession={onSelectSession}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}
    </div>
  );
}

/** Floating popover anchored to a month cell. Renders into document.body
 *  via a portal so it isn't clipped by the calendar's `overflow-hidden`
 *  shell. Position is computed once from the cell's bounding rect; we
 *  don't re-measure on scroll — the popover dismisses fast enough on
 *  mouseleave that drift isn't a real-world issue. */
function MonthHoverPopover({
  day, rect, items, userId,
  onPickDay, onSelectSession, onMouseEnter, onMouseLeave,
}: {
  day: Date;
  rect: DOMRect;
  items: GridSession[];
  userId: string | undefined;
  onPickDay: (d: Date) => void;
  onSelectSession: (s: GridSession) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const POPOVER_W = 280;
  const margin = 8;
  // Prefer to the right of the cell; flip to left if it would overflow.
  const vw = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const vh = typeof window === 'undefined' ? 800 : window.innerHeight;
  let left = rect.right + margin;
  if (left + POPOVER_W + margin > vw) left = Math.max(margin, rect.left - POPOVER_W - margin);
  // Anchor near the top of the cell. Clamp so it doesn't run off the
  // bottom — assume max popover height ~ 60vh.
  const maxH = Math.min(vh * 0.6, 480);
  let top = rect.top;
  if (top + maxH > vh - margin) top = Math.max(margin, vh - margin - maxH);

  return createPortal(
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ position: 'fixed', top, left, width: POPOVER_W, maxHeight: maxH, zIndex: 60 }}
      className="rounded-2xl bg-surface ring-1 ring-surface-container shadow-2xl flex flex-col overflow-hidden"
      role="dialog"
      aria-label={`Schedule for ${day.toDateString()}`}
    >
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 border-b border-surface-container/70 bg-surface-container-low/40">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary">
            {day.toLocaleDateString('en-GB', { weekday: 'long' })}
          </p>
          <p className="text-sm font-extrabold stitch-text-primary leading-tight">
            {day.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
          </p>
        </div>
        <span className="text-[10px] font-bold stitch-text-secondary tabular-nums">
          {items.length} session{items.length === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {items.map((s) => {
          const time = s.startsAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          const end = new Date(s.startsAt.getTime() + s.intended_duration_minutes * 60_000)
            .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          const title = s.session_title ?? s.session_goal ?? (s.session_mode === 'solo' ? 'Solo focus' : 'Session');
          const tone =
            s.session_mode === 'solo'
              ? 'bg-rose-500'
              : s.session_mode === 'one_on_one'
              ? 'bg-violet-500'
              : 'bg-blue-500';
          const isMine = s.user_id === userId;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelectSession(s)}
                className="w-full flex items-start gap-2 px-2 py-2 rounded-lg text-left hover:bg-surface-container-low transition-colors"
              >
                <span className={`shrink-0 mt-1 w-1.5 h-1.5 rounded-full ${tone}`} aria-hidden />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold stitch-text-secondary tabular-nums">
                    {time} – {end}
                  </p>
                  <p className="text-sm font-bold stitch-text-primary leading-tight truncate">
                    {title}
                  </p>
                  <p className="text-[10px] stitch-text-secondary truncate">
                    {s.session_mode === 'solo' ? 'Solo' : s.session_mode === 'one_on_one' ? '1-on-1' : 'Group'}
                    {!isMine && ` · ${s.display_name}`}
                    {s.project_title && ` · ${s.project_title}`}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => onPickDay(day)}
        className="shrink-0 px-3 py-2 text-[11px] font-extrabold uppercase tracking-widest stitch-text-secondary hover:stitch-text-primary hover:bg-surface-container-low/60 border-t border-surface-container/70 transition-colors text-center"
      >
        Open day in time grid →
      </button>
    </div>,
    document.body,
  );
}

/** A single session pill inside a month cell. Compact — just a colour
 *  dot, the start time, and a truncated label. Click bubbles up via
 *  stopPropagation so the parent cell's onClick (drill-into-day)
 *  doesn't fire when the user actually wanted the session itself. */
function MonthPill({
  session,
  isMine,
  onClick,
}: {
  session: GridSession;
  isMine: boolean;
  onClick: () => void;
}) {
  const time = session.startsAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const label = session.session_title ?? session.session_goal ?? (session.session_mode === 'solo' ? 'Solo focus' : 'Session');
  // Mode-based colour matches the legend chips in the sidebar.
  const tone =
    session.session_mode === 'solo'
      ? 'bg-rose-100 text-rose-800 ring-rose-200'
      : session.session_mode === 'one_on_one'
      ? 'bg-violet-100 text-violet-800 ring-violet-200'
      : 'bg-blue-100 text-blue-800 ring-blue-200';
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onClick(); } }}
      className={`flex items-center gap-1 px-1.5 py-[2px] rounded-md text-[9px] sm:text-[10px] font-bold ring-1 truncate cursor-pointer ${tone} ${isMine ? '' : 'opacity-90'}`}
      title={`${time} · ${label}`}
    >
      <span className="tabular-nums shrink-0">{time}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}

// ── Week view (agenda) ──────────────────────────────────────────
//
// Mon→Sun list of days. Each day is a section header (date pill +
// weekday) with the day's sessions listed beneath as compact rows.
// Today gets an emerald highlight on the date pill — same treatment
// the reference design uses. Empty days show "No sessions" with a
// tappable "+ Book" affordance.

function WeekAgendaView({
  weekStart,
  allSessions,
  onSelectSession,
  onBookSlot,
}: {
  weekStart: Date;
  allSessions: GridSession[];
  onSelectSession: (s: GridSession) => void;
  onBookSlot: (day: Date) => void;
}) {
  const today = startOfDay(new Date());
  const days7 = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Bucket sessions by yyyy-mm-dd of their startsAt, sorted chronologically.
  const byDay = useMemo(() => {
    const m = new Map<string, GridSession[]>();
    for (const s of allSessions) {
      const k = `${s.startsAt.getFullYear()}-${s.startsAt.getMonth()}-${s.startsAt.getDate()}`;
      const arr = m.get(k) ?? [];
      arr.push(s);
      m.set(k, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    return m;
  }, [allSessions]);

  return (
    <div className="flex-1 min-h-0 rounded-2xl bg-surface overflow-hidden flex flex-col border border-surface-container/50">
      <div className="flex-1 overflow-y-auto divide-y divide-surface-container/60">
        {days7.map((d) => {
          const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          const items = byDay.get(k) ?? [];
          const isToday = sameDay(d, today);
          const isPast = d.getTime() < today.getTime();
          return (
            <section key={k} className="flex gap-3 px-3 sm:px-4 py-3">
              {/* Date pill — emerald when today, dim when past */}
              <div className="shrink-0 w-12 text-center">
                <p className={`text-[10px] font-extrabold uppercase tracking-widest ${
                  isToday ? 'text-emerald-600' : isPast ? 'stitch-text-secondary opacity-60' : 'stitch-text-secondary'
                }`}>
                  {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                </p>
                <p className={`mt-0.5 inline-flex items-center justify-center w-8 h-8 rounded-full text-base font-extrabold tabular-nums ${
                  isToday
                    ? 'bg-emerald-500 text-white'
                    : isPast
                    ? 'stitch-text-secondary opacity-60'
                    : 'stitch-text-primary'
                }`}>
                  {d.getDate()}
                </p>
              </div>

              {/* Sessions for this day, or empty-state row */}
              <div className="flex-1 min-w-0 space-y-1.5">
                {items.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => !isPast && onBookSlot(d)}
                    disabled={isPast}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs italic transition-colors ${
                      isPast
                        ? 'stitch-text-secondary opacity-50 cursor-default'
                        : 'stitch-text-secondary hover:bg-surface-container-low hover:not-italic hover:stitch-text-primary'
                    }`}
                  >
                    {isPast ? 'Nothing recorded' : 'No sessions — tap to book'}
                  </button>
                ) : (
                  items.map((s) => <WeekAgendaRow key={s.id} session={s} onClick={() => onSelectSession(s)} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Single session row in the week agenda. Time on the left in a small
 *  caption, title + mode chip in the body, colour stripe to the left
 *  matches the session_mode (rose=solo, violet=1-on-1, blue=group). */
function WeekAgendaRow({
  session,
  onClick,
}: {
  session: GridSession;
  onClick: () => void;
}) {
  const time = session.startsAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const end = new Date(session.startsAt.getTime() + session.intended_duration_minutes * 60_000)
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const title = session.session_title ?? session.session_goal ?? (session.session_mode === 'solo' ? 'Solo focus' : 'Session');

  const stripe =
    session.session_mode === 'solo' ? 'bg-rose-400' :
    session.session_mode === 'one_on_one' ? 'bg-violet-500' :
    'bg-blue-500';
  const bg =
    session.session_mode === 'solo' ? 'bg-rose-50 hover:bg-rose-100/70 ring-rose-100' :
    session.session_mode === 'one_on_one' ? 'bg-violet-50 hover:bg-violet-100/70 ring-violet-100' :
    'bg-blue-50 hover:bg-blue-100/70 ring-blue-100';
  const modeLabel =
    session.session_mode === 'solo' ? 'Solo' :
    session.session_mode === 'one_on_one' ? '1-on-1' : 'Group';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full flex items-center gap-2.5 pl-3 pr-3 py-2 rounded-lg ring-1 transition-colors text-left overflow-hidden ${bg}`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${stripe}`} aria-hidden />
      <span className="flex-1 min-w-0">
        <span className="block text-[11px] font-bold stitch-text-secondary tabular-nums">
          {time} – {end}
        </span>
        <span className="block text-sm font-bold stitch-text-primary truncate leading-tight">
          {title}
        </span>
      </span>
      <span className="shrink-0 text-[9px] font-extrabold uppercase tracking-widest stitch-text-secondary">
        {modeLabel}
      </span>
    </button>
  );
}

// ── Mobile action sheet ─────────────────────────────────────────
//
// Single-CTA replacement for the 5-button mobile sidebar stack.
// Tapping "Start a session" on the mobile sidebar opens this sheet
// with all 5 lanes as full-width rows. Same handlers, same destinations,
// but the calendar grid stays the page focus instead of scrolling
// past a tall CTA column to reach it.

function MobileActionSheet({
  matchBusy,
  onClose,
  onMatch,
  onSolo,
  onSchedule,
  onFind,
}: {
  matchBusy: boolean;
  onClose: () => void;
  onMatch: () => void;
  onSolo: () => void;
  onSchedule: () => void;
  onFind: () => void;
}) {
  // Lock body scroll while the sheet is open — same pattern as the
  // other portal sheets in this codebase.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const rows = [
    {
      id: 'match',
      Icon: Zap,
      label: 'Match me now',
      desc: 'Auto-pair with the next person looking',
      onClick: onMatch,
      bg: 'bg-gradient-to-br from-amber-400 to-rose-500',
      busy: matchBusy,
    },
    {
      id: 'solo',
      Icon: User,
      label: 'Solo session',
      desc: 'Focus alone, optional video room',
      onClick: onSolo,
      bg: 'bg-gradient-to-br from-violet-500 to-purple-600',
    },
    {
      id: 'schedule',
      Icon: CalIcon,
      label: 'Schedule a session',
      desc: 'Pick a future time, any mode',
      onClick: onSchedule,
      bg: 'bg-gradient-to-br from-blue-600 to-indigo-600',
    },
    {
      id: 'find',
      Icon: Search,
      label: 'Find a session',
      desc: 'Browse open public + 1-on-1 slots',
      onClick: onFind,
      bg: 'bg-gradient-to-br from-cyan-500 to-blue-600',
    },
  ] as const;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md sm:p-4"
      onClick={onClose}
    >
      {/*
        Responsive shell:
        • Mobile (<sm): full-width bottom sheet, 85dvh tall, rounded-top
        • Desktop (sm+): centred modal, max-w-md, rounded all corners,
          height shrinks to content with a max-h cap. Picks up the
          same pattern other portal sheets in this app use.
      */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[85dvh] sm:h-auto sm:max-h-[85vh] overflow-hidden"
        role="dialog"
        aria-label="Start a session"
      >
        {/* Drag handle (mobile only) + title + close */}
        <div className="shrink-0 relative px-5 pt-3 pb-2 border-b border-surface-container/60">
          <div className="sm:hidden absolute left-1/2 -translate-x-1/2 top-1.5 w-10 h-1 rounded-full bg-surface-container-high/70" aria-hidden />
          <div className="flex items-center justify-between mt-2 sm:mt-0">
            <p className="text-base font-extrabold stitch-text-primary">Start a session</p>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full grid place-items-center stitch-text-secondary hover:bg-surface-container-low"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Action rows — bigger touch targets + breathing room so the
            sheet feels intentionally sized, not crammed at the bottom. */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2.5">
          {rows.map(({ id, Icon, label, desc, onClick, bg, busy }) => (
            <button
              key={id}
              type="button"
              onClick={onClick}
              disabled={busy}
              className="w-full flex items-center gap-3.5 px-4 py-4 rounded-2xl bg-surface-container-low hover:bg-surface-container active:scale-[0.99] transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className={`w-14 h-14 rounded-2xl shrink-0 grid place-items-center text-white shadow-md ${bg}`}>
                {busy ? <Loader2 size={22} className="animate-spin" /> : <Icon size={22} />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-base font-extrabold stitch-text-primary leading-tight">
                  {label}
                </span>
                <span className="block text-[13px] stitch-text-secondary leading-snug mt-1">
                  {desc}
                </span>
              </span>
            </button>
          ))}

          {/* Quick Timer — kept as the existing interactive pill so the
              user gets the activity picker + duration controls inline.
              Sits below the four primary actions, separated by a
              thin divider so it reads as a distinct "one-tap" lane. */}
          <div className="pt-2 mt-1 border-t border-surface-container/60">
            <p className="text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary mb-2 px-1">
              Or one-tap timer
            </p>
            <div className="w-full flex justify-center">
              {/* onStarted closes the action sheet too, so launching a
                  quick timer collapses BOTH bottom sheets in one
                  gesture rather than leaving the action sheet visible
                  behind the navigated-away active session view.
                  forcePortal ensures the dropdown renders as its own
                  centred popup on desktop (640–1023px) where the
                  action sheet itself is also a centred popup — an
                  anchored dropdown would otherwise be clipped inside
                  the action sheet's bounds. */}
              <QuickTimerButton align="left" onStarted={onClose} forcePortal />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Inline session-mode chip ────────────────────────────────────
//
// Tiny coloured pill used at the top of each SessionBlock so the
// calendar can be scanned by session type at a glance. Distinct from
// SessionTagPills (used in the detail sheet + other surfaces) — this
// variant is monochrome per-mode and includes a participant count for
// 1-on-1 sessions ("1/2" when open, "2/2" when filled).

function SessionModeChip({
  mode,
  isQuickTimer,
  partnerCount,
}: {
  mode: 'group' | 'one_on_one' | 'solo' | undefined;
  isQuickTimer?: boolean;
  /** Only meaningful for 1-on-1. null otherwise. */
  partnerCount: number | null;
}) {
  // Quick Timer is a special-case of solo with a different label so
  // users can tell their "tap a timer, go" sessions apart from full
  // Solo Sessions (which optionally have video, project pinning, etc.).
  const label = isQuickTimer
    ? 'Timer'
    : mode === 'one_on_one'
    ? '1-on-1'
    : mode === 'group'
    ? 'Group'
    : 'Solo';

  const tone = isQuickTimer
    ? 'bg-amber-100 text-amber-800 ring-amber-200'
    : mode === 'one_on_one'
    ? 'bg-violet-100 text-violet-800 ring-violet-200'
    : mode === 'group'
    ? 'bg-blue-100 text-blue-800 ring-blue-200'
    : 'bg-rose-100 text-rose-800 ring-rose-200';

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-[1px] rounded-full ring-1 text-[9px] font-extrabold uppercase tracking-wider leading-none whitespace-nowrap shrink-0 ${tone}`}
    >
      {label}
      {partnerCount != null && (
        <>
          <span className="opacity-50" aria-hidden>·</span>
          <span className="tabular-nums">{partnerCount}/2</span>
        </>
      )}
    </span>
  );
}

// ── Empty-state helper export (unused locally but useful for marketing mirror) ──
export { CalIcon };
