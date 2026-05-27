// musicAudioBus
//
// Tiny module-scoped singleton that connects the session music player's
// HTMLAudioElement to a Web Audio AnalyserNode, so any other component
// (currently the SoloFocusView visualizer) can read live frequency data.
//
// Why module-scope rather than React context?
//   • Only one music player is ever active at a time.
//   • The AnalyserNode + MediaElementAudioSourceNode are tied to ONE
//     audio element for their lifetime — re-creating on re-render is
//     forbidden by the spec (and noisy in dev with HMR).
//   • This file owns the lifecycle so the music player just calls
//     attach() and the visualizer just calls subscribe(); no provider
//     trees, no prop drilling.
//
// CORS note: the audio element MUST have `crossOrigin="anonymous"`
// set BEFORE the `src` is assigned, otherwise createMediaElementSource
// produces silent audio (CORS-tainted media). Supabase Storage's public
// bucket already returns the right `Access-Control-Allow-Origin: *`
// header, so anonymous is sufficient.

let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
let attachedElement: HTMLAudioElement | null = null;

type PlayingListener = (playing: boolean) => void;
const listeners = new Set<PlayingListener>();
let currentPlaying = false;

function ensureContext(): void {
  if (ctx) return;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  analyser = ctx.createAnalyser();
  // 256 bins gives 128 useful frequency buckets — plenty for a smooth
  // bar visualizer without overworking requestAnimationFrame.
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.78;
  analyser.connect(ctx.destination);
}

export const musicAudioBus = {
  /** Wire an audio element into the analyser graph. Idempotent per
   *  element — calling repeatedly with the same element is a no-op.
   *  Calling with a different element rejects (you'd have to refresh
   *  the page; the source node binding is permanent). */
  attach(audio: HTMLAudioElement): void {
    if (attachedElement === audio) return;
    if (attachedElement && attachedElement !== audio) {
      // Different element — the Web Audio spec forbids re-binding.
      // Silently bail; visualizer just won't react until next reload.
      return;
    }
    ensureContext();
    if (!ctx || !analyser) return;
    try {
      sourceNode = ctx.createMediaElementSource(audio);
      sourceNode.connect(analyser);
      attachedElement = audio;
    } catch (e) {
      // Most likely: this element was already wrapped by another
      // MediaElementSourceNode in a previous mount (HMR). Nothing
      // we can do — visualizer stays inert.
      console.warn('[musicAudioBus] attach failed:', e);
    }
  },

  /** Music player calls this on every play/pause. Resumes the
   *  AudioContext on the first play (browsers suspend it until a
   *  user gesture). */
  setPlaying(playing: boolean): void {
    currentPlaying = playing;
    if (playing && ctx && ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
    listeners.forEach((l) => l(playing));
  },

  /** Subscribe to play/pause changes. Returns an unsubscribe fn.
   *  Immediately fires with the current state. */
  subscribe(fn: PlayingListener): () => void {
    listeners.add(fn);
    fn(currentPlaying);
    return () => { listeners.delete(fn); };
  },

  /** Visualizer pulls frequency data each animation frame via this. */
  getAnalyser(): AnalyserNode | null {
    return analyser;
  },
};
