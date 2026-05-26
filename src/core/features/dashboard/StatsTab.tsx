/**
 * StatsTab — personal momentum view inside the home dashboard.
 *
 * The frame: ADHD-friendly stats SHOULD show momentum, not gaps. Every
 * metric here is framed positively where possible. We never show "you
 * haven't worked in N days" — we show "current streak" and let the user
 * draw their own conclusion.
 *
 * Layout (mobile-first, ~2 viewport heights):
 *   1. Hero: focused hours this week + sparkline + "↑ vs last week"
 *   2. Streak strip: current and longest, side by side
 *   3. Counts row: sessions / things shipped / intentions met
 *   4. Time by project (only when 2+ projects logged time)
 *   5. (Future) This month section, expandable
 */

import { useEffect, useState } from 'react';
import { Flame, Trophy, Sparkles, CheckCircle2, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useCoreData } from '../../data/CoreDataContext';
import {
  fetchProfileStats,
  fetchWeeklyStats,
  type ProfileStats,
  type WeeklyStats,
} from '../../services/ProfileService';

export function StatsTab() {
  const { user } = useAuth();
  const { state: { projects } } = useCoreData();
  const [profile, setProfile] = useState<ProfileStats | null>(null);
  const [weekly, setWeekly] = useState<WeeklyStats | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([fetchProfileStats(user.id), fetchWeeklyStats(user.id)])
      .then(([p, w]) => {
        if (!cancelled) {
          setProfile(p);
          setWeekly(w);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [user]);

  if (!loaded) {
    return (
      <div className="py-6 text-center text-sm stitch-text-secondary">
        Loading your stats…
      </div>
    );
  }

  if (!profile || !weekly) {
    return (
      <div className="py-6 text-center text-sm stitch-text-secondary">
        Stats unavailable. Try refreshing.
      </div>
    );
  }

  const hoursThisWeek = weekly.thisWeekMinutes / 60;
  const hoursLastWeek = weekly.lastWeekMinutes / 60;
  const delta = hoursThisWeek - hoursLastWeek;

  return (
    <div className="space-y-4 pb-6">
      {/* ── Hero metric: focused hours this week ─────────────── */}
      <section className="rounded-2xl bg-gradient-to-br from-violet-50 via-blue-50/40 to-cyan-50/40 ring-1 ring-violet-200/40 p-5">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-700">
            This week
          </p>
          {hoursLastWeek > 0 && (
            <DeltaPill delta={delta} unit="h" />
          )}
        </div>
        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="text-4xl font-extrabold stitch-text-primary tabular-nums">
            {hoursThisWeek.toFixed(1)}
          </span>
          <span className="text-sm font-semibold stitch-text-secondary">hours focused</span>
        </div>
        <Sparkline values={weekly.dailyMinutes.slice(7)} />
      </section>

      {/* ── Consistency strip ───────────────────────────────────
          Reframed from "streak" to "consistency" to soften the punitive
          edge. A single missed day no longer feels like a failure —
          these are reflective metrics, not pressure metrics. */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Flame size={14} className="text-orange-500" />}
          label="Recent run"
          value={profile.currentStreak}
          unit={profile.currentStreak === 1 ? 'day' : 'days'}
          accent="orange"
        />
        <StatCard
          icon={<Trophy size={14} className="text-amber-500" />}
          label="Best run"
          value={profile.longestStreak}
          unit={profile.longestStreak === 1 ? 'day' : 'days'}
          accent="amber"
        />
      </div>

      {/* ── Counts row: what got done this week ──────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Sparkles size={12} className="text-violet-500" />}
          label="Sessions"
          value={weekly.thisWeekSessions}
          unit="this week"
          compact
        />
        <StatCard
          icon={<CheckCircle2 size={12} className="text-emerald-500" />}
          label="Finished"
          value={weekly.thisWeekFinished}
          unit="this week"
          compact
        />
        <StatCard
          icon={<Target size={12} className="text-blue-500" />}
          label="Intentions"
          value={`${weekly.thisWeekIntentionsDone}/${weekly.thisWeekIntentionsTotal}`}
          unit="this week"
          compact
          isString
        />
      </div>

      {/* ── By project (only when 2+ projects logged time) ───── */}
      {Object.keys(weekly.projectMinutes).length >= 2 && (
        <section className="rounded-2xl bg-white ring-1 ring-surface-container p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary mb-3">
            <TrendingUp size={10} className="inline-block mr-1 -mt-0.5" />
            Time by project · last 7 days
          </p>
          <ProjectTimeBars
            projectMinutes={weekly.projectMinutes}
            projects={projects}
          />
        </section>
      )}

      {/* ── Lifetime tally (small footer) ────────────────────── */}
      <p className="text-[10px] text-center stitch-text-secondary pt-2">
        All-time: {profile.totalSessions} sessions · {Math.round(profile.totalFocusMinutes / 60)}h focused
        {profile.bestDayOfWeek && ` · Strongest on ${profile.bestDayOfWeek}s`}
      </p>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function StatCard({
  icon, label, value, unit, accent, compact = false, isString = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  unit: string;
  accent?: 'orange' | 'amber';
  compact?: boolean;
  isString?: boolean;
}) {
  const bg =
    accent === 'orange' ? 'bg-orange-50 ring-orange-200/50'
    : accent === 'amber' ? 'bg-amber-50 ring-amber-200/50'
    : 'bg-white ring-surface-container';

  return (
    <div className={`rounded-2xl ring-1 p-3 ${bg}`}>
      <div className="flex items-center gap-1 mb-1">
        {icon}
        <p className="text-[9px] font-bold uppercase tracking-widest stitch-text-secondary truncate">
          {label}
        </p>
      </div>
      <p className={`font-extrabold stitch-text-primary tabular-nums leading-none ${compact ? 'text-xl' : 'text-2xl'}`}>
        {isString ? value : value}
      </p>
      <p className="text-[10px] stitch-text-secondary mt-0.5">{unit}</p>
    </div>
  );
}

function DeltaPill({ delta, unit }: { delta: number; unit: string }) {
  const positive = delta > 0;
  const zero = Math.abs(delta) < 0.05;
  if (zero) {
    return (
      <span className="text-[10px] font-bold stitch-text-secondary">
        Same as last week
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${
      positive ? 'text-emerald-700' : 'text-rose-600'
    }`}>
      {positive ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}{unit} vs last week
    </span>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <div className="flex items-end gap-1 h-12">
      {values.map((v, i) => {
        const h = (v / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex-1 flex flex-col justify-end">
              <div
                className="w-full rounded-t bg-gradient-to-t from-violet-400 to-violet-500"
                style={{ height: `${Math.max(h, v > 0 ? 8 : 2)}%`, opacity: v > 0 ? 1 : 0.25 }}
              />
            </div>
            <span className="text-[9px] stitch-text-secondary">{days[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function ProjectTimeBars({
  projectMinutes,
  projects,
}: {
  projectMinutes: Record<string, number>;
  projects: Array<{ id: string; name: string; color: string | null }>;
}) {
  const total = Object.values(projectMinutes).reduce((a, b) => a + b, 0);
  const PROJECT_HEX: Record<string, string> = {
    cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
    emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
  };
  const entries = Object.entries(projectMinutes)
    .sort(([, a], [, b]) => b - a)
    .map(([id, mins]) => {
      const project = projects.find((p) => p.id === id);
      return {
        id,
        name: project?.name ?? 'Unknown project',
        color: project?.color ? (PROJECT_HEX[project.color] ?? project.color) : '#94a3b8',
        mins,
        pct: total > 0 ? (mins / total) * 100 : 0,
      };
    });

  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <div key={e.id}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
              <span className="text-xs font-semibold stitch-text-primary truncate">{e.name}</span>
            </div>
            <span className="text-[10px] font-bold stitch-text-secondary tabular-nums">
              {Math.round(e.mins / 60 * 10) / 10}h · {Math.round(e.pct)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-container overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${e.pct}%`, backgroundColor: e.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
