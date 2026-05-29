// StartCheckInSheet
//
// A focused, skippable start-of-session check-in: TWO distinct questions —
// mood (how you feel) and focus (how able you are to concentrate). They're
// different and often diverge, so we capture both. Pulled out of the busy
// declare modal into its own full-screen moment for honest answers.

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';
import type { SessionKind } from '../../../lib/sessionMood';
import { moodOptionsForKind, moodPromptForKind, FOCUS_LEVELS, focusPrompt } from '../../../lib/sessionMood';

interface Props {
  kind: SessionKind;
  onSubmit: (mood: string | null, focus: string | null) => void;
  onSkip: () => void;
}

export function StartMoodSheet({ kind, onSubmit, onSkip }: Props) {
  const moodOptions = moodOptionsForKind(kind);
  const [mood, setMood] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

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
          Quick check-in
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

        <button
          type="button"
          onClick={() => onSubmit(mood, focus)}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white text-slate-900 text-base font-extrabold active:scale-[0.98] transition-transform"
        >
          <Check size={17} /> Start session
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
