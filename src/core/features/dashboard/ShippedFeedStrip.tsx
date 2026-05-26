/**
 * ShippedFeedStrip — a slim horizontal strip on the home dashboard showing
 * recent "finished" session outcomes from across the community.
 *
 * The product purpose: social proof. Seeing other members ship in real time
 * is what makes accountability feel alive. Quiet bystanders see momentum,
 * and the cost of starting your own session feels lower because others are
 * doing it too.
 *
 * Pulls from `session_outcomes` filtered to outcome='finished', joined with
 * the participant's profile and session goal. Realtime-subscribed so newly
 * shipped outcomes appear without a refresh.
 */

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface ShippedItem {
  id: string;
  user_id: string;
  declared_goal: string | null;
  created_at: string;
  profile: { display_name: string; avatar_url: string | null } | null;
}

const FEED_LIMIT = 12;

export function ShippedFeedStrip() {
  const [items, setItems] = useState<ShippedItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Two-query approach — PostgREST can't infer the relationship between
      // session_outcomes.user_id and profiles (FK is to auth.users, not
      // profiles directly). We fetch outcomes + profiles separately and
      // join client-side. Same pattern as fetchSessionOutcomes in the
      // SessionService.
      const { data: outcomes, error } = await supabase
        .from('session_outcomes')
        .select('id, user_id, declared_goal, created_at')
        .eq('outcome', 'finished')
        .order('created_at', { ascending: false })
        .limit(FEED_LIMIT);

      if (cancelled) return;
      if (error) {
        console.warn('[ShippedFeedStrip] load failed:', error.message);
        setLoaded(true);
        return;
      }

      const rows = outcomes ?? [];
      if (rows.length === 0) {
        setItems([]);
        setLoaded(true);
        return;
      }

      const userIds = Array.from(new Set(rows.map((r) => r.user_id as string)));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);
      if (cancelled) return;

      const byId = new Map(
        (profiles ?? []).map((p) => [
          p.id as string,
          {
            display_name: (p.display_name as string) ?? 'Member',
            avatar_url:   (p.avatar_url as string | null) ?? null,
          },
        ]),
      );

      const items: ShippedItem[] = rows.map((r) => ({
        id:            r.id as string,
        user_id:       r.user_id as string,
        declared_goal: (r.declared_goal as string | null) ?? null,
        created_at:    r.created_at as string,
        profile:       byId.get(r.user_id as string) ?? null,
      }));

      setItems(items);
      setLoaded(true);
    }

    load();

    // Realtime: prepend new "finished" outcomes as they happen
    const channel = supabase
      .channel('shipped_feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_outcomes',
          filter: 'outcome=eq.finished',
        },
        () => {
          // Re-fetch top-N rather than diff-applying (avoids missing the
          // joined profile data on the realtime payload).
          load();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const visible = useMemo(() => items.filter((i) => i.declared_goal), [items]);

  if (!loaded) return null;
  if (visible.length === 0) return null;

  return (
    <section className="rounded-2xl bg-gradient-to-br from-emerald-50/60 via-white to-violet-50/40 ring-1 ring-emerald-200/30 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-emerald-600" />
          <p className="text-[10px] font-bold text-emerald-700 tracking-widest uppercase">
            Just shipped
          </p>
        </div>
        <span className="text-[10px] font-semibold stitch-text-secondary tabular-nums">
          {visible.length} {visible.length === 1 ? 'finish' : 'finishes'}
        </span>
      </div>

      {/* Horizontal scroll of cards */}
      <div className="-mx-3 px-3 overflow-x-auto">
        <div className="flex gap-2 pb-1">
          {visible.map((item) => (
            <ShippedCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ShippedCard({ item }: { item: ShippedItem }) {
  const name = item.profile?.display_name ?? 'Member';
  const initial = name.trim().charAt(0).toUpperCase();
  const goal = item.declared_goal ?? '';
  const minutesAgo = Math.max(1, Math.round((Date.now() - new Date(item.created_at).getTime()) / 60000));
  const timeLabel =
    minutesAgo < 60       ? `${minutesAgo}m ago`
    : minutesAgo < 60 * 24 ? `${Math.round(minutesAgo / 60)}h ago`
    :                        `${Math.round(minutesAgo / 60 / 24)}d ago`;

  return (
    <div className="shrink-0 w-56 bg-white rounded-xl ring-1 ring-emerald-200/40 p-3 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        {item.profile?.avatar_url ? (
          <img src={item.profile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            {initial}
          </div>
        )}
        <span className="text-xs font-bold stitch-text-primary truncate flex-1 min-w-0">{name}</span>
        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
      </div>
      <p className="text-xs stitch-text-primary leading-snug line-clamp-2 mb-1.5">
        {goal}
      </p>
      <p className="text-[10px] stitch-text-secondary">{timeLabel}</p>
    </div>
  );
}

// Optional CTA — exported so the dashboard can place it wherever it wants.
// Kept as a separate component so the strip itself stays purely visual.
export function ShippedFeedFooterLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:opacity-70 transition-opacity"
    >
      See all shipped <ArrowRight size={11} />
    </button>
  );
}
