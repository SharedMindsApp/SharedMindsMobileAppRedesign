// sessionChimes
//
// Lightweight synthesized audio cues for solo focus sessions. No asset
// files — uses Web Audio's OscillatorNode to generate two short tones:
//
//   • "warning" — soft bell at T-10s and T-5s. A gentle "you've got
//     ~10 seconds left, start wrapping up" nudge. Mid-frequency,
//     ~300ms.
//   • "complete" — warmer two-note chord at T-0. "Session done."
//     Lower frequency, ~700ms, with a soft tail.
//
// Volume is intentionally low — these are nudges, not alarms.
//
// Persisted on/off preference in localStorage. Defaults ON because
// most users want the "did the timer actually finish?" answer without
// looking at the screen, but motion-sensitive / shared-space users
// can disable.

const LS_CHIMES = 'sm.solo.chimes';

export function readChimesEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const v = window.localStorage.getItem(LS_CHIMES);
  // Default ON — only return false if explicitly stored as 'off'.
  return v !== 'off';
}

export function writeChimesEnabled(on: boolean): void {
  try { window.localStorage.setItem(LS_CHIMES, on ? 'on' : 'off'); } catch { /* private */ }
}

let _ctx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (_ctx) return _ctx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  _ctx = new AC();
  return _ctx;
}

/** Plays a single tone with a soft attack and exponential decay.
 *  All chimes derive from this primitive so they share an envelope
 *  shape — keeps the family sonically coherent. */
function tone(freq: number, durationMs: number, peakGain: number, when: number = 0) {
  const c = ctx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => {});
  const t0 = c.currentTime + when;
  const dur = durationMs / 1000;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  // Attack 20ms, decay to near-zero over the remaining duration.
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sessionChimes = {
  /** Pre-end warning. Single soft bell. Call at T-10s and T-5s. */
  playWarning(): void {
    if (!readChimesEnabled()) return;
    tone(880, 300, 0.08); // A5
  },

  /** Session-complete chord. Two-note bell: a fifth interval that
   *  reads as resolved/done rather than anxious. Slight delay between
   *  the two notes gives a "bell + reverb tail" feel. */
  playComplete(): void {
    if (!readChimesEnabled()) return;
    tone(523.25, 700, 0.12);          // C5
    tone(783.99, 700, 0.08, 0.05);    // G5 (a fifth above), slight delay
  },
};
