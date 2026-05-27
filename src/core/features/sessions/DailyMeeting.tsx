/**
 * DailyMeeting — custom-UI Daily.co integration.
 *
 * Replaces the old Daily Prebuilt iframe with a fully-custom React UI:
 *   • <VideoGrid> renders one <ParticipantTile> per participant
 *   • Each tile shows live video OR avatar + audio-reactive pulsing rings
 *   • <MeetingControls> provides mic/cam/share/leave
 *
 * Why custom: lets us show profile pictures (with audio visualization) when
 * the camera is off, instead of a black tile. This makes camera-shy users
 * feel less invisible while still letting them work in peace — core to the
 * SharedMinds ADHD-friendly positioning.
 *
 * Flow:
 *   1. Fetch a signed token from the get-daily-token Edge Function
 *   2. Create a Daily call object (no iframe)
 *   3. Wrap children in <DailyProvider> so hooks can read call state
 *   4. Join the room
 *   5. Dispose on unmount
 */

import { useEffect, useRef, useState } from 'react';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';
import { DailyProvider } from '@daily-co/daily-react';
import { Loader2, WifiOff, RefreshCw, MicOff, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { VideoGrid } from './VideoGrid';
import { MeetingControls } from './MeetingControls';

// ── Token fetcher ─────────────────────────────────────────────────────────────

async function fetchDailyToken(
  roomName: string,
  displayName: string,
  isModerator: boolean,
  bodyDouble: boolean,
): Promise<{ url: string; token: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const authToken = session?.access_token;
  if (!authToken) throw new Error('Not authenticated');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const res = await fetch(`${supabaseUrl}/functions/v1/get-daily-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ roomName, displayName, isModerator, bodyDouble }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = body?.error ?? `HTTP ${res.status}`;
    throw new Error(`Daily setup failed: ${detail}`);
  }
  if (!body?.url || !body?.token) {
    throw new Error('Daily token response missing url or token');
  }
  return { url: body.url as string, token: body.token as string };
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ConnectionState = 'loading' | 'connected' | 'error';

export interface DailyMeetingProps {
  roomName: string;
  displayName: string;
  isModerator?: boolean;
  startAudioMuted?: boolean;
  startVideoMuted?: boolean;
  /**
   * True only if the local user's avatar has been face-verified.
   * Drives whether the camera-off button is enabled — unverified users
   * are hard-blocked from turning off their camera (must upload a real
   * profile photo first).
   */
  avatarVerified?: boolean;
  /**
   * Body-double mode: forces camera ON, locks mic OFF (via Daily token
   * permissions), and uses the shared persistent room.
   */
  bodyDouble?: boolean;
  /**
   * If true, hide the bottom MeetingControls bar entirely. Used by the
   * solo body-double layout where the parent owns its own controls and
   * the user can't toggle anything anyway.
   */
  chromeless?: boolean;
  /**
   * SharedMinds focus_sessions.id — threaded through to ParticipantTile
   * so the in-tile Report flow can attach a chat-transcript snapshot
   * scoped to this session as evidence.
   */
  focusSessionId?: string;
  onParticipantCountChanged?: (count: number) => void;
  onParticipantJoined?: () => void;
  /**
   * Fires when the user leaves the Daily call (clicks Leave, closes tab,
   * navigates away). This is NOT the same as ending the session — the
   * session keeps running for everyone else. The parent should just
   * navigate the user out, not write to the DB.
   */
  onLeave?: () => void;
  /** Imperative "mute now" trigger. Each unique value mutes the local
   *  audio once via callObject.setLocalAudio(false). Used by
   *  ActiveSessionPage on the intro→work phase transition for matched
   *  sessions whose vibe is silent or brief_hi. It's a *one-shot*
   *  signal, not a sticky setting — the user can immediately unmute
   *  again if they want. Subsequent value changes mute again. */
  muteAudioSignal?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DailyMeeting({
  roomName,
  displayName,
  isModerator = false,
  startAudioMuted = false,
  startVideoMuted = false,
  avatarVerified = false,
  bodyDouble = false,
  chromeless = false,
  focusSessionId,
  onParticipantCountChanged,
  onParticipantJoined,
  onLeave,
  muteAudioSignal,
}: DailyMeetingProps) {
  const callRef = useRef<DailyCall | null>(null);
  const [call, setCall] = useState<DailyCall | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('loading');
  const [retryKey, setRetryKey] = useState(0);
  const [deviceWarning, setDeviceWarning] = useState<null | 'not_found' | 'permission_denied'>(null);
  const [deviceWarningDismissed, setDeviceWarningDismissed] = useState(false);

  // Stable refs for callbacks so we don't restart the effect on every render
  const cbCountRef  = useRef(onParticipantCountChanged);
  const cbJoinedRef = useRef(onParticipantJoined);
  const cbLeaveRef = useRef(onLeave);

  // Auto-mute trigger — fires whenever the muteAudioSignal value changes
  // (and is non-zero, so the initial 0 → undefined mount doesn't mute).
  // One-shot: we just call setLocalAudio(false). User can manually
  // unmute again — we don't fight them on subsequent renders.
  useEffect(() => {
    if (muteAudioSignal === undefined || muteAudioSignal === 0) return;
    const c = callRef.current;
    if (!c) return;
    try {
      c.setLocalAudio(false);
    } catch (e) {
      console.warn('[DailyMeeting] auto-mute via signal failed:', e);
    }
  }, [muteAudioSignal]);
  useEffect(() => {
    cbCountRef.current  = onParticipantCountChanged;
    cbJoinedRef.current = onParticipantJoined;
    cbLeaveRef.current = onLeave;
  });

  // Proactive device check — surface the no-camera/no-mic banner before
  // we even try to join. enumerateDevices doesn't trigger a permission prompt.
  useEffect(() => {
    setDeviceWarning(null);
    setDeviceWarningDismissed(false);
    if (!navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const hasAudio = devices.some((d) => d.kind === 'audioinput');
      const hasVideo = devices.some((d) => d.kind === 'videoinput');
      if (!hasAudio && !hasVideo) setDeviceWarning('not_found');
    }).catch(() => { /* restricted env — skip */ });
  }, [retryKey]);

  // ── Main effect: create call object + join room ───────────────────────────
  useEffect(() => {
    let cancelled = false;
    setConnectionState('loading');

    fetchDailyToken(roomName, displayName, isModerator, bodyDouble)
      .then(async ({ url, token }) => {
        if (cancelled) return;

        // Daily allows at most one call object per page; ensure any previous
        // one is fully destroyed before creating a new one.
        if (callRef.current) {
          try { await callRef.current.destroy(); } catch { /* ignore */ }
          callRef.current = null;
        }

        // If there are no devices at all, force mic + cam off so Daily
        // doesn't stall trying to acquire tracks.
        let forceAudioOff = startAudioMuted;
        let forceVideoOff = startVideoMuted;
        try {
          const devices = await navigator.mediaDevices?.enumerateDevices?.();
          const hasAudio = devices?.some((d) => d.kind === 'audioinput');
          const hasVideo = devices?.some((d) => d.kind === 'videoinput');
          if (!hasAudio) forceAudioOff = true;
          if (!hasVideo) forceVideoOff = true;
        } catch { /* ignore */ }

        const daily = DailyIframe.createCallObject({
          audioSource: !forceAudioOff,
          videoSource: !forceVideoOff,
        });

        callRef.current = daily;

        // ── Event handlers ────────────────────────────────────────────
        daily.on('joined-meeting', () => {
          if (cancelled) return;
          setConnectionState('connected');
          const count = Object.keys(daily.participants()).length;
          cbCountRef.current?.(count);
        });

        daily.on('participant-joined', () => {
          if (cancelled) return;
          const count = Object.keys(daily.participants()).length;
          cbCountRef.current?.(count);
          cbJoinedRef.current?.();
        });

        daily.on('participant-left', () => {
          if (cancelled) return;
          const count = Object.keys(daily.participants()).length;
          cbCountRef.current?.(count);
        });

        daily.on('left-meeting', () => {
          if (cancelled) return;
          cbHangupRef.current?.();
        });

        daily.on('camera-error', (evt) => {
          if (cancelled) return;
          const type = (evt?.errorMsg?.errorMsg ?? '').toLowerCase();
          if (type.includes('permission') || type.includes('not-allowed')) {
            setDeviceWarning('permission_denied');
          } else {
            setDeviceWarning('not_found');
          }
        });

        daily.on('error', (evt) => {
          if (cancelled) return;
          console.error('[DailyMeeting] error event:', evt);
          setConnectionState('error');
        });

        // ── Join ──────────────────────────────────────────────────────
        try {
          await daily.join({ url, token, startAudioOff: forceAudioOff, startVideoOff: forceVideoOff });
          if (!cancelled) setCall(daily);
        } catch (err) {
          if (cancelled) return;
          console.error('[DailyMeeting] join failed:', err);
          setConnectionState('error');
        }
      })
      .catch((err) => {
        console.error('[DailyMeeting] init failed:', err);
        if (!cancelled) setConnectionState('error');
      });

    return () => {
      cancelled = true;
      if (callRef.current) {
        callRef.current.destroy().catch(() => { /* ignore */ });
        callRef.current = null;
      }
      setCall(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, isModerator, retryKey]);

  function handleRetry() {
    setConnectionState('loading');
    setDeviceWarning(null);
    setDeviceWarningDismissed(false);
    setRetryKey((k) => k + 1);
  }

  function handleLeave() {
    if (callRef.current) {
      callRef.current.leave().catch(() => { /* ignore */ });
    }
    // onHangup fires via 'left-meeting' but call it directly too for snappy UX
    cbHangupRef.current?.();
  }

  return (
    <div className="absolute inset-0 bg-[#1a1a2e] flex flex-col">
      {/* ── Loading overlay ─────────────────────────────────────── */}
      {connectionState === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-30 gap-3 bg-[#1a1a2e]">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-violet-400" />
          </div>
          <p className="text-sm text-white/50">
            {isModerator ? 'Setting up your room…' : 'Joining room…'}
          </p>
        </div>
      )}

      {/* ── Error state ─────────────────────────────────────────── */}
      {connectionState === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-30 gap-4 bg-[#1a1a2e]">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
            <WifiOff size={30} className="text-white/30" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-white/70 mb-1">Couldn't connect</p>
            <p className="text-xs text-white/40 max-w-[220px] leading-relaxed">
              Check your connection and try again. Your session is still running.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-full text-sm font-bold active:scale-95 transition-all"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      )}

      {/* ── Connected: video grid + controls ─────────────────────── */}
      {call && connectionState === 'connected' && (
        <DailyProvider callObject={call}>
          <div className="flex-1 min-h-0 relative">
            <VideoGrid focusSessionId={focusSessionId} />
          </div>
          {!chromeless && (
            <MeetingControls onLeave={handleLeave} avatarVerified={avatarVerified} />
          )}
        </DailyProvider>
      )}

      {/* ── Device warning banner (non-blocking) ────────────────── */}
      {deviceWarning && !deviceWarningDismissed && (
        <div className="absolute bottom-20 inset-x-0 z-40 px-3 pb-3 pointer-events-none">
          <div className="max-w-md mx-auto flex items-start gap-3 bg-amber-500/20 border border-amber-400/40 backdrop-blur-sm rounded-2xl px-4 py-3 pointer-events-auto">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 flex items-center justify-center shrink-0 mt-0.5">
              <MicOff size={15} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              {deviceWarning === 'not_found' ? (
                <>
                  <p className="text-xs font-bold text-amber-200 mb-0.5">No camera or microphone found</p>
                  <p className="text-[11px] text-amber-200/70 leading-relaxed">
                    Others see your profile picture with a glowing ring instead. Connect a device and tap <strong className="text-amber-200">Retry</strong> to switch to video.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-amber-200 mb-0.5">Camera &amp; microphone blocked</p>
                  <p className="text-[11px] text-amber-200/70 leading-relaxed">
                    Tap the camera icon in your address bar, choose <strong className="text-amber-200">Allow</strong>, then tap <strong className="text-amber-200">Retry</strong>.
                  </p>
                </>
              )}
              <button
                type="button"
                onClick={handleRetry}
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 bg-amber-400/15 hover:bg-amber-400/25 px-3 py-1 rounded-full transition-colors active:scale-95"
              >
                <RefreshCw size={11} />
                Retry
              </button>
            </div>
            <button
              type="button"
              onClick={() => setDeviceWarningDismissed(true)}
              className="shrink-0 text-amber-400/50 hover:text-amber-300 transition-colors mt-0.5"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
