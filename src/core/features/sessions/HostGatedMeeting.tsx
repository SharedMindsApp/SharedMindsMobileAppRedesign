/**
 * HostGatedMeeting — host-activated waiting room for GROUP sessions.
 *
 * Everyone who arrives sits in a lobby seeing only their *own* local camera
 * preview (getUserMedia — free, no Daily API call). The host (session creator
 * / moderator) gets a "Start session" button; nobody's video room exists on
 * Daily.co until the host presses it.
 *
 * When the host starts:
 *   • The host's client mounts <DailyMeeting> and broadcasts `started: true`
 *     over the free Supabase presence channel keyed by the room name.
 *   • Every other client in the lobby sees `started: true` and mounts Daily
 *     too — so the whole group lands in the room together.
 *   • Late arrivals see the flag is already set and join straight away
 *     (no second wait). The flag is re-broadcast by everyone who's in the
 *     call, so it survives the original host stepping away.
 *
 * The gate latches open, so a refresh won't tear the call down.
 */

import { useEffect, useRef, useState } from 'react';
import { Video, Loader2, Play, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { DailyMeeting, type DailyMeetingProps } from './DailyMeeting';

function fmt(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

interface PresenceEntry { started?: boolean }

export interface HostGatedMeetingProps extends Omit<DailyMeetingProps, 'startVideoMuted'> {
  /** Stable identity for the presence channel (the auth user id). */
  currentUserId: string;
  /** Only the host sees the "Start session" control. */
  isHost: boolean;
  /** Declared goal, shown in the lobby. */
  goal: string;
  /** Live countdown seconds, shown in the lobby. */
  secondsRemaining: number;
}

export function HostGatedMeeting({
  currentUserId,
  isHost,
  goal,
  secondsRemaining,
  ...daily
}: HostGatedMeetingProps) {
  const { roomName } = daily;

  const [presentCount, setPresentCount] = useState(1);
  const [open, setOpen] = useState(false);            // latched: render DailyMeeting
  const [hasCam, setHasCam] = useState<boolean | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  const openRef = useRef(open); openRef.current = open;
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Local camera preview (free — no Daily) ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const devices = await navigator.mediaDevices?.enumerateDevices?.();
        const camPresent = !!devices?.some((d) => d.kind === 'videoinput');
        if (cancelled) return;
        setHasCam(camPresent);
        if (!camPresent) return;
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        setPreviewStream(stream);
      } catch {
        if (!cancelled) setHasCam(false);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && previewStream) videoRef.current.srcObject = previewStream;
  }, [previewStream]);

  // Release the camera the instant we open Daily, so Daily can acquire it.
  useEffect(() => {
    if (!open) return;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setPreviewStream(null);
  }, [open]);

  // ── Presence channel: headcount + "has the host started?" ─────────────────
  useEffect(() => {
    const channel = supabase.channel(`video-gate:${roomName}`, {
      config: { presence: { key: currentUserId } },
    });
    channelRef.current = channel;

    const evaluate = () => {
      const state = channel.presenceState() as Record<string, PresenceEntry[]>;
      const keys = Object.keys(state);
      setPresentCount(keys.length);
      const started = keys.some((k) => (state[k] ?? []).some((e) => e?.started));
      if (started && !openRef.current) setOpen(true);
    };

    channel
      .on('presence', { event: 'sync' }, evaluate)
      .on('presence', { event: 'join' }, evaluate)
      .on('presence', { event: 'leave' }, evaluate)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') channel.track({ user_id: currentUserId, started: openRef.current });
      });

    return () => { channelRef.current = null; supabase.removeChannel(channel); };
  }, [roomName, currentUserId]);

  // Once we're in the call, broadcast `started` so the flag survives the
  // original host leaving (anyone still in keeps the room "open" for arrivals).
  useEffect(() => {
    if (open) channelRef.current?.track({ user_id: currentUserId, started: true });
  }, [open, currentUserId]);

  function handleStart() {
    setOpen(true);
    channelRef.current?.track({ user_id: currentUserId, started: true });
  }

  if (open) return <DailyMeeting {...daily} startVideoMuted={false} />;

  // ── Lobby ─────────────────────────────────────────────────────────────────
  const others = Math.max(0, presentCount - 1);
  return (
    <div className="absolute inset-0 bg-[#1a1a2e] flex flex-col items-center justify-center text-center px-6 gap-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(139,92,246,0.18),transparent_60%)]" />
      <div className="relative flex flex-col items-center gap-4 w-full max-w-sm">
        {/* Self preview */}
        <div className="relative w-44 h-44 rounded-3xl overflow-hidden bg-black/40 ring-1 ring-white/10 grid place-items-center">
          {previewStream ? (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
          ) : hasCam === null ? (
            <Loader2 size={22} className="animate-spin text-white/40" />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-white/40">
              <Video size={24} />
              <span className="text-[10px]">No camera — you'll join as your avatar</span>
            </div>
          )}
        </div>

        <div>
          <p className="text-base font-bold text-white/90">
            {isHost ? 'Your group is gathering' : 'Waiting for the host'}
          </p>
          <p className="text-xs text-white/50 leading-relaxed mt-1.5">
            {isHost
              ? 'This preview is just for you. Start the session when you’re ready and everyone here joins together.'
              : 'You’re in the lobby with your camera preview. The session goes live when the host starts it.'}
          </p>
        </div>

        {goal && <p className="text-sm text-white/70 leading-snug">{goal}</p>}

        <p className="text-4xl font-extrabold text-white tabular-nums leading-none">{fmt(secondsRemaining)}</p>

        {isHost ? (
          <button
            type="button"
            onClick={handleStart}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-violet-500 hover:bg-violet-600 text-white text-sm font-bold active:scale-95 transition-all"
          >
            <Play size={15} /> Start session
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 ring-1 ring-white/10 text-white/60 text-sm font-semibold">
            <Loader2 size={14} className="animate-spin" /> Waiting for the host to start
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-white/40">
          <Users size={12} />
          {others === 0 ? 'You’re the first one here' : `${others} other${others === 1 ? '' : 's'} in the lobby`}
        </div>
      </div>
    </div>
  );
}
