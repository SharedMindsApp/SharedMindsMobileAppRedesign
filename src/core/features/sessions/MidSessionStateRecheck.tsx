// MidSessionStateRecheck
//
// For sessions longer than an hour, surface a small inline prompt asking
// whether the user's mental state has shifted — and if so, let them
// re-pick a music category. Only shown when music is currently audible
// (enabled, not muted, actively playing). Otherwise the prompt would be
// asking about a thing the user isn't hearing.
//
// Personal — never broadcast. Each user decides independently. Skipped
// entirely for non-host group participants (they can't change anything
// beyond local mute, so the question has no actionable answer).

import { useEffect, useState } from 'react';
import { Music, X } from 'lucide-react';

interface Props {
  /** Total intended session duration in seconds. We only consider the
   *  recheck for sessions > 60 minutes. */
  totalSeconds: number;
  /** Seconds remaining on the session clock. */
  remainingSeconds: number;
  /** When false (e.g. group participant), the component never renders. */
  applicable: boolean;
  /** Called when the user clicks "Yes, re-pick" — opens the arrival wizard. */
  onRepick: () => void;
}

// When in the session timeline to fire the prompt. 60 minutes = 3600s.
// For a 90-min session this hits at the 30-min-remaining mark. For a
// 2-hour session it hits with an hour to go. Only fired once per session.
const RECHECK_AFTER_SECONDS = 60 * 60;

export function MidSessionStateRecheck({
  totalSeconds,
  remainingSeconds,
  applicable,
  onRepick,
}: Props) {
  // "Audible" mirrors the music player — gated on enabled && !muted && playing.
  const [audible, setAudible] = useState(false);
  // Dismissed flag is session-local — we want the prompt back on next session.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function onAudible(e: Event) {
      const detail = (e as CustomEvent).detail as { audible: boolean };
      setAudible(!!detail?.audible);
    }
    window.addEventListener('sm:music-audible', onAudible);
    return () => window.removeEventListener('sm:music-audible', onAudible);
  }, []);

  // Only consider showing once the session has been running long enough.
  // `elapsed` = total - remaining (clamped because remaining can briefly
  // exceed total in edge cases).
  const elapsed = Math.max(0, totalSeconds - remainingSeconds);
  const longEnoughSession = totalSeconds > RECHECK_AFTER_SECONDS;
  const reachedThreshold = elapsed >= RECHECK_AFTER_SECONDS;
  const enoughTimeLeft = remainingSeconds > 5 * 60; // don't pop up in the last 5 min

  if (!applicable) return null;
  if (!longEnoughSession) return null;
  if (!reachedThreshold) return null;
  if (!enoughTimeLeft) return null;
  if (!audible) return null;
  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[65] w-[260px] rounded-2xl bg-black/80 backdrop-blur-md text-white shadow-xl ring-1 ring-white/10 p-3">
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-full bg-emerald-500/20 grid place-items-center flex-shrink-0">
          <Music size={13} className="text-emerald-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-extrabold leading-tight">
            How's your focus now?
          </p>
          <p className="text-[11px] text-white/55 leading-snug mt-0.5">
            You've been at this for an hour. Want to retune the music?
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="w-5 h-5 rounded-full grid place-items-center text-white/45 hover:text-white hover:bg-white/10"
          aria-label="Dismiss"
        >
          <X size={11} />
        </button>
      </div>
      <div className="flex gap-1.5 mt-2.5">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex-1 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-white/5 text-white/65 hover:bg-white/10"
        >
          Same
        </button>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            onRepick();
          }}
          className="flex-1 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/85 text-white hover:bg-emerald-500"
        >
          Shifted
        </button>
      </div>
    </div>
  );
}
