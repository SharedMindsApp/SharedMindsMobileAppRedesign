// QuickTimerButton
//
// One-tap "I just want to focus right now" entry. Spins up a solo
// session with sensible defaults (25min, no goal required, no video,
// no ceremony) and drops the user straight into ActiveSessionPage.
//
// Conceptually this is a stopwatch with zero friction. Under the hood
// it's still a focus_sessions row so momentum / stats / streaks stay
// honest — the user shouldn't feel a difference between "I started a
// timer" and "I started a session." Just less paperwork up front.
//
// A small "+ details" affordance lets the user pop into the full
// DeclareSessionModal if they want to set a goal, change duration,
// pin a project, etc.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Timer, ChevronDown } from 'lucide-react';
import { startCommunitySession } from '../../services/SessionService';
import { useFocusSession } from '../../../contexts/FocusSessionContext';

const DURATIONS: Array<{ minutes: 25 | 50 | 90; label: string }> = [
  { minutes: 25, label: '25 min' },
  { minutes: 50, label: '50 min' },
  { minutes: 90, label: '90 min' },
];

interface Props {
  /** Optional project to pin the timer to. */
  projectId?: string | null;
  /** Compact = pill button, no expand menu. Default false. */
  compact?: boolean;
  /** Optional extra classes for the outer container. */
  className?: string;
}

export function QuickTimerButton({ projectId = null, compact = false, className = '' }: Props) {
  const navigate = useNavigate();
  const { setActiveSession } = useFocusSession();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startTimer(minutes: 25 | 50 | 90) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await startCommunitySession({
        goalText: 'Quick focus',
        durationMinutes: minutes,
        sessionMode: 'solo',
        projectId: projectId ?? undefined,
      });
      setActiveSession(session as any);
      navigate(`/session/${session.id}`);
    } catch (e: any) {
      setError(e?.message ?? 'Could not start the timer.');
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => startTimer(25)}
        disabled={busy}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold bg-surface-container-low stitch-text-primary hover:bg-surface-container transition-colors disabled:opacity-50 ${className}`}
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Timer size={12} />}
        Quick timer
      </button>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="inline-flex rounded-full overflow-hidden shadow-sm">
        {/* Primary "start 25min" button */}
        <button
          type="button"
          onClick={() => startTimer(25)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Timer size={14} />}
          Quick timer · 25 min
        </button>
        {/* Expand for other durations */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          disabled={busy}
          aria-label="Pick duration"
          className="inline-flex items-center justify-center w-9 bg-slate-800 hover:bg-slate-700 text-white border-l border-white/10 transition-colors disabled:opacity-60"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {menuOpen && !busy && (
        <div
          className="absolute z-30 right-0 mt-2 w-44 rounded-2xl bg-surface ring-1 ring-surface-container-high shadow-lg overflow-hidden py-1"
          onMouseLeave={() => setMenuOpen(false)}
        >
          <p className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary">
            Start a quick timer
          </p>
          {DURATIONS.map(({ minutes, label }) => (
            <button
              key={minutes}
              type="button"
              onClick={() => { setMenuOpen(false); startTimer(minutes); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold stitch-text-primary hover:bg-surface-container-low transition-colors text-left"
            >
              <Timer size={12} className="stitch-text-secondary" /> {label}
            </button>
          ))}
          <div className="border-t border-surface-container my-1" />
          <p className="px-3 py-1.5 text-[10px] stitch-text-secondary leading-snug">
            No goal, no video — just the clock. Logs as a solo session
            so it still counts toward your momentum.
          </p>
        </div>
      )}

      {error && (
        <p className="absolute top-full mt-2 right-0 text-[11px] font-semibold text-rose-700 bg-rose-50 ring-1 ring-rose-100 rounded-lg px-2.5 py-1.5">
          {error}
        </p>
      )}
    </div>
  );
}
