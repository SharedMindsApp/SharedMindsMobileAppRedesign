/**
 * SmartNextCard — the home page's "what now?" card.
 *
 * Picks ONE of these in priority order:
 *
 *   1. Rejoin active session    (mid-session, top priority)
 *   2. Imminent scheduled       (yours, in next 2 hours)
 *   3. Open partner slot        (a connection just hosted a 1-on-1)
 *   4. Continue pinned project  (active project has open tasks)
 *   5. Generic declare CTA      (default fallback)
 *
 * One decision per render. Replaces the old DailyFocusCard's "edit your goal"
 * pattern for returning users with something concrete the engine picked for
 * them.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Clock, UserPlus, Pin, ArrowRight, Target, StopCircle,
} from 'lucide-react';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { useCoreData } from '../../data/CoreDataContext';
import type { CoreTask, CoreProject } from '../../data/CoreDataContext';
import type { CommunitySession } from '../../../lib/sessions/focusTypes';
import type { ScheduledSessionWithProfile } from '../../services/SessionService';

type Suggestion =
  | { kind: 'active'; sessionId: string; goal: string | null; secondsLeft: number; duration: number }
  | { kind: 'scheduled'; session: ScheduledSessionWithProfile; minutesUntil: number }
  | { kind: 'partner_slot'; session: CommunitySession }
  | { kind: 'pinned_task'; project: CoreProject; task: CoreTask }
  | { kind: 'declare' };

const PROJECT_HEX: Record<string, string> = {
  cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
  emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
};
function dotHex(token: string | null) {
  return PROJECT_HEX[token ?? ''] ?? PROJECT_HEX.blue;
}

function pickSuggestion(args: {
  activeSession: ReturnType<typeof useFocusSession>['activeSession'];
  sessionGoal: string | null;
  timerSecondsRemaining: number;
  liveSessions: CommunitySession[];
  upcomingScheduled: ScheduledSessionWithProfile[];
  myUserId: string | undefined;
  projects: CoreProject[];
  tasks: CoreTask[];
  activeProjectId: string | null;
}): Suggestion {
  const {
    activeSession, sessionGoal, timerSecondsRemaining,
    upcomingScheduled, liveSessions, myUserId,
    projects, tasks, activeProjectId,
  } = args;

  // 1. Active session — rejoin
  if (activeSession) {
    return {
      kind: 'active',
      sessionId: activeSession.id,
      goal: sessionGoal,
      secondsLeft: timerSecondsRemaining,
      duration: activeSession.intended_duration_minutes ?? 50,
    };
  }

  // 2. Scheduled session of mine starting within 2h
  const now = Date.now();
  const TWO_H_MS = 2 * 60 * 60 * 1000;
  const imminentMine = upcomingScheduled.find((s) => {
    if (s.user_id !== myUserId) return false;
    const startMs = new Date(s.scheduled_at ?? s.start_time).getTime();
    return startMs > now - 5 * 60 * 1000 && startMs - now <= TWO_H_MS;
  });
  if (imminentMine) {
    const startMs = new Date(imminentMine.scheduled_at ?? imminentMine.start_time).getTime();
    const minutesUntil = Math.max(0, Math.round((startMs - now) / 60000));
    return { kind: 'scheduled', session: imminentMine, minutesUntil };
  }

  // 3. Open partner slot (1-on-1 from someone else, slot available)
  //    Prefer connections, but for MVP any open slot works.
  const openPartner = liveSessions.find(
    (s) =>
      s.session_mode === 'one_on_one' &&
      !s.partner_user_id &&
      s.user_id !== myUserId
  );
  if (openPartner) {
    return { kind: 'partner_slot', session: openPartner };
  }

  // 4. Pinned project with at least one open task
  if (activeProjectId) {
    const project = projects.find((p) => p.id === activeProjectId);
    if (project) {
      const task = tasks.find((t) => t.projectId === activeProjectId && !t.done);
      if (task) return { kind: 'pinned_task', project, task };
    }
  }

  return { kind: 'declare' };
}

function formatRemaining(sec: number): string {
  if (sec <= 0) return 'Time up';
  const m = Math.ceil(sec / 60);
  if (m < 60) return `${m}m left`;
  return `${Math.floor(m / 60)}h ${m % 60}m left`;
}

export function SmartNextCard({
  liveSessions,
  upcomingScheduled,
  myUserId,
  onDeclareCustom,
  onSchedule,
}: {
  liveSessions: CommunitySession[];
  upcomingScheduled: ScheduledSessionWithProfile[];
  myUserId: string | undefined;
  onDeclareCustom: (initialGoal?: string) => void;
  onSchedule: () => void;
}) {
  const navigate = useNavigate();
  const { activeSession, sessionGoal, timerSecondsRemaining } = useFocusSession();
  const { state: { projects, tasks, activeProjectId } } = useCoreData();

  const suggestion = useMemo(
    () => pickSuggestion({
      activeSession, sessionGoal, timerSecondsRemaining,
      liveSessions, upcomingScheduled, myUserId,
      projects, tasks, activeProjectId,
    }),
    [activeSession, sessionGoal, timerSecondsRemaining, liveSessions, upcomingScheduled, myUserId, projects, tasks, activeProjectId],
  );

  switch (suggestion.kind) {
    case 'active': {
      const totalSeconds = suggestion.duration * 60;
      const progress = totalSeconds > 0 ? Math.max(0, 1 - suggestion.secondsLeft / totalSeconds) : 0;
      return (
        <div className="rounded-[1.5rem] overflow-hidden stitch-card--accent p-5">
          <div className="flex items-start justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate(`/session/${suggestion.sessionId}`)}
              className="flex-1 min-w-0 text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-white/70 animate-pulse" />
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest">
                  In session · tap to rejoin
                </p>
              </div>
              {suggestion.goal && (
                <p className="text-sm font-bold text-white line-clamp-2 leading-snug mb-3">
                  {suggestion.goal}
                </p>
              )}
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-white/70 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="text-xs text-white/60">{formatRemaining(suggestion.secondsLeft)}</p>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/session/${suggestion.sessionId}/summary`)}
              className="shrink-0 flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-2 rounded-full transition-all active:scale-95"
            >
              <StopCircle size={13} /> End
            </button>
          </div>
        </div>
      );
    }

    case 'scheduled': {
      const s = suggestion.session;
      const startsIn = suggestion.minutesUntil === 0
        ? 'Starting now'
        : suggestion.minutesUntil < 60
          ? `in ${suggestion.minutesUntil}m`
          : `in ${Math.floor(suggestion.minutesUntil / 60)}h ${suggestion.minutesUntil % 60}m`;
      return (
        <NextCardShell
          eyebrow="Up next"
          eyebrowAccent="text-primary"
          icon={<Clock size={17} className="text-primary" />}
          iconBg="bg-primary/10"
          title={s.session_title ?? 'Focus session'}
          subtitle={`${s.intended_duration_minutes ?? 50}m · ${startsIn}`}
          primaryLabel="Join now"
          primaryIcon={<Play size={13} />}
          onPrimary={() => s.join_code ? navigate(`/join/${s.join_code}`) : navigate(`/session/${s.id}`)}
        />
      );
    }

    case 'partner_slot': {
      const s = suggestion.session;
      return (
        <NextCardShell
          eyebrow="Partner slot open"
          eyebrowAccent="text-violet-700"
          icon={
            s.avatar_url
              ? <img src={s.avatar_url} alt="" className="w-9 h-9 rounded-xl object-cover" />
              : <UserPlus size={17} className="text-violet-700" />
          }
          iconBg="bg-violet-100"
          title={`${s.display_name} is working alone`}
          subtitle={s.session_goal ? `On: ${s.session_goal}` : `1-on-1 · ${s.intended_duration_minutes ?? 50}m`}
          primaryLabel="Take the slot"
          primaryIcon={<UserPlus size={13} />}
          onPrimary={() => navigate('/sessions')}
        />
      );
    }

    case 'pinned_task': {
      const { project, task } = suggestion;
      return (
        <NextCardShell
          eyebrow={
            <span className="inline-flex items-center gap-1.5">
              <Pin size={9} fill="currentColor" />
              <span>Pinned · {project.name}</span>
            </span>
          }
          eyebrowAccent="text-primary"
          icon={
            <span
              className="w-3 h-3 rounded-full ring-2 ring-white shadow"
              style={{ backgroundColor: dotHex(project.color) }}
            />
          }
          iconBg="bg-white"
          title={task.title}
          subtitle="Pick this up in a focus session"
          primaryLabel="Start session"
          primaryIcon={<Play size={13} />}
          onPrimary={() => onDeclareCustom(task.title)}
          secondaryLabel="Schedule"
          onSecondary={onSchedule}
        />
      );
    }

    case 'declare':
    default:
      return (
        <div className="rounded-2xl bg-surface-container-low p-4">
          <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">
            What's next
          </p>
          <p className="text-base font-bold stitch-text-primary leading-snug mb-3">
            Pick something to finish today.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onDeclareCustom()}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl stitch-btn--primary text-white text-sm font-bold shadow-md shadow-primary/20 active:scale-[0.98]"
            >
              <Play size={14} /> Start now
            </button>
            <button
              type="button"
              onClick={onSchedule}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface-container stitch-text-primary text-sm font-bold hover:bg-surface-container-high active:scale-[0.98]"
            >
              <Target size={14} /> Schedule
            </button>
          </div>
        </div>
      );
  }
}

// ── Shared shell for non-active suggestions ─────────────────────

function NextCardShell({
  eyebrow, eyebrowAccent,
  icon, iconBg,
  title, subtitle,
  primaryLabel, primaryIcon, onPrimary,
  secondaryLabel, onSecondary,
}: {
  eyebrow: React.ReactNode;
  eyebrowAccent: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  primaryLabel: string;
  primaryIcon: React.ReactNode;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="rounded-2xl bg-surface-container-low p-4">
      <p className={`text-[10px] font-bold tracking-widest uppercase mb-3 ${eyebrowAccent}`}>
        {eyebrow}
      </p>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0 overflow-hidden`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold stitch-text-primary leading-snug">{title}</p>
          <p className="text-[11px] stitch-text-secondary mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrimary}
          className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl stitch-btn--primary text-white text-sm font-bold shadow-md shadow-primary/20 active:scale-[0.98]"
        >
          {primaryIcon}
          {primaryLabel}
        </button>
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl bg-surface-container stitch-text-primary text-xs font-bold hover:bg-surface-container-high active:scale-[0.98]"
          >
            {secondaryLabel}
            <ArrowRight size={11} />
          </button>
        )}
      </div>
    </div>
  );
}
