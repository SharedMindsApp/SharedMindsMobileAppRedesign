/**
 * TodayPlannerCard — unified weekly + daily planner. The home-page hero.
 *
 * Inspired by Accountable / calendar.me — one card, three sections, all
 * visible at once so ADHD brains see the whole picture without navigating.
 *
 *   ┌─ Hero band: 7-day strip (today is the focal point) ─┐
 *   ├─ This Week (3 goals) ─┬─ Today (timeline) ──────────┤
 *   │  • Ship MVP ~2 sess.  │  Intention input            │
 *   │  • Launch  ~1 sess.   │  Quick-add chips            │
 *   │  • Outreach ~3 sess.  │  Hour grid w/ live red line │
 *   │  + Break into steps   │  Coloured event cards       │
 *   └───────────────────────┴─────────────────────────────┘
 *
 * Goals and today's timeline live SIDE BY SIDE because the timeline IS the
 * answer to the goals — you can see what you're shipping AND when you've
 * scheduled it.
 */

import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun, Sparkles, ArrowRight, Plus,
  Mail, Zap, PenLine, Layers, Target, Phone,
  Play, CheckCircle2, Circle, X, Loader2, Check,
  Calendar as CalendarIcon, Search, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { FindSessionsSheet } from './FindSessionsSheet';
import { TimeBlockService, type TimeBlock, type BlockType } from '../../services/TimeBlockService';
import {
  ReflectionService, mondayOf, estimateSessions,
  type ReflectionWithIntentions, type WeeklyIntentionWithMicrotasks,
} from '../../services/ReflectionService';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/AuthProvider';
import { useCoreData } from '../../data/CoreDataContext';
import { IntentionWizard } from '../reflection/IntentionWizard';
import { fetchUpcomingScheduledSessions, type ScheduledSessionWithProfile } from '../../services/SessionService';
import type { GridSession } from '../sessions/CalendarView';
import { SessionHoverCard } from '../sessions/SessionHoverCard';

// The session detail sheet lives in CalendarView (the /sessions route chunk).
// Lazy-load it so opening a session on home pulls that chunk on demand rather
// than bundling the whole calendar into the home page.
const SessionDetailSheet = lazy(() =>
  import('../sessions/CalendarView').then((m) => ({ default: m.SessionDetailSheet })));

type SessionMode = 'group' | 'one_on_one' | 'solo';

/** Mode → hex, matching the SessionModeChip palette on the /sessions calendar
 *  (Timer=amber, 1-on-1=violet, Group=blue, Solo=rose). The home grid has no
 *  room for a tag, so the block colour carries the mode instead. */
function modeHex(mode: SessionMode, isQuickTimer: boolean): string {
  if (isQuickTimer) return '#f59e0b';        // amber
  if (mode === 'one_on_one') return '#8b5cf6'; // violet
  if (mode === 'group') return '#3b82f6';      // blue
  return '#f43f5e';                            // rose (solo)
}

/** A focus session reduced to what the planner grid needs. Read-only —
 *  these are a record of work done/booked, laid over the editable blocks.
 *  Colour-coded by session mode, mirroring the /sessions calendar tags. */
interface PlannerSession {
  id: string;
  startsAt: Date;
  durationMins: number;
  title: string;
  status: 'scheduled' | 'completed';
  mode: SessionMode;
  isQuickTimer: boolean;
  /** The source row, so a click can open the shared SessionDetailSheet. */
  raw: ScheduledSessionWithProfile;
}

function toPlannerSession(s: ScheduledSessionWithProfile): PlannerSession {
  const a = s as Record<string, unknown>;
  return {
    id: s.id,
    startsAt: new Date((a.scheduled_at as string) ?? s.start_time),
    durationMins: s.intended_duration_minutes ?? 50,
    title: s.session_title ?? s.session_goal ?? 'Focus session',
    status: (a.status === 'completed' ? 'completed' : 'scheduled'),
    mode: (a.session_mode as SessionMode) ?? 'group',
    isQuickTimer: !!a.is_quick_timer,
    raw: s,
  };
}

/** Map a planner session's raw row → the GridSession the detail sheet wants.
 *  Mirrors CalendarView.toGridScheduled (kept local so the home chunk doesn't
 *  statically import the calendar module). */
function plannerToGrid(s: ScheduledSessionWithProfile): GridSession {
  const a = s as Record<string, unknown>;
  return {
    id: s.id,
    user_id: s.user_id,
    partner_user_id: (a.partner_user_id as string) ?? null,
    display_name: s.display_name,
    avatar_url: s.avatar_url ?? null,
    session_goal: s.session_goal,
    session_title: s.session_title,
    session_mode: (a.session_mode as GridSession['session_mode']) ?? 'group',
    quiet_mode: !!a.quiet_mode,
    intended_duration_minutes: s.intended_duration_minutes ?? 50,
    startsAt: new Date((a.scheduled_at as string) ?? s.start_time),
    status: 'scheduled',
    session_kind: (a.session_kind as GridSession['session_kind']) ?? null,
    start_mood: (a.start_mood as string) ?? null,
    project_id: s.project_id ?? null,
    project_title: s.project?.title ?? null,
    project_color: s.project?.color ?? null,
    is_quick_timer: !!a.is_quick_timer,
    segments: (a.segments as GridSession['segments']) ?? null,
  };
}

/** Inline style for a session block, tinted by its mode colour. */
function sessionBlockStyle(ps: PlannerSession): { hex: string; style: React.CSSProperties } {
  const hex = modeHex(ps.mode, ps.isQuickTimer);
  return {
    hex,
    style: {
      backgroundColor: `${hex}14`,            // ~8% tint
      boxShadow: `inset 0 0 0 1px ${hex}59`,  // ~35% ring (works for any hex)
    },
  };
}

/** Same local calendar day? Avoids UTC-slice off-by-one near midnight. */
function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}

// ── Layout constants ───────────────────────────────────────────────

const HOUR_PX = 56;                                       // height of one hour row
const HOURS   = Array.from({ length: 15 }, (_, i) => i + 7); // 7am → 9pm
const GRID_TOP_PADDING = 12;

// ── Templates + styles ─────────────────────────────────────────────

