// SessionsListView
//
// Flat chronological list of upcoming + active sessions, grouped by
// day with a horizontal date strip selector. Default view for the
// sessions page — an empty grid feels dead, but a feed-style list
// stays warm even when it's just one or two sessions.
//
// Same data source as CalendarView (the active + scheduled arrays
// from the parent), same GridSession shape, same filter chips.
//
// Empty state is intentionally inviting: "be the first to book."

import { useMemo } from 'react';
import {
  Users, UserPlus, User, Clock, Calendar as CalIcon,
  Play, Video, ChevronRight, Sparkles,
} from 'lucide-react';

// ── Types (kept local — match CalendarView's GridSession shape) ──

export type ListSession = {
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
};

const PROJECT_DOT_HEX: Record<string, string> = {
  cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
  emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
};
function projectDot(token: string | null | undefined): string {
  return PROJECT_DOT_HEX[token ?? ''] ?? PROJECT_DOT_HEX.blue;
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

/** Relative-day label: Today / Tomorrow / Thu / etc. */
function dayLabel(d: Date): { top: string; bottom: string } {
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return { top: 'Today', bottom: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) };
  if (diffDays === 1) return { top: 'Tomorrow', bottom: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) };
  return { top: d.toLocaleDateString('en-GB', { weekday: 'short' }), bottom: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) };
}

