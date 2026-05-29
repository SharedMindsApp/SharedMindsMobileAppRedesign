// StartCheckInSheet
//
// A focused, skippable start-of-session check-in: TWO distinct questions —
// mood (how you feel) and focus (how able you are to concentrate). They're
// different and often diverge, so we capture both. Pulled out of the busy
// declare modal into its own full-screen moment for honest answers.

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, AlertTriangle } from 'lucide-react';
import type { SessionKind } from '../../../lib/sessionMood';
import { moodOptionsForKind, moodPromptForKind, FOCUS_LEVELS, focusPrompt } from '../../../lib/sessionMood';

/** Low-end focus codes, and the dragging-mood codes across both axes. */
const LOW_FOCUS = new Set(['foc_drifting', 'foc_foggy']);
const LOW_MOOD = new Set(['low', 'brainfog', 'distracted', 'foggy', 'scattered']);

interface Props {
  kind: SessionKind;
  /** True when the linked task is a 'deep' (demanding) one. Drives the
   *  "maybe pick something easier" nudge when focus/mood is low. */
  demandingTask?: boolean;
  onSubmit: (mood: string | null, focus: string | null) => void;
  /** Optional — offered in the low-focus warning to swap to a lighter task. */
  onSwapTask?: () => void;
  /** Optional eyebrow, e.g. "Step 2 of 2" (combined match-me-now check-in). */
  stepLabel?: string;
  onSkip: () => void;
}

export function StartMoodSheet({ kind, demandingTask = false, onSubmit, onSwapTask, stepLabel, onSkip }: Props) {
  const moodOptions = moodOptionsForKind(kind);
  const [mood, setMood] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  // Mismatch nudge: a demanding task + low focus (or low mood) = likely a
  // grind. Surface it as gentle, dismissable feedback — never a block.
  const lowState = (focus !== null && LOW_FOCUS.has(focus)) || (mood !== null && LOW_MOOD.has(mood));
  const showMismatch = demandingTask && lowState;

  return createPortal(
    <div className="fixed inset-0 z-[130] overflow-y-auto bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-white">
      <button
        type="button"
        onClick={onSkip}
        className="fixed top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md grid place-items-center hover:bg-white/20"
        aria-label="Skip"
      >
        <X size={18} />
      </button>

      <div
        className="min-h-full flex flex-col justify-center max-w-md mx-auto px-6"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 2.5rem)', paddingBottom: 'max(env(safe-area-inset-bottom), 2.5rem)' }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-2 text-center">
          {stepLabel ?? 'Quick check-in'}
        </p>

        {/* Mood */}
        <section className="mb-6">
          <h3 className="text-lg sm:text-xl font-extrabold leading-tight text-center mb-3">
            {moodPromptForKind(kind, 'before')}
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {moodOptions.map((m) => (
              <Chip key={m.code} emoji={m.emoji} label={m.label} active={mood === m.code} onClick={() => setMood(mood === m.code ? null : m.code)} />
            ))}
          </div>
        </section>

        {/* Focus */}
        <section className="mb-7">
          <h3 className="text-lg sm:text-xl font-extrabold leading-tight text-center mb-1">
            {focusPrompt('before')}
          </h3>
          <p className="text-[11px] text-white/45 text-center mb-3">Different from mood — how sharp can you concentrate?</p>
          <div className="flex flex-wrap justify-center gap-2">
            {FOCUS_LEVELS.map((f) => (
              <Chip key={f.code} emoji={f.emoji} label={f.label} active={focus === f.code} onClick={() => setFocus(focus === f.code ? null : f.code)} />
            ))}
          </div>
        </section>

        {/* Task ↔ state mismatch nudge */}
        {showMismatch && (
          <div className="mb-3 rounded-2xl bg-amber-400/10 ring-1 ring-amber-300/30 p-3.5 text-left">
            <p className="text-sm font-bold text-amber-200 inline-flex items-center gap-1.5">
              <AlertTriangle size={14} /> Big task, low fuel
            </p>
            <p className="text-[12px] text-amber-100/70 leading-snug mt-1">
              You've picked a demanding task but your focus is low right now. That's a recipe for
              a grind — consider a lighter task or a shorter block. Totally fine to push on, though.
            </p>
            {onSwapTask && (
              <button
                type="button"
                onClick={onSwapTask}
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-950 bg-amber-300 px-3 py-1.5 rounded-full active:scale-[0.98] transition-transform"
              >
                Pick a lighter task
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => onSubmit(mood, focus)}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white text-slate-900 text-base font-extrabold active:scale-[0.98] transition-transform"
        >
          <Check size={17} /> {showMismatch ? 'Start anyway' : 'Start session'}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="mt-3 text-xs font-bold text-white/40 hover:text-white/70 transition-colors mx-auto"
        >
          Skip
        </button>
      </div>
    </div>,
    document.body,
  );
}

function Chip({ emoji, label, active, onClick }: { emoji: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-bold transition-all active:scale-95 ${
        active ? 'bg-white text-slate-900 shadow-lg' : 'bg-white/8 text-white/85 ring-1 ring-white/15 hover:bg-white/15'
      }`}
    >
      <span className="text-base leading-none">{emoji}</span>{label}
    </button>
  );
}
