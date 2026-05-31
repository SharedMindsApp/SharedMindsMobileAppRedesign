/**
 * MeetingControls — bottom bar with mic, camera, screenshare, and leave.
 *
 * Replaces Daily Prebuilt's built-in toolbar so we can match the SharedMinds
 * visual style and keep the UI distraction-free.
 *
 * Camera-off is gated on `avatarVerified`: users without a verified profile
 * photo can't turn off their camera. This keeps accountability honest — you
 * can't be invisible without first proving who you are.
 */

import { useEffect, useState } from 'react';
import { useDaily, useLocalParticipant, useScreenShare } from '@daily-co/daily-react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, PhoneOff, ShieldAlert, X, Sparkles, Waves } from 'lucide-react';

interface MeetingControlsProps {
  onLeave: () => void;
  /** True only if the local user's avatar passed face verification. */
  avatarVerified: boolean;
}

// localStorage keys so the user's blur / noise-suppression preferences stick
// across sessions (these are per-device, local-only processor settings).
const BLUR_KEY = 'sm_fx_blur';
const DENOISE_KEY = 'sm_fx_denoise';

export function MeetingControls({ onLeave, avatarVerified }: MeetingControlsProps) {
  const call = useDaily();
  const localParticipant = useLocalParticipant();
  const { isSharingScreen, startScreenShare, stopScreenShare } = useScreenShare();
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // ── Background blur + noise suppression (local processors) ─────────────────
  // Blur defaults OFF (people opt in); Krisp noise-cancellation defaults ON
  // (home coworking is noisy — quieter is the better default). Both degrade
  // gracefully: if the browser/plan doesn't support a processor, the toggle
  // hides itself rather than erroring.
  const [blurOn, setBlurOn] = useState<boolean>(() => localStorage.getItem(BLUR_KEY) === '1');
  const [denoiseOn, setDenoiseOn] = useState<boolean>(() => localStorage.getItem(DENOISE_KEY) !== '0');
  const [blurSupported, setBlurSupported] = useState(true);
  const [denoiseSupported, setDenoiseSupported] = useState(true);

  useEffect(() => {
    if (!call) return;
    let cancelled = false;
    (async () => {
      try {
        await call.updateInputSettings({
          video: {
            processor: blurOn
              ? { type: 'background-blur', config: { strength: 0.6 } }
              : { type: 'none' },
          },
        });
      } catch {
        if (!cancelled) setBlurSupported(false);
      }
    })();
    return () => { cancelled = true; };
  }, [call, blurOn]);

  useEffect(() => {
    if (!call) return;
    let cancelled = false;
    (async () => {
      try {
        await call.updateInputSettings({
          audio: { processor: { type: denoiseOn ? 'noise-cancellation' : 'none' } },
        });
      } catch {
        if (!cancelled) setDenoiseSupported(false);
      }
    })();
    return () => { cancelled = true; };
  }, [call, denoiseOn]);

  function toggleBlur() {
    setBlurOn((v) => { localStorage.setItem(BLUR_KEY, v ? '0' : '1'); return !v; });
  }
  function toggleDenoise() {
    setDenoiseOn((v) => { localStorage.setItem(DENOISE_KEY, v ? '0' : '1'); return !v; });
  }

  const micOn = !!localParticipant?.tracks.audio.state
    && localParticipant.tracks.audio.state !== 'off'
    && localParticipant.tracks.audio.state !== 'blocked';
  const camOn = !!localParticipant?.tracks.video.state
    && localParticipant.tracks.video.state !== 'off'
    && localParticipant.tracks.video.state !== 'blocked';

  function toggleMic() {
    if (!call) return;
    call.setLocalAudio(!micOn);
  }

  function toggleCam() {
    if (!call) return;
    // Hard block: users without a verified avatar can't turn off their camera.
    // We let them turn it back ON freely (camOn === false → about to turn on).
    if (camOn && !avatarVerified) {
      setShowAvatarModal(true);
      return;
    }
    call.setLocalVideo(!camOn);
  }

  function toggleShare() {
    if (isSharingScreen) stopScreenShare();
    else startScreenShare();
  }

  return (
    <>
      <div className="shrink-0 flex items-center justify-center gap-2 sm:gap-3 px-4 py-3 bg-black/40 backdrop-blur-md border-t border-white/5">
        <ControlButton onClick={toggleMic} active={micOn} label={micOn ? 'Mute' : 'Unmute'}>
          {micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </ControlButton>

        <ControlButton
          onClick={toggleCam}
          active={camOn}
          label={
            camOn
              ? avatarVerified ? 'Stop video' : 'Verified profile photo required'
              : 'Start video'
          }
          locked={camOn && !avatarVerified}
        >
          {camOn ? <Video size={18} /> : <VideoOff size={18} />}
        </ControlButton>

        <ControlButton onClick={toggleShare} active={!isSharingScreen} label={isSharingScreen ? 'Stop sharing' : 'Share screen'}>
          {isSharingScreen ? <ScreenShareOff size={18} /> : <ScreenShare size={18} />}
        </ControlButton>

        {/* Background blur — opt-in, hides your room. */}
        {blurSupported && (
          <ControlButton onClick={toggleBlur} active={blurOn} variant="accent" label={blurOn ? 'Turn off background blur' : 'Blur my background'}>
            <Sparkles size={18} />
          </ControlButton>
        )}

        {/* Noise suppression (Krisp) — on by default; quiet wins for home coworking. */}
        {denoiseSupported && (
          <ControlButton onClick={toggleDenoise} active={denoiseOn} variant="accent" label={denoiseOn ? 'Turn off noise suppression' : 'Suppress background noise'}>
            <Waves size={18} />
          </ControlButton>
        )}

        <button
          type="button"
          onClick={onLeave}
          aria-label="Leave session"
          className="ml-2 flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold transition-all active:scale-95"
        >
          <PhoneOff size={16} />
          Leave
        </button>
      </div>

      {showAvatarModal && (
        <AvatarRequiredModal onClose={() => setShowAvatarModal(false)} />
      )}
    </>
  );
}

function ControlButton({
  onClick, active, label, children, locked = false, variant = 'danger',
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  children: React.ReactNode;
  locked?: boolean;
  /** 'danger' (default): inactive renders red (mic/cam off = warning).
   *  'accent': inactive is neutral, active is a violet highlight — for
   *  on/off enhancements like blur + noise suppression. */
  variant?: 'danger' | 'accent';
}) {
  const stateCls = locked
    ? 'bg-white/5 text-white/30 cursor-not-allowed hover:bg-white/5'
    : variant === 'accent'
      ? active
        ? 'bg-violet-500/80 hover:bg-violet-500 text-white'
        : 'bg-white/10 hover:bg-white/15 text-white/70'
      : active
        ? 'bg-white/10 hover:bg-white/15 text-white'
        : 'bg-red-500/80 hover:bg-red-500 text-white';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`relative flex items-center justify-center w-11 h-11 rounded-full transition-all active:scale-95 ${stateCls}`}
    >
      {children}
      {locked && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
          <ShieldAlert size={9} className="text-amber-950" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function AvatarRequiredModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-sm w-full bg-[#1a1a2e] border border-white/10 rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-white/40 hover:text-white/70 transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-amber-400/20 flex items-center justify-center mb-4">
          <ShieldAlert size={22} className="text-amber-400" />
        </div>

        <h2 className="text-lg font-bold text-white mb-2">
          Verified profile photo required
        </h2>
        <p className="text-sm text-white/60 leading-relaxed mb-5">
          To keep coworking accountable, you need a real photo of yourself before you can turn off your camera. Other members will see that photo (with audio-reactive rings) instead of a blank tile.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/profile');
            }}
            className="flex-1 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-full text-sm font-bold transition-all active:scale-95"
          >
            Upload photo
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-full text-sm font-bold transition-all active:scale-95"
          >
            Keep camera on
          </button>
        </div>
      </div>
    </div>
  );
}
