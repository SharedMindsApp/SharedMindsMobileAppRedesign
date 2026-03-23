import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CalendarClock,
  MapPinned,
  Package,
  ScanSearch,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { getPantryItems, type PantryItem } from '../../../lib/intelligentGrocery';
import { ensureDefaultLocations, type PantryLocation } from '../../../lib/pantryLocations';
import { SectionHeader, SurfaceCard } from '../../ui/CorePage';

type PantryAnalyticsPanelProps = {
  spaceId: string;
  spaceName: string;
};

type PantrySnapshot = {
  items: PantryItem[];
  locations: PantryLocation[];
};

function buildSnapshot(items: PantryItem[], locations: PantryLocation[]) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const withDates = items
    .filter((item) => item.expires_on)
    .map((item) => {
      const expiry = new Date(item.expires_on as string);
      expiry.setHours(0, 0, 0, 0);
      const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        item,
        daysUntilExpiry,
        expiry,
      };
    })
    .sort((a, b) => a.expiry.getTime() - b.expiry.getTime());

  const expiringSoon = withDates.filter((entry) => entry.daysUntilExpiry >= 0 && entry.daysUntilExpiry <= 14);
  const expired = withDates.filter((entry) => entry.daysUntilExpiry < 0);

  const critical = withDates.filter((entry) => entry.daysUntilExpiry <= 1);
  const soon = withDates.filter((entry) => entry.daysUntilExpiry > 1 && entry.daysUntilExpiry <= 7);
  const safe = withDates.filter((entry) => entry.daysUntilExpiry > 7);
  const assignedCount = items.filter((item) => item.location_id).length;
  const scannedCount = items.filter((item) => item.vision_metadata?.source === 'openrouter_photo_scan').length;
  const datedCount = withDates.length;
  const valuedItems = items.filter((item) => item.estimated_cost !== null && item.estimated_cost !== undefined);
  const totalEstimatedValue = valuedItems.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);

  const categoryCounts = new Map<string, number>();
  for (const item of items) {
    const category = item.category || item.food_item?.category || 'uncategorised';
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  }

  const locationCounts = new Map<string, number>();
  const valueByType = new Map<string, number>();
  const valueByLocation = new Map<string, number>();
  for (const item of items) {
    const key = item.location_id || 'unassigned';
    locationCounts.set(key, (locationCounts.get(key) || 0) + 1);
  }

  for (const item of valuedItems) {
    const typeKey = item.item_type || 'uncategorised';
    valueByType.set(typeKey, (valueByType.get(typeKey) || 0) + (item.estimated_cost || 0));
    const locationKey = item.location_id || 'unassigned';
    valueByLocation.set(locationKey, (valueByLocation.get(locationKey) || 0) + (item.estimated_cost || 0));
  }

  const topCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const locationBreakdown = [
    ...locations.map((location) => ({
      id: location.id,
      name: location.name,
      icon: location.icon,
      count: locationCounts.get(location.id) || 0,
    })),
    {
      id: 'unassigned',
      name: 'Unassigned',
      icon: null,
      count: locationCounts.get('unassigned') || 0,
    },
  ].filter((entry) => entry.count > 0);

  const catalogueCoverage = items.length === 0 ? 0 : Math.round((assignedCount / items.length) * 100);
  const datedCoverage = items.length === 0 ? 0 : Math.round((datedCount / items.length) * 100);
  const valuedCoverage = items.length === 0 ? 0 : Math.round((valuedItems.length / items.length) * 100);

  const narrative = (() => {
    if (items.length === 0) {
      return 'Start with a few shelf-stable staples or scan a storage bin to build your stock record.';
    }

    if (expiringSoon.length > 0) {
      return `${expiringSoon.length} item${expiringSoon.length === 1 ? '' : 's'} need a date check in the next two weeks.`;
    }

    if (locationBreakdown.length > 0) {
      const primaryLocation = locationBreakdown.slice().sort((a, b) => b.count - a.count)[0];
      return `${primaryLocation.name} is carrying most of the current stock, which makes that a good place to review first.`;
    }

    return 'Your pantry ledger is in a good place to scan, top up, and rotate without relying on memory.';
  })();

  return {
    expiringSoon,
    expired,
    critical,
    soon,
    safe,
    assignedCount,
    scannedCount,
    datedCount,
    valuedItems,
    totalEstimatedValue,
    topCategories,
    locationBreakdown,
    valueByType: Array.from(valueByType.entries()).sort((a, b) => b[1] - a[1]),
    valueByLocation: Array.from(valueByLocation.entries()).sort((a, b) => b[1] - a[1]),
    catalogueCoverage,
    datedCoverage,
    valuedCoverage,
    narrative,
  };
}

