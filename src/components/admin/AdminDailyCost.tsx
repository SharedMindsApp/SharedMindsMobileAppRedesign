/**
 * AdminDailyCost — Daily.co cost estimate + projections.
 *
 * Estimates billable participant-minutes from focus_sessions and applies
 * Daily's graduated pricing. This is a PLANNING tool, not a billing record —
 * the source of truth is the Daily dashboard. The one real unknown is group
 * headcount (we don't log per-participant attendance), so it's a live knob.
 */

import { useEffect, useMemo, useState } from 'react';
import { DollarSign, Clock, Users, TrendingUp, Waves, AlertCircle, Info } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { getCostSessions, getDailyUsage, type DailyUsage } from '../../lib/admin';
import {
  summariseCost, projectMonthlyCost, graduatedCost, fmtUSD, FREE_MINUTES, VIDEO_BRACKETS,
  type CostSessionRow,
} from '../../lib/dailyCost';

const WINDOWS = [
  { days: 30, label: 'Last 30 days' },
  { days: 7, label: 'Last 7 days' },
  { days: 90, label: 'Last 90 days' },
];

function fmtMin(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function AdminDailyCost() {
  const [rows, setRows] = useState<CostSessionRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState(30);
  const [avgGroupSize, setAvgGroupSize] = useState(3);
  // Real usage from Daily's API (the billing source of truth). null until
  // loaded; stays null if the edge function isn't deployed yet.
  const [usage, setUsage] = useState<DailyUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCostSessions(windowDays)
      .then((r) => { if (!cancelled) setRows(r); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [windowDays]);

  useEffect(() => {
    let cancelled = false;
    setUsageLoading(true);
    getDailyUsage(windowDays)
      .then((u) => { if (!cancelled) setUsage(u); })
      .catch(() => { if (!cancelled) setUsage(null); })
      .finally(() => { if (!cancelled) setUsageLoading(false); });
    return () => { cancelled = true; };
  }, [windowDays]);

  const actualCost = usage ? graduatedCost(usage.participantMinutes, VIDEO_BRACKETS) : 0;
  const actualFreePct = usage ? Math.min(100, (usage.participantMinutes / FREE_MINUTES) * 100) : 0;

  const summary = useMemo(
    () => (rows ? summariseCost(rows, avgGroupSize) : null),
    [rows, avgGroupSize],
  );

  // Monthly projections hold the current per-user video-minute average constant.
  const projections = useMemo(() => {
    if (!summary || summary.avgVideoMinutesPerUser <= 0) return null;
    const per = summary.avgVideoMinutesPerUser;
    return [100, 1_000, 10_000, 50_000].map((users) => ({
      users,
      cost: projectMonthlyCost(per, users),
    }));
  }, [summary]);

  if (loading) {
    return <AdminLayout><div className="flex items-center justify-center h-64 text-gray-500">Loading cost estimate…</div></AdminLayout>;
  }
  if (error || !summary) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={24} />
          <div><h3 className="font-semibold text-red-900">Error</h3><p className="text-sm text-red-700">{error ?? 'No data'}</p></div>
        </div>
      </AdminLayout>
    );
  }

  const modes = [
    { key: 'solo' as const, label: 'Solo (no room)', note: 'never bills' },
    { key: 'one_on_one' as const, label: '1-on-1 / matched', note: '2 participants' },
    { key: 'group' as const, label: 'Group', note: `${avgGroupSize} assumed` },
    { key: 'body_double' as const, label: 'Body double', note: '1 each' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Daily.co cost</h1>
            <p className="text-gray-600">Estimated video infrastructure cost from session usage.</p>
          </div>
          <div className="flex gap-1.5">
            {WINDOWS.map((w) => (
              <button
                key={w.days}
                type="button"
                onClick={() => setWindowDays(w.days)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  windowDays === w.days ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── ACTUAL usage from Daily (billing source of truth) ──────── */}
        {usageLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-sm text-gray-500">Loading actual usage from Daily…</div>
        ) : usage ? (
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/40 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><Waves size={16} className="text-emerald-600" /> Actual usage from Daily</h3>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Source of truth</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={DollarSign} tint="emerald" label={`Actual cost · ${windowDays}d`} value={fmtUSD(actualCost)}
                sub={actualCost === 0 ? 'within free allowance' : 'graduated video rate'} />
              <StatCard icon={Clock} tint="blue" label="Participant-minutes" value={fmtMin(usage.participantMinutes)}
                sub="real connected time" />
              <StatCard icon={Users} tint="violet" label="Meetings" value={fmtMin(usage.meetingCount)}
                sub={usage.ongoing ? `${usage.ongoing} ongoing now` : 'rooms that opened'} />
              <StatCard icon={TrendingUp} tint="amber" label="Free allowance" value={`${actualFreePct.toFixed(0)}%`}
                sub={`of ${fmtMin(FREE_MINUTES)} min/mo`} />
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5">
            <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[13px] text-amber-900 leading-snug">
              <strong>Actual usage unavailable.</strong> Deploy the <code>daily-usage</code> edge function
              (<code>supabase functions deploy daily-usage</code>) to pull real participant-minutes from Daily.
              Until then, only the modelled estimate below is shown.
            </p>
          </div>
        )}

        {/* Estimate disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5">
          <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[13px] text-amber-900 leading-snug">
            <strong>Modelled estimate (upper bound).</strong> The figures below estimate cost from declared
            session <em>durations</em> × assumed headcount. Daily only bills for time participants are actually
            connected, so this runs <em>higher</em> than the actuals above — use it for capacity planning, not billing.
          </p>
        </div>

        {/* ── Top stat cards (modelled) ──────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={DollarSign} tint="emerald" label={`Modelled cost · ${windowDays}d`} value={fmtUSD(summary.estCost)}
            sub={`${fmtUSD(summary.blendedRate)}/min blended`} />
          <StatCard icon={Clock} tint="blue" label="Modelled participant-min" value={fmtMin(summary.participantMinutes)}
            sub={`${summary.roomSessions} of ${summary.sessionCount} sessions billed`} />
          <StatCard icon={Users} tint="violet" label="Active users" value={fmtMin(summary.activeUsers)}
            sub={`${fmtMin(summary.avgVideoMinutesPerUser)} min/user`} />
          <StatCard icon={TrendingUp} tint="amber" label="Modelled cost / user" value={fmtUSD(summary.costPerActiveUser)}
            sub="this window" />
        </div>

        {/* ── Free-tier usage ────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Free allowance (10,000 min/month)</h3>
            <span className="text-sm font-bold tabular-nums text-gray-700">{summary.freeMinutesUsedPct.toFixed(0)}% used</span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full ${summary.freeMinutesUsedPct >= 100 ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, summary.freeMinutesUsedPct)}%` }} />
          </div>
          <p className="text-[13px] text-gray-500 mt-2">
            {summary.participantMinutes < FREE_MINUTES
              ? `${fmtMin(FREE_MINUTES - summary.participantMinutes)} free participant-minutes remaining — you're not paying Daily yet.`
              : `Over the free allowance — billing has started.`}
          </p>
        </div>

        {/* ── Group-size assumption ──────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-semibold text-gray-900">Assumed avg group size</h3>
              <p className="text-[13px] text-gray-500">We don't log group attendance — set what a typical group session holds.</p>
            </div>
            <div className="flex items-center gap-3">
              <input type="range" min={2} max={12} value={avgGroupSize}
                onChange={(e) => setAvgGroupSize(parseInt(e.target.value, 10))} className="w-40 accent-gray-900" />
              <span className="w-8 text-center text-lg font-bold tabular-nums text-gray-900">{avgGroupSize}</span>
            </div>
          </div>
        </div>

        {/* ── Breakdown by mode ──────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Where the minutes come from</h3>
          <div className="space-y-2">
            {modes.map((m) => {
              const b = summary.byMode[m.key];
              const pct = summary.participantMinutes > 0 ? (b.participantMinutes / summary.participantMinutes) * 100 : 0;
              return (
                <div key={m.key} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <p className="text-sm font-semibold text-gray-800">{m.label}</p>
                    <p className="text-[11px] text-gray-400">{m.note}</p>
                  </div>
                  <div className="flex-1 h-5 rounded bg-gray-100 overflow-hidden">
                    <div className="h-full bg-blue-500/80" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-28 text-right text-[13px] tabular-nums text-gray-600">
                    {fmtMin(b.participantMinutes)}m · {b.sessions} sess
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Audio-only optimisation ────────────────────────────── */}
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-100 grid place-items-center shrink-0">
            <Waves size={20} className="text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-violet-900">Audio-only rooms would save {fmtUSD(summary.optimisedSavings)} ({windowDays}d)</h3>
            <p className="text-[13px] text-violet-800/80 leading-snug mt-1">
              Quiet + body-double sessions don't need video — running them on audio-only Daily rooms (~4× cheaper) cuts
              the bill from <strong>{fmtUSD(summary.estCost)}</strong> to <strong>{fmtUSD(summary.optimisedCost)}</strong>.
              Worth building next.
            </p>
          </div>
        </div>

        {/* ── Scale projection ───────────────────────────────────── */}
        {projections && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Monthly cost at scale</h3>
            <p className="text-[13px] text-gray-500 mb-4">
              Holding the current average of {fmtMin(summary.avgVideoMinutesPerUser)} video-min per active user, on graduated pricing.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {projections.map((p) => (
                <div key={p.users} className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{fmtMin(p.users)} users</p>
                  <p className="text-xl font-bold text-gray-900 tabular-nums mt-1">{fmtUSD(p.cost)}<span className="text-xs font-medium text-gray-400">/mo</span></p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{fmtUSD(p.cost / p.users)}/user</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

const TINTS: Record<string, { bg: string; text: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
};

function StatCard({ icon: Icon, tint, label, value, sub }: {
  icon: typeof DollarSign; tint: string; label: string; value: string; sub: string;
}) {
  const c = TINTS[tint] ?? TINTS.blue;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
        <Icon size={20} className={c.text} />
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      <p className="text-[12px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}