interface QuickTemplate {
  title: string;
  durationMins: number;
  blockType: BlockType;
  Icon: React.ElementType;
  chipCls: string;
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  { title: 'Inbox zero', durationMins: 30,  blockType: 'admin', Icon: Mail,    chipCls: 'bg-sky-50 text-sky-700 ring-sky-200/60'        },
  { title: 'Deep work',  durationMins: 90,  blockType: 'deep',  Icon: Zap,     chipCls: 'bg-violet-50 text-violet-700 ring-violet-200/60' },
  { title: 'Write',      durationMins: 60,  blockType: 'focus', Icon: PenLine, chipCls: 'bg-primary/8 text-primary ring-primary/20'     },
  { title: 'Admin pile', durationMins: 30,  blockType: 'admin', Icon: Layers,  chipCls: 'bg-amber-50 text-amber-700 ring-amber-200/60'  },
  { title: 'Strategy',   durationMins: 90,  blockType: 'deep',  Icon: Target,  chipCls: 'bg-indigo-50 text-indigo-700 ring-indigo-200/60' },
  { title: 'Sales call', durationMins: 30,  blockType: 'focus', Icon: Phone,   chipCls: 'bg-rose-50 text-rose-700 ring-rose-200/60'     },
];

interface BlockStyle {
  bg:     string;
  border: string;
  stripe: string;
  text:   string;
  dot:    string;
  label:  string;
}

const BLOCK_STYLES: Record<BlockType, BlockStyle> = {
  focus:    { bg: 'bg-primary/8',  border: 'ring-primary/20',  stripe: 'bg-primary',     text: 'text-primary',     dot: 'bg-primary',     label: 'Focus'    },
  deep:     { bg: 'bg-violet-50',  border: 'ring-violet-200',  stripe: 'bg-violet-600',  text: 'text-violet-700',  dot: 'bg-violet-600',  label: 'Deep'     },
  admin:    { bg: 'bg-amber-50',   border: 'ring-amber-200',   stripe: 'bg-amber-500',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Admin'    },
  break:    { bg: 'bg-emerald-50', border: 'ring-emerald-200', stripe: 'bg-emerald-500', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Break'    },
  personal: { bg: 'bg-rose-50',    border: 'ring-rose-200',    stripe: 'bg-rose-500',    text: 'text-rose-700',    dot: 'bg-rose-500',    label: 'Personal' },
};

// ── Date helpers ───────────────────────────────────────────────────

interface WeekDay {
  date: Date;
  dateStr: string;
  letter: string;
  dayNum: number;
}

/** YYYY-MM-DD from a date's LOCAL calendar components. Using toISOString()
 *  here is a bug in any timezone ahead of UTC (e.g. BST): local midnight maps
 *  to the previous UTC day, so the date string drifts one day behind the day
 *  the user actually sees. Always format from local parts. */
function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekDays(now: Date, weekOffset = 0): WeekDay[] {
  const dow = now.getDay();
  const dayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + dayOffset + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      date: d,
      dateStr: localISO(d),
      letter: LETTERS[i],
      dayNum: d.getDate(),
    };
  });
}

