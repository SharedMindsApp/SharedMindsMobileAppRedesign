// SessionMusicPlayer
//
// Floating audio mini-bar shown during active focus sessions. Auto-picks
// a track from the user's mood category (derived from the task's energy)
// when the session starts. Volume + enabled state persist to localStorage
// so the user only configures preferences once.
//
// Why an HTMLAudioElement ref (not a React state-controlled <audio>)?
// React re-renders shouldn't tear down the audio stream — that would cause
// gaps every time the timer ticks. The ref keeps a single audio element
// alive across all state updates.

import { useEffect, useRef, useState } from 'react';
import { Music, Play, Pause, SkipForward, Volume2, VolumeX, X, Waves, Headphones } from 'lucide-react';
import { SessionMusicService, type SessionTrack, type MusicCategory, MUSIC_CATEGORIES, categoryMeta } from '../../services/SessionMusicService';
import { supabase } from '../../../lib/supabase';
import { BinauralEngine } from './BinauralEngine';
import { musicAudioBus } from './musicAudioBus';

interface Props {
  /** Mood category to pull tracks from. Defaults to 'medium' when unknown. */
  category: MusicCategory;
  /** Active session id — used as the realtime channel name for host/participant sync. */
  sessionId: string | null;
  /** True for group sessions; enables host-vs-participant split UI. */
  isGroupSession: boolean;
  /** True when the current user is the session host (focus_sessions.user_id).
   *  Hosts run the music; participants can only mute on their device. */
  isHost: boolean;
}

/** Shape of messages broadcast on the music sync channel. Kept minimal —
 *  participants fetch the full track row via getTrackById on receipt. */
type MusicSyncEvent =
  | { type: 'track'; trackId: string }
  | { type: 'play' }
  | { type: 'pause' };

const LS_VOLUME = 'sm.musicVolume';
const LS_ENABLED = 'sm.musicEnabled';
// Persistent category preference. When set, overrides the task-derived
// auto-pick for every session until the user clicks "Auto-match" to clear it.
const LS_CATEGORY_OVERRIDE = 'sm.musicCategory';
// Binaural beat prefs — off by default since many users find it weird.
const LS_BINAURAL_ENABLED = 'sm.binauralEnabled';
const LS_BINAURAL_VOLUME = 'sm.binauralVolume';
// Once the user confirms they have headphones we never ask again.
const LS_BINAURAL_HEADPHONES_OK = 'sm.binauralHeadphonesOk';

function readLocal<T>(key: string, fallback: T, parse: (raw: string) => T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : parse(raw);
  } catch {
    return fallback;
  }
}

