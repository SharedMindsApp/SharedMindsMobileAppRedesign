/**
 * HomeHero — full-bleed atmospheric header for the dashboard home screen.
 *
 * Inspired by FLOWN's "see the platform is alive" home philosophy:
 * the very first thing you see answers "who is focusing right now?"
 * and gives you a one-tap way to join them or start your own session.
 *
 * Design decisions:
 *  - Dark gradient (slate-900 → indigo-950 → violet-950) with blurred
 *    colour orbs for depth — no external images needed.
 *  - Live session list in a glass card updates via realtime subscription,
 *    so the count/names are always fresh without a page reload.
 *  - "Start a focus session" CTA is in the hero so the primary action is
 *    above the fold on every viewport.
 *  - Full-bleed: negative margins cancel the Layout's px-3/sm:px-4 padding
 *    so the gradient bleeds to the screen edges.
 *  - No load gate: firstName comes from the cached auth profile and
 *    liveSessions from the realtime hook — both are ready immediately.
 */

import { useNavigate } from 'react-router-dom';
import { Play, Calendar } from 'lucide-react';
import type { CommunitySession } from '../../../lib/sessions/focusTypes';

// ── Helpers ────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDuration(startIso: string): string {
  const mins = Math.floor((Date.now() - new Date(startIso).getTime()) / 60000);
  if (mins < 1) return 'just started';
  if (mins < 60) return `${mins}m in`;
  return `${Math.floor(mins / 60)}h in`;
}

const AVATAR_GRADS = [
  'from-violet-400 to-fuchsia-500',
  'from-cyan-400 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-indigo-400 to-purple-500',
];
function gradFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADS[Math.abs(h) % AVATAR_GRADS.length];
}

// ── Component ──────────────────────────────────────────────────────

export function HomeHero({
  firstName,
  liveSessions,
  onStart,
  onFind,
}: {
  firstName: string;
  liveSessions: CommunitySession[];
  /** Spin up a new session (opens DeclareSessionModal). */
  onStart: () => void;
  /** Browse the public session calendar (navigates to /sessions). */
  onFind: () => void;
}) {
  const navigate = useNavigate();

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Show up to 3 sessions in the panel; note the overflow count
  const visible = liveSessions.slice(0, 3);
  const overflow = liveSessions.length - visible.length;

  return (
    /* Negative margins cancel Layout's px-3 sm:px-4 md:px-6 lg:px-8 so
       the gradient bleeds edge-to-edge. The outer div clips the orbs. */
    <div className="-mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8 overflow-hidden">
      <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 px-4 sm:px-6 pt-5 pb-5">

        {/* Ambient colour orbs — pure CSS, no images */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-[-10%] left-[35%] w-72 h-72 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="absolute bottom-[-20%] right-[5%] w-56 h-56 rounded-full bg-indigo-500/15 blur-3xl" />
          <div className="absolute top-[40%] left-[-8%] w-44 h-44 rounded-full bg-fuchsia-600/10 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">

          {/* ── Greeting ──────────────────────────────────────── */}
          <p className="text-indigo-300/60 text-[11px] font-semibold tracking-wide mb-1 uppercase">
            {dateStr}
          </p>
          <h1 className="text-white text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight mb-4">
            {greeting()}, {firstName} 👋
          </h1>

          {/* ── Live panel + CTA ───────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3">

            {/* Live now glass card */}
            <div className="flex-1 bg-white/[0.07] backdrop-blur-sm rounded-2xl border border-white/[0.12] px-4 py-3">

              {/* Header row */}
              <div className="flex items-center gap-2 mb-3">
                {liveSessions.length > 0 ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                      {liveSessions.length} focusing right now
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-slate-500/70 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Room is open
                    </span>
                  </>
                )}
              </div>

              {/* Sessions list */}
              {visible.length > 0 ? (
                <div className="space-y-2.5">
                  {visible.map((s) => (
                    <div key={s.id} className="flex items-center gap-2.5">
                      {/* Avatar */}
                      {s.avatar_url ? (
                        <img
                          src={s.avatar_url}
                          alt=""
                          className="w-7 h-7 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradFor(s.display_name)} flex items-center justify-center text-white text-[11px] font-extrabold shrink-0`}
                        >
                          {s.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Goal + name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-semibold truncate leading-tight">
                          {s.session_goal ?? 'Deep focus'}
                        </p>
                        <p className="text-white/50 text-[10px]">
                          {s.display_name} · {formatDuration(s.start_time)}
                        </p>
                      </div>

                      {/* Join button (only for sessions with a join code) */}
                      {s.join_code && (
                        <button
                          type="button"
                          onClick={() => navigate(`/join/${s.join_code}`)}
                          className="shrink-0 text-[10px] font-bold text-indigo-950 bg-white/90 hover:bg-white active:scale-95 px-2.5 py-1 rounded-lg transition-all"
                        >
                          Join
                        </button>
                      )}
                    </div>
                  ))}

                  {overflow > 0 && (
                    <p className="text-white/40 text-[10px] font-medium pl-9">
                      +{overflow} more focusing
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-white/45 text-xs leading-snug">
                  No one's focusing yet today.<br />
                  Open the room and others will follow.
                </p>
              )}
            </div>

            {/* Two CTAs — Start vs Find. They map to the two ways into
                coworking: commit a new block, or join one already on the
                public calendar. Equal visual weight on sm+, stacked
                horizontally on mobile to keep the hero compact. */}
            <div className="sm:w-[160px] flex sm:flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={onStart}
                className="flex-1 sm:flex-initial flex sm:flex-col items-center justify-center gap-2 bg-white text-indigo-950 font-bold text-[13px] py-3 px-3 rounded-2xl hover:bg-white/90 active:scale-[0.98] transition-all shadow-lg"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <Play size={14} fill="currentColor" className="text-indigo-700 ml-0.5" />
                </div>
                <span className="sm:text-center sm:leading-snug">Start a session</span>
              </button>
              <button
                type="button"
                onClick={onFind}
                className="flex-1 sm:flex-initial flex sm:flex-col items-center justify-center gap-2 bg-white/10 text-white font-bold text-[13px] py-3 px-3 rounded-2xl hover:bg-white/15 active:scale-[0.98] transition-all ring-1 ring-white/15 backdrop-blur-sm"
              >
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Calendar size={14} className="text-white" />
                </div>
                <span className="sm:text-center sm:leading-snug">Find a session</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
