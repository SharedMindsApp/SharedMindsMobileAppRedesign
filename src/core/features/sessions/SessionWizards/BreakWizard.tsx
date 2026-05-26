// BreakWizard
//
// Group break — host triggers a 5-min "step away from the screen" overlay
// that everyone sees. Calmer counterpart to the focus state: just a clock,
// some encouragement, and the option to come back early. No animation, no
// pressure — the point is to disengage.
//
// We deliberately don't pause the session timer underneath. Breaks eat
// into session time by design — if hosts want extra time, they use the
// "Extend +15/+30" button separately. Keeps the mental model clean:
// breaks ≠ time bonuses.
//
// Broadcast: yes. Everyone in the session sees the same overlay. Host's
// close ends for everyone; a participant's close only closes their own.

import { useEffect, useState } from 'react';
import { Coffee, X } from 'lucide-react';
import type { WizardComponentProps } from './types';

interface Props extends WizardComponentProps {
  /** Total break duration in seconds. */
  durationSeconds: number;
}

/** Lightweight encouragement copy — shuffled per break so it doesn't
 *  feel rote when the same group does this every day. */
const BREAK_PROMPTS = [
  'Stand up · stretch your back',
  'Look at something 20ft away · let your eyes rest',
  'Sip some water · refill if needed',
  'Take three slow breaths',
  'Walk to a window · notice the light',
  'Shake out your hands · roll your shoulders',
];

export function BreakWizard({
  isHost,
  onLocalDismiss,
  onBroadcastEnd,
  durationSeconds,
}: Props) {
  const [elapsed, setElapsed] = useState(0);
  // Pick one encouragement at mount so it stays stable for this break.
  const [prompt] = useState(
    () => BREAK_PROMPTS[Math.floor(Math.random() * BREAK_PROMPTS.length)],
  );

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const e = (Date.now() - start) / 1000;
      setElapsed(e);
      if (e >= durationSeconds) {
        clearInterval(id);
        if (isHost) onBroadcastEnd();
        onLocalDismiss();
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationSeconds, isHost]);

  const remaining = Math.max(0, Math.ceil(durationSeconds - elapsed));
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = Math.min(1, elapsed / durationSeconds);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-gradient-to-br from-amber-950 via-orange-950 to-stone-950 text-white p-6">
      <button
        type="button"
        onClick={() => {
          if (isHost) onBroadcastEnd();
          onLocalDismiss();
        }}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md grid place-items-center hover:bg-white/20"
        aria-label={isHost ? 'End break for everyone' : 'Skip break for me'}
      >
        <X size={18} />
      </button>

      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-300/60 mb-3">
        {isHost ? 'You called a break' : 'Group break'}
      </p>

      <div className="relative w-[220px] h-[220px] flex items-center justify-center mb-6">
        {/* Subtle progress ring */}
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 220 220">
          <circle cx="110" cy="110" r="100" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="110"
            cy="110"
            r="100"
            fill="none"
            stroke="rgba(251,191,36,0.7)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 100}
            strokeDashoffset={2 * Math.PI * 100 * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 250ms linear' }}
          />
        </svg>
        <div className="flex flex-col items-center gap-1">
          <Coffee size={26} className="text-amber-300/80 mb-1" />
          <p className="text-4xl font-extrabold tabular-nums tracking-tight">
            {mins}:{String(secs).padStart(2, '0')}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            remaining
          </p>
        </div>
      </div>

      <p className="text-sm font-semibold text-white/85 text-center max-w-xs">
        {prompt}
      </p>
      <p className="text-[11px] text-white/40 text-center mt-2 max-w-xs leading-snug">
        Step away. Your session timer keeps running — you'll come back when it ends.
      </p>
    </div>
  );
}

// Pre-configured launcher variants
export function Break3Min(props: WizardComponentProps) {
  return <BreakWizard {...props} durationSeconds={3 * 60} />;
}
export function Break5Min(props: WizardComponentProps) {
  return <BreakWizard {...props} durationSeconds={5 * 60} />;
}
