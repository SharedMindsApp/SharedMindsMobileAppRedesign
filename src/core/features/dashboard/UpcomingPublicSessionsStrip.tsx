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

import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, UserPlus, MicOff, ArrowRight } from 'lucide-react';
import type { ScheduledSessionWithProfile } from '../../services/SessionService';

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

  // Filter out solo (always private) — they don't exist as scheduled, but defensive.
  // Drop your own scheduled sessions (the SmartNextCard handles those).
  const upcoming = sessions
    .filter((s) => (s as any).session_mode !== 'solo')
    .filter((s) => s.user_id !== myUserId)
    .slice(0, 6);

  if (upcoming.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
          Coming up on the calendar
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
              onClick={() => {
                if (s.join_code) navigate(`/join/${s.join_code}`);
                else navigate('/sessions');
              }}
              className="snap-start shrink-0 w-[220px] text-left rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all p-3 active:scale-[0.98]"
            >
              <div className="flex items-center gap-1.5 mb-2.5">
                <Clock size={11} className="text-primary" />
                <span className="text-[11px] font-bold text-primary">{formatWhen(startIso)}</span>
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
                  {s.display_name}
                </p>
              </div>

              <p className="text-sm font-semibold stitch-text-primary line-clamp-2 leading-snug mb-2">
                {s.session_title ?? s.session_goal ?? 'Focus session'}
              </p>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                  isOneOnOne ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {isOneOnOne ? <UserPlus size={8} /> : <Users size={8} />}
                  {isOneOnOne ? '1-on-1' : 'Group'}
                </span>
                {isQuiet && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-slate-100 text-slate-700">
                    <MicOff size={8} /> Quiet
                  </span>
                )}
                {partnerOpen && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">
                    Slot open
                  </span>
                )}
                <span className="text-[10px] stitch-text-secondary ml-auto">
                  {s.intended_duration_minutes}m
                </span>
              </div>
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
    </section>
  );
}
