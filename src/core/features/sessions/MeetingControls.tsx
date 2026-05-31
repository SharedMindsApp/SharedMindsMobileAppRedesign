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
import { createPortal } from 'react-dom';
import { useDaily, useLocalParticipant, useScreenShare, useDevices } from '@daily-co/daily-react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, PhoneOff, ShieldAlert, X, Aperture, Waves, MoreHorizontal, Volume2, Check, Camera } from 'lucide-react';

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
  const [settingsOpen, setSettingsOpen] = useState(false);

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

        {/* Session settings — blur, noise suppression, camera/mic/speaker.
            Keeps the bar to the essentials (mic / cam / share / leave). */}
        <ControlButton onClick={() => setSettingsOpen(true)} active label="Session settings" variant="accent">
          <MoreHorizontal size={18} />
        </ControlButton>

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

      {settingsOpen && (
        <SessionSettingsSheet
          blurOn={blurOn}
          blurSupported={blurSupported}
          onToggleBlur={toggleBlur}
          denoiseOn={denoiseOn}
          denoiseSupported={denoiseSupported}
          onToggleDenoise={toggleDenoise}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {showAvatarModal && (
        <AvatarRequiredModal onClose={() => setShowAvatarModal(false)} />
      )}
    </>
  );
}

// ── Session settings sheet ────────────────────────────────────────────────────
// Bottom sheet on mobile, centred card on desktop. Houses the secondary
// controls that don't need to be one tap away: video effects + device pickers.

function SessionSettingsSheet({
  blurOn, blurSupported, onToggleBlur,
  denoiseOn, denoiseSupported, onToggleDenoise,
  onClose,
}: {
  blurOn: boolean;
  blurSupported: boolean;
  onToggleBlur: () => void;
  denoiseOn: boolean;
  denoiseSupported: boolean;
  onToggleDenoise: () => void;
  onClose: () => void;
}) {
  const { cameras, microphones, speakers, currentCam, currentMic, currentSpeaker, setCamera, setMicrophone, setSpeaker } = useDevices();

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm max-h-[85dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#1a1a2e] ring-1 ring-white/10 shadow-2xl p-5"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.25rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center -mt-2 mb-2"><span className="w-9 h-1 rounded-full bg-white/20" /></div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-white">Session settings</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full grid place-items-center text-white/60 hover:bg-white/10">
            <X size={16} />
          </button>
        </div>

        {/* Effects */}
        {(blurSupported || denoiseSupported) && (
          <section className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Effects</p>
            <div className="space-y-1.5">
              {blurSupported && (
                <SettingToggle
                  icon={<Aperture size={16} />}
                  label="Blur my background"
                  hint="Hide your room — keep the focus on you"
                  on={blurOn}
                  onToggle={onToggleBlur}
                />
              )}
              {denoiseSupported && (
                <SettingToggle
                  icon={<Waves size={16} />}
                  label="Suppress background noise"
                  hint="Filter out keyboard clatter, traffic, hum"
                  on={denoiseOn}
                  onToggle={onToggleDenoise}
                />
              )}
            </div>
          </section>
        )}

        {/* Devices */}
        <section className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Devices</p>
          {cameras.length > 1 && (
            <DeviceSelect icon={<Camera size={15} />} label="Camera" value={currentCam?.device.deviceId}
              options={cameras.map((d) => ({ id: d.device.deviceId, label: d.device.label }))}
              onChange={(id) => void setCamera(id)} />
          )}
          {microphones.length > 1 && (
            <DeviceSelect icon={<Mic size={15} />} label="Microphone" value={currentMic?.device.deviceId}
              options={microphones.map((d) => ({ id: d.device.deviceId, label: d.device.label }))}
              onChange={(id) => void setMicrophone(id)} />
          )}
          {speakers.length > 1 && (
            <DeviceSelect icon={<Volume2 size={15} />} label="Speaker" value={currentSpeaker?.device.deviceId}
              options={speakers.map((d) => ({ id: d.device.deviceId, label: d.device.label }))}
              onChange={(id) => void setSpeaker(id)} />
          )}
          {cameras.length <= 1 && microphones.length <= 1 && speakers.length <= 1 && (
            <p className="text-xs text-white/40 leading-snug">Only one camera, mic and speaker detected — nothing to switch between.</p>
          )}
        </section>
      </div>
    </div>,
    document.body,
  );
}

function SettingToggle({
  icon, label, hint, on, onToggle,
}: { icon: React.ReactNode; label: string; hint: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-left transition-colors"
    >
      <span className={`w-9 h-9 shrink-0 rounded-full grid place-items-center ${on ? 'bg-violet-500 text-white' : 'bg-white/10 text-white/70'}`}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-white">{label}</span>
        <span className="block text-[11px] text-white/45 leading-snug">{hint}</span>
      </span>
      {/* Pill switch */}
      <span className={`shrink-0 w-10 h-6 rounded-full p-0.5 transition-colors ${on ? 'bg-violet-500' : 'bg-white/15'}`}>
        <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${on ? 'translate-x-4' : ''}`} />
      </span>
    </button>
  );
}

function DeviceSelect({
  icon, label, value, options, onChange,
}: { icon: React.ReactNode; label: string; value?: string; options: { id: string; label: string }[]; onChange: (id: string) => void }) {
  return (
    <label className="flex items-center gap-3">
      <span className="w-9 h-9 shrink-0 rounded-full grid place-items-center bg-white/10 text-white/70">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-0.5">{label}</span>
        <span className="relative flex items-center">
          <select
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full appearance-none text-sm font-semibold text-white bg-white/5 rounded-lg pl-2.5 pr-7 py-2 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-violet-400/40"
          >
            {options.map((o) => (
              <option key={o.id} value={o.id} className="bg-[#1a1a2e]">{o.label || 'Unnamed device'}</option>
            ))}
          </select>
          <Check size={13} className="absolute right-2.5 text-white/30 pointer-events-none" />
        </span>
      </span>
    </label>
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
