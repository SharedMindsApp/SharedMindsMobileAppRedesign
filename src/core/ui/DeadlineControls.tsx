/**
 * DeadlineChip + DeadlineEditor — the shared UI for phase / milestone /
 * project deadlines. The chip shows the on-target verdict; the editor sets
 * a date + flexible/hard type (or clears it).
 */

import { CalendarClock } from 'lucide-react';
import {
  deadlineStatus, type DeadlineType, type DeadlineKind,
} from '../../lib/deadlineStatus';

/** Read-only verdict chip. Renders nothing when there's no deadline. */
export function DeadlineChip({
  targetDate, deadlineType, done, className = '',
}: {
  targetDate: string | null | undefined;
  deadlineType?: DeadlineType | null;
  done?: boolean;
  className?: string;
}) {
  const s = deadlineStatus({ targetDate, deadlineType, done });
  if (s.kind === 'none' || s.kind === 'done') return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${s.tone} ${className}`}>
      <CalendarClock size={9} />
      {s.label}
    </span>
  );
}

/** A small label + tone for a rolled-up verdict (project/milestone summary). */
export function rollupChipMeta(kind: DeadlineKind): { label: string; tone: string } | null {
  switch (kind) {
    case 'overdue':     return { label: 'Behind',   tone: 'bg-rose-100 text-rose-700' };
    case 'past-target': return { label: 'Past aim',  tone: 'bg-amber-100 text-amber-800' };
    case 'due-soon':    return { label: 'Due soon',  tone: 'bg-amber-100 text-amber-700' };
    case 'on-track':    return { label: 'On track',  tone: 'bg-sky-100 text-sky-700' };
    default:            return null;
  }
}

/** Inline editor: date input + Flexible/Hard toggle + clear. */
export function DeadlineEditor({
  date, type, onChange, accentHex = '#6366f1',
}: {
  date: string | null;
  type: DeadlineType | null;
  /** Fires on any change. `null` date clears the deadline entirely. */
  onChange: (next: { date: string | null; type: DeadlineType | null }) => void;
  accentHex?: string;
}) {
  const effectiveType: DeadlineType = type ?? 'flexible';
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="date"
        value={date ?? ''}
        onChange={(e) => {
          const v = e.target.value || null;
          onChange({ date: v, type: v ? effectiveType : null });
        }}
        className="bg-surface-container-low rounded-lg px-2 py-1 text-[11px] stitch-text-primary outline-none ring-1 ring-surface-container focus:ring-2 focus:ring-primary/30"
      />
      {date && (
        <>
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-surface-container-low p-0.5">
            {(['flexible', 'hard'] as DeadlineType[]).map((t) => {
              const active = effectiveType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onChange({ date, type: t })}
                  aria-pressed={active}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold capitalize transition-all ${
                    active ? 'text-white shadow-sm' : 'stitch-text-secondary hover:bg-surface-container'
                  }`}
                  style={active ? { backgroundColor: t === 'hard' ? '#e11d48' : accentHex } : undefined}
                  title={t === 'hard' ? 'Firm date — overdue if missed' : 'Soft aim — gentle nudge only'}
                >
                  {t === 'hard' ? 'Hard' : 'Flexible'}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => onChange({ date: null, type: null })}
            className="text-[10px] font-bold text-rose-600/80 hover:text-rose-700"
          >
            Clear
          </button>
        </>
      )}
    </div>
  );
}
