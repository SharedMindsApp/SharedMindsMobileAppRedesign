/**
 * DashboardTabs — internal tab navigation for the home page.
 *
 * Four tabs:
 *   • Now    — active session / next-up / smart suggestion (default)
 *   • Plan   — weekly intentions + today's tasks + projects
 *   • Stats  — personal momentum view (StatsTab)
 *   • Pulse  — community presence (optional, less prominent)
 *
 * Tab state lives in localStorage so the user lands back on the tab they
 * last used. No URL hash routing — keeps the home page URL clean and
 * lets us preserve scroll position when tabs change.
 */

import { useState, useEffect, type ReactNode } from 'react';
import { Zap, Target, BarChart3, Users } from 'lucide-react';

type TabKey = 'now' | 'plan' | 'stats' | 'pulse';

const TABS: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: 'now',   label: 'Now',   icon: <Zap size={13} /> },
  { key: 'plan',  label: 'Plan',  icon: <Target size={13} /> },
  { key: 'stats', label: 'Stats', icon: <BarChart3 size={13} /> },
  { key: 'pulse', label: 'Pulse', icon: <Users size={13} /> },
];

const STORAGE_KEY = 'sm:dashboard:tab';

function readInitialTab(): TabKey {
  if (typeof window === 'undefined') return 'now';
  const v = window.localStorage.getItem(STORAGE_KEY) as TabKey | null;
  return v && TABS.some((t) => t.key === v) ? v : 'now';
}

export interface DashboardTabsProps {
  now: ReactNode;
  plan: ReactNode;
  stats: ReactNode;
  pulse: ReactNode;
}

export function DashboardTabs({ now, plan, stats, pulse }: DashboardTabsProps) {
  const [active, setActive] = useState<TabKey>(readInitialTab);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, active); } catch { /* private mode */ }
  }, [active]);

  const content =
    active === 'now'   ? now
    : active === 'plan'  ? plan
    : active === 'stats' ? stats
    : pulse;

  return (
    <div>
      {/* Tab bar — horizontally scrollable on tiny screens just in case */}
      <div className="overflow-x-auto -mx-1 px-1 mb-4">
        <div className="flex gap-1 min-w-fit bg-surface-container-low rounded-full p-1">
          {TABS.map((t) => {
            const isActive = active === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActive(t.key)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white stitch-text-primary shadow-sm'
                    : 'stitch-text-secondary hover:stitch-text-primary'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div>{content}</div>
    </div>
  );
}
