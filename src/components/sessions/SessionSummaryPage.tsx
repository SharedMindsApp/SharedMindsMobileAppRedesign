import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Trophy, Clock, AlertTriangle, Bell, TrendingUp, ArrowRight, Home, CheckCircle2, CircleDashed, CloudOff, Zap, RotateCcw, Flame } from 'lucide-react';
import { getFocusSessionSummary, endFocusSession } from '../../lib/sessions/focus';
import { endCommunitySession } from '../../core/services/SessionService';
import { supabase } from '../../lib/supabase';
import type { FocusSessionSummary, SessionOutcome } from '../../lib/sessions/focusTypes';

const OUTCOME_OPTIONS: { value: SessionOutcome; label: string; icon: any; description: string }[] = [
  { value: 'finished', label: 'Yes, I finished it', icon: CheckCircle2, description: 'Task complete' },
  { value: 'partially', label: 'Partially done', icon: CircleDashed, description: 'Made good progress' },
  { value: 'something_came_up', label: 'Something came up', icon: CloudOff, description: 'Life happened' },
];

function OutcomeQuestion({ onSelect, submitting }: { onSelect: (o: SessionOutcome) => void; submitting: boolean }) {
  return (
    <div className="py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy size={32} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Session done!</h1>
          <p className="text-gray-600">Did you finish what you declared?</p>
        </div>
        <div className="space-y-3">
          {OUTCOME_OPTIONS.map(({ value, label, icon: Icon, description }) => (
            <button
              key={value}
              type="button"
              onClick={() => !submitting && onSelect(value)}
              disabled={submitting}
              className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all text-left disabled:opacity-50"
            >
              <Icon size={24} className="text-blue-600 shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">{label}</p>
                <p className="text-sm text-gray-500">{description}</p>
              </div>
            </button>
          ))}
        </div>
        {submitting && (
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Saving…</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function SessionSummaryPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FocusSessionSummary | null>(null);
  const [outcomeSubmitted, setOutcomeSubmitted] = useState(false);
  const [outcomeSubmitting, setOutcomeSubmitting] = useState(false);

  useEffect(() => {
    if (sessionId) {
      loadSummary(sessionId);
    }
  }, [sessionId]);

  async function loadSummary(id: string) {
    try {
      const sessionSummary = await getFocusSessionSummary(id);

      if (!sessionSummary || !sessionSummary.session) {
        navigate('/guardrails/dashboard');
        return;
      }

      // If session_outcome already recorded, skip the outcome question
      if (sessionSummary.session.session_outcome) {
        setOutcomeSubmitted(true);
      }

      if (sessionSummary.session.status === 'active' || sessionSummary.session.status === 'paused') {
        // For community sessions (session_goal set), don't call endFocusSession —
        // endCommunitySession will handle status when outcome is submitted.
        // For legacy guardrails sessions, end as before.
        if (!sessionSummary.session.session_goal) {
          await endFocusSession(id);
        }
        const updatedSummary = await getFocusSessionSummary(id);
        setSummary(updatedSummary);
      } else {
        setSummary(sessionSummary);
      }
    } catch (error) {
      console.error('Failed to load session summary:', error);
      navigate('/guardrails/dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function handleOutcomeSelect(outcome: SessionOutcome) {
    if (!sessionId || outcomeSubmitting) return;
    setOutcomeSubmitting(true);
    try {
      await endCommunitySession({ sessionId, outcome });
      setOutcomeSubmitted(true);
      // Reload summary to get updated data
      const updated = await getFocusSessionSummary(sessionId);
      if (updated) setSummary(updated);
    } catch (err) {
      console.error('Failed to save outcome:', err);
      setOutcomeSubmitted(true); // proceed anyway
    } finally {
      setOutcomeSubmitting(false);
    }
  }

  function handleStartNewSession() {
    navigate('/sessions');
  }

  function handleReturnToDashboard() {
    navigate('/home');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center px-6">
          <p className="stitch-text-secondary mb-4 text-sm">Session not found</p>
          <button
            onClick={handleReturnToDashboard}
            className="px-6 py-3 stitch-btn--primary text-white rounded-xl text-sm font-semibold"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ── Community session outcome gate ──────────────────────────
  if (summary.session.session_goal && !outcomeSubmitted) {
    return <OutcomeQuestion onSelect={handleOutcomeSelect} submitting={outcomeSubmitting} />;
  }

  // ── Community session finish screen ──────────────────────────
  if (summary.session.session_goal) {
    return <CommunitySummary summary={summary} onNewSession={handleStartNewSession} onHome={handleReturnToDashboard} />;
  }

  // ── Legacy guardrails session summary ────────────────────────
  const actualDuration = summary.session.actual_duration_minutes || 0;

  const scoreColor = summary.focusScore >= 80
    ? 'text-green-600'
    : summary.focusScore >= 60
    ? 'text-yellow-600'
    : 'text-red-600';

  const scoreBg = summary.focusScore >= 80
    ? 'bg-green-50 border-green-200'
    : summary.focusScore >= 60
    ? 'bg-yellow-50 border-yellow-200'
    : 'bg-red-50 border-red-200';

  return (
    <div className="py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy size={40} className="text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Session Complete!</h1>
          <p className="text-gray-600">Here's how you did</p>
        </div>

        <div className={`${scoreBg} border-2 rounded-2xl p-8 text-center`}>
          <p className="text-sm font-semibold text-gray-600 mb-2">FOCUS SCORE</p>
          <div className={`text-7xl font-bold ${scoreColor} mb-2`}>
            {summary.focusScore}
          </div>
          <p className="text-sm text-gray-600">
            {summary.focusScore >= 80 ? 'Excellent focus!' : summary.focusScore >= 60 ? 'Good effort!' : 'Keep improving!'}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <Clock size={32} className="text-blue-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-gray-900 mb-1">{actualDuration}</div>
            <div className="text-sm text-gray-600">Minutes Focused</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <AlertTriangle size={32} className="text-red-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-gray-900 mb-1">{summary.totalDrifts}</div>
            <div className="text-sm text-gray-600">Total Drifts</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <Bell size={32} className="text-orange-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-gray-900 mb-1">{summary.totalDistractions}</div>
            <div className="text-sm text-gray-600">Distractions Logged</div>
          </div>
        </div>

        {summary.timeline && summary.timeline.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp size={24} />
              Session Timeline
            </h2>
            <div className="space-y-3">
              {summary.timeline.map((event, index) => {
                const time = new Date(event.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div key={index} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 font-mono mt-1">{time}</div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 capitalize">{event.event_type.replace('_', ' ')}</div>
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="text-sm text-gray-600 mt-1">
                          {event.metadata.message || JSON.stringify(event.metadata)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 mb-3">Suggestions for Improvement</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            {summary.totalDrifts > 3 && (
              <li>• Try breaking your work into smaller, more manageable chunks</li>
            )}
            {summary.totalDistractions > 5 && (
              <li>• Consider putting your phone in another room during focus sessions</li>
            )}
            {summary.focusScore < 60 && (
              <li>• Start with shorter sessions (15-20 minutes) and gradually increase</li>
            )}
            {summary.focusScore >= 80 && (
              <li>• Great work! Consider extending your session duration for even more productivity</li>
            )}
          </ul>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleStartNewSession}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-lg"
          >
            Start New Session
            <ArrowRight size={24} />
          </button>

          <button
            onClick={handleReturnToDashboard}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
          >
            <Home size={24} />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Community finish screen ───────────────────────────────────

const OUTCOME_DISPLAY: Record<string, {
  label: string;
  emoji: string;
  bg: string;
  text: string;
  heading: string;
  sub: string;
}> = {
  finished: {
    label: 'Finished',
    emoji: '🚀',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    heading: 'You finished it!',
    sub: 'Task complete. That’s one more thing done.',
  },
  partially: {
    label: 'Partial',
    emoji: '🔶',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    heading: 'Good progress.',
    sub: 'You moved it forward. That counts.',
  },
  something_came_up: {
    label: 'Interrupted',
    emoji: '💨',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    heading: 'Life happened.',
    sub: 'You showed up. Come back tomorrow.',
  },
};

/** Fetch count of completed sessions this week (Mon 00:00 → now) for the current user. */
async function fetchWeekSessionCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  // Start of the current ISO week (Monday)
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const daysFromMon = (day === 0 ? 6 : day - 1);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysFromMon);
  weekStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('focus_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .gte('end_time', weekStart.toISOString());

  return count ?? 0;
}

function streakMessage(count: number): string {
  if (count === 1) return "First session done this week — nice start! 🌱";
  if (count === 2) return "Two sessions this week. The momentum is building! ⚡";
  if (count === 3) return "That's your 3rd session this week — you're on fire! 🔥";
  if (count === 4) return "Four sessions this week. Seriously impressive! 💪";
  if (count === 5) return "Five sessions this week — that's a full working week! 🏆";
  return `${count} sessions this week. You're on an absolute tear! 🚀`;
}

function CommunitySummary({
  summary,
  onNewSession,
  onHome,
}: {
  summary: FocusSessionSummary;
  onNewSession: () => void;
  onHome: () => void;
}) {
  const outcome = summary.session.session_outcome ?? 'finished';
  const display = OUTCOME_DISPLAY[outcome] ?? OUTCOME_DISPLAY.finished;
  const duration = summary.session.actual_duration_minutes
    ?? summary.session.intended_duration_minutes
    ?? 0;

  const [weekCount, setWeekCount] = useState<number | null>(null);

  useEffect(() => {
    fetchWeekSessionCount().then(setWeekCount).catch(() => setWeekCount(null));
  }, []);

  const isFinished = outcome === 'finished';

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 space-y-6 max-w-md mx-auto w-full">

        {/* Outcome emoji + heading */}
        <div className="text-center space-y-2">
          <div className="text-6xl mb-2">{display.emoji}</div>
          <h1 className="stitch-headline text-2xl font-extrabold tracking-tight">
            {display.heading}
          </h1>
          <p className="text-sm stitch-text-secondary leading-relaxed">{display.sub}</p>
        </div>

        {/* Outcome badge + goal card */}
        <div className={`w-full rounded-2xl p-5 space-y-3 ${display.bg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-widest ${display.text}`}>
              {display.label}
            </span>
            <div className="flex items-center gap-1.5 text-xs stitch-text-secondary">
              <Clock size={11} />
              <span>{duration}m</span>
            </div>
          </div>
          {summary.session.session_goal && (
            <p className="text-sm font-semibold stitch-text-primary leading-snug">
              "{summary.session.session_goal}"
            </p>
          )}
        </div>

        {/* ── Streak celebration (only when finished + we have data) ── */}
        {isFinished && weekCount !== null && weekCount > 0 && (
          <div className="w-full rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 ring-1 ring-violet-200/60 p-5 flex items-start gap-4">
            {/* Flame icon with count badge */}
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Flame size={24} className="text-white" fill="currentColor" />
              </div>
              {weekCount >= 3 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow">
                  {weekCount}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-violet-800 leading-snug">
                {streakMessage(weekCount)}
              </p>
              <div className="mt-2 flex gap-1">
                {Array.from({ length: Math.min(weekCount, 7) }).map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-violet-400 to-indigo-400"
                  />
                ))}
                {Array.from({ length: Math.max(0, 5 - weekCount) }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="h-1.5 flex-1 rounded-full bg-violet-100"
                  />
                ))}
              </div>
              <p className="text-[11px] text-violet-500 mt-1 font-medium">
                {weekCount} of 5 sessions this week
              </p>
            </div>
          </div>
        )}

        {/* Next actions */}
        <div className="w-full space-y-3">
          <button
            type="button"
            onClick={onNewSession}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl stitch-btn--primary text-white font-bold text-sm shadow-md shadow-primary/20 active:scale-[0.98] transition-all"
          >
            <Zap size={15} />
            Declare another session
          </button>
          <button
            type="button"
            onClick={onHome}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-surface-container stitch-text-primary font-semibold text-sm active:scale-[0.98] transition-all"
          >
            <Home size={15} />
            Back to home
          </button>
        </div>

      </div>
    </div>
  );
}
