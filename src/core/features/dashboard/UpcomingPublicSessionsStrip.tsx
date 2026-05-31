/**
 * UpcomingPublicSessionsStrip — horizontal carousel of upcoming non-solo
 * scheduled sessions you could join.
 *
 * Even when the room is currently quiet, there's often someone hosting a
 * session in 2 hours. This strip surfaces those bookings so a brand-new
 * user can see "oh, things are happening today" and pre-commit to one.
 *
 * Tap a card → /sessions (calendar) at that day, or use join code if set.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, ArrowRight, Sparkles, Globe2, Users } from 'lucide-react';
import { fetchRsvpCounts, type ScheduledSessionWithProfile } from '../../services/SessionService';
import { SessionTagPills } from '../sessions/SessionTagPills';
import { SessionDetailSheet, toGridScheduled } from '../sessions/CalendarView';

const PURPOSE_META: Record<string, { label: string; cls: string; Icon: typeof Sparkles }> = {
  weekly_review: { label: 'Weekly review', cls: 'bg-violet-100 text-violet-700', Icon: Sparkles },
  community:     { label: 'Community',     cls: 'bg-cyan-100 text-cyan-700',     Icon: Globe2 },
  workshop:      { label: 'Workshop',      cls: 'bg-amber-100 text-amber-700',   Icon: Sparkles },
};

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

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  if (diffMins < 0) return 'Now';
  if (diffMins < 60) return `In ${diffMins}m`;
  if (isToday) return `Today · ${time}`;
  if (isTomorrow) return `Tomorrow · ${time}`;
  return d.toLocaleDateString('en-GB', { weekday: 'short' }) + ' · ' + time;
}

export function UpcomingPublicSessionsStrip({
  sessions,
  myUserId,
}: {
  sessions: ScheduledSessionWithProfile[];
  myUserId: string | undefined;
}) {
  const navigate = useNavigate();

  // This strip is a DISCOVERY surface — "what group sessions are coming up
  // that I could join". So we show GROUP sessions only:
  //   • solo      → always private, never joinable
  //   • one_on_one → matched/private, not an open room to drop into
  // We keep the viewer's own group sessions (tagged "You" below) so an
  // established host whose only bookings are their own still sees the strip
  // rather than an empty/hidden section.
  // Only genuinely upcoming sessions — the feed also carries `completed`
  // history rows (the calendar scrolls backward), which must not leak in.
  const FRESH_GRACE_MS = 15 * 60 * 1000; // tolerate a session that just started
  const upcoming = sessions
    // null/undefined session_mode = legacy/admin-curated rows, which default
    // to group; only explicit solo + one_on_one are excluded.
    .filter((s) => { const m = (s as any).session_mode; return m == null || m === 'group'; })
    .filter((s) => (s as any).status !== 'completed' && (s as any).status !== 'cancelled')
    .filter((s) => {
      const t = new Date(s.scheduled_at ?? s.start_time).getTime();
      return Number.isFinite(t) && t > Date.now() - FRESH_GRACE_MS;
    })
    .slice(0, 6);

  // Tapping a card opens the shared SessionDetailSheet (sign up / details /
  // host edit) as a bottom sheet — no full-page navigation.
  const [openSession, setOpenSession] = useState<ScheduledSessionWithProfile | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // "N going" social proof — aggregate sign-up counts for the shown sessions.
  const [going, setGoing] = useState<Record<string, number>>({});
  const idsKey = upcoming.map((s) => s.id).join(',');
  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    fetchRsvpCounts(idsKey.split(','))
      .then((c) => { if (!cancelled) setGoing(c); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [idsKey, refreshKey]);

  if (upcoming.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
          Group sessions coming up
        </p>
        <button
          type="button"
          onClick={() => navigate('/sessions')}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-70 transition-opacity"
        >
          See all <ArrowRight size={12} />
        </button>
      </div>

      <div className="flex gap-2.5 overflow-x-auto -mx-1 px-1 pb-1 snap-x snap-mandatory">
        {upcoming.map((s) => {
          const startIso = s.scheduled_at ?? s.start_time;
          const isOneOnOne = (s as any).session_mode === 'one_on_one';
          const partnerOpen = isOneOnOne && !(s as any).partner_user_id;
          const isQuiet = !!(s as any).quiet_mode;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setOpenSession(s)}
              className="snap-start shrink-0 w-[220px] text-left rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all p-3 active:scale-[0.98]"
            >
              <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                <Clock size={11} className="text-primary" />
                <span className="text-[11px] font-bold text-primary">{formatWhen(startIso)}</span>
                {(() => {
                  const purpose = (s as any).session_purpose as string | null | undefined;
                  if (!purpose) return null;
                  const meta = PURPOSE_META[purpose];
                  if (!meta) return null;
                  const Icon = meta.Icon;
                  return (
                    <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${meta.cls}`}>
                      <Icon size={8} /> {meta.label}
                    </span>
                  );
                })()}
                {(going[s.id] ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold stitch-text-secondary">
                    <Users size={9} /> {going[s.id]} going
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-2.5">
                {s.avatar_url ? (
                  <img src={s.avatar_url} alt="" className="w-8 h-8 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradFor(s.display_name)} flex items-center justify-center text-white text-xs font-extrabold shrink-0`}>
                    {s.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <p className="text-xs font-bold stitch-text-primary truncate flex-1 min-w-0">
                  {s.user_id === myUserId ? 'You' : s.display_name}
                </p>
              </div>

              <p className="text-sm font-semibold stitch-text-primary line-clamp-2 leading-snug mb-2">
                {s.session_title ?? s.session_goal ?? 'Focus session'}
              </p>

              <SessionTagPills
                mode={isOneOnOne ? 'one_on_one' : 'group'}
                quietMode={isQuiet}
                partnerOpen={partnerOpen}
                durationMinutes={s.intended_duration_minutes}
                size="sm"
              />
            </button>
          );
        })}

        {/* Trailing "view all" card */}
        <button
          type="button"
          onClick={() => navigate('/sessions')}
          className="snap-start shrink-0 w-[120px] rounded-2xl bg-surface-container-low/60 border-2 border-dashed border-surface-container-high hover:border-primary/40 hover:bg-primary/5 transition-all p-3 flex flex-col items-center justify-center gap-2"
        >
          <Calendar size={18} className="text-primary/60" />
          <span className="text-xs font-bold text-primary">View calendar</span>
        </button>
      </div>

      {openSession && (
        <SessionDetailSheet
          session={toGridScheduled(openSession)}
          isMine={openSession.user_id === myUserId}
          onClose={() => setOpenSession(null)}
          onJoined={(id) => { setOpenSession(null); navigate(`/session/${id}`); }}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </section>
  );
}
