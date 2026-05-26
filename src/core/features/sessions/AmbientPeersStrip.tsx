/**
 * AmbientPeersStrip — "you're not alone" presence for solo sessions.
 *
 * Renders a slim, unobtrusive column showing other members currently in
 * solo sessions. No interaction, no chat — just enough visual signal to
 * recreate the ADHD body-double effect: someone else is also grinding right
 * now, and that's enough to lower the activation energy of starting.
 *
 * Each peer card shows:
 *   • Avatar + first name
 *   • Their declared goal (one line, truncated)
 *   • A tiny progress ring representing their session progress
 *
 * Auto-refreshes via Realtime — peers appear when they start a solo session,
 * disappear when they end or roll over to non-solo modes.
 */

import { useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { fetchActiveSoloPeers, type AmbientSoloPeer } from '../../services/SessionService';

interface AmbientPeersStripProps {
  /** Optional: hide if there are zero active peers (vs render a "nobody else" hint). */
  hideWhenEmpty?: boolean;
}

export function AmbientPeersStrip({ hideWhenEmpty = false }: AmbientPeersStripProps) {
  const [peers, setPeers] = useState<AmbientSoloPeer[]>([]);
  const [now, setNow] = useState(Date.now());

  // Initial load + realtime subscription. Re-fetch whenever a solo
  // session row changes (insert/update/delete) — simpler than diff-applying.
  useEffect(() => {
    let cancelled = false;

    function load() {
      fetchActiveSoloPeers().then((rows) => {
        if (!cancelled) setPeers(rows);
      }).catch(() => {});
    }

    load();

    const ch = supabase
      .channel('ambient_solo_peers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'focus_sessions' },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, []);

  // Tick once a minute so progress rings stay roughly accurate without
  // burning re-renders every second.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const visible = useMemo(() => peers.slice(0, 5), [peers]);

  if (hideWhenEmpty && visible.length === 0) return null;

  return (
    <aside
      className="absolute left-3 top-3 bottom-3 w-44 hidden md:flex flex-col gap-2 pointer-events-none z-10"
      aria-label="Other members working solo"
    >
      <div className="flex items-center gap-1.5 px-1">
        <Users size={10} className="text-white/40" />
        <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">
          {visible.length > 0
            ? `${visible.length} working solo`
            : 'You’re first in tonight'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {visible.map((peer) => (
          <PeerCard key={peer.id} peer={peer} now={now} />
        ))}
        {visible.length === 0 && (
          <p className="text-[10px] text-white/30 italic leading-relaxed px-1 pt-1">
            Nobody else is in solo mode right now. You’re holding the line.
          </p>
        )}
      </div>
    </aside>
  );
}

function PeerCard({ peer, now }: { peer: AmbientSoloPeer; now: number }) {
  const startMs = new Date(peer.start_time).getTime();
  const durationMs = (peer.intended_duration_minutes ?? 50) * 60 * 1000;
  const elapsed = Math.max(0, now - startMs);
  const progress = Math.min(1, elapsed / durationMs);

  const initial = peer.display_name.trim().charAt(0).toUpperCase();
  // Show first name only — public profile keeps full name optional.
  const firstName = peer.display_name.split(/\s+/)[0] ?? peer.display_name;

  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/5 backdrop-blur-sm ring-1 ring-white/5 px-2 py-1.5">
      {/* Avatar with overlay progress ring */}
      <div className="relative shrink-0">
        {peer.avatar_url ? (
          <img src={peer.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
            {initial}
          </div>
        )}
        <ProgressRing progress={progress} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-white/90 truncate leading-tight">
          {firstName}
        </p>
        {peer.session_goal && (
          <p className="text-[9px] text-white/45 truncate leading-tight">
            {peer.session_goal}
          </p>
        )}
      </div>
    </div>
  );
}

function ProgressRing({ progress }: { progress: number }) {
  // 28×28 ring sitting around the 28px avatar
  const size = 32;
  const stroke = 1.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="absolute -top-[2px] -left-[2px] -rotate-90 pointer-events-none"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="rgba(167,139,250,0.7)"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}
