/**
 * PresenceGatedMeeting — defer the Daily.co room until 2+ people are here.
 *
 * Problem: <DailyMeeting> creates (upserts) a Daily room and joins it the
 * moment it mounts — i.e. as soon as the FIRST person opens the session.
 * A solo host sitting in an empty room still burns Daily participant
 * minutes for no benefit (there's no one to see).
 *
 * Fix: gate the mount behind a *free* Supabase Realtime presence channel
 * keyed by the Daily room name. While fewer than `minPeers` distinct users
 * are present we render a local `lobby` (a plain timer view — no Daily API
 * call at all). The instant a second person joins the presence channel,
 * every client crosses the threshold within the same realtime tick, mounts
 * <DailyMeeting>, and the room is created then.
 *
 * Notes:
 *   • "Present" means present in the session, NOT "camera on" — we can't
 *     observe camera state without already being in the Daily room (which
 *     is the very cost we're avoiding). Presence is the cheap proxy.
 *   • Presence is keyed by user id, so a second tab from the SAME user does
 *     not trip the gate (you can't pair with yourself).
 *   • Once opened, the gate latches — a brief drop back to 1 person (someone
 *     refreshing) won't tear the call down. Mid-call departures are handled
 *     by ActiveSessionPage's own partner-watch logic.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../../../lib/supabase';
import { DailyMeeting, type DailyMeetingProps } from './DailyMeeting';

interface PresenceGatedMeetingProps extends DailyMeetingProps {
  /** Stable identity for the presence channel (the auth user id). */
  currentUserId: string;
  /** How many distinct people must be present before video starts. Default 2. */
  minPeers?: number;
  /** Rendered while the gate is closed. Receives the live headcount
   *  (always ≥ 1, since it counts the local user). */
  lobby: (presentCount: number) => ReactNode;
}

export function PresenceGatedMeeting({
  currentUserId,
  minPeers = 2,
  lobby,
  ...daily
}: PresenceGatedMeetingProps) {
  const { roomName } = daily;
  const [presentCount, setPresentCount] = useState(1);
  // Latch: once we've ever reached the threshold for this room, stay open.
  const [open, setOpen] = useState(false);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    const channel = supabase.channel(`video-gate:${roomName}`, {
      config: { presence: { key: currentUserId } },
    });

    const evaluate = () => {
      const count = Object.keys(channel.presenceState()).length;
      setPresentCount(count);
      if (count >= minPeers && !openRef.current) setOpen(true);
    };

    channel
      .on('presence', { event: 'sync' }, evaluate)
      .on('presence', { event: 'join' }, evaluate)
      .on('presence', { event: 'leave' }, evaluate)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') channel.track({ user_id: currentUserId, at: Date.now() });
      });

    return () => { supabase.removeChannel(channel); };
  }, [roomName, currentUserId, minPeers]);

  if (!open) return <>{lobby(presentCount)}</>;
  return <DailyMeeting {...daily} />;
}