function formatRelativeExpiry(daysUntilExpiry: number) {
  if (daysUntilExpiry < 0) {
    return `${Math.abs(daysUntilExpiry)}d overdue`;
  }
  if (daysUntilExpiry === 0) {
    return 'Today';
  }
  if (daysUntilExpiry === 1) {
    return 'Tomorrow';
  }
  return `${daysUntilExpiry}d`;
}

function formatExpiryDate(dateString: string | null) {
  if (!dateString) return 'No date';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 2,
  }).format(value);
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type ChartRange = '6w' | '6m' | 'custom';
type DateMode = 'added' | 'expiry';
type Bucket = { key: string; label: string; sublabel?: string; count: number; isCurrent: boolean };

/** Extract relevant dates from items based on the date mode */
function extractDates(items: PantryItem[], mode: DateMode): Date[] {
  const dates: Date[] = [];
  for (const item of items) {
    const raw = mode === 'added' ? item.created_at : (item.expires_on || item.expiration_date);
    if (!raw) continue;
    dates.push(new Date(raw));
  }
  return dates;
}

/** Build weekly buckets for the last 6 weeks */
function buildWeeklyVolume(items: PantryItem[], mode: DateMode): Bucket[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const buckets: Bucket[] = [];
  const dates = extractDates(items, mode);

  for (let i = 5; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - i * 7 - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const key = weekStart.toISOString().slice(0, 10);
    const label = i === 0 ? 'This wk' : i === 1 ? 'Last wk' : `${weekStart.getDate()} ${MONTH_LABELS[weekStart.getMonth()]}`;
    buckets.push({ key, label, count: 0, isCurrent: i === 0 });
  }

  for (const d of dates) {
    const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    for (let i = 0; i < buckets.length; i++) {
      const bStart = new Date(today);
      bStart.setDate(today.getDate() - (5 - i) * 7 - today.getDay());
      const bEnd = new Date(bStart);
      bEnd.setDate(bStart.getDate() + 6);
      if (itemDate >= bStart && itemDate <= bEnd) {
        buckets[i].count += 1;
        break;
      }
    }
  }

  return buckets;
}

/** Build monthly buckets for the last 6 months */
function buildMonthlyVolume(items: PantryItem[], mode: DateMode): Bucket[] {
  const now = new Date();
  const buckets: Bucket[] = [];
  const dates = extractDates(items, mode);

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({
      key,
      label: MONTH_LABELS[d.getMonth()].toUpperCase(),
      sublabel: d.getFullYear() !== now.getFullYear() ? `${d.getFullYear()}` : undefined,
      count: 0,
      isCurrent: i === 0,
    });
  }

  for (const d of dates) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bucket = buckets.find((m) => m.key === key);
    if (bucket) bucket.count += 1;
  }

  return buckets;
}

