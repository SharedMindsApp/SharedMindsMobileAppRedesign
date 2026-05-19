/**
 * RecentFinishesCarousel — "Founders finished today"
 *
 * Horizontal scroll of community sessions that completed in the last 24
 * hours. Real social proof: avatar + goal + outcome chip. RLS for this
 * is opened up to all authenticated users in migration
 * 20260519000002_recent_finishes_visibility.sql (non-solo only).
 *
 * Fetched once on mount — refresh feels noisy on a low-volume product.
 */

import { useEffect, useState } from 'react';
import { CheckCircle2, CircleDashed, CloudOff, Sparkles } from 'lucide-react';
import { fetchRecentShippedSessions, type ShippedSession } from '../../services/SessionService';

const AVATAR_GRAD = [
  'from-violet-400 to-fuchsia-500',
  'from-cyan-400 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-indigo-400 to-purple-500',
];
function gradFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRAD[Math.abs(hash) % AVATAR_GRAD.length];
}

const OUTCOME_META: Record<string, { label: string; Icon: typeof CheckCircle2; cls: string }> = {
  finished:          { label: 'Finished', Icon: CheckCircle2, cls: 'text-emerald-700 bg-emerald-100' },
  partially:         { label: 'Partial',  Icon: CircleDashed, cls: 'text-amber-700 bg-amber-100' },
  something_came_up: { label: 'Came up',  Icon: CloudOff,     cls: 'text-slate-600 bg-slate-100' },
};

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return hrs === 1 ? '1h ago' : `${hrs}h ago`;
}

export function RecentFinishesCarousel({ excludeUserId }: { excludeUserId?: string }) {
  const [items, setItems] = useState<ShippedSession[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchRecentShippedSessions()
      .then((rows) => {
        if (cancelled) return;
        // Drop your own + solo sessions client-side (RLS already filters but defensive)
        const filtered = rows.filter(
          (s) => s.user_id !== excludeUserId && (s as any).session_mode !== 'solo'
        );
        setItems(filtered);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => { cancelled = true; };
  }, [excludeUserId]);

  // Hide section entirely while loading or when empty — no sad placeholder.
  if (!loaded || items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={12} className="text-emerald-600" />
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
          Founders finished today
        </p>
      </div>

      <div className="flex gap-2.5 overflow-x-auto -mx-1 px-1 pb-1 snap-x">
        {items.map((s) => {
          const meta = OUTCOME_META[s.session_outcome ?? 'finished'] ?? OUTCOME_META.finished;
          const Icon = meta.Icon;
          return (
            <div
              key={s.id}
              className="snap-start shrink-0 w-[240px] rounded-2xl bg-gradient-to-br from-white to-emerald-50/40 border border-emerald-200/40 p-3 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2.5">
                {s.avatar_url ? (
                  <img src={s.avatar_url} alt="" className="w-8 h-8 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradFor(s.display_name)} flex items-center justify-center text-white text-xs font-extrabold shrink-0`}>
                    {s.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold stitch-text-primary truncate">{s.display_name}</p>
                  <p className="text-[10px] stitch-text-secondary">
                    {timeAgo(s.ended_at ?? s.end_time)}
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold stitch-text-primary line-clamp-2 leading-snug mb-2.5">
                {s.session_goal ?? s.session_title ?? 'Worked on something'}
              </p>
              <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${meta.cls}`}>
                <Icon size={9} strokeWidth={2.5} />
                {meta.label}
                {s.intended_duration_minutes ? ` · ${s.intended_duration_minutes}m` : ''}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
