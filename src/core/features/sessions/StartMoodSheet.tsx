// StartMoodSheet
//
// A focused, single-question start-of-session check-in: "How's your energy
// going in?" (or clarity, for plan/reflect sessions). Pulled out of the busy
// declare modal into its own full-screen moment so it gets an honest answer
// rather than a rushed tap on the way to the start button. Skippable.

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { SessionKind } from '../../../lib/sessionMood';
import { moodOptionsForKind, moodPromptForKind } from '../../../lib/sessionMood';

interface Props {
  kind: SessionKind;
  onPick: (code: string) => void;
  onSkip: () => void;
}

export function StartMoodSheet({ kind, onPick, onSkip }: Props) {
  const options = moodOptionsForKind(kind);
  const prompt = moodPromptForKind(kind, 'before');

  return createPortal(
    <div className="fixed inset-0 z-[130] flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-white overflow-y-auto">
      <button
        type="button"
        onClick={onSkip}
        className="fixed top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md grid place-items-center hover:bg-white/20"
        aria-label="Skip"
      >
        <X size={18} />
      </button>

      <div
        className="w-full max-w-md mx-auto px-6 text-center"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 2rem)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 2rem)',
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-3">
          Quick check-in
        </p>
        <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
          {prompt}
        </h2>
        <p className="text-sm text-white/55 mt-2 leading-snug">
          One tap — it helps you (and us) see how sessions shift how you feel.
        </p>

        <div className="mt-7 grid grid-cols-2 gap-2.5">
          {options.map((m) => (
            <button
              key={m.code}
              type="button"
              onClick={() => onPick(m.code)}
              className="flex flex-col items-center gap-1.5 py-5 rounded-2xl bg-white/5 hover:bg-white/12 ring-1 ring-white/10 hover:ring-white/25 transition-all active:scale-[0.98]"
            >
              <span className="text-3xl leading-none">{m.emoji}</span>
              <span className="text-sm font-extrabold">{m.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onSkip}
          className="mt-6 text-xs font-bold text-white/40 hover:text-white/70 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>,
    document.body,
  );
}
