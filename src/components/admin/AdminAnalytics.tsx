/**
 * AdminAnalytics — high-level usage dashboard for SharedMinds admins.
 *
 * Shows the metrics that actually exist in the current product:
 *   • Users (role split + signups today/week)
 *   • Sessions (active now, today, week, total + completion outcomes)
 *   • Connections (accepted + pending)
 *
 * All numbers come from `getAnalytics()` in lib/admin.ts which queries
 * profiles / focus_sessions / connections directly.
 */

import { useEffect, useState } from 'react';
import { Users, Activity, Link2, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { getAnalytics } from '../../lib/admin';
import type { AnalyticsSummary } from '../../lib/admin';

export function AdminAnalytics() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAnalytics()
      .then((res) => { if (!cancelled) setSummary(res.summary); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load analytics'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-gray-500">Loading analytics…</div>
      </AdminLayout>
    );
  }

  if (error || !summary) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={24} />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700">{error ?? 'No data'}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics & Insights</h1>
          <p className="text-gray-600">Monitor user activity and session engagement</p>
        </div>

        {/* ── Three top stat cards ──────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Users */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Total Users</h3>
              <Users className="text-blue-600" size={22} />
            </div>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{summary.totalUsers}</p>
            <div className="mt-4 space-y-1.5 text-sm">
              <Row label="Free"        value={summary.freeUsers} />
              <Row label="Premium"     value={summary.premiumUsers} />
              <Row label="Admin"       value={summary.adminUsers} />
              <div className="border-t border-gray-100 my-2" />
              <Row label="New today"   value={summary.newSignupsToday} muted />
              <Row label="New this week" value={summary.newSignupsWeek} muted />
            </div>
          </div>

          {/* Sessions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Sessions</h3>
              <Activity className="text-emerald-600" size={22} />
            </div>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{summary.totalSessions}</p>
            <div className="mt-4 space-y-1.5 text-sm">
              <Row label="Live now"    value={summary.activeSessionsNow} highlight={summary.activeSessionsNow > 0} />
              <Row label="Today"       value={summary.sessionsToday} />
              <Row label="This week"   value={summary.sessionsThisWeek} />
              <div className="border-t border-gray-100 my-2" />
              <Row label="Completion rate" value={`${summary.completionRate}%`} muted />
            </div>
          </div>

          {/* Connections */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Connections</h3>
              <Link2 className="text-violet-600" size={22} />
            </div>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{summary.totalConnections}</p>
            <div className="mt-4 space-y-1.5 text-sm">
              <Row label="Accepted"  value={summary.totalConnections} />
              <Row label="Pending"   value={summary.pendingConnections} muted />
            </div>
          </div>
        </div>

        {/* ── Session outcome breakdown ─────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Session Outcomes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <OutcomeTile
              Icon={CheckCircle2}
              iconCls="text-emerald-600 bg-emerald-50"
              label="Finished"
              count={summary.finishedSessions}
            />
            <OutcomeTile
              Icon={Clock}
              iconCls="text-amber-600 bg-amber-50"
              label="Partially finished"
              count={summary.partiallyFinished}
            />
            <OutcomeTile
              Icon={XCircle}
              iconCls="text-rose-600 bg-rose-50"
              label="Something came up"
              count={summary.somethingCameUp}
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// ── Helpers ──────────────────────────────────────────────────────

function Row({
  label, value, muted = false, highlight = false,
}: {
  label: string;
  value: number | string;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={muted ? 'text-gray-500' : 'text-gray-600'}>{label}</span>
      <span className={`font-semibold tabular-nums ${highlight ? 'text-emerald-600' : 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
}

function OutcomeTile({
  Icon, iconCls, label, count,
}: {
  Icon: React.ElementType;
  iconCls: string;
  label: string;
  count: number;
}) {
  return (
    <div className="rounded-lg border border-gray-100 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconCls}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{count}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  );
}
