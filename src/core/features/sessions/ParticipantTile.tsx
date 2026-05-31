/**
 * ParticipantTile — single participant in the video grid.
 *
 * Renders one of two views:
 *   • Video on  → live <video> wired to Daily's video track
 *   • Video off → avatar (from userData.avatarUrl) with audio-reactive
 *                 pulsing rings around it
 *
 * Also overlays display name + mute indicator and outlines the tile when
 * this participant is the active speaker.
 */

import { useEffect, useRef, useState, memo } from 'react';
import {
  useParticipantProperty,
  useAudioLevelObserver,
  useVideoTrack,
  useAudioTrack,
  useActiveSpeakerId,
} from '@daily-co/daily-react';
import { MicOff } from 'lucide-react';
import { PulsingRings } from './PulsingRings';
import { SafetyMenu } from '../moderation/SafetyMenu';

interface ParticipantTileProps {
  sessionId: string;        // Daily session ID (not SharedMinds session)
  isLocal?: boolean;
  /** SharedMinds focus_sessions.id — when set + the participant is a real
   *  remote user, an in-tile Safety menu is rendered so the local user
   *  can Report or Block them. Evidence (screenshot + last 5m of chat)
   *  is captured automatically on report submission. */
  focusSessionId?: string;
}

function ParticipantTileImpl({ sessionId, isLocal = false, focusSessionId }: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // ── Daily React selectors — each one re-renders only when its slice changes
  const userName  = useParticipantProperty(sessionId, 'user_name') as string | null;
  const userData  = useParticipantProperty(sessionId, 'userData') as { avatarUrl?: string | null } | null;
  // SharedMinds user id is set in the Daily token as `user_id` (see
  // supabase/functions/get-daily-token). Exposed as `participant.user_id`.
  const sharedmindsUserId = useParticipantProperty(sessionId, 'user_id') as string | null;
  const videoOff  = useParticipantProperty(sessionId, 'tracks.video.off') as boolean | null;
  const audioMute = useParticipantProperty(sessionId, 'tracks.audio.state') as string | null;
  const activeSpeakerId = useActiveSpeakerId();
  const isSpeaking = activeSpeakerId === sessionId;

  const videoTrack = useVideoTrack(sessionId);
  const audioTrack = useAudioTrack(sessionId);

  const hasVideo = !!videoTrack?.persistentTrack && !videoOff;
  const isMuted  = audioMute === 'off' || audioMute === 'blocked';

  // ── Audio level (0..1) drives the pulsing rings. useAudioLevelObserver
  //    starts Daily's audio-level observer and reports levels by session id
  //    (works for both the local mic and remote participants). The older
  //    useAudioLevel(track) hook is deprecated and read 0 whenever its
  //    internal Web-Audio context stayed suspended — which is why the
  //    visualiser never pulsed.
  const [audioLevel, setAudioLevel] = useState(0);
  useAudioLevelObserver(sessionId, (v) => setAudioLevel(v));

  // ── Wire the video track into the <video> element
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoTrack?.persistentTrack) return;
    el.srcObject = new MediaStream([videoTrack.persistentTrack]);
    return () => { el.srcObject = null; };
  }, [videoTrack?.persistentTrack]);

  // ── Play remote audio (NEVER for local — would cause echo)
  useEffect(() => {
    if (isLocal) return;
    const el = audioRef.current;
    if (!el || !audioTrack?.persistentTrack) return;
    el.srcObject = new MediaStream([audioTrack.persistentTrack]);
    el.play().catch(() => { /* autoplay restrictions — needs user gesture */ });
    return () => { el.srcObject = null; };
  }, [audioTrack?.persistentTrack, isLocal]);

  const avatarUrl = userData?.avatarUrl ?? null;
  const initial = (userName ?? '?').trim().charAt(0).toUpperCase();

  return (
    <div
      // data-daily-participant tags this tile so the evidenceCapture
      // helper (src/lib/evidenceCapture.ts) can locate the <video>
      // element by Daily session id when a user reports this participant.
      data-daily-participant={sessionId}
      className="relative rounded-2xl overflow-hidden bg-[#0f0f1e] flex items-center justify-center min-h-[200px]"
      style={{
        outline: isSpeaking ? '2px solid #a78bfa' : '2px solid transparent',
        outlineOffset: '-2px',
        transition: 'outline-color 150ms ease',
      }}
    >
      {/* Hidden audio element for remote voice */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}

      {/* Safety menu — only for remote participants who have a real
          SharedMinds user_id. Floats top-right with a semi-opaque chip
          so it reads against any video background. Reporting from here
          triggers evidence capture (video frame + chat transcript). */}
      {!isLocal && sharedmindsUserId && (
        <div className="absolute top-2 right-2 z-20">
          <SafetyMenu
            targetUserId={sharedmindsUserId}
            targetUserName={userName ?? 'Participant'}
            sessionContext={{
              dailyParticipantId: sessionId,
              focusSessionId,
            }}
          />
        </div>
      )}

      {/* Video element — fades in when track is on */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted   // always muted; audio routed through <audio> above
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          hasVideo ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Audio-only fallback — avatar + pulsing rings */}
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Rings sit behind the avatar */}
          <PulsingRings audioLevel={audioLevel} size={120} />

          <div className="relative z-10 w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <span className="text-3xl sm:text-4xl font-bold text-white">{initial}</span>
            )}
          </div>
        </div>
      )}

      {/* Name + mute badge */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 pointer-events-none">
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 max-w-full">
          {isMuted && <MicOff size={10} className="text-red-400 shrink-0" />}
          <span className="text-[11px] font-bold text-white truncate">
            {isLocal ? `${userName ?? 'You'} (You)` : userName ?? 'Guest'}
          </span>
        </div>
      </div>
    </div>
  );
}

export const ParticipantTile = memo(ParticipantTileImpl);
