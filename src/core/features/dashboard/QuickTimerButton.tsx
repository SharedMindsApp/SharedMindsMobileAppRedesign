// QuickTimerButton
//
// The low-friction lane for starting a focus session. Two clicks max
// from anywhere in the app, with three ways to choose what you're
// doing:
//
//   1. Pick a Quick Activity (Cold calling, Research, Social posts…)
//      — seeded from the user's work_types via ActivityService.
//   2. Type a custom one-off goal in the inline input.
//   3. Just start with no goal — falls back to "Quick focus".
//
// And two ways to choose WHEN:
//   • Now (default) — solo session starts immediately.
//   • Schedule for later — picks a future slot via 4 time chips
//     (Tonight / Tomorrow / Custom). Creates a scheduled_session row.
//
// Solo Session (DeclareSessionModal) remains the deliberate lane for
// bespoke goals + project pinning + body-double / real-world modes.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Timer, ChevronDown, Calendar, Plus, Settings2, Search, Library, Pin } from 'lucide-react';
import { startCommunitySession, createScheduledSession } from '../../services/SessionService';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { useAuth } from '../../auth/AuthProvider';
import { ActivityService, type UserActivity, type ActivityTemplate } from '../../services/ActivityService';
import { ActivityManagerSheet } from './ActivityManagerSheet';
import { ActivityPickerSheet } from './ActivityPickerSheet';

const PRESETS: Array<{ minutes: number; label: string }> = [
  { minutes: 10, label: '10 min' },
  { minutes: 15, label: '15 min' },
  { minutes: 25, label: '25 min' },
  { minutes: 50, label: '50 min' },
  { minutes: 75, label: '75 min' },
  { minutes: 90, label: '90 min' },
];

const LS_LAST = 'sm.quickTimer.lastMinutes';
function readLast(): number {
  if (typeof window === 'undefined') return 25;
  const n = parseInt(window.localStorage.getItem(LS_LAST) ?? '25', 10);
  return Number.isFinite(n) && n >= 5 && n <= 180 ? n : 25;
}
function writeLast(n: number): void {
  try { window.localStorage.setItem(LS_LAST, String(n)); } catch { /* private */ }
}

// One pinned "go-to" activity per user. Survives refresh and is
// auto-selected when the dropdown opens so the primary button reads
// "Quick timer · ☎️ Cold calling · 25m" without the user having to
// re-pick every time. Stored as the user_activity id; null = no pin.
const LS_PINNED = 'sm.quickTimer.pinnedActivityId';
function readPinned(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(LS_PINNED);
}
function writePinned(id: string | null): void {
  try {
    if (id) window.localStorage.setItem(LS_PINNED, id);
    else window.localStorage.removeItem(LS_PINNED);
  } catch { /* private */ }
}

/** Backend constraint: durationMinutes is typed as 25 | 50 | 90 but the
 *  underlying focus_sessions column accepts any integer. The cast is
 *  intentional — see comment in SessionService.startCommunitySession. */
function asValidDuration(n: number): 25 | 50 | 90 {
  return n as 25 | 50 | 90;
}

// ── Scheduling helpers ──────────────────────────────────────────

interface TimeChip {
  id: string;
  label: string;
  /** Returns the absolute Date this chip resolves to at click-time. */
  resolve: () => Date;
}

/** Quick time chips. Resolution is intentionally lazy so e.g.
 *  "Tonight 7pm" updates relative to *when the user clicks*, not when
 *  the dropdown was first rendered. */
const TIME_CHIPS: TimeChip[] = [
  {
    id: 'tonight',
    label: 'Tonight 7pm',
    resolve: () => {
      const d = new Date();
      d.setHours(19, 0, 0, 0);
      if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
      return d;
    },
  },
  {
    id: 'tomorrow-am',
    label: 'Tomorrow 9am',
    resolve: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
  {
    id: 'tomorrow-pm',
    label: 'Tomorrow 2pm',
    resolve: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(14, 0, 0, 0);
      return d;
    },
  },
];

