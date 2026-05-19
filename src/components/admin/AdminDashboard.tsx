import { useEffect, useState } from 'react';
import {
  Users, Activity, TrendingUp, AlertCircle,
  Clock, CheckCircle2, Link2, Sparkles,
  CircleDashed, CloudOff, UserPlus,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import {
  getAnalytics, getRecentFinishedSessions, getRecentSignups,
  type AnalyticsSummary, type RecentFinishedSession, type RecentSignup,
} from '../../lib/admin';

// ── Helpers ─────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function avatarHashClass(name: string): string {
  const colors = [
    'bg-violet-100 text-violet-700',
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-indigo-100 text-indigo-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const WORK_TYPE_LABELS: Record<string, string> = {
  designer: 'Designer', developer: 'Developer', writer: 'Writer',
  founder: 'Founder', filmmaker: 'Filmmaker', marketer: 'Marketer',
  consultant: 'Consultant', researcher: 'Researcher', other: 'Other',
};

const OUTCOME_META: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  finished:          { label: 'Finished', color: 'text-emerald-600', icon: CheckCircle2 },
  partially:         { label: 'Partial',  color: 'text-amber-600',   icon: CircleDashed },
  something_came_up: { label: 'Came up',  color: 'text-slate-500',   icon: CloudOff },
};

// ── Dashboard ───────────────────────────────────────────────────

export function AdminDashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [finished, setFinished] = useState<RecentFinishedSession[]>([]);
  const [signups, setSignups] = useState<RecentSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getAnalytics(),
      getRecentFinishedSessions(8),
      getRecentSignups(6),
    ])
      .then(([analytics, recentFinished, recentSignups]) => {
        if (cancelled) return;
        setSummary(analytics.summary);
        setFinished(recentFinished);
        setSignups(recentSignups);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading dashboard…</div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={24} />
          <div>
            <h3 className="font-semibold text-red-900">Error loading dashboard</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const stats = [
    {
      label: 'Total users',
      sub: summary?.newSignupsWeek
        ? `+${summary.newSignupsWeek} this week`
        : 'No new signups this week',
      value: summary?.totalUsers ?? 0,
      icon: Users,
      tint: 'blue',
    },
    {
      label: 'Active right now',
      sub: 'Non-solo sessions in progress',
      value: summary?.activeSessionsNow ?? 0,
      icon: Activity,
      tint: 'emerald',
      live: (summary?.activeSessionsNow ?? 0) > 0,
    },
    {
      label: 'Sessions today',
      sub: `${summary?.sessionsThisWeek ?? 0} this week · ${summary?.totalSessions ?? 0} all time`,
      value: summary?.sessionsToday ?? 0,
      icon: Clock,
      tint: 'cyan',
    },
    {
      label: 'Completion rate',
      sub: `${summary?.finishedSessions ?? 0} finished / ${(summary?.finishedSessions ?? 0) + (summary?.partiallyFinished ?? 0) + (summary?.somethingCameUp ?? 0)} reported`,
      value: `${summary?.completionRate ?? 0}%`,
      icon: CheckCircle2,
      tint: 'violet',
    },
    {
      label: 'Connections made',
      sub: summary?.pendingConnections
        ? `${summary.pendingConnections} pending`
        : 'Accepted mutual connections',
      value: summary?.totalConnections ?? 0,
      icon: Link2,
      tint: 'amber',
    },
    {
      label: 'Admin users',
      sub: `${summary?.premiumUsers ?? 0} premium · ${summary?.freeUsers ?? 0} free`,
      value: summary?.adminUsers ?? 0,
      icon: Sparkles,
      tint: 'rose',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Dashboard</h1>
          <p className="text-gray-600">Community health at a glance.</p>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
        </div>

        {/* Two-column activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          <ActivityCard
            title="Recently finished sessions"
            icon={CheckCircle2}
            empty="No finished sessions yet."
          >
            {finished.map((s) => {
              const outcome = s.session_outcome ? OUTCOME_META[s.session_outcome] : null;
              const OIcon = outcome?.icon ?? CheckCircle2;
              return (
                <div key={s.id} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
                  {s.avatar_url ? (
                    <img src={s.avatar_url} alt={s.display_name} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className={`w-9 h-9 rounded-lg ${avatarHashClass(s.display_name)} flex items-center justify-center text-sm font-bold shrink-0`}>
                      {s.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{s.display_name}</p>
                      <span className="text-xs text-gray-500 shrink-0">{timeAgo(s.ended_at)}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-0.5">
                      {s.session_goal ?? s.session_title ?? 'Worked on something'}
                    </p>
                    <div className="flex items-center gap-2.5 mt-1.5 text-[11px]">
                      {outcome && (
                        <span className={`inline-flex items-center gap-1 font-bold ${outcome.color}`}>
                          <OIcon className="w-3 h-3" /> {outcome.label}
                        </span>
                      )}
                      {s.intended_duration_minutes && (
                        <span className="text-gray-400">{s.intended_duration_minutes}m</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </ActivityCard>

          <ActivityCard
            title="New signups"
            icon={UserPlus}
            empty="No signups yet. Once people sign up, they'll show up here."
          >
            {signups.map((u) => {
              const workType = u.work_types?.[0] ? WORK_TYPE_LABELS[u.work_types[0]] : null;
              return (
                <div key={u.id} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.display_name} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className={`w-9 h-9 rounded-lg ${avatarHashClass(u.display_name)} flex items-center justify-center text-sm font-bold shrink-0`}>
                      {u.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{u.display_name}</p>
                      <span className="text-xs text-gray-500 shrink-0">{timeAgo(u.created_at)}</span>
                    </div>
                    {workType && <p className="text-xs text-gray-500 mt-0.5">{workType}</p>}
                  </div>
                </div>
              );
            })}
          </ActivityCard>
        </div>

        {/* System status */}
        <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-xl border border-emerald-200 p-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">System status</h2>
            <p className="text-sm text-gray-600 mt-0.5">Database, auth, storage, edge functions.</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
            </span>
            All systems operational
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}

// ── Stat card ────────────────────────────────────────────────────

const TINTS: Record<string, { bg: string; text: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-600' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-600' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-600' },
};

function StatCard({
  label, sub, value, icon: Icon, tint, live,
}: {
  label: string;
  sub: string;
  value: number | string;
  icon: typeof TrendingUp;
  tint: string;
  live?: boolean;
}) {
  const colors = TINTS[tint] ?? TINTS.blue;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow relative">
      {live && (
        <span className="absolute top-4 right-4 flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </span>
          LIVE
        </span>
      )}
      <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center mb-3`}>
        <Icon size={20} className={colors.text} />
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-1 tabular-nums">{value}</p>
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}

// ── Activity card ────────────────────────────────────────────────

function ActivityCard({
  title, icon: Icon, empty, children,
}: {
  title: string;
  icon: typeof TrendingUp;
  empty: string;
  children: React.ReactNode;
}) {
  const childrenArray = Array.isArray(children) ? children : [children];
  const hasItems = childrenArray.filter(Boolean).length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
        <Icon size={16} className="text-gray-500" />
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
      </div>
      {hasItems ? (
        <div>{children}</div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-8">{empty}</p>
      )}
    </div>
  );
}
