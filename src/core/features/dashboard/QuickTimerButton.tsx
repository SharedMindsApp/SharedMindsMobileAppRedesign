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

const PRESETS: Array<{ minutes: number; label: string }> = [
  { minutes: 10, label: '10 min' },
  { minutes: 15, label: '15 min' },
  { minutes: 25, label: '25 min' },
  { minutes: 50, label: '50 min' },
  { minutes: 75, label: '75 min' },
  { minutes: 90, label: '90 min' },
];

/** Last-used custom duration, remembered so the picker reopens with
 *  the user's actual habit instead of always falling back to 25. */
const LS_LAST = 'sm.quickTimer.lastMinutes';
function readLast(): number {
  if (typeof window === 'undefined') return 25;
  const n = parseInt(window.localStorage.getItem(LS_LAST) ?? '25', 10);
  return Number.isFinite(n) && n >= 5 && n <= 180 ? n : 25;
}
function writeLast(n: number): void {
  try { window.localStorage.setItem(LS_LAST, String(n)); } catch { /* private */ }
}

/** Backend constraint: durationMinutes is typed as 25 | 50 | 90 but the
 *  underlying focus_sessions column accepts any integer. We cast through
 *  the type system here intentionally — the row stores intended_duration
 *  unmodified and the timer derives target_end_time = start + minutes. */
function asValidDuration(n: number): 25 | 50 | 90 {
  // The literal union is just a guard against typos in callers; the DB
  // happily takes any positive integer. Cast wide.
  return n as 25 | 50 | 90;
}

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
  const [defaultMinutes] = useState<number>(() => readLast());
  // Custom-minute input — controlled string so the user can type freely
  // (including a transient empty value) without us coercing it back.
  const [customInput, setCustomInput] = useState<string>('');

  async function startTimer(minutes: number) {
    if (busy) return;
    const safe = Math.min(180, Math.max(5, Math.round(minutes)));
    setBusy(true);
    setError(null);
    try {
      const session = await startCommunitySession({
        goalText: 'Quick focus',
        durationMinutes: asValidDuration(safe),
        sessionMode: 'solo',
        projectId: projectId ?? undefined,
      });
      writeLast(safe);
      setActiveSession(session as any);
      navigate(`/session/${session.id}`);
    } catch (e: any) {
      setError(e?.message ?? 'Could not start the timer.');
      setBusy(false);
    }
  }

  function handleCustomStart() {
    const n = parseInt(customInput, 10);
    if (!Number.isFinite(n) || n < 5 || n > 180) {
      setError('Pick a duration between 5 and 180 minutes.');
      return;
    }
    setMenuOpen(false);
    startTimer(n);
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => startTimer(defaultMinutes)}
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
        {/* Primary "start last-used duration" button. Defaults to 25 on
            first run, then remembers whatever the user actually picked. */}
        <button
          type="button"
          onClick={() => startTimer(defaultMinutes)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Timer size={14} />}
          Quick timer · {defaultMinutes} min
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
          className="absolute z-30 right-0 mt-2 w-56 rounded-2xl bg-surface ring-1 ring-surface-container-high shadow-lg overflow-hidden"
        >
          <p className="px-3 pt-2.5 pb-1.5 text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary">
            Start a quick timer
          </p>
          {/* Preset chips — 2 columns so 6 options fit cleanly */}
          <div className="px-2 pb-2 grid grid-cols-2 gap-1">
            {PRESETS.map(({ minutes, label }) => (
              <button
                key={minutes}
                type="button"
                onClick={() => { setMenuOpen(false); startTimer(minutes); }}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors text-center ${
                  minutes === defaultMinutes
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                    : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Custom input row */}
          <div className="border-t border-surface-container px-3 py-2.5 space-y-1.5">
            <p className="text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary">
              Custom
            </p>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={5}
                max={180}
                inputMode="numeric"
                placeholder="e.g. 35"
                value={customInput}
                onChange={(e) => { setCustomInput(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCustomStart(); }}
                className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-sm font-bold stitch-text-primary tabular-nums bg-surface-container-low ring-1 ring-surface-container focus:ring-2 focus:ring-primary/30 outline-none"
              />
              <span className="text-[11px] stitch-text-secondary font-semibold">min</span>
              <button
                type="button"
                onClick={handleCustomStart}
                disabled={!customInput.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Start
              </button>
            </div>
            <p className="text-[10px] stitch-text-secondary">5–180 minutes</p>
          </div>
          <div className="border-t border-surface-container px-3 py-2 bg-surface-container-low/30">
            <p className="text-[10px] stitch-text-secondary leading-snug">
              No goal, no video — just the clock. Still logs as a solo
              session so it counts toward your momentum.
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="absolute top-full mt-2 right-0 text-[11px] font-semibold text-rose-700 bg-rose-50 ring-1 ring-rose-100 rounded-lg px-2.5 py-1.5 z-30">
          {error}
        </p>
      )}
    </div>
  );
}
