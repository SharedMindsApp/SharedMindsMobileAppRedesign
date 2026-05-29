/**
 * AdminHeatmaps — mood & productivity analytics for SharedMinds admins.
 *
 * Three panels:
 *  1. Mood heatmap     — hour-of-day × day-of-week grid, avg mood score
 *  2. Mood before/after — avg start vs end mood per session kind
 *  3. Productivity      — sessions + tasks completed per day (bar chart)
 */

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  AlertCircle, TrendingUp, TrendingDown, Minus,
  Activity, CheckSquare, Clock, Smile,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import {
  getHeatmapAnalytics,
  getMatchWaitAnalytics,
  MOOD_SCORES,
  type HeatmapAnalytics,
  type MoodTimeCell,
  type MoodShift,
  type MatchWaitAnalytics,
  type MatchWaitCell,
} from '../../lib/admin';

type Range = 'week' | 'month' | 'quarter' | 'all';

const RANGE_LABELS: Record<Range, string> = {
  week: 'Last 7 days',
  month: 'Last 30 days',
  quarter: 'Last 90 days',
  all: 'All time',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const BUCKET_LABELS = [
  '12–3am', '3–6am', '6–9am', '9am–12pm',
  '12–3pm', '3–6pm', '6–9pm', '9pm–12am',
];

// 2-hour buckets (12/day) for the match-wait heatmap, labelled in UTC.
const MATCH_BUCKET_LABELS = [
  '12am', '2am', '4am', '6am', '8am', '10am',
  '12pm', '2pm', '4pm', '6pm', '8pm', '10pm',
];

/** Wait minutes → colour. Lower (faster match) = greener, higher = redder. */
function waitToColor(mins: number | null): string {
  if (mins === null) return 'bg-gray-100';
  if (mins < 3)  return 'bg-emerald-500';
  if (mins < 6)  return 'bg-lime-400';
  if (mins < 10) return 'bg-amber-300';
  if (mins < 15) return 'bg-orange-400';
  return 'bg-red-400';
}

const KIND_META: Record<string, { label: string; emoji: string; color: string }> = {
  do:      { label: 'Do work',     emoji: '⚡', color: '#3b82f6' },
  plan:    { label: 'Plan & think', emoji: '🧭', color: '#8b5cf6' },
  reflect: { label: 'Reflect',     emoji: '🪞', color: '#10b981' },
};

/** Map a 1–6 mood score to a Tailwind-compatible background colour. */
function scoreToColor(score: number | null): string {
  if (score === null) return 'bg-gray-100';
  if (score < 2)   return 'bg-red-400';
  if (score < 2.8) return 'bg-orange-400';
  if (score < 3.6) return 'bg-amber-300';
  if (score < 4.4) return 'bg-lime-300';
  if (score < 5.2) return 'bg-emerald-400';
  return 'bg-teal-500';
}

/** Inline style background for the bar chart label colours. */
function scoreToHex(score: number): string {
  if (score < 2)   return '#f87171';
  if (score < 2.8) return '#fb923c';
  if (score < 3.6) return '#fbbf24';
  if (score < 4.4) return '#a3e635';
  if (score < 5.2) return '#34d399';
  return '#14b8a6';
}

const MAX_SCORE = Math.max(...Object.values(MOOD_SCORES)); // 6

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, iconCls, label, value, sub,
}: {
  icon: React.ElementType;
  iconCls: string;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${iconCls}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function MoodHeatmap({ cells }: { cells: MoodTimeCell[] }) {
  // Build a lookup: day → bucket → cell
  const lookup = new Map<string, MoodTimeCell>();
  for (const c of cells) lookup.set(`${c.day}-${c.bucket}`, c);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        {/* Header row: day labels */}
        <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
          <div />
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-500">{d}</div>
          ))}
        </div>

        {/* One row per 3-hour bucket */}
        {BUCKET_LABELS.map((label, bucket) => (
          <div
            key={bucket}
            className="grid gap-1 mb-1"
            style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}
          >
            <div className="text-right text-[11px] text-gray-400 pr-2 self-center leading-tight">
              {label}
            </div>
            {DAY_LABELS.map((_, day) => {
              const cell = lookup.get(`${day}-${bucket}`);
              return (
                <div
                  key={day}
                  title={
                    cell
                      ? `${DAY_LABELS[day]} ${label}: avg ${cell.avgScore.toFixed(1)}/6 (${cell.count} sessions)`
                      : 'No data'
                  }
                  className={`h-8 rounded flex items-center justify-center text-[10px] font-medium
                    ${cell ? scoreToColor(cell.avgScore) + ' text-white cursor-default' : 'bg-gray-100 text-gray-300'}`}
                >
                  {cell ? cell.avgScore.toFixed(1) : '–'}
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-gray-400">Low mood</span>
          {['bg-red-400', 'bg-orange-400', 'bg-amber-300', 'bg-lime-300', 'bg-emerald-400', 'bg-teal-500'].map((c) => (
            <div key={c} className={`w-6 h-3 rounded ${c}`} />
          ))}
          <span className="text-xs text-gray-400">High mood</span>
        </div>
      </div>
    </div>
  );
}

function MoodShiftPanel({ shifts }: { shifts: MoodShift[] }) {
  if (shifts.length === 0) {
    return <p className="text-gray-400 text-sm">No before/after mood data yet.</p>;
  }

  const chartData = shifts.map((s) => {
    const meta = KIND_META[s.sessionKind] ?? { label: s.sessionKind, emoji: '', color: '#6b7280' };
    return {
      name: `${meta.emoji} ${meta.label}`,
      'Before session': parseFloat(s.avgStart.toFixed(2)),
      'After session':  parseFloat(s.avgEnd.toFixed(2)),
      count: s.count,
      delta: s.delta,
    };
  });

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 6]} tick={{ fontSize: 11 }} tickCount={7} />
          <Tooltip
            formatter={(v: number, name: string) => [`${v.toFixed(2)} / 6`, name]}
          />
          <Legend />
          <Bar dataKey="Before session" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="After session"  fill="#34d399" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Delta summary chips */}
      <div className="flex flex-wrap gap-3">
        {shifts.map((s) => {
          const meta = KIND_META[s.sessionKind];
          const positive = s.delta > 0.05;
          const negative = s.delta < -0.05;
          return (
            <div
              key={s.sessionKind}
              className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
            >
              <span className="text-base">{meta?.emoji}</span>
              <div>
                <p className="text-xs font-semibold text-gray-700">{meta?.label}</p>
                <p className="text-xs text-gray-500">{s.count} sessions</p>
              </div>
              <div className={`flex items-center gap-1 ml-2 font-semibold text-sm ${
                positive ? 'text-emerald-600' : negative ? 'text-rose-500' : 'text-gray-400'
              }`}>
                {positive ? <TrendingUp size={14} /> : negative ? <TrendingDown size={14} /> : <Minus size={14} />}
                {s.delta > 0 ? '+' : ''}{s.delta.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductivityChart({ data }: { data: HeatmapAnalytics['dailyActivity'] }) {
  if (data.length === 0) {
    return <p className="text-gray-400 text-sm">No productivity data yet.</p>;
  }

  // Show last 30 points max to keep the chart readable
  const visible = data.slice(-30).map((d) => ({
    date: d.date.slice(5),   // MM-DD
    Sessions: d.sessions,
    Tasks: d.tasksCompleted,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={visible} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10 }}
          interval={Math.max(0, Math.floor(visible.length / 8) - 1)}
        />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="Sessions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Tasks"    fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

/** Match-wait heatmap — day-of-week × 2-hour bucket, avg wait minutes. */
function MatchWaitHeatmap({ cells }: { cells: MatchWaitCell[] }) {
  const byKey = new Map(cells.map((c) => [`${c.day}-${c.bucket}`, c]));
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Column headers (2-hour buckets) */}
        <div className="grid" style={{ gridTemplateColumns: `48px repeat(12, minmax(34px, 1fr))` }}>
          <div />
          {MATCH_BUCKET_LABELS.map((label) => (
            <div key={label} className="text-[9px] text-gray-400 text-center pb-1">{label}</div>
          ))}
        </div>
        {DAY_LABELS.map((dayLabel, day) => (
          <div key={day} className="grid items-center" style={{ gridTemplateColumns: `48px repeat(12, minmax(34px, 1fr))` }}>
            <div className="text-[11px] font-semibold text-gray-500 pr-2 text-right">{dayLabel}</div>
            {Array.from({ length: 12 }).map((_, bucket) => {
              const cell = byKey.get(`${day}-${bucket}`);
              return (
                <div key={bucket} className="p-0.5">
                  <div
                    title={cell ? `${dayLabel} ${MATCH_BUCKET_LABELS[bucket]} UTC · ~${Math.round(cell.avgMinutes)} min · ${cell.count} match${cell.count === 1 ? '' : 'es'}` : 'No matches'}
                    className={`h-8 rounded grid place-items-center text-[9px] font-bold tabular-nums
                      ${cell ? waitToColor(cell.avgMinutes) + ' text-white' : 'bg-gray-100 text-gray-300'}`}
                  >
                    {cell ? Math.round(cell.avgMinutes) : ''}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400">
          <span>Faster</span>
          {['bg-emerald-500', 'bg-lime-400', 'bg-amber-300', 'bg-orange-400', 'bg-red-400'].map((c) => (
            <span key={c} className={`w-5 h-3 rounded ${c}`} />
          ))}
          <span>Slower</span>
        </div>
      </div>
    </div>
  );
}

export function AdminHeatmaps() {
  const [range, setRange] = useState<Range>('month');
  const [data, setData]   = useState<HeatmapAnalytics | null>(null);
  const [matchWait, setMatchWait] = useState<MatchWaitAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback((r: Range) => {
    setLoading(true);
    setError(null);
    Promise.all([getHeatmapAnalytics(r), getMatchWaitAnalytics(r)])
      .then(([h, mw]) => { setData(h); setMatchWait(mw); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(range); }, [load, range]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalSessions  = data?.dailyActivity.reduce((s, d) => s + d.sessions, 0) ?? 0;
  const totalTasks     = data?.dailyActivity.reduce((s, d) => s + d.tasksCompleted, 0) ?? 0;
  const avgMoodLabel   = data?.avgMoodScore != null
    ? `${data.avgMoodScore.toFixed(1)} / 6`
    : '—';
  const peakHourLabel  = data != null
    ? `${data.peakHour}:00–${data.peakHour + 1}:00 UTC`
    : '—';

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-gray-500">Loading heatmaps…</div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600 shrink-0" size={24} />
          <div>
            <p className="font-semibold text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header + range selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Heatmap Analytics</h1>
            <p className="text-gray-500 mt-1">Mood patterns, session shifts, and productivity trends</p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 self-start sm:self-auto">
            {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  range === r
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {/* ── Summary stats ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Activity}
            iconCls="bg-blue-50 text-blue-600"
            label="Total sessions"
            value={totalSessions}
            sub={RANGE_LABELS[range]}
          />
          <StatCard
            icon={CheckSquare}
            iconCls="bg-emerald-50 text-emerald-600"
            label="Tasks completed"
            value={totalTasks}
            sub={RANGE_LABELS[range]}
          />
          <StatCard
            icon={Smile}
            iconCls="bg-amber-50 text-amber-600"
            label="Avg mood score"
            value={avgMoodLabel}
            sub="Across all start moods"
          />
          <StatCard
            icon={Clock}
            iconCls="bg-violet-50 text-violet-600"
            label="Peak session hour"
            value={peakHourLabel}
            sub="Most sessions start here"
          />
        </div>

        {/* ── Panel 1: Mood heatmap ──────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">Mood Heatmap</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Average start-of-session mood score (1–6) by day and time — hover a cell for details
            </p>
          </div>
          {data && data.moodCells.length > 0
            ? <MoodHeatmap cells={data.moodCells} />
            : <p className="text-gray-400 text-sm">No mood data in this range yet.</p>
          }
        </div>

        {/* ── Panel 2: Mood before/after ─────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">Mood Before & After Sessions</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Average mood score at session start vs end, by session type — higher is better
            </p>
          </div>
          {data && <MoodShiftPanel shifts={data.moodShifts} />}
        </div>

        {/* ── Panel: Match-me-now wait times ─────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Match-me-now Wait Times</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Average minutes a door waits before a partner drops in, by day × 2-hour block (UTC).
                Feeds the live "around now" estimate shown when opening a door.
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {matchWait?.globalAvgMinutes != null ? `${Math.round(matchWait.globalAvgMinutes)}m` : '—'}
              </p>
              <p className="text-[11px] text-gray-400">global avg · {matchWait?.sampleSize ?? 0} matches</p>
            </div>
          </div>
          {matchWait && matchWait.cells.length > 0
            ? <MatchWaitHeatmap cells={matchWait.cells} />
            : <p className="text-gray-400 text-sm">No matched sessions in this range yet.</p>
          }
        </div>

        {/* ── Panel 3: Productivity ──────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">Productivity Over Time</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Sessions started and tasks completed per day (last 30 data points shown)
            </p>
          </div>
          {data && <ProductivityChart data={data.dailyActivity} />}
        </div>
      </div>
    </AdminLayout>
  );
}