export function SessionMusicPlayer({ category, sessionId, isGroupSession, isHost }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // In a hosted group session, non-hosts run in "participant mode": their
  // track + transport are driven by the host's broadcasts. They can only
  // mute on their own device.
  const isParticipant = isGroupSession && !isHost;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Persisted prefs (lazy init from localStorage).
  const [enabled, setEnabled] = useState<boolean>(() =>
    readLocal(LS_ENABLED, true, (v) => v === 'true'),
  );
  const [volume, setVolume] = useState<number>(() =>
    readLocal(LS_VOLUME, 0.35, (v) => Math.min(1, Math.max(0, parseFloat(v)))),
  );
  const [muted, setMuted] = useState(false);

  // Per-session state.
  const [track, setTrack] = useState<SessionTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  // Persistent override: once the user picks a state manually it sticks
  // across sessions. Cleared via the "Auto-match to task" button.
  const [overrideCategory, setOverrideCategoryState] = useState<MusicCategory | null>(() => {
    try {
      const raw = localStorage.getItem(LS_CATEGORY_OVERRIDE);
      return MUSIC_CATEGORIES.some((c) => c.id === raw) ? (raw as MusicCategory) : null;
    } catch {
      return null;
    }
  });
  function setOverrideCategory(next: MusicCategory | null) {
    setOverrideCategoryState(next);
    try {
      if (next == null) localStorage.removeItem(LS_CATEGORY_OVERRIDE);
      else localStorage.setItem(LS_CATEGORY_OVERRIDE, next);
    } catch {}
  }
  const [expanded, setExpanded] = useState(false);
  const [noTracks, setNoTracks] = useState(false);

  // ── Binaural beats state ──────────────────────────────────────────────
  // Persisted per-user. Default OFF — binaural is opt-in.
  const [binauralEnabled, setBinauralEnabled] = useState<boolean>(() =>
    readLocal(LS_BINAURAL_ENABLED, false, (v) => v === 'true'),
  );
  const [binauralVolume, setBinauralVolume] = useState<number>(() =>
    readLocal(LS_BINAURAL_VOLUME, 0.15, (v) => Math.min(1, Math.max(0, parseFloat(v)))),
  );
  // Headphones-confirmation gate — shown the first time the user enables
  // binaural in the current browser. Saved permanently once they confirm.
  const [showHeadphonesGate, setShowHeadphonesGate] = useState(false);
  // The engine itself. Kept in a ref so React re-renders don't recreate
  // the AudioContext (which would forbid restart by the browser).
  const binauralRef = useRef<BinauralEngine | null>(null);

  const effectiveCategory: MusicCategory = overrideCategory ?? category;

  // Persist prefs as they change + publish audible-state events so the
  // mid-session recheck panel knows whether to show itself.
  useEffect(() => {
    try { localStorage.setItem(LS_VOLUME, String(volume)); } catch {}
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);
  useEffect(() => {
    try { localStorage.setItem(LS_ENABLED, String(enabled)); } catch {}
  }, [enabled]);
  useEffect(() => {
    // The recheck panel listens for this to decide whether to surface.
    // "Audible" = enabled, not muted, currently playing.
    window.dispatchEvent(
      new CustomEvent('sm:music-audible', {
        detail: { audible: enabled && !muted && playing },
      }),
    );
  }, [enabled, muted, playing]);

  // ── Binaural engine lifecycle ────────────────────────────────────────
  // Single engine instance per mount. Started/stopped declaratively from
  // the `binauralEnabled` flag. Frequencies follow the effective category.
  useEffect(() => {
    if (!binauralRef.current) binauralRef.current = new BinauralEngine();
    return () => {
      binauralRef.current?.destroy();
      binauralRef.current = null;
    };
  }, []);

  // Persist binaural prefs.
  useEffect(() => {
    try { localStorage.setItem(LS_BINAURAL_ENABLED, String(binauralEnabled)); } catch {}
  }, [binauralEnabled]);
  useEffect(() => {
    try { localStorage.setItem(LS_BINAURAL_VOLUME, String(binauralVolume)); } catch {}
    binauralRef.current?.setVolume(binauralVolume);
  }, [binauralVolume]);

  // Drive start/stop based on enabled flag. When enabled flips on we feed
  // the current category's freqs; when off we fade out.
  useEffect(() => {
    const engine = binauralRef.current;
    if (!engine) return;
    if (binauralEnabled) {
      const meta = categoryMeta(effectiveCategory);
      engine.start({ baseL: meta.baseL, baseR: meta.baseR });
      engine.setVolume(binauralVolume);
    } else {
      engine.stop();
    }
    // Volume effect above handles its own retune; we deliberately don't
    // re-fire on volume changes to avoid restarting the context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [binauralEnabled, effectiveCategory]);

  function handleToggleBinaural() {
    if (binauralEnabled) {
      setBinauralEnabled(false);
      return;
    }
    // Turning ON: first-time gate to remind the user about headphones.
    const ok = readLocal(LS_BINAURAL_HEADPHONES_OK, false, (v) => v === 'true');
    if (!ok) {
      setShowHeadphonesGate(true);
      return;
    }
    setBinauralEnabled(true);
  }

  function confirmHeadphonesAndEnable() {
    try { localStorage.setItem(LS_BINAURAL_HEADPHONES_OK, 'true'); } catch {}
    setShowHeadphonesGate(false);
    setBinauralEnabled(true);
  }

  // External callers (ArrivalStateWizard, MidSessionRecheck) can set the
  // music category via window event. Saves wiring contexts through props.
  useEffect(() => {
    function onSet(e: Event) {
      const detail = (e as CustomEvent).detail as MusicCategory;
      if (MUSIC_CATEGORIES.some((c) => c.id === detail)) {
        setOverrideCategory(detail);
        // If the user picks a state but had music off, flip it on — they
        // explicitly chose a category, that's a clear intent signal.
        setEnabled(true);
      }
    }
    window.addEventListener('sm:music-set-category', onSet);
    return () => window.removeEventListener('sm:music-set-category', onSet);
    // setOverrideCategory + setEnabled are stable; safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Realtime sync (group sessions only) ──────────────────────────────
  // The host writes; participants read. Channel name keyed to session id
  // so multiple concurrent sessions don't bleed into each other.
  useEffect(() => {
    if (!isGroupSession || !sessionId) {
      channelRef.current = null;
      return;
    }
    const channel = supabase.channel(`music:${sessionId}`, {
      config: { broadcast: { self: false } },
    });
    channel.on('broadcast', { event: 'music' }, async (msg) => {
      // Only participants apply incoming events. Hosts ignore (they're the
      // source of truth and have `self: false` on their own channel anyway).
      if (!isParticipant) return;
      const event = msg.payload as MusicSyncEvent;
      if (event.type === 'track') {
        const next = await SessionMusicService.getTrackById(event.trackId);
        setTrack(next);
        setNoTracks(next == null);
      } else if (event.type === 'pause') {
        audioRef.current?.pause();
        setPlaying(false);
      } else if (event.type === 'play') {
        audioRef.current?.play().then(() => setPlaying(true)).catch(() => {});
      }
    });
    channel.subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [isGroupSession, sessionId, isParticipant]);

  /** Host-side helper: tell participants about a music event. No-op when
   *  the session isn't a hosted group or there's no channel ready. */
  function broadcast(event: MusicSyncEvent) {
    if (!isGroupSession || !isHost) return;
    const ch = channelRef.current;
    if (!ch) return;
    ch.send({ type: 'broadcast', event: 'music', payload: event });
  }

  // Pick a track when enabled and category changes.
  // Participants don't auto-pick — they wait for the host's broadcast.
  useEffect(() => {
    if (!enabled) {
      setTrack(null);
      setPlaying(false);
      return;
    }
    if (isParticipant) {
      // Participant: don't pick our own track. Stay idle until the host
      // broadcasts what to play.
      return;
    }
    let cancelled = false;
    setLoading(true);
    SessionMusicService.pickRandomTrack(effectiveCategory)
      .then((t) => {
        if (cancelled) return;
        setTrack(t);
        setNoTracks(t == null);
        if (t) broadcast({ type: 'track', trackId: t.id });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // broadcast is intentionally excluded — it's a stable closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, effectiveCategory, isParticipant]);

  // When the track changes, start playback (autoplay policy permitting).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    audio.src = track.url;
    audio.volume = muted ? 0 : volume;
    audio.loop = false; // we manually advance to the next track on ended
    if (enabled) {
      audio.play()
        .then(() => setPlaying(true))
        .catch(() => {
          // Autoplay blocked — user has to click. Surface a paused state.
          setPlaying(false);
        });
    }
    // Volume + muted intentionally not in deps: they're handled by their own effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, enabled]);

  function handlePlayPause() {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      broadcast({ type: 'pause' });
    } else {
      audio.play().then(() => {
        setPlaying(true);
        broadcast({ type: 'play' });
      }).catch(() => setPlaying(false));
    }
  }

  async function handleSkip() {
    if (!enabled || isParticipant) return; // Participants can't skip
    setLoading(true);
    const next = await SessionMusicService.pickRandomTrack(effectiveCategory);
    setTrack(next);
    setNoTracks(next == null);
    setLoading(false);
    if (next) broadcast({ type: 'track', trackId: next.id });
  }

  function handleEnded() {
    // Loop the focus mood by auto-picking another random track in the
    // same category. Participants don't auto-pick — they wait for the
    // host's next broadcast.
    if (isParticipant) return;
    void handleSkip();
  }

  function handleToggleEnabled() {
    if (enabled) {
      audioRef.current?.pause();
      setPlaying(false);
    }
    setEnabled((v) => !v);
  }

  // ── Compact (collapsed) UI ────────────────────────────────────────────
  if (!expanded) {
    return (
      <>
        <audio
          ref={(el) => { audioRef.current = el; if (el) musicAudioBus.attach(el); }}
          onEnded={() => { musicAudioBus.setPlaying(false); handleEnded(); }}
          onPlay={() => musicAudioBus.setPlaying(true)}
          onPause={() => musicAudioBus.setPlaying(false)}
          crossOrigin="anonymous"
          preload="auto"
        />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 px-3 py-2 rounded-full bg-black/60 backdrop-blur-md text-white shadow-lg hover:bg-black/75 transition-colors"
          aria-label="Open music player"
        >
          <Music size={14} className={enabled && playing ? 'text-emerald-400' : 'text-white/70'} />
          <span className="text-[11px] font-bold tracking-wide uppercase">
            {enabled && track ? track.title.length > 22 ? track.title.slice(0, 20) + '…' : track.title : 'Music'}
          </span>
        </button>
      </>
    );
  }

  // ── Expanded mini-bar ─────────────────────────────────────────────────
  return (
    <>
      <audio
          ref={(el) => { audioRef.current = el; if (el) musicAudioBus.attach(el); }}
          onEnded={() => { musicAudioBus.setPlaying(false); handleEnded(); }}
          onPlay={() => musicAudioBus.setPlaying(true)}
          onPause={() => musicAudioBus.setPlaying(false)}
          crossOrigin="anonymous"
          preload="auto"
        />
      <div className="fixed bottom-4 right-4 z-[60] w-[280px] rounded-2xl bg-black/75 backdrop-blur-md text-white shadow-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Music size={13} className={enabled && playing ? 'text-emerald-400' : 'text-white/60'} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
              {isParticipant ? "Host's music" : 'Session music'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="w-6 h-6 rounded-full grid place-items-center text-white/60 hover:text-white hover:bg-white/10"
            aria-label="Collapse"
          >
            <X size={13} />
          </button>
        </div>

        {/* ── Participant mode: track + local mute only ──────────────
            The host controls what plays, when, and at what mood. The
            participant's only knob is their device's mute / local volume. */}
        {isParticipant ? (
          <>
            <div className="px-1 mb-2">
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-0.5">
                {playing ? 'Now playing' : 'Paused by host'}
              </p>
              <p className="text-xs font-bold text-white truncate" title={track?.title}>
                {track?.title ?? 'Waiting for host…'}
              </p>
              {track?.artist && (
                <p className="text-[10px] text-white/50 truncate">{track.artist}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMuted((v) => !v)}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-bold ${
                muted ? 'bg-rose-500/15 text-rose-300' : 'bg-white/10 text-white hover:bg-white/15'
              }`}
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              {muted ? 'Muted on your device' : 'Mute on my device'}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
              className="w-full h-1 mt-3 accent-emerald-400"
              aria-label="Local volume"
              title="Local volume (host controls the track; this only affects you)"
            />
            <p className="text-[9px] text-white/40 text-center mt-1.5 leading-tight">
              The host controls the music · this only affects your device
            </p>
          </>
        ) : (
        <>
        {/* Enabled toggle */}
        <button
          type="button"
          onClick={handleToggleEnabled}
          className={`w-full mb-2 flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-bold ${
            enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-white/60'
          }`}
        >
          <span>{enabled ? 'Music ON' : 'Music OFF'}</span>
          <span className={`w-7 h-4 rounded-full p-0.5 ${enabled ? 'bg-emerald-500' : 'bg-white/15'} relative`}>
            <span
              className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
              style={{ left: enabled ? 14 : 2 }}
            />
          </span>
        </button>

        {enabled && (
          <>
            {/* Track title */}
            <div className="px-1 mb-2">
              <p className="text-xs font-bold text-white truncate" title={track?.title}>
                {loading ? 'Loading…' : noTracks ? 'No tracks in this mood yet' : track?.title ?? '—'}
              </p>
              {track?.artist && (
                <p className="text-[10px] text-white/50 truncate">{track.artist}</p>
              )}
            </div>

            {/* Transport */}
            <div className="flex items-center gap-1 mb-2">
              <button
                type="button"
                onClick={handlePlayPause}
                disabled={!track || loading}
                className="flex-1 h-8 rounded-lg bg-white text-black grid place-items-center disabled:opacity-40 hover:bg-white/90"
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                className="w-8 h-8 rounded-lg bg-white/10 grid place-items-center hover:bg-white/15 disabled:opacity-40"
                aria-label="Skip track"
              >
                <SkipForward size={13} />
              </button>
              <button
                type="button"
                onClick={() => setMuted((v) => !v)}
                className="w-8 h-8 rounded-lg bg-white/10 grid place-items-center hover:bg-white/15"
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
            </div>

            {/* Volume */}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
              className="w-full h-1 accent-emerald-400"
              aria-label="Volume"
            />

            {/* ── State override ──────────────────────────────────
                Picks music based on what state the user is ARRIVING in —
                stressed, foggy, ready, hyperfocused, etc. The category
                determines both the music character and the binaural-beat
                target frequency. Persists across sessions until cleared. */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/45">
                  How are you arriving?
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/45">
                  {overrideCategory == null ? <>Default · {category}</> : <>Your pick</>}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {MUSIC_CATEGORIES.map((c) => {
                  const isActive = effectiveCategory === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setOverrideCategory(c.id)}
                      className={`py-1.5 px-1 rounded-md text-[10px] font-bold flex flex-col items-center gap-0.5 ${
                        isActive
                          ? 'bg-white text-black'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                      title={`${c.character} · For ${c.forState.toLowerCase()} · ${c.targetHz} Hz target`}
                      aria-label={`Switch to ${c.label} — for ${c.forState}`}
                    >
                      <span className="text-sm leading-none">{c.glyph}</span>
                      <span className="uppercase tracking-wider">{c.label}</span>
                    </button>
                  );
                })}
              </div>
              {overrideCategory != null && (
                <button
                  type="button"
                  onClick={() => setOverrideCategory(null)}
                  className="mt-1.5 w-full py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-white/50 hover:text-white hover:bg-white/5"
                >
                  ↺ Use default ({category})
                </button>
              )}
              {/* Tiny hint about the currently-effective category */}
              <p className="mt-1.5 text-[9px] text-white/35 text-center leading-tight px-1">
                {categoryMeta(effectiveCategory).character}
              </p>
            </div>

            {/* ── Binaural beats ─────────────────────────────────
                Opt-in subliminal tone layer. Mixed BELOW the music
                (own volume slider). Requires stereo headphones —
                first-time toggle shows a confirmation gate. */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={handleToggleBinaural}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-bold ${
                  binauralEnabled
                    ? 'bg-cyan-500/15 text-cyan-300'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
                aria-pressed={binauralEnabled}
              >
                <span className="flex items-center gap-1.5">
                  <Waves size={12} />
                  Binaural {categoryMeta(effectiveCategory).targetHz} Hz
                </span>
                <span className={`w-7 h-4 rounded-full p-0.5 ${binauralEnabled ? 'bg-cyan-500' : 'bg-white/15'} relative`}>
                  <span
                    className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                    style={{ left: binauralEnabled ? 14 : 2 }}
                  />
                </span>
              </button>
              {binauralEnabled && (
                <>
                  <div className="flex items-center gap-2 mt-2 px-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 w-12">
                      Tone
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={0.4}
                      step={0.02}
                      value={binauralVolume}
                      onChange={(e) => setBinauralVolume(parseFloat(e.target.value))}
                      className="flex-1 h-1 accent-cyan-400"
                      aria-label="Binaural tone volume"
                    />
                  </div>
                  <p className="mt-1.5 text-[9px] text-white/35 text-center leading-tight px-1">
                    {categoryMeta(effectiveCategory).baseL}L / {categoryMeta(effectiveCategory).baseR}R Hz · stereo headphones required
                  </p>
                </>
              )}
            </div>
          </>
        )}
        </>
        )}
      </div>

      {/* ── First-time binaural headphones gate ─────────────────────
          Shown the very first time a user toggles binaural on. We can't
          detect headphones reliably from the browser (no API exists);
          this is honesty mode — tell them what's needed, let them
          confirm. Saved permanently once confirmed. */}
      {showHeadphonesGate && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface text-stitch-text-primary shadow-2xl p-5">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-cyan-500/15 grid place-items-center mb-3">
                <Headphones size={22} className="text-cyan-500" />
              </div>
              <h3 className="text-base font-extrabold">Wearing headphones?</h3>
              <p className="text-xs stitch-text-secondary mt-1.5 leading-snug">
                Binaural beats only work with <strong>stereo headphones</strong> — the brain needs slightly different frequencies in each ear to perceive the beat. Laptop speakers won't work.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={confirmHeadphonesAndEnable}
                className="w-full py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-wide bg-cyan-500 text-white hover:bg-cyan-600"
              >
                Yes, headphones on — enable
              </button>
              <button
                type="button"
                onClick={() => setShowHeadphonesGate(false)}
                className="w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wide stitch-text-secondary hover:bg-surface-container-low"
              >
                Not right now
              </button>
            </div>
            <p className="mt-3 text-[10px] stitch-text-secondary/70 text-center leading-snug">
              We won't ask again on this device.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
