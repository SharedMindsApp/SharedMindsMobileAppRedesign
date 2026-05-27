// FloatingTimerWidget
//
// Persistent mini-timer pill shown on every page while a solo focus
// session is active and the user has navigated away from the session
// surface. Lets the timer keep running while they plan their next
// session, edit a project, or browse — without forcing them to keep
// the dedicated focus view open.
//
// Behaviour:
//   • Only renders when there's an active session AND the user is
//     NOT currently on /session/:id (would be redundant).
//   • Click → navigates back to /session/:id (full focus view).
//   • Compact pill (~120px wide) — tabular mm:ss + tiny progress ring.
//   • Bottom-left so it doesn't fight with the chat bubble (bottom-right).
//
// We mount it inside Layout so it survives route changes. The
// FocusSessionContext is already provided at the app root.

import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Timer, Maximize2 } from 'lucide-react';
import { useFocusSession } from '../../../contexts/FocusSessionContext';

function pad(n: number): string { return n.toString().padStart(2, '0'); }
function formatRemaining(secs: number): string {
  if (secs < 0 || !Number.isFinite(secs)) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${pad(m)}:${pad(s)}`;
}

export function FloatingTimerWidget() {
  const { activeSession, sessionGoal, timerSecondsRemaining } = useFocusSession();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide when there's no active session OR the user is already on the
  // session surface (the dedicated timer there is much richer).
  const onSessionPage = location.pathname.startsWith('/session/');
  if (!activeSession || onSessionPage) return null;

  const total = (activeSession.intended_duration_minutes ?? 25) * 60;
  const elapsed = Math.max(0, total - timerSecondsRemaining);
  const progress = total > 0 ? Math.min(1, elapsed / total) : 0;

  // Ring math — small SVG, 32px diameter.
  const r = 13;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);

  // Colour shifts amber/rose in the last 5 / 1 minutes — same logic as
  // the big timer so the peripheral cue stays consistent.
  const stroke = useMemo(() => {
    if (timerSecondsRemaining <= 60) return '#fb7185';
    if (timerSecondsRemaining <= 300) return '#fbbf24';
    return '#a78bfa';
  }, [timerSecondsRemaining]);

  const label = sessionGoal || 'Focus session';

  return (
    <button
      type="button"
      onClick={() => navigate(`/session/${activeSession.id}`)}
      title="Return to session"
      className="fixed bottom-4 left-4 z-[60] inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md text-white shadow-xl ring-1 ring-white/10 hover:bg-slate-800 hover:-translate-y-0.5 transition-all group"
      aria-label={`Return to focus session: ${label}, ${formatRemaining(timerSecondsRemaining)} remaining`}
    >
      {/* Tiny progress ring */}
      <span className="relative w-7 h-7 shrink-0">
        <svg width="28" height="28" viewBox="0 0 28 28" className="-rotate-90 absolute inset-0">
          <circle cx="14" cy="14" r={r} stroke="rgba(255,255,255,0.12)" strokeWidth="2" fill="none" />
          <circle
            cx="14" cy="14" r={r}
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 600ms ease' }}
          />
        </svg>
        <Timer size={11} className="absolute inset-0 m-auto text-white/80" />
      </span>
      <span className="text-xs font-extrabold tabular-nums leading-none">
        {formatRemaining(timerSecondsRemaining)}
      </span>
      <Maximize2 size={10} className="text-white/50 group-hover:text-white/80 transition-colors" />
    </button>
  );
}
