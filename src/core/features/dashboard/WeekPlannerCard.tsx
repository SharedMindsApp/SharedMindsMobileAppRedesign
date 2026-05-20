/**
 * WeekPlannerCard — weekly overview: 7-day strip + intentions with microtasks.
 *
 * Two parts:
 *   1. Day strip — Mon→Sun of the current week, each day shows its block
 *      count and a "done" indicator. Today is highlighted.
 *   2. WeeklyIntentionsCard — the three-priority section with microtask
 *      breakdown (already built — rendered as a sub-component here).
 */

import { useState, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';
import { TimeBlockService } from '../../services/TimeBlockService';
import { formatWeekRange, mondayOf } from '../../services/ReflectionService';
import { WeeklyIntentionsCard } from './WeeklyIntentionsCard';

// ── Week day helpers ───────────────────────────────────────────────

interface WeekDay {
  date: Date;
  dateStr: string;   // YYYY-MM-DD
  label: string;     // 'M', 'T', 'W', 'T', 'F', 'S', 'S'
  dayNum: number;
}

function getWeekDays(now: Date): WeekDay[] {
  const dow = now.getDay();                            // 0=Sun
  const offset = dow === 0 ? -6 : 1 - dow;            // shift to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + offset);
  monday.setHours(0, 0, 0, 0);

  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      date:    d,
      dateStr: d.toISOString().slice(0, 10),
      label:   DAY_LABELS[i],
      dayNum:  d.getDate(),
    };
  });
}

// ── WeekPlannerCard ────────────────────────────────────────────────

export function WeekPlannerCard() {
  const now     = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const days     = getWeekDays(now);

  // Block counts per day — loaded async so the strip renders immediately
  const [blockCounts, setBlockCounts] = useState<Record<string, number>>({});
  const [doneCounts,  setDoneCounts]  = useState<Record<string, number>>({});

  useEffect(() => {
    const weekStart = days[0].dateStr;
    const weekEnd   = days[6].dateStr;
    TimeBlockService.getBlocksForDateRange(weekStart, weekEnd)
      .then((blocks) => {
        const total: Record<string, number> = {};
        const done:  Record<string, number> = {};
        for (const b of blocks) {
          total[b.block_date] = (total[b.block_date] ?? 0) + 1;
          if (b.completed_at) done[b.block_date] = (done[b.block_date] ?? 0) + 1;
        }
        setBlockCounts(total);
        setDoneCounts(done);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weekLabel = formatWeekRange(mondayOf(now));

  return (
    <div className="space-y-4">

      {/* ── 7-day strip ─────────────────────────────────────────── */}
      <div className="rounded-2xl bg-surface ring-1 ring-surface-container/40 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={13} className="text-primary" />
            <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
              This week
            </p>
          </div>
          <span className="text-[10px] stitch-text-secondary">{weekLabel}</span>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const isToday = day.dateStr === todayStr;
            const isPast  = day.date < new Date(todayStr + 'T00:00:00');
            const total   = blockCounts[day.dateStr] ?? 0;
            const done    = doneCounts[day.dateStr]  ?? 0;
            const allDone = total > 0 && done === total;

            return (
              <div
                key={day.dateStr}
                className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-colors ${
                  isToday
                    ? 'bg-primary/8 ring-1 ring-primary/20'
                    : isPast
                    ? 'opacity-35'
                    : ''
                }`}
              >
                {/* Day letter */}
                <span className={`text-[10px] font-extrabold tracking-wide ${
                  isToday ? 'text-primary' : 'stitch-text-secondary'
                }`}>
                  {day.label}
                </span>

                {/* Date number */}
                <span className={`text-sm font-extrabold tabular-nums leading-none ${
                  isToday ? 'text-primary' : 'stitch-text-primary'
                }`}>
                  {day.dayNum}
                </span>

                {/* Block indicator */}
                {total > 0 ? (
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full tabular-nums leading-none ${
                    allDone
                      ? 'bg-emerald-100 text-emerald-700'
                      : isToday
                      ? 'bg-primary/15 text-primary'
                      : 'bg-surface-container text-slate-500'
                  }`}>
                    {done}/{total}
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-surface-container-high" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Weekly intentions + microtasks ──────────────────────── */}
      <WeeklyIntentionsCard />
    </div>
  );
}