function formatHour(h: number): string {
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

function todayKey(): string {
  return localISO(new Date());
}

function formatWeekRange(days: WeekDay[]): string {
  const from = days[0].date;
  const to   = days[6].date;
  const monthShort = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short' });
  if (from.getMonth() === to.getMonth()) {
    return `${from.getDate()} – ${to.getDate()} ${monthShort(to)}`;
  }
  return `${from.getDate()} ${monthShort(from)} – ${to.getDate()} ${monthShort(to)}`;
}

function nearestDuration(mins: number): 25 | 50 | 90 {
  // Map calendar block lengths (30/60/90/120) to the nearest community session
  // duration (25/50/90) when the user hits "Start" on a block.
  if (mins <= 45) return 25;  // 30 min block → 25 min session
  if (mins <= 75) return 50;  // 60 min block → 50 min session
  return 90;                  // 90 or 120 min block → 90 min session
}

function nextFreeSlot(blocks: TimeBlock[]): number {
  const now = new Date();
  const taken = new Set(blocks.map((b) => parseInt(b.start_time.split(':')[0], 10)));
  let h = Math.max(7, now.getHours());
  while (h <= 20 && taken.has(h)) h++;
  return Math.min(h, 20);
}

// ── BlockCard ──────────────────────────────────────────────────────

function BlockCard({
  block, onToggle, onStart, onDelete,
}: {
  block: TimeBlock;
  onToggle: (b: TimeBlock) => void;
  onStart:  (b: TimeBlock) => void;
  onDelete: (id: string) => void;
}) {
  const s    = BLOCK_STYLES[block.block_type];
  const done = !!block.completed_at;

  return (
    <div
      className={`relative rounded-xl pl-3 pr-2 py-2 mb-1 ring-1 group transition-all overflow-hidden ${s.bg} ${s.border} ${done ? 'opacity-55' : 'hover:shadow-md hover:-translate-y-px'}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.stripe}`} />

      <div className="flex items-center gap-2.5 pl-1">
        <button type="button" onClick={() => onToggle(block)} className="shrink-0">
          {done
            ? <CheckCircle2 size={16} className="text-emerald-600" strokeWidth={2.5} />
            : <Circle       size={16} className={s.text + ' opacity-60'} strokeWidth={2} />
          }
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold leading-tight truncate ${done ? 'line-through stitch-text-secondary' : 'stitch-text-primary'}`}>
            {block.title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
            <span className={`text-[10px] font-bold ${s.text}`}>{s.label}</span>
            <span className="text-[10px] font-semibold stitch-text-secondary">· {block.duration_mins}m</span>
          </div>
        </div>

        {!done && (
          <button
            type="button"
            onClick={() => onStart(block)}
            className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-primary bg-white rounded-lg px-2.5 py-1.5 shadow-sm ring-1 ring-primary/20 hover:bg-primary hover:text-white hover:shadow transition-all"
          >
            <Play size={10} fill="currentColor" strokeWidth={0} />
            Start
          </button>
        )}

        <button
          type="button"
          onClick={() => onDelete(block.id)}
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/8 transition-all opacity-0 group-hover:opacity-100"
          aria-label="Remove block"
        >
          <X size={12} className="stitch-text-secondary" />
        </button>
      </div>
    </div>
  );
}

// ── AddBlockForm ───────────────────────────────────────────────────

function AddBlockForm({
  onAdd, onCancel,
}: {
  onAdd:    (title: string, durationMins: number, blockType: BlockType) => void;
  onCancel: () => void;
}) {
  const [title,    setTitle]    = useState('');
  const [duration, setDuration] = useState<30 | 60 | 90 | 120>(60);
  const [type,     setType]     = useState<BlockType>('focus');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), duration, type);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-1 rounded-xl bg-white ring-1 ring-primary/30 p-2.5 shadow-md">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        placeholder="What will you work on?"
        maxLength={200}
        className="text-sm font-semibold stitch-text-primary bg-transparent outline-none w-full placeholder:font-normal placeholder:stitch-text-secondary"
      />
      <div className="flex items-center gap-1.5 flex-wrap">
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value) as 30 | 60 | 90 | 120)}
          className="text-[11px] font-semibold stitch-text-secondary bg-surface-container-low rounded-lg px-2 py-1.5 outline-none ring-1 ring-surface-container-high"
        >
          <option value={30}>30 min</option>
          <option value={60}>1 hour</option>
          <option value={90}>1.5 hours</option>
          <option value={120}>2 hours</option>
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as BlockType)}
          className="text-[11px] font-semibold stitch-text-secondary bg-surface-container-low rounded-lg px-2 py-1.5 outline-none ring-1 ring-surface-container-high flex-1 min-w-[80px]"
        >
          {(Object.keys(BLOCK_STYLES) as BlockType[]).map((t) => (
            <option key={t} value={t}>{BLOCK_STYLES[t].label}</option>
          ))}
        </select>
        <button type="submit" disabled={!title.trim()}
          className="text-[11px] font-bold text-white bg-primary rounded-lg px-3 py-1.5 disabled:opacity-40 transition-opacity">
          Add
        </button>
        <button type="button" onClick={onCancel} className="p-1.5 stitch-text-secondary hover:stitch-text-primary">
          <X size={13} />
        </button>
      </div>
    </form>
  );
}

// ── Week-goals sidebar (this week, 3 intentions) ───────────────────

function WeekGoalsSidebar({
  data, loaded, onChange, onOpenWizard,
}: {
  data: ReflectionWithIntentions | null;
  loaded: boolean;
  onChange: () => Promise<void>;
  onOpenWizard: () => void;
}) {
  const navigate = useNavigate();
  const intentions = data?.intentions ?? [];
  const doneCount  = intentions.filter((i) => i.completed_at).length;
  const totalSessions = intentions.reduce(
    (sum, it) => sum + estimateSessions(it.microtasks ?? []),
    0,
  );

  async function handleToggle(it: WeeklyIntentionWithMicrotasks) {
    await ReflectionService.toggleIntentionComplete(it).catch(() => {});
    await onChange();
  }

  if (!loaded) return <div className="p-5 text-xs stitch-text-secondary">Loading goals…</div>;

  // ── Empty state ────────────────────────────────────────────────
  if (intentions.length === 0) {
    return (
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-center gap-1.5 mb-3">
          <Sparkles size={13} className="text-violet-600" />
          <p className="text-[10px] font-bold text-violet-700 tracking-widest uppercase">
            This week
          </p>
        </div>
        <p className="text-sm font-bold stitch-text-primary leading-snug mb-1.5">
          Pick 3 things to finish.
        </p>
        <p className="text-xs stitch-text-secondary leading-relaxed mb-4">
          Then break each one into steps — visible work is doable work.
        </p>
        <button
          type="button"
          onClick={onOpenWizard}
          className="inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-white bg-gradient-to-br from-violet-600 to-blue-500 rounded-xl px-3 py-2 shadow-md shadow-violet-500/25 hover:shadow-lg hover:-translate-y-px transition-all"
        >
          <Sparkles size={11} strokeWidth={2.5} />
          Set intentions
        </button>
      </div>
    );
  }

  // ── Populated ──────────────────────────────────────────────────
  return (
    <div className="p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-violet-600" />
          <p className="text-[10px] font-bold text-violet-700 tracking-widest uppercase">This week</p>
        </div>
        <span className="text-[10px] font-extrabold tabular-nums text-violet-700 bg-violet-100/70 px-2 py-0.5 rounded-full">
          {doneCount}/{intentions.length}
        </span>
      </div>

      {/* Intention rows */}
      <div className="space-y-2 flex-1">
        {intentions.map((it, i) => {
          const done    = !!it.completed_at;
          const microN  = it.microtasks?.length ?? 0;
          const microD  = it.microtasks?.filter((m) => m.completed_at).length ?? 0;
          const sess    = estimateSessions(it.microtasks ?? []);

          return (
            <div
              key={it.id}
              className={`group rounded-2xl p-2.5 ring-1 transition-all ${
                done
                  ? 'bg-emerald-50/50 ring-emerald-200/50'
                  : 'bg-white ring-violet-200/30 hover:ring-violet-300/60 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-2">
                {/* Number badge */}
                <div
                  className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                    done
                      ? 'bg-emerald-500 text-white'
                      : 'bg-violet-100 text-violet-700'
                  }`}
                >
                  {done ? <Check size={11} strokeWidth={3} /> : i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(it)}
                    className={`text-left text-sm font-bold leading-snug w-full ${
                      done ? 'line-through stitch-text-secondary' : 'stitch-text-primary hover:text-primary'
                    } transition-colors`}
                  >
                    {it.title}
                  </button>

                  {/* Meta: steps + sessions */}
                  {(microN > 0 || sess > 0) && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {microN > 0 && (
                        <span className="text-[9px] font-bold tabular-nums stitch-text-secondary">
                          {microD}/{microN} steps
                        </span>
                      )}
                      {sess > 0 && (
                        <span className="text-[9px] font-bold text-primary bg-primary/8 px-1.5 py-0.5 rounded-full tabular-nums">
                          ~{sess} session{sess !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add-more affordance */}
        {intentions.length < 3 && (
          <button
            type="button"
            onClick={onOpenWizard}
            className="w-full flex items-center justify-center gap-1.5 rounded-2xl p-2.5 ring-1 ring-dashed ring-violet-300/40 text-[11px] font-bold text-violet-700 hover:bg-violet-50/50 transition-colors"
          >
            <Plus size={11} strokeWidth={2.5} />
            Add goal {intentions.length + 1} of 3
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-violet-200/30 flex items-center justify-between">
        {totalSessions > 0 && (
          <span className="text-[10px] font-bold stitch-text-secondary">
            ~{totalSessions} session{totalSessions !== 1 ? 's' : ''} total
          </span>
        )}
        <button
          type="button"
          onClick={() => navigate('/reflection')}
          className="ml-auto text-[10px] font-bold text-violet-700 hover:text-violet-900 inline-flex items-center gap-0.5 transition-colors"
        >
          Break into steps <ArrowRight size={10} />
        </button>
      </div>
    </div>
  );
}

// ── WeekTimeline (7-day calendar grid) ─────────────────────────────

function WeekTimeline({
  weekDays, weekBlocks, weekSessions, todayKey, currentHour, currentMin,
  nowLabel, showNowLine, nowYpx,
  onToggle, onStart, onDelete, onSwitchToDay, onSelectSession, onHoverSession,
}: {
  weekDays: WeekDay[];
  weekBlocks: TimeBlock[];
  weekSessions: PlannerSession[];
  onSelectSession: (ps: PlannerSession) => void;
  onHoverSession: (ps: PlannerSession | null, rect: DOMRect | null) => void;
  todayKey: string;
  currentHour: number;
  currentMin: number;
  nowLabel: string;
  showNowLine: boolean;
  nowYpx: number;
  onToggle: (b: TimeBlock) => void;
  onStart:  (b: TimeBlock) => void;
  onDelete: (id: string) => void;
  onSwitchToDay: (dateStr: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayIdx = weekDays.findIndex((d) => d.dateStr === todayKey);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!scrollRef.current) return;
      const targetY = Math.max(0, (currentHour - 7 - 1) * HOUR_PX);
      scrollRef.current.scrollTo({ top: targetY, behavior: 'smooth' });
    }, 200);
    return () => clearTimeout(t);
  }, [currentHour]);

  function blockTopPx(block: TimeBlock): number {
    const h = parseInt(block.start_time.split(':')[0], 10);
    const m = parseInt(block.start_time.split(':')[1] ?? '0', 10);
    return ((h - 7) * 60 + m) * (HOUR_PX / 60) + GRID_TOP_PADDING;
  }
  function blockHeightPx(block: TimeBlock): number {
    return Math.max(28, (block.duration_mins / 60) * HOUR_PX - 2);
  }
  function sessionTopPx(d: Date): number {
    return ((d.getHours() - 7) * 60 + d.getMinutes()) * (HOUR_PX / 60) + GRID_TOP_PADDING;
  }
  function sessionHeightPx(mins: number): number {
    return Math.max(20, (mins / 60) * HOUR_PX - 2);
  }

  return (
    <div className="flex flex-col h-[600px]">
      {/* Sticky day headers row */}
      <div className="grid grid-cols-[44px_repeat(7,1fr)] bg-surface-container-lowest/40 border-b border-surface-container/50">
        <div /> {/* corner spacer for hour rail */}
        {weekDays.map((d) => {
          const isToday = d.dateStr === todayKey;
          return (
            <button
              key={d.dateStr}
              type="button"
              onClick={() => onSwitchToDay(d.dateStr)}
              className={`flex flex-col items-center py-2.5 border-l border-surface-container/50 transition-colors ${
                isToday ? 'bg-violet-50/60' : 'hover:bg-surface-container-low/40'
              }`}
            >
              <span className={`text-[10px] font-extrabold uppercase tracking-wider leading-none ${
                isToday ? 'text-violet-700' : 'stitch-text-secondary'
              }`}>
                {d.letter}
              </span>
              <span className={`text-base font-extrabold tabular-nums leading-none mt-0.5 ${
                isToday ? 'text-violet-700' : 'stitch-text-primary'
              }`}>
                {d.dayNum}
              </span>
            </button>
          );
        })}
      </div>

      {/* Scrollable hours + columns */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative" style={{ scrollbarWidth: 'none' }}>
        <div className="grid grid-cols-[44px_repeat(7,1fr)] relative" style={{ minHeight: `${HOURS.length * HOUR_PX + GRID_TOP_PADDING * 2}px` }}>

          {/* Hour rail (left column) */}
          <div className="relative" style={{ paddingTop: `${GRID_TOP_PADDING}px` }}>
            {HOURS.map((hour) => (
              <div key={hour} className="text-right pr-2" style={{ height: `${HOUR_PX}px` }}>
                <span className={`text-[10px] font-extrabold tabular-nums -translate-y-1 inline-block ${
                  hour === currentHour ? 'text-rose-600' : 'text-slate-400'
                }`}>
                  {formatHour(hour)}
                </span>
              </div>
            ))}
          </div>

          {/* 7 day columns */}
          {weekDays.map((d) => {
            const isToday = d.dateStr === todayKey;
            const dayBlocks = weekBlocks.filter((b) => b.block_date === d.dateStr);
            return (
              <div
                key={d.dateStr}
                className={`relative border-l border-surface-container/40 ${
                  isToday ? 'bg-violet-50/20' : ''
                }`}
                style={{ paddingTop: `${GRID_TOP_PADDING}px` }}
              >
                {/* Hour grid lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="border-t border-surface-container/30"
                    style={{ height: `${HOUR_PX}px` }}
                  />
                ))}

                {/* Blocks (absolutely positioned within column) */}
                {dayBlocks.map((b) => {
                  const s = BLOCK_STYLES[b.block_type];
                  const done = !!b.completed_at;
                  return (
                    <div
                      key={b.id}
                      className={`absolute left-1 right-1 rounded-lg ring-1 px-1.5 py-1 overflow-hidden group cursor-pointer transition-all ${s.bg} ${s.border} ${done ? 'opacity-55' : 'hover:shadow-md hover:z-10'}`}
                      style={{ top: `${blockTopPx(b)}px`, height: `${blockHeightPx(b)}px` }}
                      onClick={() => onToggle(b)}
                      title={`${b.title} · ${s.label} · ${b.duration_mins}min`}
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${s.stripe}`} />
                      <p className={`text-[10px] font-bold leading-tight truncate pl-1.5 ${done ? 'line-through stitch-text-secondary' : 'stitch-text-primary'}`}>
                        {b.title}
                      </p>
                      <p className={`text-[9px] font-semibold pl-1.5 ${s.text}`}>
                        {b.duration_mins}m
                      </p>
                      {!done && blockHeightPx(b) >= 50 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onStart(b); }}
                          className="absolute bottom-1 right-1 flex items-center gap-0.5 text-[9px] font-bold text-primary bg-white rounded px-1 py-0.5 shadow-sm ring-1 ring-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Play size={8} fill="currentColor" strokeWidth={0} />
                          Start
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDelete(b.id); }}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded flex items-center justify-center hover:bg-black/8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={9} className="stitch-text-secondary" />
                      </button>
                    </div>
                  );
                })}

                {/* Logged + booked sessions (read-only overlay), tinted by project */}
                {weekSessions.filter((ps) => sameLocalDay(ps.startsAt, d.date)).map((ps) => {
                  const completed = ps.status === 'completed';
                  const { hex, style } = sessionBlockStyle(ps);
                  return (
                    <div
                      key={ps.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectSession(ps)}
                      onKeyDown={(e) => { if (e.key === 'Enter') onSelectSession(ps); }}
                      onMouseEnter={(e) => onHoverSession(ps, e.currentTarget.getBoundingClientRect())}
                      onMouseLeave={() => onHoverSession(null, null)}
                      className={`absolute left-1 right-1 rounded-lg pl-2 pr-1.5 py-1 overflow-hidden cursor-pointer hover:brightness-[0.97] hover:z-10 transition ${completed ? '' : 'opacity-90'}`}
                      style={{ ...style, top: `${sessionTopPx(ps.startsAt)}px`, height: `${sessionHeightPx(ps.durationMins)}px` }}
                      title={`${ps.title} · ${ps.durationMins}min · ${completed ? 'completed' : 'scheduled'}`}
                    >
                      <span className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: hex }} />
                      <p className="text-[10px] font-bold leading-tight truncate flex items-center gap-0.5" style={{ color: hex }}>
                        {completed
                          ? <Check size={9} strokeWidth={3} className="shrink-0" />
                          : <CalendarIcon size={8} className="shrink-0" />}
                        {ps.title}
                      </p>
                      <p className="text-[9px] font-semibold opacity-80" style={{ color: hex }}>
                        {ps.durationMins}m
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Live "now" line — spans today's column only */}
          {showNowLine && todayIdx >= 0 && (
            <div
              className="absolute pointer-events-none z-20 flex items-center"
              style={{
                top: `${nowYpx}px`,
                left: `calc(44px + ${todayIdx} * ((100% - 44px) / 7))`,
                width: `calc((100% - 44px) / 7)`,
              }}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 shadow-md shadow-rose-500/40 ring-2 ring-white -ml-1" />
              <div className="flex-1 h-px bg-rose-500/80" />
              <span className="text-[9px] font-extrabold text-rose-600 tabular-nums bg-white/90 backdrop-blur rounded-l-full pr-1 pl-1.5 shrink-0">
                {nowLabel}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── TodayPlannerCard (main export) ─────────────────────────────────

export function TodayPlannerCard({
  onStartSession,
}: {
  onStartSession: (goal: string, duration: 25 | 50 | 90) => void;
}) {
  const { user } = useAuth();
  const { state: { spaces } } = useCoreData();
  const personalSpace = spaces.find((s) => s.type === 'personal');
  const navigate = useNavigate();

  const now = useMemo(() => new Date(), []);
  const today = todayKey();
  const currentHour = now.getHours();
  const currentMin  = now.getMinutes();

  // ── Week navigation (0 = current week … 3 = 4 weeks ahead) ────
  const MAX_WEEK_OFFSET = 3;
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDays = useMemo(() => getWeekDays(now, weekOffset), [now, weekOffset]);

  // ── Selected day for the day-view timeline ─────────────────────
  // Defaults to today; updates when user clicks a day pill or changes week.
  const [selectedDateStr, setSelectedDateStr] = useState(today);

  // ── Daily intention ────────────────────────────────────────────
  const [intention,        setIntention]        = useState('');
  const [intentionLoaded,  setIntentionLoaded]  = useState(false);
  const [intentionSaving,  setIntentionSaving]  = useState(false);
  const [intentionSavedAt, setIntentionSavedAt] = useState<number | null>(null);
  const intentionInitRef   = useRef('');
  const intentionDebounce  = useRef<number | null>(null);

  // ── View mode ──────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  // ── Time blocks ────────────────────────────────────────────────
  const [blocks,          setBlocks]          = useState<TimeBlock[]>([]);
  const [weekBlocks,      setWeekBlocks]      = useState<TimeBlock[]>([]);
  const [weekBlockCounts, setWeekBlockCounts] = useState<Record<string, { done: number; total: number }>>({});
  const [mutating,        setMutating]        = useState(false);
  const [addingAtHour,    setAddingAtHour]    = useState<number | null>(null);

  // ── Logged + booked focus sessions (read-only overlay) ─────────────
  // The planner shows your editable time blocks; this lays your actual
  // sessions on top so the calendar reflects work done, like /sessions.
  const [plannerSessions, setPlannerSessions] = useState<PlannerSession[]>([]);
  // The session whose detail sheet is open (clicked from the grid).
  const [selectedGridSession, setSelectedGridSession] = useState<GridSession | null>(null);
  // The session being hovered → shows a preview card anchored to its block.
  const [hoveredSession, setHoveredSession] = useState<{ session: GridSession; rect: DOMRect } | null>(null);

  const reloadSessions = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await fetchUpcomingScheduledSessions(user.id);
      // Only MY sessions on my personal planner (host or partner).
      const mine = rows
        .filter((s) => s.user_id === user.id || (s as { partner_user_id?: string }).partner_user_id === user.id)
        .map(toPlannerSession);
      setPlannerSessions(mine);
    } catch { /* leave current */ }
  }, [user]);

  useEffect(() => { void reloadSessions(); }, [reloadSessions]);

  // Sessions on the day-view's selected day (parse YYYY-MM-DD as local).
  const daySessions = useMemo(() => {
    const [yy, mm, dd] = selectedDateStr.split('-').map(Number);
    const sel = new Date(yy, mm - 1, dd);
    return plannerSessions.filter((ps) => sameLocalDay(ps.startsAt, sel));
  }, [plannerSessions, selectedDateStr]);

  // ── Weekly intentions ──────────────────────────────────────────
  const [weeklyData,    setWeeklyData]    = useState<ReflectionWithIntentions | null>(null);
  const [weeklyLoaded,  setWeeklyLoaded]  = useState(false);
  const [showWizard,    setShowWizard]    = useState(false);
  const [showFindSessions, setShowFindSessions] = useState(false);

  async function reloadWeekly(weekMondayStr?: string) {
    const d = await ReflectionService.getReflectionByWeek(weekMondayStr ?? weekDays[0]?.dateStr ?? mondayOf());
    setWeeklyData(d);
    setWeeklyLoaded(true);
  }

  // Scroll containers + refs
  const gridScrollRef = useRef<HTMLDivElement>(null);

  // ── Fetch intention + selected day's blocks ────────────────────
  useEffect(() => {
    if (!user) return;
    setIntentionLoaded(false);
    supabase
      .from('daily_plans')
      .select('intention')
      .eq('user_id', user.id)
      .eq('plan_date', selectedDateStr)
      .maybeSingle()
      .then(({ data }) => {
        const text = data?.intention ?? '';
        setIntention(text);
        intentionInitRef.current = text;
        setIntentionLoaded(true);
      });
    TimeBlockService.getBlocksForDate(selectedDateStr).then(setBlocks).catch(() => {});
  }, [user, selectedDateStr]);

  // ── Reload weekly intentions when the viewed week changes ──────
  useEffect(() => {
    setWeeklyLoaded(false);
    reloadWeekly(weekDays[0]?.dateStr).catch(() => setWeeklyLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDays[0]?.dateStr]);

  // ── Fetch week block counts for the strip ──────────────────────
  useEffect(() => {
    if (!user) return;
    TimeBlockService.getBlocksForDateRange(weekDays[0].dateStr, weekDays[6].dateStr)
      .then((all) => {
        setWeekBlocks(all);
        const counts: Record<string, { done: number; total: number }> = {};
        for (const b of all) {
          const c = counts[b.block_date] ?? { done: 0, total: 0 };
          c.total += 1;
          if (b.completed_at) c.done += 1;
          counts[b.block_date] = c;
        }
        setWeekBlockCounts(counts);
      })
      .catch(() => {});
  }, [user, weekDays]);

  // ── Auto-scroll grid to current hour ───────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      if (!gridScrollRef.current) return;
      const targetY = Math.max(0, (currentHour - 7 - 1) * HOUR_PX);
      gridScrollRef.current.scrollTo({ top: targetY, behavior: 'smooth' });
    }, 200);
    return () => clearTimeout(t);
  }, [currentHour]);

  // ── Debounced intention save ───────────────────────────────────
  useEffect(() => {
    if (!intentionLoaded || !user || !personalSpace) return;
    if (intention === intentionInitRef.current) return;
    if (intentionDebounce.current) window.clearTimeout(intentionDebounce.current);
    // Capture the date at the time of scheduling so the debounce saves to
    // the right day even if the user switches days mid-edit.
    const saveDateStr = selectedDateStr;
    intentionDebounce.current = window.setTimeout(async () => {
      setIntentionSaving(true);
      const { error } = await supabase.from('daily_plans').upsert(
        { user_id: user.id, space_id: personalSpace.id, plan_date: saveDateStr, intention: intention.trim() || null },
        { onConflict: 'user_id,plan_date' },
      );
      if (!error) { intentionInitRef.current = intention; setIntentionSavedAt(Date.now()); }
      setIntentionSaving(false);
    }, 800);
    return () => { if (intentionDebounce.current) window.clearTimeout(intentionDebounce.current); };
  }, [intention, intentionLoaded, user, personalSpace, selectedDateStr]);

  useEffect(() => {
    if (!intentionSavedAt) return;
    const id = window.setTimeout(() => setIntentionSavedAt(null), 1500);
    return () => window.clearTimeout(id);
  }, [intentionSavedAt]);

  // ── Mutations ──────────────────────────────────────────────────
  async function handleQuickAdd(template: QuickTemplate) {
    if (!user || mutating) return;
    const hour = nextFreeSlot(blocks);
    const startTime = `${String(hour).padStart(2, '0')}:00`;
    setMutating(true);
    try {
      const nb = await TimeBlockService.addBlock({
        blockDate: selectedDateStr, startTime,
        durationMins: template.durationMins,
        title: template.title,
        blockType: template.blockType,
      });
      setBlocks((prev) => [...prev, nb].sort((a, b) => a.start_time.localeCompare(b.start_time)));
      setWeekBlocks((prev) => [...prev, nb]);
    } finally { setMutating(false); }
  }

  async function handleAddAt(hour: number, title: string, durationMins: number, blockType: BlockType, dateStr: string = today) {
    if (!user || mutating) return;
    const startTime = `${String(hour).padStart(2, '0')}:00`;
    setMutating(true);
    try {
      const nb = await TimeBlockService.addBlock({ blockDate: dateStr, startTime, durationMins, title, blockType });
      if (dateStr === today) {
        setBlocks((prev) => [...prev, nb].sort((a, b) => a.start_time.localeCompare(b.start_time)));
      }
      setWeekBlocks((prev) => [...prev, nb]);
      setAddingAtHour(null);
    } finally { setMutating(false); }
  }

  async function handleToggle(block: TimeBlock) {
    const updated = await TimeBlockService.toggleBlockComplete(block);
    setBlocks((prev) => prev.map((b) => b.id === updated.id ? updated : b));
    setWeekBlocks((prev) => prev.map((b) => b.id === updated.id ? updated : b));
  }

  async function handleDelete(blockId: string) {
    await TimeBlockService.deleteBlock(blockId);
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setWeekBlocks((prev) => prev.filter((b) => b.id !== blockId));
  }

  // ── Derived ────────────────────────────────────────────────────
  const isViewingToday   = selectedDateStr === today;
  const selectedDate     = new Date(selectedDateStr + 'T00:00:00');
  const dateLabel        = selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const doneCount        = blocks.filter((b) => b.completed_at).length;
  const totalCount       = blocks.length;
  const weekLabel        = formatWeekRange(weekDays);

  const nowMinutesFromGridStart = (currentHour - 7) * 60 + currentMin;
  const nowYpx      = nowMinutesFromGridStart * (HOUR_PX / 60) + GRID_TOP_PADDING;
  // Only draw the live "now" line when the user is looking at today's timeline
  const showNowLine = isViewingToday && currentHour >= 7 && currentHour <= 21;
  const nowLabel    = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <>
      <div className="rounded-3xl overflow-hidden bg-surface ring-1 ring-violet-200/30 shadow-sm">

        {/* ─────────────────────────────────────────────────────── */}
        {/* HERO: gradient banner with 7-day pills                  */}
        {/* ─────────────────────────────────────────────────────── */}
        <div className="relative px-4 sm:px-6 pt-6 pb-5 bg-gradient-to-br from-violet-50 via-blue-50/40 to-cyan-50/30 border-b border-violet-200/30">
          {/* Header — two rows on mobile (heading, then controls) so the
              controls never get squeezed into vertical-text slivers; a single
              justify-between row from sm+ where there's width to spare. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold tracking-widest uppercase text-violet-600 mb-0.5">Plan</p>
                <h2 className="text-base font-extrabold stitch-text-primary leading-tight truncate">
                  Week of {weekLabel}
                </h2>
              </div>
              {/* Today count — visible on mobile here (was hidden), sits with the heading */}
              <div className="flex sm:hidden items-center gap-1.5 shrink-0 text-[10px] font-bold stitch-text-secondary bg-white/70 backdrop-blur px-2.5 py-1.5 rounded-full ring-1 ring-violet-200/40 whitespace-nowrap">
                <CalendarIcon size={11} className="text-violet-600" />
                <span className="tabular-nums">{doneCount} / {totalCount || '—'}</span> today
              </div>
            </div>

            {/* Controls row — wraps gracefully if it ever runs out of room */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Week prev/next */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const newOffset = Math.max(0, weekOffset - 1);
                    setWeekOffset(newOffset);
                    setSelectedDateStr(newOffset === 0 ? today : weekDays[0].dateStr);
                  }}
                  disabled={weekOffset === 0}
                  className="flex items-center gap-1 shrink-0 whitespace-nowrap text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-white/80 ring-1 ring-violet-200 text-violet-700 hover:bg-white hover:shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Previous week"
                >
                  <ChevronLeft size={12} strokeWidth={2.5} />
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newOffset = Math.min(MAX_WEEK_OFFSET, weekOffset + 1);
                    setWeekOffset(newOffset);
                    const newWeekDays = getWeekDays(now, newOffset);
                    setSelectedDateStr(newWeekDays[0].dateStr);
                  }}
                  disabled={weekOffset >= MAX_WEEK_OFFSET}
                  className="flex items-center gap-1 shrink-0 whitespace-nowrap text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-white/80 ring-1 ring-violet-200 text-violet-700 hover:bg-white hover:shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Next week"
                >
                  Next
                  <ChevronRight size={12} strokeWidth={2.5} />
                </button>
              </div>

              {/* Day / Week toggle */}
              <div className="inline-flex items-center gap-0.5 shrink-0 bg-white/70 backdrop-blur rounded-full p-0.5 ring-1 ring-violet-200/40">
                <button
                  type="button"
                  onClick={() => setViewMode('day')}
                  className={`text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap px-2.5 py-1 rounded-full transition-all ${
                    viewMode === 'day'
                      ? 'bg-gradient-to-br from-violet-600 to-blue-500 text-white shadow-md'
                      : 'stitch-text-secondary hover:text-violet-700'
                  }`}
                >
                  Day
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('week')}
                  className={`text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap px-2.5 py-1 rounded-full transition-all ${
                    viewMode === 'week'
                      ? 'bg-gradient-to-br from-violet-600 to-blue-500 text-white shadow-md'
                      : 'stitch-text-secondary hover:text-violet-700'
                  }`}
                >
                  Week
                </button>
              </div>

              {/* Find sessions — opens sheet listing this week's public sessions */}
              <button
                type="button"
                onClick={() => setShowFindSessions(true)}
                className="inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1.5 rounded-full bg-white/85 backdrop-blur ring-1 ring-violet-200/50 text-violet-700 hover:bg-white hover:shadow-sm hover:-translate-y-px transition-all"
              >
                <Search size={11} strokeWidth={2.5} />
                Find sessions
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {weekDays.map((d) => {
              const isToday    = d.dateStr === today;
              const isSelected = d.dateStr === selectedDateStr;
              const isPast     = d.date < new Date(today + 'T00:00:00');
              const c          = weekBlockCounts[d.dateStr];
              const total      = c?.total ?? 0;
              const done       = c?.done  ?? 0;
              const allDone    = total > 0 && done === total;

              return (
                <button
                  key={d.dateStr}
                  type="button"
                  onClick={() => {
                    setSelectedDateStr(d.dateStr);
                    // In week view → switch to day view for the clicked date;
                    // In day view → just update the selected date
                    if (viewMode === 'week') setViewMode('day');
                  }}
                  title={d.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                  className={`relative flex flex-col items-center gap-1 rounded-2xl py-3 px-1 transition-all cursor-pointer ${
                    isToday
                      ? 'bg-gradient-to-br from-violet-600 via-violet-500 to-blue-500 text-white shadow-xl shadow-violet-500/40 ring-2 ring-white/60 scale-[1.04] hover:scale-[1.06]'
                      : isSelected
                      ? 'bg-violet-100 ring-2 ring-violet-300 text-violet-800 shadow-sm scale-[1.02]'
                      : isPast
                      ? 'bg-white/50 opacity-50 hover:opacity-80 hover:shadow-sm'
                      : 'bg-white/80 hover:bg-white hover:shadow-sm hover:-translate-y-px transition-all'
                  }`}
                >
                  <span className={`text-[10px] font-extrabold tracking-widest uppercase leading-none ${isToday ? 'text-white/85' : 'stitch-text-secondary'}`}>
                    {d.letter}
                  </span>
                  <span className={`text-xl sm:text-2xl font-extrabold tabular-nums leading-none ${isToday ? 'text-white' : 'stitch-text-primary'}`}>
                    {d.dayNum}
                  </span>
                  <div className="h-[14px] flex items-center">
                    {total > 0 ? (
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full tabular-nums leading-none whitespace-nowrap ${
                        isToday
                          ? 'bg-white/25 text-white'
                          : allDone
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-violet-100/70 text-violet-700'
                      }`}>
                        {done}/{total}
                      </span>
                    ) : (
                      <span className={`w-1 h-1 rounded-full ${isToday ? 'bg-white/45' : 'bg-violet-200/60'}`} />
                    )}
                  </div>

                  {isToday && (
                    <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-extrabold uppercase bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-full tracking-wider shadow-md z-10">
                      Today
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────── */}
        {/* BODY: two columns — weekly goals | today's timeline     */}
        {/* ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-surface-container/50">

          {/* LEFT: This week's 3 goals */}
          <aside className="bg-gradient-to-br from-violet-50/30 to-transparent">
            <WeekGoalsSidebar
              data={weeklyData}
              loaded={weeklyLoaded}
              onChange={reloadWeekly}
              onOpenWizard={() => setShowWizard(true)}
            />
          </aside>

          {/* RIGHT: Day or Week timeline */}
          <main className="flex flex-col">

          {viewMode === 'day' ? (
            <>
            {/* Header */}
            <div className="px-4 sm:px-5 pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Sun size={13} className={isViewingToday ? 'text-amber-500' : 'text-slate-400'} />
                <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
                  {isViewingToday ? 'Today' : 'Planning'}
                </p>
                <span className="text-[10px] stitch-text-secondary font-semibold">· {dateLabel}</span>
                <div className="ml-auto flex items-center gap-2">
                  {intentionSaving && <Loader2 size={11} className="animate-spin stitch-text-secondary" />}
                  {!intentionSaving && intentionSavedAt && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                      <Check size={10} strokeWidth={3} /> Saved
                    </span>
                  )}
                </div>
              </div>

              <input
                type="text"
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                maxLength={200}
                placeholder="What's today about? One line."
                className="w-full text-base font-bold stitch-text-primary bg-transparent outline-none placeholder:font-normal placeholder:stitch-text-secondary"
              />
            </div>

            {/* Quick-add */}
            <div className="px-4 sm:px-5 pb-3">
              <p className="text-[9px] font-bold stitch-text-secondary tracking-widest uppercase mb-1.5">Block out</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {QUICK_TEMPLATES.map((t) => (
                  <button
                    key={t.title}
                    type="button"
                    onClick={() => handleQuickAdd(t)}
                    disabled={mutating}
                    className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-full shrink-0 ring-1 transition-all disabled:opacity-50 hover:shadow-sm hover:-translate-y-px ${t.chipCls}`}
                  >
                    <t.Icon size={11} />
                    {t.title}
                    <span className="opacity-60 font-semibold">{t.durationMins}m</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hour grid */}
            <div
              ref={gridScrollRef}
              className="relative max-h-[440px] overflow-y-auto border-t border-surface-container/40 bg-gradient-to-b from-surface-container-lowest/30 to-surface"
              style={{ scrollbarWidth: 'none' }}
            >
              <div className="relative pt-3 pb-4 px-3 sm:px-4">

                {/* Empty-state hint when no blocks at all */}
                {totalCount === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1]">
                    <div className="text-center px-6">
                      <p className="text-xs font-bold stitch-text-secondary mb-1">No blocks yet.</p>
                      <p className="text-[11px] stitch-text-secondary opacity-70">
                        Tap a chip above, or click an hour to schedule.
                      </p>
                    </div>
                  </div>
                )}

                {/* Live "now" line */}
                {showNowLine && (
                  <div
                    className="absolute left-0 right-0 flex items-center pointer-events-none z-20"
                    style={{ top: `${nowYpx}px` }}
                  >
                    <span className="text-[9px] font-extrabold text-rose-600 tabular-nums shrink-0 w-12 text-right pr-2 bg-white/90 backdrop-blur rounded-r-full">
                      {nowLabel}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 shadow-md shadow-rose-500/40 ring-2 ring-white" />
                    <div className="flex-1 h-px bg-gradient-to-r from-rose-500 via-rose-400/70 to-transparent" />
                  </div>
                )}

                {/* Hour rows */}
                {HOURS.map((hour) => {
                  const blocksHere = blocks.filter((b) => parseInt(b.start_time.split(':')[0], 10) === hour);
                  // When viewing today: hours already passed are greyed. On future days: nothing is past.
                  const isPast     = isViewingToday && hour < currentHour;
                  const isCurrent  = isViewingToday && hour === currentHour;
                  const isAdding   = addingAtHour === hour;
                  const hasBlocks  = blocksHere.length > 0;
                  const sessHere   = daySessions.filter((ps) => ps.startsAt.getHours() === hour);

                  return (
                    <div
                      key={hour}
                      className="flex gap-2 relative"
                      style={{ minHeight: `${HOUR_PX}px` }}
                    >
                      {/* Hour label */}
                      <div className="w-12 -mt-2 pr-2 text-right shrink-0">
                        <span
                          className={`text-[10px] font-extrabold tabular-nums ${
                            isCurrent ? 'text-rose-600' : isPast ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          {formatHour(hour)}
                        </span>
                      </div>

                      {/* Lane */}
                      <div className="flex-1 relative pl-2 border-l border-surface-container-high/40">
                        {blocksHere.map((block) => (
                          <BlockCard
                            key={block.id}
                            block={block}
                            onToggle={handleToggle}
                            onStart={(b) => onStartSession(b.title, nearestDuration(b.duration_mins))}
                            onDelete={handleDelete}
                          />
                        ))}
                        {/* Logged + booked sessions for this hour (read-only), tinted by project */}
                        {sessHere.map((ps) => {
                          const completed = ps.status === 'completed';
                          const { hex, style } = sessionBlockStyle(ps);
                          return (
                            <div
                              key={ps.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedGridSession(plannerToGrid(ps.raw))}
                              onKeyDown={(e) => { if (e.key === 'Enter') setSelectedGridSession(plannerToGrid(ps.raw)); }}
                              onMouseEnter={(e) => setHoveredSession({ session: plannerToGrid(ps.raw), rect: e.currentTarget.getBoundingClientRect() })}
                              onMouseLeave={() => setHoveredSession(null)}
                              className={`relative flex items-center gap-1.5 rounded-lg pl-3 pr-2 py-1.5 mb-1 cursor-pointer hover:brightness-[0.97] active:scale-[0.99] transition ${completed ? '' : 'opacity-90'}`}
                              style={style}
                              title={`${ps.title} · ${ps.durationMins}min · ${completed ? 'completed' : 'scheduled'}`}
                            >
                              <span className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: hex }} />
                              {completed
                                ? <Check size={11} strokeWidth={3} className="shrink-0" style={{ color: hex }} />
                                : <CalendarIcon size={10} className="shrink-0" style={{ color: hex }} />}
                              <span className="flex-1 min-w-0 text-[11px] font-bold truncate" style={{ color: hex }}>
                                {ps.title}
                              </span>
                              <span className="text-[10px] font-semibold shrink-0 opacity-80" style={{ color: hex }}>
                                {ps.durationMins}m
                              </span>
                            </div>
                          );
                        })}

                        {isAdding && (
                          <AddBlockForm
                            onAdd={(title, dur, type) => handleAddAt(hour, title, dur, type)}
                            onCancel={() => setAddingAtHour(null)}
                          />
                        )}

                        {!isAdding && !hasBlocks && !isPast && (
                          <button
                            type="button"
                            onClick={() => setAddingAtHour(hour)}
                            className="group w-full h-full absolute inset-0 flex items-center gap-1.5 text-[11px] text-slate-300 hover:text-primary px-2 transition-colors rounded-lg hover:bg-primary/4"
                          >
                            <Plus size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                              Block out time
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </>
          ) : (
            <WeekTimeline
              weekDays={weekDays}
              weekBlocks={weekBlocks}
              weekSessions={plannerSessions}
              todayKey={today}
              currentHour={currentHour}
              currentMin={currentMin}
              nowLabel={nowLabel}
              showNowLine={showNowLine}
              nowYpx={nowYpx}
              onToggle={handleToggle}
              onStart={(b) => onStartSession(b.title, nearestDuration(b.duration_mins))}
              onDelete={handleDelete}
              onSwitchToDay={(d) => { setSelectedDateStr(d); setViewMode('day'); }}
              onSelectSession={(ps) => setSelectedGridSession(plannerToGrid(ps.raw))}
              onHoverSession={(ps, rect) =>
                setHoveredSession(ps && rect ? { session: plannerToGrid(ps.raw), rect } : null)}
            />
          )}

          </main>
        </div>
      </div>

      {/* Intention wizard modal */}
      {showWizard && (
        <IntentionWizard
          onClose={() => setShowWizard(false)}
          onComplete={reloadWeekly}
        />
      )}

      {/* Find sessions sheet (modal on desktop, bottom-sheet on mobile) */}
      {showFindSessions && (
        <FindSessionsSheet onClose={() => setShowFindSessions(false)} />
      )}

      {/* Hover preview — anchored card, same info as the /sessions calendar */}
      {hoveredSession && !selectedGridSession && (
        <SessionHoverCard session={hoveredSession.session} anchorRect={hoveredSession.rect} />
      )}

      {/* Session detail — same sheet as the /sessions calendar, on click */}
      {selectedGridSession && (
        <Suspense fallback={null}>
          <SessionDetailSheet
            session={selectedGridSession}
            isMine={selectedGridSession.user_id === user?.id}
            onClose={() => setSelectedGridSession(null)}
            onJoined={(id) => { setSelectedGridSession(null); navigate(`/session/${id}`); }}
            onChanged={() => { void reloadSessions(); }}
          />
        </Suspense>
      )}
    </>
  );
}
