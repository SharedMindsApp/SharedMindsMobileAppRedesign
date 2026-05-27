// sessionSounds
//
// Tiny synthesised sound effects for the matched-session transitions:
// someone wants to join (knock), someone joined (chime up), someone left
// (chime down), intro phase ending (ding-ding rise). Synthesised with
// Web Audio rather than MP3 assets so:
//   • No bundled binary weight.
//   • No CDN round-trip on first play (chimes fire instantly).
//   • Easy to tune timbre/length here without going back to a sound pack.
//
// We can always swap to recorded assets later for a richer feel — the
// API surface (playJoinChime, playLeaveChime, etc.) stays the same.
//
// Respect: a global toggle in localStorage lets users mute all session
// SFX without affecting music. Default ON because the join/leave signal
// is functionally important (otherwise people drop in unannounced).

const LS_SFX_ENABLED = 'sm.sessionSfxEnabled';

let ctx: AudioContext | null = null;

function ensureContext(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext
    || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

function isEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(LS_SFX_ENABLED);
    // Default ON: only the explicit string 'false' silences. New users get sound.
    return raw !== 'false';
  } catch {
    return true;
  }
}

export function setSessionSfxEnabled(enabled: boolean): void {
  try { window.localStorage.setItem(LS_SFX_ENABLED, String(enabled)); } catch { /* private */ }
}

export function getSessionSfxEnabled(): boolean {
  return isEnabled();
}

/** Play a sequence of notes. Each note: frequency Hz, start offset in s,
 *  duration in s, optional peak gain (default 0.18 — quiet by design,
 *  these shouldn't startle anyone deep in flow). */
function playSequence(notes: { freq: number; at: number; dur: number; gain?: number; type?: OscillatorType }[]): void {
  if (!isEnabled()) return;
  const c = ensureContext();
  if (!c) return;
  // Browsers suspend the context until a user gesture. We try to resume;
  // if it stays suspended (first-load before any click) the sequence is
  // silently dropped, which is fine — the very first audio cue isn't
  // critical (the visual UI also signals the event).
  if (c.state === 'suspended') {
    void c.resume().catch(() => {});
  }
  const now = c.currentTime;
  for (const note of notes) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = note.type ?? 'sine';
    osc.frequency.value = note.freq;
    const peak = note.gain ?? 0.18;
    // Short fade-in (5ms) and exponential fade-out across the note's
    // duration to avoid clicks at the boundaries.
    gain.gain.setValueAtTime(0.0001, now + note.at);
    gain.gain.exponentialRampToValueAtTime(peak, now + note.at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.at + note.dur);
    osc.connect(gain).connect(c.destination);
    osc.start(now + note.at);
    osc.stop(now + note.at + note.dur + 0.02);
  }
}

// ── Public API ──────────────────────────────────────────────────────

/** Someone is requesting to join — host hears this when the knock toast
 *  appears. Soft double-tap pattern, mid register. ~400ms total. */
export function playKnock(): void {
  playSequence([
    { freq: 520, at: 0.00, dur: 0.10, type: 'triangle' },
    { freq: 520, at: 0.16, dur: 0.10, type: 'triangle' },
  ]);
}

/** A joiner successfully entered the session. Warm major-third rise.
 *  Both host and joiner hear this. ~550ms. */
export function playJoinChime(): void {
  playSequence([
    { freq: 392, at: 0.00, dur: 0.35, gain: 0.16 }, // G4
    { freq: 494, at: 0.10, dur: 0.45, gain: 0.16 }, // B4
  ]);
}

/** Someone left the session. Gentle descending tone — signals departure
 *  without alarming the remaining person. ~500ms. */
export function playLeaveChime(): void {
  playSequence([
    { freq: 494, at: 0.00, dur: 0.30, gain: 0.14 }, // B4
    { freq: 392, at: 0.10, dur: 0.40, gain: 0.14 }, // G4
  ]);
}

/** Intro phase → work phase. Two-tone rising "ding-ding" — signals a
 *  shift in mode, sharper than the join chime. ~700ms. */
export function playPhaseTransition(): void {
  playSequence([
    { freq: 587, at: 0.00, dur: 0.18, gain: 0.18 }, // D5
    { freq: 784, at: 0.22, dur: 0.40, gain: 0.18 }, // G5
  ]);
}

/** Preview helper for the settings panel — play each sound in turn so
 *  the user can audition them. */
export function previewAllSounds(): void {
  playKnock();
  setTimeout(playJoinChime, 600);
  setTimeout(playLeaveChime, 1400);
  setTimeout(playPhaseTransition, 2100);
}
