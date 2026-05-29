// SessionSoonModal
//
// Fires (once/day) when the user lands on home with a scheduled session
// starting soon — instead of the generic "what should I do?" re-entry prompt,
// we acknowledge the commitment they already made. Within the join window we
// offer "Join now"; otherwise it's a heads-up with a calendar link.

import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Users, UserPlus, User, ArrowRight } from 'lucide-react';
import type { ScheduledSessionWithProfile } from '../../services/SessionService';

const JOIN_WINDOW_MS = 5 * 60 * 1000;

const MODE_ICON = { solo: User, one_on_one: UserPlus, group: Users } as const;
const MODE_LABEL = { solo: 'Solo', one_on_one: '1-on-1', group: 'Group' } as const;

interface Props {
  session: ScheduledSessionWithProfile;
  onClose: () => void;
}

export function SessionSoonModal({ session, onClose }: Props) {
  const navigate = useNavigate();
  const startMs = new Date((session.scheduled_at ?? session.start_time) as string).getTime();
  const minsAway = Math.max(0, Math.round((startMs - Date.now()) / 60000));
  const canJoin = Date.now() >= startMs - JOIN_WINDOW_MS;
  const mode = (session.session_mode ?? 'group') as keyof typeof MODE_ICON;
  const ModeIcon = MODE_ICON[mode];
  const title = session.session_title ?? session.session_goal ?? 'Focus session';

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.25rem)' }}
        className="relative w-full sm:max-w-sm bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl p-5"
      >
        <div className="sm:hidden flex justify-center pb-2 -mt-1"><span className="w-9 h-1 rounded-full bg-black/15" /></div>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/15 grid place-items-center shrink-0">
            <CalendarClock size={20} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
              {minsAway === 0 ? 'Starting now' : `In ${minsAway} min`}
            </p>
            <h2 className="text-base font-extrabold stitch-text-primary leading-tight">
              You've got a session booked
            </h2>
          </div>
        </div>

        <div className="rounded-2xl bg-surface-container-low p-3.5 mb-4">
          <p className="text-sm font-bold stitch-text-primary leading-snug">{title}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold stitch-text-secondary">
            <ModeIcon size={12} /> {MODE_LABEL[mode]} · {session.intended_duration_minutes ?? 50} min
          </p>
        </div>

        <p className="text-xs stitch-text-secondary leading-snug mb-4">
          {canJoin
            ? "It's time — jump in and decide what you'll work on together."
            : "Hold tight — you can join a few minutes before it starts. Want to get set up?"}
        </p>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => { onClose(); navigate(canJoin ? `/session/${session.id}` : '/sessions'); }}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl stitch-btn--primary text-white text-sm font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
          >
            {canJoin ? 'Join now' : 'View on calendar'} <ArrowRight size={15} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-surface-container-low stitch-text-primary text-sm font-semibold hover:bg-surface-container active:scale-[0.98] transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
