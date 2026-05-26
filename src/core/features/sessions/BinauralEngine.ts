// BinauralEngine
//
// Wraps Web Audio to produce a stereo binaural beat: two sine waves at
// slightly different frequencies panned hard left and right. The brain
// perceives the difference as a beat at |right - left| Hz, theorised to
// nudge brainwave entrainment toward that frequency.
//
// Critically, binaural beats ONLY work with stereo headphones. Laptop
// speakers and mono audio destroy the effect. The UI is responsible for
// gating on that — this module just produces the tones.
//
// Design notes:
// - One AudioContext per engine instance. We create it lazily on first
//   start() because browsers block autoplay until a user gesture.
// - Two OscillatorNodes (sine waves), each fed through a StereoPannerNode
//   panned -1 and +1. A shared GainNode handles master volume.
// - Frequency changes use linearRampToValueAtTime over 1s so retuning
//   mid-session doesn't feel like a jolt.
// - stop() suspends the context rather than closing it — closing
//   forbids future restarts, suspend lets us resume cheaply.

export interface BinauralFrequencies {
  baseL: number;
  baseR: number;
}

export class BinauralEngine {
  private ctx: AudioContext | null = null;
  private oscL: OscillatorNode | null = null;
  private oscR: OscillatorNode | null = null;
  private panL: StereoPannerNode | null = null;
  private panR: StereoPannerNode | null = null;
  private gain: GainNode | null = null;
  private running = false;
  // Current target volume (0-1). Stored separately from gain.gain.value
  // so we can re-apply it across suspends/resumes cleanly.
  private volume = 0.15;

  /** Start the engine with given frequencies. Must be called from a user
   *  gesture handler the first time (autoplay policy). Subsequent calls
   *  can run from anywhere because the context is already unlocked. */
  start({ baseL, baseR }: BinauralFrequencies): void {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        // Web Audio not available — silently no-op. The UI should
        // already have hidden the binaural controls in that case.
        return;
      }
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0; // fade in from silence
      this.gain.connect(this.ctx.destination);

      this.oscL = this.ctx.createOscillator();
      this.oscL.type = 'sine';
      this.oscL.frequency.value = baseL;
      this.panL = this.ctx.createStereoPanner();
      this.panL.pan.value = -1; // hard left
      this.oscL.connect(this.panL).connect(this.gain);
      this.oscL.start();

      this.oscR = this.ctx.createOscillator();
      this.oscR.type = 'sine';
      this.oscR.frequency.value = baseR;
      this.panR = this.ctx.createStereoPanner();
      this.panR.pan.value = 1; // hard right
      this.oscR.connect(this.panR).connect(this.gain);
      this.oscR.start();
    } else if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    // Apply requested frequencies (smooth ramp if oscillators existed).
    this.setFrequencies({ baseL, baseR });
    // Fade in to target volume over 400ms so the start doesn't pop.
    if (this.gain && this.ctx) {
      const now = this.ctx.currentTime;
      this.gain.gain.cancelScheduledValues(now);
      this.gain.gain.setValueAtTime(this.gain.gain.value, now);
      this.gain.gain.linearRampToValueAtTime(this.volume, now + 0.4);
    }
    this.running = true;
  }

  /** Smoothly retune to new frequencies. Useful when the user switches
   *  mood category mid-session — we don't want a jarring frequency jump. */
  setFrequencies({ baseL, baseR }: BinauralFrequencies): void {
    if (!this.ctx || !this.oscL || !this.oscR) return;
    const now = this.ctx.currentTime;
    this.oscL.frequency.cancelScheduledValues(now);
    this.oscR.frequency.cancelScheduledValues(now);
    this.oscL.frequency.setValueAtTime(this.oscL.frequency.value, now);
    this.oscR.frequency.setValueAtTime(this.oscR.frequency.value, now);
    this.oscL.frequency.linearRampToValueAtTime(baseL, now + 1.0);
    this.oscR.frequency.linearRampToValueAtTime(baseR, now + 1.0);
  }

  /** Update master volume (0-1). Applied immediately with a small ramp
   *  to avoid clicks. */
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (!this.ctx || !this.gain) return;
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(this.volume, now + 0.15);
  }

  /** Fade out to silence and suspend the context. Cheap to restart. */
  stop(): void {
    if (!this.ctx || !this.gain) {
      this.running = false;
      return;
    }
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(0, now + 0.3);
    // Suspend after fade so we don't burn CPU on idle oscillators.
    window.setTimeout(() => {
      if (this.ctx && this.ctx.state === 'running') {
        void this.ctx.suspend();
      }
    }, 350);
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  /** Permanent teardown — call on session end. After this the engine
   *  can't be restarted (would need a new instance). */
  destroy(): void {
    try { this.oscL?.stop(); } catch {}
    try { this.oscR?.stop(); } catch {}
    this.oscL = this.oscR = null;
    this.panL = this.panR = null;
    this.gain = null;
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.running = false;
  }
}
