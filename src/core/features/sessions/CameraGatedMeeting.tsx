/**
 * CameraGatedMeeting — "Share my camera" gate for 1-on-1 / match sessions.
 *
 * Goal: never bill a Daily.co room until someone actually wants video.
 *
 * While gated we show a *local* camera preview (getUserMedia — free, no Daily
 * API call) and a single "Share my camera" button. Daily spins up when:
 *
 *     2+ people are present  AND  at least one has pressed "Share my camera"
 *
 * Both signals travel over a free Supabase Realtime presence channel keyed by
 * the room name (presence payload carries `sharing` + `hasCam`). Consequences:
 *
 *   • One press is enough. The presser joins camera-ON; the other person is
 *     pulled into the same room camera-OFF (shown as their avatar) and can
 *     press "Share my camera" themselves whenever they like.
 *   • Pressing while still alone *arms* the intent (preview stays local, no
 *     Daily call) — the room starts automatically the moment a 2nd person
 *     arrives.
 *   • Deadlock guard: if nobody present has a camera at all, we fall back to
 *     opening on the 2nd arrival (audio/avatar coworking) so they're not stuck.
 *
 * Once opened the gate latches, so a brief refresh won't tear the call down.
 */

import { useEffect, useRef, useState } from 'react';
import { Video, Loader2, Check, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { DailyMeeting, type DailyMeetingProps } from './DailyMeeting';

function fmt(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

interface PresenceEntry { sharing?: boolean; hasCam?: boolean }

export interface CameraGatedMeetingProps extends Omit<DailyMeetingProps, 'startVideoMuted'> {
  /** Stable identity for the presence channel (the auth user id). */
  currentUserId: string;
  /** People required before video can start. Default 2. */
  minPeers?: number;
  /** When true, connect immediately (bypass the "Share my camera" gate).
   *  Used once a 1-on-1 is actually matched — both people explicitly paired
   *  up to co-work, so we join the room straight away (camera-off by default;
   *  they can share via the in-call controls). The share-gate only makes
   *  sense while waiting alone. */
  connectNow?: boolean;
  /** Declared goal, shown in the lobby. */
  goal: string;
  /** Live countdown seconds, shown in the lobby. */
  secondsRemaining: number;
}

export function CameraGatedMeeting({
  currentUserId,
  minPeers = 2,
  connectNow = false,
  goal,
  secondsRemaining,
  ...daily
}: CameraGatedMeetingProps) {
  const { roomName } = daily;

  const [presentCount, setPresentCount] = useState(1);
  const [shared, setShared] = useState(false);          // did I press "Share my camera"
  const [open, setOpen] = useState(false);              // latched: render DailyMeeting
  const [hasCam, setHasCam] = useState<boolean | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  const openRef = useRef(open); openRef.current = open;
  const sharedRef = useRef(shared); sharedRef.current = shared;
  const hasCamRef = useRef<boolean>(false);
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
        hasCamRef.current = camPresent;
        if (!camPresent) return;
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        setPreviewStream(stream);
      } catch {
        if (!cancelled) { setHasCam(false); hasCamRef.current = false; }
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Matched → connect immediately (the partner explicitly paired up; no need
  // to wait for a manual "Share my camera" tap).
  useEffect(() => {
    if (connectNow && !openRef.current) setOpen(true);
  }, [connectNow]);

  // Attach the preview stream to the <video> element.
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

  // ── Presence channel: headcount + "who wants video" ───────────────────────
  useEffect(() => {
    const channel = supabase.channel(`video-gate:${roomName}`, {
      config: { presence: { key: currentUserId } },
    });
    channelRef.current = channel;

    const evaluate = () => {
      const state = channel.presenceState() as Record<string, PresenceEntry[]>;
      const keys = Object.keys(state);
      setPresentCount(keys.length);
      const entries = keys.flatMap((k) => state[k] ?? []);
      const anySharing = entries.some((e) => e?.sharing);
      const anyCam = entries.some((e) => e?.hasCam);
      // Open once 2+ present AND (someone wants video, OR nobody has a camera
      // so there's nothing to wait on).
      if (keys.length >= minPeers && (anySharing || !anyCam) && !openRef.current) {
        setOpen(true);
      }
    };

    channel
      .on('presence', { event: 'sync' }, evaluate)
      .on('presence', { event: 'join' }, evaluate)
      .on('presence', { event: 'leave' }, evaluate)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.track({ user_id: currentUserId, sharing: sharedRef.current, hasCam: hasCamRef.current });
        }
      });

    return () => { channelRef.current = null; supabase.removeChannel(channel); };
    // hasCam is read via ref inside track(); re-track on change handled below.
  }, [roomName, currentUserId, minPeers]);

  // Re-broadcast presence when our camera-detection resolves (so peers learn
  // whether we even have a camera — drives the deadlock fallback).
  useEffect(() => {
    if (hasCam === null) return;
    channelRef.current?.track({ user_id: currentUserId, sharing: sharedRef.current, hasCam });
  }, [hasCam, currentUserId]);

  function handleShare() {
    setShared(true);
    sharedRef.current = true;
    // Broadcast intent; peers (and we) re-evaluate the open condition.
    channelRef.current?.track({ user_id: currentUserId, sharing: true, hasCam: hasCamRef.current });
    // If a peer is already here, open immediately for us too.
    if (presentCount >= minPeers) setOpen(true);
  }

  if (open) {
    // The presser joins camera-on; everyone else camera-off (avatar) until
    // they press Share themselves via the in-call controls.
    return <DailyMeeting {...daily} startVideoMuted={!shared} />;
  }

  // ── Lobby ─────────────────────────────────────────────────────────────────
  const alone = presentCount < minPeers;
  return (
    <div className="absolute inset-0 bg-[#1a1a2e] flex flex-col items-center justify-center text-center px-6 gap-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(139,92,246,0.18),transparent_60%)]" />
      <div className="relative flex flex-col items-center gap-4 w-full max-w-sm">
        {/* Self preview */}
        <div className="relative w-44 h-44 rounded-3xl overflow-hidden bg-black/40 ring-1 ring-white/10 grid place-items-center">
          {previewStream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />
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
            {alone ? "You're the first one here" : 'Ready when you are'}
          </p>
          <p className="text-xs text-white/50 leading-relaxed mt-1.5">
            {shared
              ? alone
                ? 'Camera ready — video starts automatically when someone joins.'
                : 'Starting the call…'
              : alone
                ? 'This preview is just for you. Video only starts once someone joins.'
                : 'Someone’s here. Share your camera to start the call for both of you.'}
          </p>
        </div>

        {goal && <p className="text-sm text-white/70 leading-snug">{goal}</p>}

        <p className="text-4xl font-extrabold text-white tabular-nums leading-none">{fmt(secondsRemaining)}</p>

        {/* Share button — only meaningful when a camera exists. */}
        {hasCam !== false && (
          shared ? (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30 text-emerald-200 text-sm font-bold">
              <Check size={15} /> Camera ready
            </div>
          ) : (
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-violet-500 hover:bg-violet-600 text-white text-sm font-bold active:scale-95 transition-all"
            >
              <Video size={15} /> Share my camera
            </button>
          )
        )}

        {!alone && (
          <div className="flex items-center gap-1.5 text-[11px] text-white/40">
            <Users size={12} /> {presentCount} here
          </div>
        )}
      </div>
    </div>
  );
}
