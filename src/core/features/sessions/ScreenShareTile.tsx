/**
 * ScreenShareTile — renders a participant's shared screen.
 *
 * Daily exposes a screen share as a separate "screenVideo" media track on the
 * sharing participant (NOT a separate participant). We wire that track into a
 * <video> with object-contain so the whole screen is visible (letterboxed)
 * rather than cropped. Screen audio (e.g. a shared video's sound) plays through
 * a hidden <audio> element for remote shares only.
 */

import { useEffect, useRef } from 'react';
import { useMediaTrack, useParticipantProperty } from '@daily-co/daily-react';
import { MonitorUp } from 'lucide-react';

interface ScreenShareTileProps {
  /** Daily session id of the participant who is sharing. */
  sessionId: string;
  /** True when the local user is the one sharing (skip audio playback to
   *  avoid echo / feedback). */
  isLocal?: boolean;
}

export function ScreenShareTile({ sessionId, isLocal = false }: ScreenShareTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const screenVideo = useMediaTrack(sessionId, 'screenVideo');
  const screenAudio = useMediaTrack(sessionId, 'screenAudio');
  const userName = useParticipantProperty(sessionId, 'user_name') as string | null;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !screenVideo?.persistentTrack) return;
    el.srcObject = new MediaStream([screenVideo.persistentTrack]);
    return () => { el.srcObject = null; };
  }, [screenVideo?.persistentTrack]);

  useEffect(() => {
    if (isLocal) return;
    const el = audioRef.current;
    if (!el || !screenAudio?.persistentTrack) return;
    el.srcObject = new MediaStream([screenAudio.persistentTrack]);
    el.play().catch(() => { /* autoplay restrictions — needs a user gesture */ });
    return () => { el.srcObject = null; };
  }, [screenAudio?.persistentTrack, isLocal]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black flex items-center justify-center ring-1 ring-violet-400/30">
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />
      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
        <MonitorUp size={12} className="text-violet-300 shrink-0" />
        <span className="text-[11px] font-bold text-white truncate">
          {isLocal ? 'Your screen' : `${userName ?? 'Someone'}'s screen`}
        </span>
      </div>
    </div>
  );
}
