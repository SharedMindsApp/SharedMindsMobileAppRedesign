import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, ReceiptPoundSterling, ShoppingBasket, TrendingUp, Wallet, ArrowUpRight, Package2 } from 'lucide-react';
import { getPurchaseHistory, type PurchaseHistory } from '../../../lib/intelligentGrocery';
import { SectionHeader, SurfaceCard } from '../../ui/CorePage';

type PantryBudgetPanelProps = {
  spaceId: string;
  spaceName: string;
};

const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactCurrency(value: number) {
  if (value >= 1000) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  return formatCurrency(value);
}

function startOfWeek(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() - value.getDay());
  return value;
}

function endOfWeek(date: Date) {
  const value = startOfWeek(date);
  value.setDate(value.getDate() + 6);
  value.setHours(23, 59, 59, 999);
  return value;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function parsePrice(value: number | null) {
  return value ?? 0;
}

function buildBudgetSnapshot(history: PurchaseHistory[]) {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const pricedHistory = history.filter((entry) => entry.price !== null);

  const weekEntries = pricedHistory.filter((entry) => {
    const date = new Date(entry.purchased_date);
    return date >= weekStart && date <= weekEnd;
  });

  const monthEntries = pricedHistory.filter((entry) => {
    const date = new Date(entry.purchased_date);
    return date >= monthStart && date <= monthEnd;
  });

  const weeklySpend = weekEntries.reduce((sum, entry) => sum + parsePrice(entry.price), 0);
  const monthlySpend = monthEntries.reduce((sum, entry) => sum + parsePrice(entry.price), 0);

  const weeklyBuckets = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    const countAndTotal = weekEntries.reduce(
      (acc, entry) => {
        const date = new Date(entry.purchased_date);
        if (
          date.getFullYear() === day.getFullYear() &&
          date.getMonth() === day.getMonth() &&
          date.getDate() === day.getDate()
        ) {
          acc.total += parsePrice(entry.price);
          acc.count += 1;
        }
        return acc;
      },
      { total: 0, count: 0 }
    );

    return {
      key: day.toISOString().slice(0, 10),
      label: WEEK_LABELS[day.getDay()],
      total: countAndTotal.total,
      count: countAndTotal.count,
      isCurrent: day.toDateString() === now.toDateString(),
    };
  });

  const monthlyBuckets = Array.from({ length: 6 }, (_, offset) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - offset), 1);
    const monthStartDate = startOfMonth(monthDate);
    const monthEndDate = endOfMonth(monthDate);
    const monthEntries = pricedHistory.filter((entry) => {
      const date = new Date(entry.purchased_date);
      return date >= monthStartDate && date <= monthEndDate;
    });

    return {
      key: `${monthDate.getFullYear()}-${monthDate.getMonth() + 1}`,
      label: MONTH_LABELS[monthDate.getMonth()],
      sublabel: monthDate.getFullYear() !== now.getFullYear() ? `${monthDate.getFullYear()}` : undefined,
      total: monthEntries.reduce((sum, entry) => sum + parsePrice(entry.price), 0),
      count: monthEntries.length,
      isCurrent: monthDate.getMonth() === now.getMonth() && monthDate.getFullYear() === now.getFullYear(),
    };
  });

  const averageWeeklySpend =
    monthlyBuckets.reduce((sum, bucket) => sum + bucket.total, 0) / Math.max(monthlyBuckets.length, 1);
  const averageSpendPerTrip =
    pricedHistory.length > 0 ? pricedHistory.reduce((sum, entry) => sum + parsePrice(entry.price), 0) / pricedHistory.length : 0;

  const spendByCategory = Array.from(
    pricedHistory.reduce<Map<string, { total: number; count: number }>>((acc, entry) => {
      const key = entry.category || 'other';
      const current = acc.get(key) || { total: 0, count: 0 };
      current.total += parsePrice(entry.price);
      current.count += 1;
      acc.set(key, current);
      return acc;
    }, new Map())
  )
    .map(([category, summary]) => ({ category, ...summary }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const recentPurchases = pricedHistory.slice(0, 8);
  const monthlyPace =
    now.getDate() === 0 ? 0 : (monthlySpend / now.getDate()) * new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const narrative = (() => {
    if (pricedHistory.length === 0) {
      return 'Budget tracking starts once checked shopping items are moved into Pantry with a cost.';
    }
    if (weeklySpend === 0 && monthlySpend > 0) {
      return 'No spend recorded this week yet, but this month already has a purchase trail.';
    }
    if (weeklySpend > averageWeeklySpend) {
      return 'This week is running hotter than your recent average, so it is worth checking what drove the spike.';
    }
    return 'Your recent Pantry purchases are tracking at or below the current six-month average.';
  })();

  return {
    pricedHistory,
    weeklySpend,
    monthlySpend,
    averageWeeklySpend,
    averageSpendPerTrip,
    monthlyPace,
    weeklyBuckets,
    monthlyBuckets,
    spendByCategory,
    recentPurchases,
    narrative,
  };
}

export function PantryBudgetPanel({ spaceId, spaceName }: PantryBudgetPanelProps) {
  const [history, setHistory] = useState<PurchaseHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadBudget() {
      try {
        setLoading(true);
        const purchaseHistory = await getPurchaseHistory(spaceId);
        if (!cancelled) {
          setHistory(purchaseHistory);
        }
      } catch (error) {
        console.error('Failed to load pantry budget history:', error);
        if (!cancelled) {
          setHistory([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBudget();
    return () => {
      cancelled = true;
    };
  }, [spaceId]);

  const budget = useMemo(() => buildBudgetSnapshot(history), [history]);
  const weeklyMax = Math.max(...budget.weeklyBuckets.map((bucket) => bucket.total), 1);
  const monthlyMax = Math.max(...budget.monthlyBuckets.map((bucket) => bucket.total), 1);
  const categoryMax = Math.max(...budget.spendByCategory.map((entry) => entry.total), 1);
  const strongestDay = budget.weeklyBuckets.reduce((best, bucket) => (bucket.total > best.total ? bucket : best), budget.weeklyBuckets[0]);
  const strongestMonth = budget.monthlyBuckets.reduce((best, bucket) => (bucket.total > best.total ? bucket : best), budget.monthlyBuckets[0]);
  const leadCategory = budget.spendByCategory[0];
  const weekShareOfMonth = budget.monthlySpend > 0 ? Math.round((budget.weeklySpend / budget.monthlySpend) * 100) : 0;
  const hasBudgetData = budget.pricedHistory.length > 0;

  return (
    <div className="space-y-5 sm:space-y-7">
      <SurfaceCard
        className="relative overflow-hidden border border-white/50 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.26),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.18),_transparent_22%),linear-gradient(135deg,rgba(10,23,44,0.98),rgba(17,24,39,0.95)_44%,rgba(20,83,45,0.94))] text-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]"
        padding="lg"
      >
        <div className="absolute right-0 top-0 h-48 w-48 translate-x-12 -translate-y-12 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute left-10 top-10 h-24 w-24 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="relative grid gap-6 xl:grid-cols-[1.2fr_minmax(0,0.8fr)]">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              <Wallet size={14} />
              Pantry budget
            </div>
            <h2
              className="text-3xl font-black tracking-tight text-white sm:text-4xl"
              style={{ fontFamily: '"Iowan Old Style", "Palatino Linotype", Georgia, serif' }}
            >
              {spaceName} spend rhythm
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78 sm:text-base">
              {loading ? 'Loading Pantry spend history...' : budget.narrative}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                  This week
                </p>
                <p className="mt-3 text-4xl font-black tracking-tight text-white">
                  {loading ? '...' : formatCurrency(budget.weeklySpend)}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm text-white/72">
                  <span>{loading ? '...' : `${weekShareOfMonth}% of this month so far`}</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                    <ArrowUpRight size={12} />
                    {hasBudgetData && strongestDay ? strongestDay.label : 'No spend'}
                  </span>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.08))] p-4 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                  This month
                </p>
                <p className="mt-3 text-4xl font-black tracking-tight text-white">
                  {loading ? '...' : formatCurrency(budget.monthlySpend)}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm text-white/72">
                  <span>{loading ? '...' : `${budget.pricedHistory.length} priced line${budget.pricedHistory.length === 1 ? '' : 's'}`}</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                    <CalendarRange size={12} />
                    Pace {loading ? '...' : formatCompactCurrency(budget.monthlyPace)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                    Lead category
                  </p>
                  <p className="mt-2 text-xl font-black text-white capitalize">
                    {loading ? '...' : leadCategory ? leadCategory.category.replace(/[_-]+/g, ' ') : 'No data yet'}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 p-2.5 text-white">
                  <ShoppingBasket size={18} />
                </div>
              </div>
              <p className="mt-3 text-sm text-white/72">
                {loading
                  ? 'Loading category split...'
                  : leadCategory
                  ? `${formatCurrency(leadCategory.total)} across ${leadCategory.count} purchase line${leadCategory.count === 1 ? '' : 's'}.`
                  : 'Top cost categories will appear once you start recording spend.'}
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                    Biggest month
                  </p>
                  <p className="mt-2 text-xl font-black text-white">
                    {loading ? '...' : strongestMonth ? strongestMonth.label : 'No data yet'}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 p-2.5 text-white">
                  <Package2 size={18} />
                </div>
              </div>
              <p className="mt-3 text-sm text-white/72">
                {loading
                  ? 'Loading month trend...'
                  : strongestMonth
                  ? `${formatCurrency(strongestMonth.total)} with ${strongestMonth.count} purchase line${strongestMonth.count === 1 ? '' : 's'}.`
                  : 'Monthly trend will appear once purchases have been logged.'}
              </p>
            </div>
          </div>
        </div>
      </SurfaceCard>

      <section className="space-y-3">
        <SectionHeader
          overline="Budget"
          title="Spend snapshot"
          subtitle="A clear split between current week, current month, and what your recent purchase rhythm looks like."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'This week',
              value: formatCurrency(budget.weeklySpend),
              detail: 'Recorded from this week’s Pantry purchases',
              icon: ReceiptPoundSterling,
              tone: 'from-emerald-500/20 via-lime-500/10 to-transparent',
            },
            {
              label: 'This month',
              value: formatCurrency(budget.monthlySpend),
              detail: 'Month-to-date Pantry spend',
              icon: CalendarRange,
              tone: 'from-sky-500/20 via-cyan-500/10 to-transparent',
            },
            {
              label: 'Average week',
              value: formatCurrency(budget.averageWeeklySpend),
              detail: 'Average across the last six months',
              icon: TrendingUp,
              tone: 'from-violet-500/20 via-fuchsia-500/10 to-transparent',
            },
            {
              label: 'Average item spend',
              value: formatCurrency(budget.averageSpendPerTrip),
              detail: 'Average price per recorded purchase line',
              icon: ShoppingBasket,
              tone: 'from-amber-500/20 via-orange-500/10 to-transparent',
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <SurfaceCard key={card.label} className="relative overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/85 backdrop-blur">
                <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${card.tone} pointer-events-none`} />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{card.label}</p>
                      <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{loading ? '...' : card.value}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-900 p-2.5 text-white shadow-sm">
                      <Icon size={18} />
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{card.detail}</p>
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SurfaceCard className="overflow-hidden border border-white/60 bg-white/85 backdrop-blur">
          <SectionHeader
            overline="Weekly spend"
            title="This week by day"
            subtitle="Useful for spotting one big supermarket run versus a few smaller top-ups."
          />
          <div className="mt-6 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {budget.weeklyBuckets.map((bucket) => (
              <div
                key={bucket.key}
                className={`min-w-[84px] flex-1 rounded-[1.7rem] border p-3 text-center shadow-sm ${
                  bucket.isCurrent
                    ? 'border-teal-200 bg-[linear-gradient(180deg,rgba(240,253,250,0.98),rgba(255,255,255,0.96))]'
                    : 'border-slate-200/80 bg-slate-50/90'
                }`}
              >
                <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${bucket.isCurrent ? 'text-teal-700' : 'text-slate-500'}`}>
                  {bucket.label}
                </div>
                <div className="mt-4 flex h-32 items-end justify-center">
                  <div className="flex h-full w-full items-end justify-center rounded-[1.1rem] bg-white/80 px-2 py-2">
                    <div
                      className={`w-full rounded-full ${bucket.isCurrent ? 'bg-[linear-gradient(180deg,#0f766e,#14b8a6)]' : 'bg-[linear-gradient(180deg,#94a3b8,#64748b)]'}`}
                      style={{ height: `${Math.max((bucket.total / weeklyMax) * 100, bucket.total > 0 ? 14 : 5)}%` }}
                    />
                  </div>
                </div>
                <div className="mt-3 text-base font-black text-slate-900">{formatCompactCurrency(bucket.total)}</div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {bucket.count} line{bucket.count === 1 ? '' : 's'}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-50/90 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Strongest day</p>
              <p className="mt-2 text-xl font-black text-slate-900">{hasBudgetData ? strongestDay.label : 'No spend yet'}</p>
              <p className="mt-2 text-sm text-slate-600">
                {hasBudgetData ? `${formatCurrency(strongestDay.total)} across ${strongestDay.count} line${strongestDay.count === 1 ? '' : 's'}.` : 'Once you log shopping spend, the busiest day of the week will stand out here.'}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-50/90 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Week vs month</p>
              <p className="mt-2 text-xl font-black text-slate-900">{loading ? '...' : `${weekShareOfMonth}%`}</p>
              <p className="mt-2 text-sm text-slate-600">
                {hasBudgetData ? 'Share of this month’s Pantry spend that has already happened this week.' : 'This will update automatically as purchases are recorded.'}
              </p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="border border-white/60 bg-white/85 backdrop-blur">
          <SectionHeader
            overline="Monthly spend"
            title="Six-month trend"
            subtitle="A broader read on how Pantry spending is changing month to month."
          />
          <div className="mt-6 space-y-3">
            {budget.monthlyBuckets.map((bucket) => (
              <div key={bucket.key} className={`rounded-[1.6rem] border p-4 ${bucket.isCurrent ? 'border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.95),rgba(255,255,255,0.96))]' : 'border-slate-200/80 bg-slate-50/90'}`}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-slate-900">{bucket.label}</p>
                    {bucket.sublabel && <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{bucket.sublabel}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-slate-900">{formatCurrency(bucket.total)}</p>
                    <p className="text-[11px] text-slate-500">{bucket.count} line{bucket.count === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`${bucket.isCurrent ? 'bg-[linear-gradient(90deg,#0f766e,#22c55e)]' : 'bg-[linear-gradient(90deg,#1d4ed8,#60a5fa)]'} h-full rounded-full`}
                    style={{ width: `${Math.max((bucket.total / monthlyMax) * 100, bucket.total > 0 ? 10 : 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-slate-200/80 bg-slate-50/90 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Peak month</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-xl font-black text-slate-900">{hasBudgetData ? strongestMonth.label : 'No data yet'}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {hasBudgetData ? `${formatCurrency(strongestMonth.total)} recorded.` : 'Budget trend appears once your purchase history builds up.'}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-900 p-2.5 text-white shadow-sm">
                <TrendingUp size={18} />
              </div>
            </div>
          </div>
        </SurfaceCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SurfaceCard className="border border-white/60 bg-white/85 backdrop-blur">
          <SectionHeader
            overline="Spend mix"
            title="Top cost categories"
            subtitle="Where Pantry money is currently going, based on logged purchase lines."
          />
          <div className="mt-5 space-y-3">
            {budget.spendByCategory.length === 0 ? (
              <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                No priced Pantry purchases recorded yet. Move checked shopping items into Pantry with a cost to start building the budget view.
              </div>
            ) : (
              budget.spendByCategory.map((entry) => (
                <div key={entry.category} className="rounded-[1.6rem] border border-slate-200/80 bg-slate-50/90 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-bold capitalize text-slate-900">{entry.category.replace(/[_-]+/g, ' ')}</p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{entry.count} purchase line{entry.count === 1 ? '' : 's'}</p>
                    </div>
                    <p className="text-base font-black text-slate-900">{formatCurrency(entry.total)}</p>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e,#84cc16)]"
                      style={{ width: `${Math.max((entry.total / categoryMax) * 100, 10)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard className="border border-white/60 bg-white/85 backdrop-blur">
          <SectionHeader
            overline="Recent spend"
            title="Latest purchase lines"
            subtitle="A running log of the most recent priced items that were moved from Shopping into Pantry."
          />
          <div className="mt-5 space-y-3">
            {budget.recentPurchases.length === 0 ? (
              <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                Your budget log is empty. As soon as you price shopping items and move them into Pantry, they will appear here.
              </div>
            ) : (
              budget.recentPurchases.map((entry) => (
                <div key={entry.id} className="flex items-start justify-between gap-3 rounded-[1.6rem] border border-slate-200/80 bg-slate-50/90 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-slate-900">{entry.item_name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {[entry.quantity, entry.category].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-slate-900">{formatCurrency(parsePrice(entry.price))}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {new Date(entry.purchased_date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
