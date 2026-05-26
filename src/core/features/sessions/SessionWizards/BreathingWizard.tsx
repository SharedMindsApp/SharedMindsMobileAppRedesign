// BreathingWizard
//
// Guided breathing animation: a circle that grows on inhale and shrinks on
// exhale, with a phase label ("Breathe in… Hold… Breathe out…"). Synced
// to a configurable breath pattern. Auto-dismisses after a duration; host
// can also end early for everyone.
//
// Why client-side timing (not synced beat-by-beat)?
// Breathing is a private rhythm. Forcing exact phase alignment across
// participants would feel mechanical and add network jitter. Each client
// runs the same pattern independently — close enough, much smoother.

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { WizardComponentProps } from './types';

interface BreathPhase {
  label: string;
  /** Seconds in this phase. */
  duration: number;
  /** Circle scale at the END of this phase. Animates from previous phase's end. */
  scaleEnd: number;
}

/** Box breathing: 4-4-4-4. Calming, used by Navy SEALs and panic-attack
 *  recovery alike. Default unless overridden via wizard variant. */
const BOX_PATTERN: BreathPhase[] = [
  { label: 'Breathe in',  duration: 4, scaleEnd: 1.0 },
  { label: 'Hold',        duration: 4, scaleEnd: 1.0 },
  { label: 'Breathe out', duration: 4, scaleEnd: 0.55 },
  { label: 'Hold',        duration: 4, scaleEnd: 0.55 },
];

/** Resonance breathing: 4 in, 6 out. Slower exhale = parasympathetic
 *  activation. Good default for "calm before focus". */
const RESONANCE_PATTERN: BreathPhase[] = [
  { label: 'Breathe in',  duration: 4, scaleEnd: 1.0 },
  { label: 'Breathe out', duration: 6, scaleEnd: 0.55 },
];

interface Props extends WizardComponentProps {
  /** Total wizard runtime in seconds. */
  durationSeconds: number;
  /** Which breath pattern to use. Defaults to resonance. */
  pattern?: 'resonance' | 'box';
}

export function BreathingWizard({
  isHost,
  onLocalDismiss,
  onBroadcastEnd,
  durationSeconds,
  pattern = 'resonance',
}: Props) {
  const phases = pattern === 'box' ? BOX_PATTERN : RESONANCE_PATTERN;
  const cycleSeconds = phases.reduce((s, p) => s + p.duration, 0);

  // Time elapsed since wizard mounted, in seconds.
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const e = (Date.now() - start) / 1000;
      setElapsed(e);
      if (e >= durationSeconds) {
        clearInterval(id);
        // Auto-end: if I'm the host, broadcast end so participants close
        // too. Either way, dismiss locally.
        if (isHost) onBroadcastEnd();
        onLocalDismiss();
      }
    }, 100);
    return () => clearInterval(id);
    // We intentionally omit callbacks — they're stable per-mount, and
    // re-running the interval would reset elapsed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationSeconds, isHost]);

  // Compute current phase + scale by walking through the cycle.
  const tInCycle = elapsed % cycleSeconds;
  let consumed = 0;
  let currentPhase = phases[0];
  let phaseStartScale = phases[phases.length - 1].scaleEnd; // start at last phase's end
  let phaseProgress = 0;
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    if (tInCycle < consumed + p.duration) {
      currentPhase = p;
      phaseStartScale = i === 0 ? phases[phases.length - 1].scaleEnd : phases[i - 1].scaleEnd;
      phaseProgress = (tInCycle - consumed) / p.duration;
      break;
    }
    consumed += p.duration;
  }
  // Lerp scale between phase start and end.
  const scale = phaseStartScale + (currentPhase.scaleEnd - phaseStartScale) * phaseProgress;
  const remaining = Math.max(0, Math.ceil(durationSeconds - elapsed));

  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-white">
      {/* Dismiss button (top-right). Host's click ends for everyone;
          participant's click only closes their own overlay. */}
      <button
        type="button"
        onClick={() => {
          if (isHost) onBroadcastEnd();
          onLocalDismiss();
        }}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md grid place-items-center hover:bg-white/20 transition-colors"
        aria-label={isHost ? 'End for everyone' : 'Skip for me'}
      >
        <X size={18} />
      </button>

      {/* Header label */}
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-4">
        {isHost ? 'You are guiding' : 'Guided breathing'}
      </p>

      {/* Breathing circle */}
      <div className="relative w-[280px] h-[280px] flex items-center justify-center">
        {/* Outer faint ring (reference) */}
        <div className="absolute inset-0 rounded-full border border-white/10" />
        {/* Animated breath circle */}
        <div
          className="rounded-full bg-gradient-to-br from-cyan-400/40 to-violet-500/40 backdrop-blur-sm transition-transform"
          style={{
            width: 200,
            height: 200,
            transform: `scale(${scale})`,
            transition: 'transform 120ms linear',
            boxShadow: '0 0 80px rgba(139, 92, 246, 0.35)',
          }}
        />
        {/* Phase label sits centered on top */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-2xl font-extrabold tracking-wide">
            {currentPhase.label}
          </p>
        </div>
      </div>

      {/* Remaining time */}
      <p className="mt-8 text-sm font-bold tabular-nums text-white/60">
        {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')} remaining
      </p>
      <p className="mt-2 text-[11px] text-white/40 text-center max-w-xs px-4">
        {pattern === 'box'
          ? 'Box breathing — 4 in, 4 hold, 4 out, 4 hold'
          : 'Resonance breathing — 4 in, 6 out'}
      </p>
    </div>
  );
}

// ── Three pre-configured launchers ────────────────────────────────────────
// We export wrapper components so the registry can keep clean ids while
// each one binds duration + pattern. Avoids dynamic params in the registry.

export function Breathing1Min(props: WizardComponentProps) {
  return <BreathingWizard {...props} durationSeconds={60} pattern="resonance" />;
}
export function Breathing3Min(props: WizardComponentProps) {
  return <BreathingWizard {...props} durationSeconds={180} pattern="resonance" />;
}
export function BreathingBox5Min(props: WizardComponentProps) {
  return <BreathingWizard {...props} durationSeconds={300} pattern="box" />;
}