function timeLabel(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ── Component ───────────────────────────────────────────────────

interface Props {
  sessions: ListSession[];
  /** Selected date as a YYYY-MM-DD anchor. The list shows that day. */
  anchorDay: Date;
  onPickDay: (d: Date) => void;
  /** Click a session row → open detail / join. */
  onSelect: (s: ListSession) => void;
  /** "+ Book a session" → opens schedule modal at the chosen date. */
  onBook: (atDay: Date) => void;
  /** Number of days to show in the strip. Default 7. */
  dayCount?: number;
}

export function SessionsListView({
  sessions,
  anchorDay,
  onPickDay,
  onSelect,
  onBook,
  dayCount = 7,
}: Props) {
  // Build the date strip — anchored on today by default, then +6 more
  // days. We don't allow the strip itself to slide backwards (past
  // sessions live in /progress); navigation forward happens via the
  // existing CalendarView next-day chevrons.
  const stripDays = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: dayCount }, (_, i) => addDays(today, i));
  }, [dayCount]);

  // Sessions for the selected day, sorted by start time.
  const daySessions = useMemo(
    () => sessions
      .filter((s) => sameDay(s.startsAt, anchorDay))
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
    [sessions, anchorDay]
  );

  // Counts per day for badges on the strip.
  const countsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      const key = startOfDay(s.startsAt).toISOString();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [sessions]);

  return (
    <div className="flex-1 min-w-0 flex flex-col mt-4 lg:mt-0 space-y-4">
      {/* ── Date strip ──────────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-thin -mx-1 px-1 pb-1">
        {stripDays.map((d) => {
          const isSelected = sameDay(d, anchorDay);
          const { top, bottom } = dayLabel(d);
          const count = countsByDay.get(startOfDay(d).toISOString()) ?? 0;
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onPickDay(d)}
              className={`shrink-0 relative rounded-2xl px-4 py-2.5 min-w-[88px] text-center transition-all ${
                isSelected
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
              }`}
            >
              <p className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-white/80' : 'stitch-text-secondary'}`}>
                {top}
              </p>
              <p className="text-sm font-extrabold leading-tight mt-0.5">
                {bottom}
              </p>
              {count > 0 && (
                <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold tabular-nums grid place-items-center ${
                  isSelected ? 'bg-white text-primary' : 'bg-primary text-white'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Day section ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold stitch-text-primary leading-tight">
            {dayLabel(anchorDay).top}
            <span className="ml-2 text-sm font-semibold stitch-text-secondary">
              {anchorDay.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onBook(anchorDay)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Play size={11} /> Book this day
        </button>
      </div>

      {/* ── Sessions list ───────────────────────────────────── */}
      {daySessions.length === 0 ? (
        <EmptyDay anchorDay={anchorDay} onBook={() => onBook(anchorDay)} />
      ) : (
        <ul className="space-y-2">
          {daySessions.map((s) => (
            <SessionRow key={s.id} s={s} onSelect={() => onSelect(s)} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Row ─────────────────────────────────────────────────────────

function SessionRow({ s, onSelect }: { s: ListSession; onSelect: () => void }) {
  const isActive = s.status === 'active';
  const startsInMs = s.startsAt.getTime() - Date.now();
  const startingSoon = !isActive && startsInMs > 0 && startsInMs < 15 * 60 * 1000;

  const modeMeta = SESSION_MODE_META[s.session_mode] ?? SESSION_MODE_META.group;

  const title = s.session_goal || s.session_title || modeMeta.fallbackTitle;
  const initials = (s.display_name || '?').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`w-full text-left rounded-2xl p-3 ring-1 transition-all hover:shadow-md hover:-translate-y-px ${
          isActive
            ? 'bg-emerald-50/40 ring-emerald-200/60 hover:ring-emerald-300'
            : 'bg-surface ring-surface-container/80 hover:ring-primary/30'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="shrink-0 relative">
            {s.avatar_url ? (
              <img src={s.avatar_url} alt={s.display_name} className="w-11 h-11 rounded-2xl object-cover" />
            ) : (
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${avatarHashClass(s.display_name)} grid place-items-center text-white text-sm font-extrabold`}>
                {initials}
              </div>
            )}
            {isActive && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-surface animate-pulse" />
            )}
          </div>

          {/* Main */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${modeMeta.chipCls}`}>
                <modeMeta.Icon size={9} /> {modeMeta.label}
              </span>
              {isActive ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  • Live now
                </span>
              ) : startingSoon ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  <Sparkles size={9} /> Starting soon
                </span>
              ) : null}
              {s.quiet_mode && (
                <span className="text-[10px] font-bold uppercase tracking-wider stitch-text-secondary">· Quiet</span>
              )}
            </div>

            <p className="text-sm font-extrabold stitch-text-primary leading-snug mt-1 line-clamp-2">
              {title}
            </p>

            <div className="flex items-center gap-2 mt-1 text-[11px] stitch-text-secondary flex-wrap">
              <span className="font-semibold stitch-text-primary truncate max-w-[140px]">{s.display_name}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock size={10} /> {timeLabel(s.startsAt)} · {s.intended_duration_minutes}m
              </span>
              {s.project_title && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: projectDot(s.project_color) }} />
                    <span className="truncate max-w-[120px]">{s.project_title}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action affordance */}
          <div className="shrink-0 self-center">
            <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full ${
              isActive
                ? 'bg-emerald-600 text-white'
                : 'bg-surface-container-low stitch-text-primary'
            }`}>
              {isActive ? <Video size={14} /> : <ChevronRight size={14} />}
            </span>
          </div>
        </div>
      </button>
    </li>
  );
}

const SESSION_MODE_META: Record<ListSession['session_mode'], {
  label: string;
  fallbackTitle: string;
  Icon: typeof Users;
  chipCls: string;
}> = {
  group:      { label: 'Group',   fallbackTitle: 'Group focus session',  Icon: Users,    chipCls: 'bg-blue-100 text-blue-700' },
  one_on_one: { label: '1-on-1',  fallbackTitle: '1-on-1 focus session', Icon: UserPlus, chipCls: 'bg-violet-100 text-violet-700' },
  solo:       { label: 'Solo',    fallbackTitle: 'Solo focus session',   Icon: User,     chipCls: 'bg-rose-100 text-rose-700' },
};

// ── Empty state ─────────────────────────────────────────────────

function EmptyDay({ anchorDay, onBook }: { anchorDay: Date; onBook: () => void }) {
  const { top } = dayLabel(anchorDay);
  return (
    <div className="rounded-2xl bg-surface-container-low/60 ring-1 ring-surface-container/50 p-6 text-center space-y-3">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/8 grid place-items-center">
        <CalIcon size={20} className="text-primary/70" />
      </div>
      <div>
        <p className="text-sm font-extrabold stitch-text-primary">
          Nothing booked for {top.toLowerCase()} yet
        </p>
        <p className="text-xs stitch-text-secondary mt-1 leading-snug max-w-[320px] mx-auto">
          Be the first to claim a slot — others can join your session, or you
          can hold it solo with just the timer.
        </p>
      </div>
      <button
        type="button"
        onClick={onBook}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold stitch-btn--primary text-white shadow-sm hover:-translate-y-px transition-all"
      >
        <Play size={11} /> Book a session
      </button>
    </div>
  );
}
