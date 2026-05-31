/**
 * AdminWaitlist — premium-tier demand dashboard.
 *
 * Lists everyone who joined the Premium waitlist via /upgrade, with their
 * self-reported price band + reason. Pure demand discovery: who would pay,
 * and roughly how much, before billing is built.
 */

import { useEffect, useMemo, useState } from 'react';
import { Sparkles, AlertCircle, Download } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { fetchPremiumWaitlist, type WaitlistEntry } from '../../core/services/WaitlistService';

const PRICE_ORDER = ['£5–10', '£10–15', '£15–20', '£20+'];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function AdminWaitlist() {
  const [rows, setRows] = useState<WaitlistEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPremiumWaitlist()
      .then((r) => { if (!cancelled) setRows(r); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const bandCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (rows ?? []).forEach((r) => {
      if (r.price_band) counts.set(r.price_band, (counts.get(r.price_band) ?? 0) + 1);
    });
    return PRICE_ORDER.map((band) => ({ band, count: counts.get(band) ?? 0 }));
  }, [rows]);

  function exportCsv() {
    if (!rows?.length) return;
    const header = ['email', 'display_name', 'price_band', 'reason', 'joined'];
    const esc = (v: string | null) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const lines = rows.map((r) => [r.email, r.display_name, r.price_band, r.reason, fmtDate(r.created_at)].map(esc).join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'premium-waitlist.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <AdminLayout><div className="flex items-center justify-center h-64 text-gray-500">Loading waitlist…</div></AdminLayout>;
  }
  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center gap-2 text-rose-600 bg-rose-50 rounded-lg px-4 py-3">
          <AlertCircle size={16} /> {error}
        </div>
      </AdminLayout>
    );
  }

  const total = rows?.length ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 grid place-items-center">
              <Sparkles size={18} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">Premium waitlist</h1>
              <p className="text-sm text-gray-500">{total} {total === 1 ? 'person' : 'people'} interested in paying</p>
            </div>
          </div>
          {total > 0 && (
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700"
            >
              <Download size={14} /> Export CSV
            </button>
          )}
        </div>

        {/* Price-band breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {bandCounts.map(({ band, count }) => (
            <div key={band} className="rounded-xl border border-gray-200 p-3">
              <p className="text-xs text-gray-500 font-medium">{band}/mo</p>
              <p className="text-2xl font-extrabold text-gray-900 tabular-nums mt-0.5">{count}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        {total === 0 ? (
          <p className="text-sm text-gray-500 italic py-8 text-center">No one's joined the waitlist yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left font-semibold px-4 py-2.5">Person</th>
                  <th className="text-left font-semibold px-4 py-2.5">Price band</th>
                  <th className="text-left font-semibold px-4 py-2.5">Reason</th>
                  <th className="text-left font-semibold px-4 py-2.5">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows!.map((r) => (
                  <tr key={r.user_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{r.display_name ?? '—'}</p>
                      <p className="text-xs text-gray-500">{r.email ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      {r.price_band
                        ? <span className="inline-flex px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold">{r.price_band}</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs">{r.reason || <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