/** Build buckets for a custom date range — auto-selects daily / weekly / monthly */
function buildCustomVolume(items: PantryItem[], from: string, to: string, mode: DateMode): Bucket[] {
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T23:59:59');
  const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = extractDates(items, mode);

  // 14 days or fewer → daily
  if (diffDays <= 14) {
    const buckets: Bucket[] = [];
    for (let i = 0; i < diffDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets.push({
        key,
        label: `${d.getDate()}`,
        sublabel: MONTH_LABELS[d.getMonth()],
        count: 0,
        isCurrent: d.getTime() === today.getTime(),
      });
    }
    for (const d of dates) {
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
      const bucket = buckets.find((b) => b.key === key);
      if (bucket) bucket.count += 1;
    }
    return buckets;
  }

  // More than 12 weeks → monthly
  if (diffDays > 84) {
    const buckets: Bucket[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    while (cursor <= endMonth) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const isCurrentMonth = cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();
      buckets.push({
        key,
        label: MONTH_LABELS[cursor.getMonth()].toUpperCase(),
        sublabel: cursor.getFullYear() !== today.getFullYear() ? `${cursor.getFullYear()}` : undefined,
        count: 0,
        isCurrent: isCurrentMonth,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    for (const d of dates) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bucket = buckets.find((b) => b.key === key);
      if (bucket) bucket.count += 1;
    }
    return buckets;
  }

  // Otherwise → weekly
  const buckets: Bucket[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const weekEnd = new Date(cursor);
    weekEnd.setDate(cursor.getDate() + 6);
    if (weekEnd > end) weekEnd.setTime(end.getTime());

    const key = cursor.toISOString().slice(0, 10);
    const label = `${cursor.getDate()} ${MONTH_LABELS[cursor.getMonth()]}`;
    buckets.push({ key, label, count: 0, isCurrent: today >= cursor && today <= weekEnd });

    for (const d of dates) {
      const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (dd >= cursor && dd <= weekEnd) buckets[buckets.length - 1].count += 1;
    }

    cursor.setDate(cursor.getDate() + 7);
  }
  return buckets;
}

// Default custom range: 12 months back from today
function getDefault12MonthRange() {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10);
  return { from, to };
}

function StockVolumeChart({ items }: { items: PantryItem[] }) {
  const defaults = useMemo(getDefault12MonthRange, []);
  const [range, setRange] = useState<ChartRange>('6m');
  const [dateMode, setDateMode] = useState<DateMode>('added');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [customFrom, setCustomFrom] = useState(defaults.from);
  const [customTo, setCustomTo] = useState(defaults.to);
  const [appliedFrom, setAppliedFrom] = useState(defaults.from);
  const [appliedTo, setAppliedTo] = useState(defaults.to);

  // Count items that have expiry data for the toggle hint
  const expiryCount = useMemo(() => items.filter((i) => i.expires_on || i.expiration_date).length, [items]);

  // Build buckets based on range + date mode
  const buckets = useMemo(() => {
    if (range === '6w') return buildWeeklyVolume(items, dateMode);
    if (range === 'custom' && appliedFrom && appliedTo) return buildCustomVolume(items, appliedFrom, appliedTo, dateMode);
    return buildMonthlyVolume(items, dateMode);
  }, [items, range, appliedFrom, appliedTo, dateMode]);

  const maxCount = Math.max(...buckets.map((m) => m.count), 1);
  const totalInRange = buckets.reduce((s, m) => s + m.count, 0);
  const avgPerBucket = buckets.length > 0 ? Math.round(totalInRange / buckets.length) : 0;
  const hasData = buckets.some((m) => m.count > 0);

  const bestBucket = useMemo(() => {
    let best = buckets[0];
    for (const m of buckets) if (m.count > best.count) best = m;
    return best;
  }, [buckets]);

  // Active point
  const activeIdx = selectedIdx !== null && selectedIdx < buckets.length ? selectedIdx : buckets.length - 1;
  const activeBucket = buckets[activeIdx];

  const prevCount = activeIdx > 0 ? buckets[activeIdx - 1].count : 0;
  const changeFromPrev = activeBucket ? activeBucket.count - prevCount : 0;
  const changeLabel = changeFromPrev > 0 ? `+${changeFromPrev}` : `${changeFromPrev}`;

  const rangeLabel = range === '6w' ? 'period' : range === 'custom' ? 'period' : 'month';

  // Reset selection when range changes
  const handleRangeChange = (r: ChartRange) => {
    setRange(r);
    setSelectedIdx(null);
  };

  const handleApplyCustom = () => {
    if (customFrom && customTo && customFrom <= customTo) {
      setAppliedFrom(customFrom);
      setAppliedTo(customTo);
      setSelectedIdx(null);
    }
  };

  // Today for date input max
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <SurfaceCard className="border border-white/60 bg-white/80 backdrop-blur w-full relative">
      {/* Controls row: date mode toggle + range pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Date mode toggle */}
        <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
          <button
            onClick={() => { setDateMode('added'); setSelectedIdx(null); }}
            className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all ${
              dateMode === 'added'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Date Added
          </button>
          <button
            onClick={() => { setDateMode('expiry'); setSelectedIdx(null); }}
            className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all ${
              dateMode === 'expiry'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Expiry Date
            {expiryCount > 0 && (
              <span className="ml-1 text-[10px] text-slate-400 font-medium">({expiryCount})</span>
            )}
          </button>
        </div>

        {/* Range pills */}
        <div className="flex items-center gap-1.5">
          {([
            { id: '6m' as ChartRange, label: '6M' },
            { id: '6w' as ChartRange, label: '6W' },
            { id: 'custom' as ChartRange, label: 'Custom' },
          ]).map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleRangeChange(opt.id)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                range === opt.id
                  ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date pickers */}
      {range === 'custom' && (
        <div className="flex flex-wrap items-end gap-2 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">From</label>
            <input
              type="date"
              value={customFrom}
              max={customTo || todayStr}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-full px-2.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent min-h-[40px]"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">To</label>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={todayStr}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-full px-2.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent min-h-[40px]"
            />
          </div>
          <button
            onClick={handleApplyCustom}
            disabled={!customFrom || !customTo || customFrom > customTo}
            className="px-4 py-2 rounded-lg bg-sky-500 text-white text-sm font-bold hover:bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors min-h-[40px]"
          >
            Apply
          </button>
        </div>
      )}

      {/* Show empty state for custom when no range applied yet */}
      {range === 'custom' && (!appliedFrom || !appliedTo) ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400 text-sm gap-1">
          <span>Pick a date range above to see your data</span>
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-sm gap-2">
          <Package size={28} className="opacity-40" />
          <span>No items {dateMode === 'expiry' ? 'expiring' : 'added'} in this period.</span>
        </div>
      ) : (
        <>
          {/* Selected bucket detail strip */}
          {activeBucket && (
            <div className="flex items-center justify-between px-1 mb-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{activeBucket.count}</span>
                <span className="text-sm text-slate-500">item{activeBucket.count !== 1 ? 's' : ''} {dateMode === 'expiry' ? 'expiring' : 'added'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  changeFromPrev > 0
                    ? 'bg-emerald-50 text-emerald-600'
                    : changeFromPrev < 0
                      ? 'bg-red-50 text-red-500'
                      : 'bg-slate-100 text-slate-500'
                }`}>
                  {changeLabel} vs prev
                </span>
                <span className="text-xs font-semibold text-slate-400">{activeBucket.label}</span>
              </div>
            </div>
          )}

          {/* Chart area */}
          <div
            className="relative w-full mt-1"
            style={{ height: '200px' }}
            onMouseLeave={() => setSelectedIdx(null)}
          >
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between pointer-events-none py-1">
              <span className="text-[10px] text-slate-400 font-medium text-right pr-1">{maxCount}</span>
              <span className="text-[10px] text-slate-400 font-medium text-right pr-1">{Math.round(maxCount / 2)}</span>
              <span className="text-[10px] text-slate-400 font-medium text-right pr-1">0</span>
            </div>

            {/* Grid lines */}
            <div className="absolute left-8 right-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none">
              <div className="w-full border-t border-slate-200/60" />
              <div className="w-full border-t border-dashed border-slate-200/40" />
              <div className="w-full border-t border-slate-200/60" />
            </div>

            {/* Interactive columns */}
            <div className="absolute left-8 right-0 top-0 bottom-0 flex overflow-x-auto">
              {buckets.map((m, i) => {
                const isActive = i === activeIdx;
                const barHeightPct = maxCount > 0 ? (m.count / maxCount) * 100 : 0;

                return (
                  <div
                    key={m.key}
                    className="flex-1 flex flex-col items-center justify-end cursor-pointer group relative"
                    style={{ paddingBottom: '32px', minWidth: buckets.length > 10 ? '36px' : undefined }}
                    onClick={() => setSelectedIdx(i === selectedIdx ? null : i)}
                    onMouseEnter={() => setSelectedIdx(i)}
                  >
                    {/* Count label above bar */}
                    <span className={`text-xs font-bold mb-1 transition-all ${
                      isActive ? 'text-sky-600 scale-110' : 'text-slate-400'
                    }`}>
                      {m.count}
                    </span>

                    {/* Bar */}
                    <div className="w-full flex justify-center" style={{ height: `calc(${Math.max(barHeightPct, 3)}%)` }}>
                      <div
                        className={`rounded-t-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-sky-500 shadow-lg shadow-sky-500/20'
                            : 'bg-sky-400/30 group-hover:bg-sky-400/50'
                        }`}
                        style={{
                          width: isActive ? '60%' : '45%',
                          height: '100%',
                          minHeight: '4px',
                        }}
                      />
                    </div>

                    {/* Bucket label */}
                    <span className={`text-[10px] font-bold mt-2 transition-colors whitespace-nowrap ${
                      isActive ? 'text-sky-600' : 'text-slate-400'
                    }`}>
                      {m.label}
                    </span>
                    {m.sublabel && (
                      <span className="text-[8px] text-slate-300 font-medium leading-none">{m.sublabel}</span>
                    )}

                    {/* Current period dot */}
                    {m.isCurrent && (
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary stats */}
          <div className="mt-3 flex justify-center">
            <div className="bg-white/60 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/40 flex gap-6 shadow-sm">
              <div className="text-center">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Avg / {rangeLabel}</div>
                <div className="text-base font-black">{avgPerBucket}</div>
              </div>
              <div className="w-px bg-slate-200" />
              <div className="text-center">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Peak</div>
                <div className="text-base font-black">{bestBucket.count} <span className="text-[10px] font-semibold text-slate-400">({bestBucket.label})</span></div>
              </div>
              <div className="w-px bg-slate-200" />
              <div className="text-center">
                <div className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">In Range</div>
                <div className="text-base font-black text-emerald-600">{totalInRange}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </SurfaceCard>
  );
}

export function PantryAnalyticsPanel({ spaceId, spaceName }: PantryAnalyticsPanelProps) {
  const [snapshot, setSnapshot] = useState<PantrySnapshot>({ items: [], locations: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshot() {
      try {
        setLoading(true);
        const [items, locations] = await Promise.all([
          getPantryItems(spaceId),
          ensureDefaultLocations(spaceId),
        ]);

        if (!cancelled) {
          setSnapshot({ items, locations });
        }
      } catch (error) {
        console.error('Failed to load pantry analytics:', error);
        if (!cancelled) {
          setSnapshot({ items: [], locations: [] });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSnapshot();

    return () => {
      cancelled = true;
    };
  }, [spaceId]);

  const analytics = useMemo(
    () => buildSnapshot(snapshot.items, snapshot.locations),
    [snapshot.items, snapshot.locations]
  );

  const metricCards = [
    {
      label: 'Inventory lines',
      value: snapshot.items.length.toString(),
      detail: `${analytics.assignedCount} assigned to a storage location`,
      icon: Package,
      tone: 'from-amber-500/20 via-orange-500/10 to-transparent',
    },
    {
      label: 'Date coverage',
      value: `${analytics.datedCoverage}%`,
      detail: `${analytics.datedCount} item${analytics.datedCount === 1 ? '' : 's'} with visible dates`,
      icon: CalendarClock,
      tone: 'from-sky-500/20 via-cyan-500/10 to-transparent',
    },
    {
      label: 'Expiring soon',
      value: analytics.expiringSoon.length.toString(),
      detail: analytics.expired.length > 0
        ? `${analytics.expired.length} already past date`
        : 'Nothing urgent in the next 14 days',
      icon: Archive,
      tone: 'from-rose-500/20 via-amber-500/10 to-transparent',
    },
    {
      label: 'AI-scanned items',
      value: analytics.scannedCount.toString(),
      detail: snapshot.items.length > 0
        ? `${Math.round((analytics.scannedCount / snapshot.items.length) * 100) || 0}% of current stock`
        : 'Ready for first photo import',
      icon: ScanSearch,
      tone: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    },
    {
      label: 'Estimated stock value',
      value: formatCurrency(analytics.totalEstimatedValue),
      detail: analytics.valuedItems.length > 0
        ? `${analytics.valuedCoverage}% of items include a cost estimate`
        : 'Add item values to unlock Pantry budget reporting',
      icon: Wallet,
      tone: 'from-emerald-500/20 via-lime-500/10 to-transparent',
    },
  ];

  const storageMapMax = Math.max(...analytics.locationBreakdown.map((entry) => entry.count), 1);
  const categoryMax = Math.max(...analytics.topCategories.map((entry) => entry[1]), 1);
  const valueByTypeMax = Math.max(...analytics.valueByType.map((entry) => entry[1]), 1);
  const valueByLocationMax = Math.max(...analytics.valueByLocation.map((entry) => entry[1]), 1);

  return (
    <div className="space-y-4 sm:space-y-6">
      <SurfaceCard
        className="relative overflow-hidden border border-white/50 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.26),_transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(28,25,23,0.94)_40%,rgba(8,47,73,0.96))] text-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]"
        padding="lg"
      >
        <div className="absolute right-0 top-0 h-48 w-48 translate-x-12 -translate-y-12 rounded-full bg-white/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_minmax(0,1fr)]">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              <Sparkles size={14} />
              Pantry overview
            </div>
            <h2
              className="text-3xl font-black tracking-tight text-white sm:text-4xl"
              style={{ fontFamily: '"Iowan Old Style", "Palatino Linotype", Georgia, serif' }}
            >
              {spaceName} stock at a glance
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78 sm:text-base">
              {loading
                ? 'Building a fresh pantry snapshot...'
                : analytics.narrative}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                Catalogue coverage
              </p>
              <p className="mt-2 text-3xl font-black text-white">{analytics.catalogueCoverage}%</p>
              <p className="mt-2 text-sm text-white/70">
                of items already tied to a physical location, which makes bin checks faster.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                Space rhythm
              </p>
              <p className="mt-2 text-base font-semibold text-white">
                {snapshot.locations.length} storage zone{snapshot.locations.length === 1 ? '' : 's'}
              </p>
              <p className="mt-2 text-sm text-white/70">
                Keeping the list aligned with real storage zones is the fastest way to trust it later.
              </p>
            </div>
          </div>
        </div>
      </SurfaceCard>

      <section className="space-y-3">
        <SectionHeader
          overline="Analytics"
          title="Inventory pulse"
          subtitle="A calm read on stock depth, dates, and how much of the pantry is already documented."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <SurfaceCard
                key={card.label}
                className={`relative overflow-hidden border border-white/60 bg-white/80 backdrop-blur`}
              >
                <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${card.tone} pointer-events-none`} />
                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {card.label}
                      </p>
                      <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                        {loading ? '...' : card.value}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-900 p-2.5 text-white shadow-sm">
                      <Icon size={18} />
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {loading ? 'Loading metric...' : card.detail}
                  </p>
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      </section>

      <section className="bg-slate-50/50 p-5 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900">
          <Sparkles size={18} className="text-blue-600" /> Actionable Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-[1.25rem] border border-slate-200/60 shadow-sm">
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-2">Priority Focus</p>
            <div className="flex items-center gap-3">
              <div className="bg-rose-50 p-2.5 rounded-xl text-rose-600">
                <Archive size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {analytics.critical.length > 0 ? analytics.critical[0].item.food_item?.name || analytics.critical[0].item.item_name || 'Unknown item' : 'Nothing critical'}
                </div>
                <div className="text-xs text-slate-500">
                  {analytics.critical.length > 0 ? 'Use this immediately to avoid waste' : 'Pantry looks fresh'}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-[1.25rem] border border-slate-200/60 shadow-sm">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">Volume Leader</p>
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
                <Package size={20} />
              </div>
              <div>
                <div className="text-sm font-bold capitalize text-slate-900">
                  {analytics.topCategories.length > 0 ? analytics.topCategories[0][0] : 'No data'}
                </div>
                <div className="text-xs text-slate-500">
                  {analytics.topCategories.length > 0 ? `Dominant category (${analytics.topCategories[0][1]} lines)` : 'Start logging to see patterns'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          overline="Budget"
          title="Stock value"
          subtitle="Estimated Pantry value based on the item costs you have logged."
        />
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <SurfaceCard className="border border-white/60 bg-white/80 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Estimated stock value
                </p>
                <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">
                  {formatCurrency(analytics.totalEstimatedValue)}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {analytics.valuedItems.length > 0
                    ? `${analytics.valuedItems.length} valued line${analytics.valuedItems.length === 1 ? '' : 's'} recorded. ${snapshot.items.length - analytics.valuedItems.length} still need a cost estimate to complete the budget picture.`
                    : 'No Pantry values recorded yet. Add an estimated cost when you log or edit items to build the budget report.'}
                </p>
              </div>
              <div className="rounded-3xl bg-emerald-50 p-3 text-emerald-700 shadow-sm">
                <Wallet size={22} />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Valued lines</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{analytics.valuedItems.length}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Coverage</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{analytics.valuedCoverage}%</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Unvalued lines</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{snapshot.items.length - analytics.valuedItems.length}</div>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="border border-white/60 bg-white/80 backdrop-blur">
            <SectionHeader
              overline="Value mix"
              title="Budget split"
              subtitle="Where the estimated stock value is currently concentrated."
            />
            <div className="mt-5 space-y-3">
              {analytics.valuedItems.length === 0 ? (
                <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm text-slate-500">
                  Add estimated costs to Pantry items to see your value split by type and location.
                </div>
              ) : (
                analytics.valueByType.slice(0, 3).map(([label, value]) => (
                  <div key={label} className="rounded-[1.5rem] bg-slate-50 p-3.5">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold capitalize text-slate-900">{label.replace('_', ' ')}</p>
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                        {formatCurrency(value)}
                      </p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e,#22c55e)]"
                        style={{ width: `${Math.max((value / valueByTypeMax) * 100, 10)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </SurfaceCard>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          overline="Trends"
          title="Stock Volume Trends"
          subtitle="Track when items were added or when they expire"
        />
        <StockVolumeChart items={snapshot.items} />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <SurfaceCard className="border border-white/60 bg-white/80 backdrop-blur">
          <SectionHeader
            overline="Mix"
            title="Category spread"
            subtitle="Where the pantry currently leans, based on the top tracked categories."
          />
          <div className="mt-5 space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="animate-pulse rounded-2xl bg-slate-100 p-4" />
              ))
            ) : analytics.topCategories.length === 0 ? (
              <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm text-slate-500">
                No category data yet. Add a few items or scan a photo to start building a pattern.
              </div>
            ) : (
              analytics.topCategories.map(([category, count]) => (
                <div key={category} className="rounded-[1.5rem] bg-slate-50 p-3.5">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold capitalize text-slate-900">{category}</p>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                      {count} line{count === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#f59e0b,#22c55e)]"
                      style={{ width: `${Math.max((count / categoryMax) * 100, 10)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>

        <div className="grid gap-4">
          <SurfaceCard className="border border-white/60 bg-white/80 backdrop-blur">
            <SectionHeader
              overline="Storage"
              title="Location map"
              subtitle="A quick count of where your stock is actually sitting."
            />
            <div className="mt-5 space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="animate-pulse rounded-2xl bg-slate-100 p-4" />
                ))
              ) : analytics.locationBreakdown.length === 0 ? (
                <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm text-slate-500">
                  No pantry locations are carrying stock yet.
                </div>
              ) : (
                analytics.locationBreakdown.map((location) => (
                  <div key={location.id} className="rounded-[1.5rem] bg-slate-50 p-3.5">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-base shadow-sm">
                          {location.icon || <MapPinned size={16} className="text-slate-500" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{location.name}</p>
                          <p className="text-xs text-slate-500">
                            {Math.round((location.count / Math.max(snapshot.items.length, 1)) * 100)}% of current stock
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-700">{location.count}</p>
                        {analytics.valueByLocation.find(([key]) => key === location.id || (key === 'unassigned' && location.id === 'unassigned'))?.[1] ? (
                          <p className="text-[11px] font-medium text-emerald-700">
                            {formatCurrency(analytics.valueByLocation.find(([key]) => key === location.id || (key === 'unassigned' && location.id === 'unassigned'))?.[1] || 0)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a,#0ea5e9)]"
                        style={{ width: `${Math.max((location.count / storageMapMax) * 100, 10)}%` }}
                      />
                    </div>
                    {analytics.valueByLocation.find(([key]) => key === location.id || (key === 'unassigned' && location.id === 'unassigned'))?.[1] ? (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#059669,#22c55e)]"
                          style={{ width: `${Math.max(((analytics.valueByLocation.find(([key]) => key === location.id || (key === 'unassigned' && location.id === 'unassigned'))?.[1] || 0) / valueByLocationMax) * 100, 10)}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard className="border border-white/60 bg-white/80 backdrop-blur">
            <SectionHeader
              overline="Dates"
              title="Expiry horizon"
              subtitle="Critical items requiring attention before they spoil."
            />
            <div className="mt-5 space-y-6">
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="animate-pulse rounded-2xl bg-slate-100 p-4" />
                ))
              ) : analytics.datedCount === 0 ? (
                <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm text-slate-500">
                  You haven't added expiry dates to any items yet.
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6 px-1">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-rose-600">
                        <span>Critical: &lt; 24h</span>
                        <span>{analytics.critical.length} Items</span>
                      </div>
                      <div className="h-3 w-full bg-rose-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.max((analytics.critical.length / analytics.datedCount) * 100, 2)}%` }}></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-amber-600">
                        <span>Soon: &lt; 7 days</span>
                        <span>{analytics.soon.length} Items</span>
                      </div>
                      <div className="h-3 w-full bg-amber-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.max((analytics.soon.length / analytics.datedCount) * 100, 2)}%` }}></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-emerald-600">
                        <span>Safe: &gt; 7 days</span>
                        <span>{analytics.safe.length} Items</span>
                      </div>
                      <div className="h-3 w-full bg-emerald-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.max((analytics.safe.length / analytics.datedCount) * 100, 2)}%` }}></div>
                      </div>
                    </div>
                  </div>

                  {([...analytics.critical, ...analytics.soon].length > 0) && (
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Priority Use List</p>
                      {[...analytics.critical, ...analytics.soon]
                        .slice(0, 4)
                        .map(({ item, daysUntilExpiry }) => (
                          <div key={item.id} className="rounded-[1.5rem] bg-slate-50 p-3.5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {item.food_item?.name || item.item_name || 'Unknown item'}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {item.quantity_value || item.quantity
                                    ? `${item.quantity_value || item.quantity}${item.quantity_unit || item.unit ? ` ${item.quantity_unit || item.unit}` : ''}`
                                    : 'Quantity not logged'}
                                </p>
                              </div>
                              <div
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${daysUntilExpiry <= 1
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-700'
                                  }`}
                              >
                                {formatRelativeExpiry(daysUntilExpiry)}
                              </div>
                            </div>
                            <p className="mt-3 text-sm text-slate-600">
                              Best before {formatExpiryDate(item.expires_on)}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