function isoLocal(d: Date): string {
  // YYYY-MM-DDTHH:mm — local-time format for <input type="datetime-local">
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Component ───────────────────────────────────────────────────

interface Props {
  /** Optional project to pin the timer to. Currently unused by the
   *  Quick Timer (activities are project-less by design) but kept for
   *  future "start a timer for this project" entry points. */
  projectId?: string | null;
  /** Compact = pill button, no expand menu. Default false. */
  compact?: boolean;
  /** Which side of the button the dropdown anchors to. Default 'right'
   *  works for buttons sitting on the right of the content area (home
   *  hero). Use 'left' when the button sits on the left edge (e.g.
   *  inside a narrow sidebar) so the dropdown extends rightward into
   *  the page rather than off-screen. */
  align?: 'left' | 'right';
  className?: string;
}

export function QuickTimerButton({ projectId = null, compact = false, align = 'right', className = '' }: Props) {
  const navigate = useNavigate();
  const { setActiveSession } = useFocusSession();
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultMinutes] = useState<number>(() => readLast());

  // ── Activity state ─────────────────────────────────────────
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<UserActivity | null>(null);
  /** Pinned activity id from localStorage — survives refresh. The
   *  pinned activity becomes the *default* effective selection: it's
   *  used whenever the user hasn't explicitly picked another chip
   *  (or typed a custom goal). Rendered first in the chip row with
   *  a filled pin marker. */
  const [pinnedId, setPinnedId] = useState<string | null>(() => readPinned());
  function togglePin(id: string) {
    const next = pinnedId === id ? null : id;
    setPinnedId(next);
    writePinned(next);
  }
  const [customGoal, setCustomGoal] = useState<string>('');
  /** The pinned activity hydrated from the user's list. Re-derived
   *  every render so it stays in sync if `activities` updates. */
  const pinnedActivity = pinnedId ? activities.find((a) => a.id === pinnedId) ?? null : null;
  /** Effective = explicit selection OR pinned fallback. Used
   *  everywhere downstream — goal text, duration default, chip
   *  highlight, primary button label. Custom goal text in the
   *  one-off field overrides this entirely (see resolveGoalText). */
  const effectiveActivity = selectedActivity ?? pinnedActivity;
  // The duration that actually goes to the backend — derived from
  // (in priority order) the inline override, the effective activity's
  // default, or the user's last-used minutes.
  const [overrideMinutes, setOverrideMinutes] = useState<number | null>(null);
  const minutes = overrideMinutes ?? effectiveActivity?.default_minutes ?? defaultMinutes;

  // ── Scheduling state ───────────────────────────────────────
  const [scheduleMode, setScheduleMode] = useState(false);
  const [customDatetime, setCustomDatetime] = useState<string>('');

  // ── Search across my list + library ────────────────────────
  // The user's chip row only shows the top 10 by default. When they
  // start typing in the search box we filter MY activities AND lazy-
  // load the full library so they can find anything without opening
  // the Manage sheet first. A library match doesn't auto-adopt — it
  // just sets the goal text for THIS session, keeping the dropdown
  // light and uncluttered.
  const [search, setSearch] = useState('');
  const [allTemplates, setAllTemplates] = useState<ActivityTemplate[] | null>(null);
  useEffect(() => {
    if (!menuOpen || allTemplates !== null) return;
    let cancelled = false;
    ActivityService.listTemplates(profile?.work_types ?? undefined)
      .then((t) => { if (!cancelled) setAllTemplates(t); })
      .catch((e) => console.warn('[QuickTimer] templates load failed', e));
    return () => { cancelled = true; };
  }, [menuOpen, allTemplates, profile?.work_types]);

  // ── Manager sheet ──────────────────────────────────────────
  const [managerOpen, setManagerOpen] = useState(false);
  /** Re-fetch activities after the manager closes — the user may have
   *  archived rows, added customs, or adopted templates. */
  async function reloadActivities() {
    try {
      const mine = await ActivityService.listMine();
      setActivities(mine);
      // If the currently-selected activity was archived, clear selection.
      if (selectedActivity && !mine.some((a) => a.id === selectedActivity.id)) {
        setSelectedActivity(null);
      }
    } catch (e) {
      console.warn('[QuickTimer] reload activities failed', e);
    }
  }

  // Lazy-load activities on first menu open. If the user has none we
  // surface the picker overlay (let them choose explicitly) instead
  // of guessing via the auto-seed — that consistently picked things
  // people didn't actually do.
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen || activitiesLoaded) return;
    let cancelled = false;
    (async () => {
      const mine = await ActivityService.listMine();
      if (cancelled) return;
      setActivities(mine);
      setActivitiesLoaded(true);
      // If the pin points at an activity that's been archived/removed,
      // clear it so we don't show a stale label. No need to seed
      // selectedActivity from the pin — effectiveActivity derives it
      // implicitly whenever selectedActivity is null.
      if (pinnedId) {
        const pinned = mine.find((a) => a.id === pinnedId);
        if (!pinned) {
          setPinnedId(null);
          writePinned(null);
        }
      }
      // Day-zero — kick the user into the picker so they curate
      // their own shortcuts instead of inheriting whatever the seed
      // guessed. Only auto-opens once per dropdown lifecycle.
      if (mine.length === 0) setPickerOpen(true);
    })().catch((e) => console.warn('[QuickTimer] activity load failed', e));
    return () => { cancelled = true; };
  }, [menuOpen, activitiesLoaded]);

  /** The goal text that ends up on the focus_sessions row.
   *  Priority: selected activity → typed custom goal → fallback. */
  function resolveGoalText(): string {
    if (effectiveActivity) return effectiveActivity.label;
    const c = customGoal.trim();
    if (c) return c;
    return 'Quick focus';
  }

  async function startNow() {
    if (busy) return;
    const safe = Math.min(180, Math.max(5, Math.round(minutes)));
    setBusy(true);
    setError(null);
    try {
      const session = await startCommunitySession({
        goalText: resolveGoalText(),
        durationMinutes: asValidDuration(safe),
        sessionMode: 'solo',
        projectId: projectId ?? undefined,
        isQuickTimer: true,
      });
      writeLast(safe);
      if (effectiveActivity) ActivityService.bumpUsage(effectiveActivity.id).catch(() => {});
      setActiveSession(session as any);
      navigate(`/session/${session.id}`);
    } catch (e: any) {
      setError(e?.message ?? 'Could not start the timer.');
      setBusy(false);
    }
  }

  async function schedule(at: Date) {
    if (busy) return;
    if (at.getTime() <= Date.now()) {
      setError('Pick a future time.');
      return;
    }
    const safe = Math.min(180, Math.max(5, Math.round(minutes)));
    setBusy(true);
    setError(null);
    try {
      await createScheduledSession({
        title: resolveGoalText(),
        goalText: resolveGoalText(),
        durationMinutes: asValidDuration(safe),
        sessionMode: 'solo',
        scheduledAt: at,
        projectId: projectId ?? undefined,
        isQuickTimer: true,
      });
      writeLast(safe);
      if (effectiveActivity) ActivityService.bumpUsage(effectiveActivity.id).catch(() => {});
      setMenuOpen(false);
      setBusy(false);
      // Light user feedback — navigate to the sessions list so they
      // see their newly-scheduled block on the calendar.
      navigate('/sessions');
    } catch (e: any) {
      setError(e?.message ?? 'Could not schedule the timer.');
      setBusy(false);
    }
  }

  function handleCustomScheduleStart() {
    if (!customDatetime) {
      setError('Pick a date and time.');
      return;
    }
    const d = new Date(customDatetime);
    if (Number.isNaN(d.getTime())) {
      setError('Invalid date.');
      return;
    }
    schedule(d);
  }

  // ── Compact pill (used inline on cards) ────────────────────
  if (compact) {
    return (
      <button
        type="button"
        onClick={() => startNow()}
        disabled={busy}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold bg-surface-container-low stitch-text-primary hover:bg-surface-container transition-colors disabled:opacity-50 ${className}`}
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Timer size={12} />}
        Quick timer
      </button>
    );
  }

  // ── Main button + dropdown ─────────────────────────────────
  const primaryLabel = effectiveActivity
    ? `${effectiveActivity.emoji} ${effectiveActivity.label} · ${minutes}m`
    : `Quick timer · ${minutes}m`;

  return (
    <div className={`relative ${className}`}>
      <div className="inline-flex rounded-full overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => (scheduleMode ? null : startNow())}
          disabled={busy || scheduleMode}
          title={scheduleMode ? 'Pick a time below' : 'Start now'}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-60 max-w-[260px]"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Timer size={14} />}
          <span className="truncate">{primaryLabel}</span>
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          disabled={busy}
          aria-label="Pick activity or duration"
          className="inline-flex items-center justify-center w-9 bg-slate-800 hover:bg-slate-700 text-white border-l border-white/10 transition-colors disabled:opacity-60"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {menuOpen && !busy && (
        <div className={`absolute z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-surface ring-1 ring-surface-container-high shadow-2xl overflow-hidden ${align === 'left' ? 'left-0' : 'right-0'}`}>

          {/* ── Activities row ────────────────────────────────────
              Most-recent first (sorted server-side). Tap to select —
              the chip becomes active and the duration auto-fills from
              the activity's default.

              When the search box has text we switch to a flat list of
              matches across BOTH the user's activities and the full
              library, so they can find anything without opening Manage.
              Library matches use a "use once" picker that sets the
              goal text without permanently adopting the template. */}
          <div className="px-3 pt-3 pb-2 max-h-[220px] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary">
                Quick activities
              </p>
              <button
                type="button"
                onClick={() => setManagerOpen(true)}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:opacity-70 transition-opacity"
                title="Manage your activities"
              >
                <Settings2 size={10} /> Manage
              </button>
            </div>

            {/* Search — filters my list + library when present */}
            <div className="relative mb-2">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 stitch-text-secondary pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search activities…"
                className="w-full pl-7 pr-2 py-1.5 rounded-lg text-xs stitch-text-primary bg-surface-container-low ring-1 ring-surface-container focus:ring-2 focus:ring-primary/30 outline-none"
              />
            </div>

            {(() => {
              // Build the visible result set based on whether the user
              // is searching. Empty search = the curated top-10 chip
              // row. Non-empty = filtered list w/ library matches.
              const q = search.trim().toLowerCase();
              if (!q) {
                if (activities.length === 0) {
                  return (
                    <div className="py-2 space-y-1.5">
                      <p className="text-xs stitch-text-secondary">
                        No shortcuts yet — pick a few activities you actually do.
                      </p>
                      <button
                        type="button"
                        onClick={() => setPickerOpen(true)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Plus size={11} /> Pick activities
                      </button>
                    </div>
                  );
                }
                // Pinned activity floats to the front so it's always
                // the first chip. Rest keep their server-side order
                // (most-recently-used first).
                const ordered = pinnedId
                  ? [
                      ...activities.filter((a) => a.id === pinnedId),
                      ...activities.filter((a) => a.id !== pinnedId),
                    ]
                  : activities;
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {/* Cap at 10 — the rest live behind Manage. */}
                    {ordered.slice(0, 10).map((a) => {
                      const active = effectiveActivity?.id === a.id;
                      const pinned = pinnedId === a.id;
                      return (
                        <div
                          key={a.id}
                          className={`group/chip inline-flex items-stretch rounded-full overflow-hidden transition-colors ${
                            active
                              ? 'bg-primary text-white'
                              : pinned
                              ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'
                              : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedActivity(active ? null : a);
                              setOverrideMinutes(null);
                              setCustomGoal('');
                            }}
                            className="inline-flex items-center gap-1 pl-2 pr-1.5 py-1 text-[11px] font-bold"
                            title={`${a.label} · ${a.default_minutes}min${pinned ? ' · pinned' : ''}`}
                          >
                            <span>{a.emoji}</span>
                            <span className="truncate max-w-[110px]">{a.label}</span>
                          </button>
                          {/* Pin toggle — always visible for the
                              pinned chip, hover-revealed for others
                              so the row stays compact. */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); togglePin(a.id); }}
                            className={`pr-1.5 pl-0.5 grid place-items-center transition-opacity ${
                              pinned ? 'opacity-100' : 'opacity-0 group-hover/chip:opacity-60 hover:!opacity-100'
                            }`}
                            title={pinned ? 'Unpin this activity' : 'Pin as your go-to'}
                            aria-label={pinned ? 'Unpin' : 'Pin'}
                          >
                            {pinned
                              ? <Pin size={10} fill="currentColor" strokeWidth={2.5} />
                              : <Pin size={10} strokeWidth={2.5} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              // Filtered view — search both buckets, dedupe by lowercase
              // label so a library template the user has already adopted
              // doesn't appear twice.
              const matchesMine = activities.filter((a) => a.label.toLowerCase().includes(q));
              const mineLabels = new Set(matchesMine.map((a) => a.label.toLowerCase()));
              const matchesLib = (allTemplates ?? []).filter(
                (t) => t.label.toLowerCase().includes(q) && !mineLabels.has(t.label.toLowerCase())
              );
              const total = matchesMine.length + matchesLib.length;

              if (total === 0) {
                return (
                  <p className="text-xs stitch-text-secondary italic py-3 text-center">
                    No matches. Type a one-off goal below ↓ or add it via Manage.
                  </p>
                );
              }

              return (
                <ul className="space-y-0.5">
                  {matchesMine.map((a) => {
                    const active = effectiveActivity?.id === a.id;
                    return (
                      <li key={`mine-${a.id}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedActivity(active ? null : a);
                            setOverrideMinutes(null);
                            setCustomGoal('');
                            setSearch('');
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                            active
                              ? 'bg-primary/15 stitch-text-primary'
                              : 'hover:bg-surface-container-low'
                          }`}
                        >
                          <span className="text-base shrink-0">{a.emoji}</span>
                          <span className="flex-1 truncate font-bold">{a.label}</span>
                          <span className="text-[10px] stitch-text-secondary tabular-nums shrink-0">
                            {a.default_minutes}m
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {matchesLib.length > 0 && matchesMine.length > 0 && (
                    <li className="pt-1.5 pb-0.5 px-1 text-[9px] font-bold uppercase tracking-widest stitch-text-secondary flex items-center gap-1">
                      <Library size={9} /> From library
                    </li>
                  )}
                  {matchesLib.map((t) => (
                    <li key={`lib-${t.id}`}>
                      <button
                        type="button"
                        onClick={() => {
                          // Use the library activity for THIS session
                          // only. Adopting permanently goes through the
                          // Manage sheet — keeps this dropdown light.
                          setSelectedActivity(null);
                          setCustomGoal(t.label);
                          setOverrideMinutes(t.default_minutes);
                          setSearch('');
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs hover:bg-surface-container-low transition-colors"
                      >
                        <span className="text-base shrink-0">{t.emoji}</span>
                        <span className="flex-1 truncate font-semibold">{t.label}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-1 py-0.5 rounded shrink-0">
                          Use once
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>

          {/* ── Custom goal input ──────────────────────────────── */}
          <div className="border-t border-surface-container px-3 py-2">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary mb-1.5">
              Or type a one-off goal
            </label>
            <input
              type="text"
              value={customGoal}
              onChange={(e) => {
                setCustomGoal(e.target.value);
                if (e.target.value.trim()) setSelectedActivity(null);
              }}
              placeholder="e.g. Polish the pitch deck"
              className="w-full px-2 py-1.5 rounded-lg text-sm stitch-text-primary bg-surface-container-low ring-1 ring-surface-container focus:ring-2 focus:ring-primary/30 outline-none"
            />
          </div>

          {/* ── Duration presets + custom ──────────────────────── */}
          <div className="border-t border-surface-container px-3 py-2.5 space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary">
              Duration
            </p>
            <div className="grid grid-cols-3 gap-1">
              {PRESETS.map(({ minutes: m, label }) => {
                const active = minutes === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setOverrideMinutes(m)}
                    className={`px-1.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                      active
                        ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                        : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={5}
                max={180}
                inputMode="numeric"
                placeholder="Custom"
                value={overrideMinutes ?? ''}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setOverrideMinutes(Number.isFinite(n) ? n : null);
                }}
                className="w-20 px-2 py-1 rounded-md text-xs font-bold stitch-text-primary tabular-nums bg-surface-container-low ring-1 ring-surface-container focus:ring-2 focus:ring-primary/30 outline-none"
              />
              <span className="text-[11px] stitch-text-secondary">min · 5–180</span>
            </div>
          </div>

          {/* ── Schedule toggle ─────────────────────────────────── */}
          <div className="border-t border-surface-container px-3 py-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={scheduleMode}
                onChange={(e) => setScheduleMode(e.target.checked)}
                className="w-3.5 h-3.5 accent-primary"
              />
              <Calendar size={12} className="stitch-text-secondary" />
              <span className="text-xs font-bold stitch-text-primary">
                Schedule for later
              </span>
            </label>
          </div>

          {/* ── Action row ──────────────────────────────────────── */}
          {!scheduleMode ? (
            <div className="border-t border-surface-container px-3 py-2.5">
              <button
                type="button"
                onClick={() => { setMenuOpen(false); startNow(); }}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-extrabold bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-60"
              >
                <Timer size={13} /> Start now
              </button>
            </div>
          ) : (
            <div className="border-t border-surface-container px-3 py-2.5 space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary">
                When?
              </p>
              <div className="grid grid-cols-3 gap-1">
                {TIME_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => schedule(chip.resolve())}
                    className="px-1.5 py-1.5 rounded-md text-[11px] font-bold bg-surface-container-low stitch-text-primary hover:bg-surface-container transition-colors text-center"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="datetime-local"
                  value={customDatetime}
                  min={isoLocal(new Date(Date.now() + 5 * 60 * 1000))}
                  onChange={(e) => setCustomDatetime(e.target.value)}
                  className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-xs font-bold stitch-text-primary bg-surface-container-low ring-1 ring-surface-container focus:ring-2 focus:ring-primary/30 outline-none"
                />
                <button
                  type="button"
                  onClick={handleCustomScheduleStart}
                  disabled={!customDatetime}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={11} /> Add
                </button>
              </div>
            </div>
          )}

          <div className="border-t border-surface-container px-3 py-2 bg-surface-container-low/30">
            <p className="text-[10px] stitch-text-secondary leading-snug">
              {effectiveActivity || customGoal.trim()
                ? <>Logs as a solo session — counts toward momentum and shows up in your calendar.</>
                : <>No goal needed. Logs as "Quick focus" — you can rename later from the calendar.</>}
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className={`absolute top-full mt-2 text-[11px] font-semibold text-rose-700 bg-rose-50 ring-1 ring-rose-100 rounded-lg px-2.5 py-1.5 z-30 ${align === 'left' ? 'left-0' : 'right-0'}`}>
          {error}
        </p>
      )}

      {managerOpen && (
        <ActivityManagerSheet
          onClose={() => setManagerOpen(false)}
          onChanged={() => { reloadActivities(); }}
        />
      )}

      {pickerOpen && (
        <ActivityPickerSheet
          onClose={() => setPickerOpen(false)}
          onDone={() => { reloadActivities(); }}
        />
      )}
    </div>
  );
}

