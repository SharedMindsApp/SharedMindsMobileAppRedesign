/**
 * UpcomingSessionCountdown
 *
 * Shows a visual countdown card for the user's next scheduled session.
 * Appears on the home page whenever a session is within 24 hours.
 *
 * States:
 *   - > 60 min away  → subtle card, shows "in Xh Ym"
 *   - 15–60 min away → amber / warm warning, countdown in MM:SS
 *   - < 15 min away  → glowing red/rose, pulsing ring, "Starting soon"
 *   - Live (past start, < 10 min over) → emerald "Join now" CTA
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Play, Users, UserPlus, User, Clock } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { fetchUpcomingScheduledSessions, type ScheduledSessionWithProfile } from '../../services/SessionService';
import { useSessionReminders } from '../../../hooks/useSessionReminders';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${pad(m)}m`;
  return `${pad(m)}:${pad(s)}`;
}

const MODE_ICON = {
  solo: User,
  one_on_one: UserPlus,
  group: Users,
} as const;

export function UpcomingSessionCountdown() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [sessions, setSessions] = useState<ScheduledSessionWithProfile[]>([]);
  const [now, setNow] = useState(() => Date.now());

  // Tick every second for smooth countdown
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch upcoming sessions scoped to this user
  useEffect(() => {
    if (!user) return;
    fetchUpcomingScheduledSessions(user.id).then(setSessions).catch(() => {});
  }, [user]);

  // Wire up browser notifications (15 min before each session)
  useSessionReminders(sessions);

  // Pick the soonest upcoming or just-started session
  const next = useMemo<ScheduledSessionWithProfile | null>(() => {
    const cutoff = now + 24 * 60 * 60 * 1000; // within 24 h
    const live_cutoff = now - 10 * 60 * 1000;  // started within last 10 min

    return (
      sessions
        .filter((s) => {
          const start = new Date(s.scheduled_at ?? s.start_time).getTime();
          return start > live_cutoff && start < cutoff;
        })
        .sort((a, b) =>
          new Date(a.scheduled_at ?? a.start_time).getTime() -
          new Date(b.scheduled_at ?? b.start_time).getTime()
        )[0] ?? null
    );
  }, [sessions, now]);

  if (!next) return null;

  const startMs = new Date(next.scheduled_at ?? next.start_time).getTime();
  const msUntil = startMs - now;
  const isLive    = msUntil <= 0;
  // Sessions become joinable 5 minutes before — clicking enters the waiting room.
  const canJoin   = msUntil <= 5 * 60 * 1000;
  const isSoon    = msUntil <= 15 * 60 * 1000;  // < 15 min (visual nudge)
  const isWarm    = msUntil <= 60 * 60 * 1000;  // < 60 min
  const ModeIcon = MODE_ICON[(next as any).session_mode as keyof typeof MODE_ICON] ?? Users;

  const timeStr = new Date(startMs).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  });

  const title = (next as any).session_title ?? (next as any).session_goal ?? 'Session';

  // Colour theme
  const theme = isLive
    ? { ring: 'ring-emerald-400/60', bg: 'bg-gradient-to-br from-emerald-50 to-teal-50', dot: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-500 text-white', pulse: true }
    : isSoon
    ? { ring: 'ring-rose-400/60', bg: 'bg-gradient-to-br from-rose-50 to-pink-50', dot: 'bg-rose-500', text: 'text-rose-700', badge: 'bg-rose-500 text-white', pulse: true }
    : isWarm
    ? { ring: 'ring-amber-400/50', bg: 'bg-gradient-to-br from-amber-50 to-orange-50', dot: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-500 text-white', pulse: false }
    : { ring: 'ring-violet-200/60', bg: 'bg-gradient-to-br from-violet-50/40 to-blue-50/20', dot: 'bg-violet-400', text: 'text-violet-700', badge: 'bg-violet-600 text-white', pulse: false };

  return (
    <div
      className={`rounded-2xl ring-2 ${theme.ring} ${theme.bg} px-4 py-3.5 flex items-center gap-3 shadow-sm transition-all`}
    >
      {/* Animated status dot */}
      <div className="relative shrink-0">
        {theme.pulse && (
          <span className={`absolute inset-0 rounded-full ${theme.dot} opacity-40 animate-ping`} />
        )}
        <span className={`relative flex w-3 h-3 rounded-full ${theme.dot}`} />
      </div>

      {/* Session info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-[10px] font-extrabold uppercase tracking-widest ${theme.text}`}>
            {isLive ? 'Live now' : isSoon ? 'Starting soon' : 'Up next'}
          </span>
          <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${theme.badge}`}>
            <ModeIcon size={8} />
            {(next as any).session_mode === 'one_on_one' ? '1-on-1' : (next as any).session_mode ?? 'group'}
          </span>
        </div>
        <p className="text-sm font-bold stitch-text-primary truncate leading-snug">
          {title}
        </p>
        <p className="text-[11px] stitch-text-secondary">
          {next.display_name} · {timeStr}
        </p>
      </div>

      {/* Countdown + action */}
      <div className="shrink-0 flex flex-col items-end gap-1.5">
        {/* Countdown clock */}
        <div className={`flex items-center gap-1 text-sm font-extrabold tabular-nums ${theme.text}`}>
          {!isLive && <Clock size={12} />}
          <span>{isLive ? 'Join now' : formatCountdown(msUntil)}</span>
        </div>

        {/* CTA button */}
        {isLive || canJoin ? (
          <button
            type="button"
            onClick={() => navigate(`/session/${next.id}`)}
            className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md hover:-translate-y-px transition-all ${
              isLive
                ? 'bg-emerald-500 text-white shadow-emerald-500/30 hover:bg-emerald-600'
                : 'bg-violet-500 text-white shadow-violet-500/30 hover:bg-violet-600'
            }`}
          >
            <Play size={10} fill="currentColor" strokeWidth={0} />
            {isLive ? 'Join' : 'Get ready'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/sessions')}
            className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ring-1 ${theme.text} ring-current/30 hover:opacity-80 transition-opacity`}
          >
            <Bell size={10} />
            {isSoon ? 'Notify me' : 'View'}
          </button>
        )}
      </div>
    </div>
  );
}
