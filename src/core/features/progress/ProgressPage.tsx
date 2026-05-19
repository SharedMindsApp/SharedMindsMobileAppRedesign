import { useState, useEffect } from 'react';
import { Flame, TrendingUp, CheckCircle2, CircleDashed, CloudOff, Play, ListTodo, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/AuthProvider';
import { useCoreData } from '../../data/CoreDataContext';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { SurfaceCard } from '../../ui/CorePage';
import { DeclareSessionModal } from '../sessions/DeclareSessionModal';
import type { SessionOutcome } from '../../../lib/sessions/focusTypes';

interface RecentSession {
  id: string;
  session_goal: string | null;
  session_outcome: SessionOutcome | null;
  actual_duration_minutes: number | null;
  intended_duration_minutes: number | null;
  start_time: string;
  ended_at: string | null;
}

const OUTCOME_CONFIG: Record<string, { icon: typeof CheckCircle2; label: string; color: string; bg: string }> = {
  finished: { icon: CheckCircle2, label: 'Finished', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  partially: { icon: CircleDashed, label: 'Partial', color: 'text-amber-500', bg: 'bg-amber-100' },
  something_came_up: { icon: CloudOff, label: 'Interrupted', color: 'text-slate-400', bg: 'bg-slate-100' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function computeStreak(sessions: { start_time: string }[]): number {
  if (sessions.length === 0) return 0;
  const days = new Set(sessions.map((s) => new Date(s.start_time).toDateString()));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (days.has(d.toDateString())) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

function WeekDots({ sessions }: { sessions: { start_time: string }[] }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const activeDays = new Set(
    sessions
      .filter((s) => {
        const d = new Date(s.start_time);
        const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
        return diff < 7;
      })
      .map((s) => {
        const d = new Date(s.start_time);
        const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
        return mondayOffset - diff;
      })
  );

  return (
    <div className="flex items-center gap-2">
      {days.map((label, i) => {
        const isPast = i <= mondayOffset;
        const isActive = activeDays.has(i);
        const isToday = i === mondayOffset;
        return (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-primary text-white'
                  : isToday
                  ? 'bg-surface-container ring-2 ring-primary/30'
                  : isPast
                  ? 'bg-surface-container-low'
                  : 'bg-surface-container-low opacity-40'
              }`}
            >
              {isActive && <CheckCircle2 size={14} strokeWidth={2.5} />}
            </div>
            <span className={`text-[10px] font-bold ${isToday ? 'text-primary' : 'stitch-text-secondary'}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ProgressPage() {
  const { user } = useAuth();
  const { state: { tasks } } = useCoreData();
  const { activeSession } = useFocusSession();
  const navigate = useNavigate();
  const [showDeclare, setShowDeclare] = useState(false);
  const [sessions, setSessions] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);

  const openTasks = tasks.filter((t) => !t.done);
  const doneTasks = tasks.filter((t) => t.done);

  useEffect(() => {
    if (!user) return;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    supabase
      .from('focus_sessions')
      .select('id, session_goal, session_outcome, actual_duration_minutes, intended_duration_minutes, start_time, ended_at')
      .eq('user_id', user.id)
      .gte('start_time', thirtyDaysAgo.toISOString())
      .order('start_time', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        setSessions((data ?? []) as RecentSession[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const completed = sessions.filter((s) => s.session_outcome);
  const shipped = completed.filter((s) => s.session_outcome === 'finished');
  const streak = computeStreak(sessions);
  const completionRate = completed.length > 0
    ? Math.round((shipped.length / completed.length) * 100)
    : 0;

  const recentSessions = sessions.slice(0, 8);

  return (
    <div className="space-y-5">

      {/* ── Header ────────────────────────────────────────── */}
      <div>
        <h1 className="stitch-headline text-xl font-extrabold tracking-tight">Your Progress</h1>
        <p className="text-xs stitch-text-secondary mt-0.5">30-day track record</p>
      </div>

      {/* ── Start session CTA ─────────────────────────────── */}
      {!activeSession && (
        <button
          type="button"
          onClick={() => setShowDeclare(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl stitch-btn--primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
        >
          <Play size={15} />
          Start a session
        </button>
      )}

      {/* ── This week ─────────────────────────────────────── */}
      <SurfaceCard>
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-4">This week</p>
        <WeekDots sessions={sessions} />
      </SurfaceCard>

      {/* ── Stats grid ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <SurfaceCard className="flex flex-col items-center justify-center py-5 text-center gap-1.5">
          <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
            <Flame size={18} className="text-orange-500" />
          </div>
          <p className="text-2xl font-extrabold stitch-headline leading-none">
            {loading ? '—' : streak}
          </p>
          <p className="text-[11px] font-semibold stitch-text-secondary uppercase tracking-wider">Day streak</p>
        </SurfaceCard>

        <SurfaceCard className="flex flex-col items-center justify-center py-5 text-center gap-1.5">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <TrendingUp size={18} className="text-primary" />
          </div>
          <p className="text-2xl font-extrabold stitch-headline leading-none">
            {loading ? '—' : sessions.length}
          </p>
          <p className="text-[11px] font-semibold stitch-text-secondary uppercase tracking-wider">Sessions</p>
        </SurfaceCard>

        <SurfaceCard className="flex flex-col items-center justify-center py-5 text-center gap-1.5">
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold stitch-headline leading-none">
            {loading ? '—' : shipped.length}
          </p>
          <p className="text-[11px] font-semibold stitch-text-secondary uppercase tracking-wider">Finished</p>
        </SurfaceCard>

        <SurfaceCard className="flex flex-col items-center justify-center py-5 text-center gap-1.5">
          <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center">
            <CircleDashed size={18} className="text-sky-600" />
          </div>
          <p className="text-2xl font-extrabold stitch-headline leading-none">
            {loading ? '—' : `${completionRate}%`}
          </p>
          <p className="text-[11px] font-semibold stitch-text-secondary uppercase tracking-wider">Finish rate</p>
        </SurfaceCard>
      </div>

      {/* ── Tasks snapshot ────────────────────────────────── */}
      <SurfaceCard>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">Tasks</p>
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-70 transition-opacity"
          >
            View all <ArrowRight size={12} />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-2 bg-surface-container rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{
                  width: tasks.length > 0
                    ? `${Math.round((doneTasks.length / tasks.length) * 100)}%`
                    : '0%',
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ListTodo size={13} className="stitch-text-secondary" />
            <span className="text-xs font-bold stitch-text-primary">{openTasks.length} open</span>
            <span className="text-xs stitch-text-secondary">· {doneTasks.length} done</span>
          </div>
        </div>
      </SurfaceCard>

      {/* ── Session history ───────────────────────────────── */}
      <section>
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-3">Session history</p>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-surface-container-low rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : recentSessions.length === 0 ? (
          <SurfaceCard>
            <div className="text-center py-6">
              <p className="text-sm font-semibold stitch-text-primary mb-1">No sessions yet</p>
              <p className="text-xs stitch-text-secondary">
                Start your first session — your track record builds here.
              </p>
            </div>
          </SurfaceCard>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((session) => {
              const cfg = session.session_outcome
                ? OUTCOME_CONFIG[session.session_outcome]
                : null;
              const Icon = cfg?.icon ?? CircleDashed;
              return (
                <SurfaceCard key={session.id} padding="sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg?.bg ?? 'bg-surface-container'}`}>
                      <Icon size={13} className={cfg?.color ?? 'stitch-text-secondary'} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold stitch-text-primary truncate">
                        {session.session_goal ?? 'Working session'}
                      </p>
                      <p className="text-[11px] stitch-text-secondary">
                        {cfg?.label ?? 'In progress'}
                        {session.actual_duration_minutes ? ` · ${session.actual_duration_minutes}m` : ''}
                      </p>
                    </div>
                    <span className="text-[10px] stitch-text-secondary shrink-0">
                      {formatDate(session.start_time)}
                    </span>
                  </div>
                </SurfaceCard>
              );
            })}
          </div>
        )}
      </section>

      {showDeclare && <DeclareSessionModal onClose={() => setShowDeclare(false)} />}
    </div>
  );
}
