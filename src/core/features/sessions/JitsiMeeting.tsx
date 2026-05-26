/**
 * JitsiMeeting — Daily.co video integration
 *
 * Previously backed by JaaS (8x8 Jitsi). Migrated to Daily.co for:
 *   • Pay-as-you-go pricing (~$0.004/participant-minute; 10k min/mo free)
 *   • Built-in knocking/lobby so participants wait until the host admits them
 *   • Native camera-error event for clean no-device UX
 *   • Simpler JWT model (Daily REST API vs RS256 private-key signing)
 *
 * Flow:
 *   1. Check device availability via enumerateDevices (no permission prompt)
 *   2. Fetch room URL + meeting token from the `get-daily-token` Edge Function
 *   3. Instantiate DailyIframe on the container div
 *   4. call.join() → iframe loads Daily Prebuilt UI
 *   5. Wire events → React state + parent callbacks
 *   6. Dispose on unmount / retry
 *
 * The component name is intentionally unchanged so ActiveSessionPage
 * requires no import updates.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import DailyIframe, { type DailyCall, type DailyEventObjectCameraError } from '@daily-co/daily-js';
import { Loader2, WifiOff, Users, RefreshCw, MicOff, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

type ConnectionState = 'loading' | 'lobby' | 'connected' | 'error';

export interface JitsiMeetingProps {
  roomName: string;
  displayName: string;
  /** True for the session creator — grants owner role + enables lobby management */
  isModerator?: boolean;
  startAudioMuted?: boolean;
  startVideoMuted?: boolean;
  /** Called whenever the participant count changes */
  onParticipantCountChanged?: (count: number) => void;
  /** Called when a NEW participant joins */
  onParticipantJoined?: () => void;
  /** Called when the user clicks Leave / hangs up */
  onHangup?: () => void;
}

// ── Token fetcher ─────────────────────────────────────────────────────────────

async function fetchDailyToken(
  roomName: string,
  displayName: string,
  isModerator: boolean,
): Promise<{ url: string; token: string }> {
  // Use fetch directly so we always get the response body — supabase.functions.invoke
  // swallows the body on non-2xx responses, hiding the actual Daily API error.
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
    body: JSON.stringify({ roomName, displayName, isModerator }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = body?.error ?? `HTTP ${res.status}`;
    console.error('[DailyToken] Edge function error:', detail, body);
    throw new Error(`Daily setup failed: ${detail}`);
  }

  if (!body?.url || !body?.token) {
    throw new Error('Daily token response missing url or token');
  }

  return { url: body.url as string, token: body.token as string };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function JitsiMeeting({
  roomName,
  displayName,
  isModerator = false,
  startAudioMuted = false,
  startVideoMuted = false,
  onParticipantCountChanged,
  onParticipantJoined,
  onHangup,
}: JitsiMeetingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callRef      = useRef<DailyCall | null>(null);

  const [connectionState, setConnectionState] = useState<ConnectionState>('loading');
  const [participantCount, setParticipantCount] = useState(1);
  const [retryKey, setRetryKey] = useState(0);
  const [deviceWarning, setDeviceWarning] = useState<null | 'not_found' | 'permission_denied'>(null);
  const [deviceWarningDismissed, setDeviceWarningDismissed] = useState(false);

  // Stable refs for callbacks — avoids restarting the effect on every render
  const cbCountRef  = useRef(onParticipantCountChanged);
  const cbJoinedRef = useRef(onParticipantJoined);
  const cbHangupRef = useRef(onHangup);
  useEffect(() => {
    cbCountRef.current  = onParticipantCountChanged;
    cbJoinedRef.current = onParticipantJoined;
    cbHangupRef.current = onHangup;
  });

  // ── Proactive device check ─────────────────────────────────────────────────
  // enumerateDevices doesn't trigger a permission prompt — it just tells us
  // whether any audio/video hardware is visible to the browser at all.
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

  // ── Main effect: fetch token → mount Daily call ────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    setConnectionState('loading');

    // Safety-net: force the iframe visible after 15 s even if joined-meeting
    // never fires (e.g. slow network, no camera causes Daily to stall).
    const fallbackTimer = setTimeout(() => {
      if (!cancelled) {
        setConnectionState((prev) => (prev === 'loading' ? 'connected' : prev));
      }
    }, 15_000);

    fetchDailyToken(roomName, displayName, isModerator)
      .then(async ({ url, token }) => {
        if (cancelled || !containerRef.current) return;

        // createFrame appends an <iframe> to the container div.
        // We keep the container at opacity-0 until joined-meeting fires
        // so users never see the Daily loading splash.
        const call = DailyIframe.createFrame(containerRef.current, {
          iframeStyle: {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            border: '0',
          },
          showLeaveButton: true,
          showFullscreenButton: false,
          // Theme to match SharedMinds dark palette
          theme: {
            colors: {
              accent: '#6366f1',
              accentText: '#ffffff',
              background: '#1a1a2e',
              backgroundAccent: '#16213e',
              baseText: '#ffffff',
              border: '#2a2a45',
              mainAreaBg: '#1a1a2e',
              mainAreaBgAccent: '#16213e',
              mainAreaText: '#ffffff',
              supportiveText: '#9ca3af',
            },
          },
        });

        callRef.current = call;

        // ── Event wiring ─────────────────────────────────────────────────
        call.on('joined-meeting', () => {
          if (cancelled) return;
          clearTimeout(fallbackTimer);
          setConnectionState('connected');
          const count = Object.keys(call.participants()).length;
          setParticipantCount(count);
          cbCountRef.current?.(count);
        });

        call.on('left-meeting', () => {
          if (cancelled) return;
          cbHangupRef.current?.();
        });

        call.on('participant-joined', () => {
          if (cancelled) return;
          const count = Object.keys(call.participants()).length;
          setParticipantCount(count);
          cbCountRef.current?.(count);
          cbJoinedRef.current?.();
        });

        call.on('participant-left', () => {
          if (cancelled) return;
          const count = Object.keys(call.participants()).length;
          setParticipantCount(count);
          cbCountRef.current?.(count);
        });

        // Non-owner landed in the knocking lobby — show waiting overlay
        // instead of the raw Daily screen (which looks confusing).
        call.on('access-state-updated', (evt) => {
          if (cancelled) return;
          if (evt?.access?.level === 'lobby' && !isModerator) {
            setConnectionState('lobby');
          }
        });

        // camera-error is fired by Daily when GUM (getUserMedia) fails.
        // These are non-fatal — Daily still joins without A/V tracks.
        call.on('camera-error', (evt: DailyEventObjectCameraError | undefined) => {
          if (cancelled) return;
          const type = evt?.errorMsg?.errorMsg ?? '';
          if (type === 'not-allowed') {
            setDeviceWarning('permission_denied');
          } else {
            // 'not-found', 'video-capture-error', etc.
            setDeviceWarning('not_found');
          }
        });

        call.on('error', (evt) => {
          if (cancelled) return;
          console.error('[DailyMeeting] error event:', evt);
          setConnectionState('error');
        });

        // ── Detect device availability ─────────────────────────────────
        // If we already know there are no devices, start with mic + cam off
        // so Daily doesn't even try to acquire tracks (which would stall).
        let forceAudioOff = startAudioMuted;
        let forceVideoOff = startVideoMuted;
        try {
          const devices = await navigator.mediaDevices?.enumerateDevices?.();
          const hasAudio = devices?.some((d) => d.kind === 'audioinput');
          const hasVideo = devices?.some((d) => d.kind === 'videoinput');
          if (!hasAudio) forceAudioOff = true;
          if (!hasVideo) forceVideoOff = true;
        } catch { /* ignore */ }

        // ── Join ─────────────────────────────────────────────────────────
        call.join({
          url,
          token,
          startAudioOff: forceAudioOff,
          startVideoOff: forceVideoOff,
        }).catch((err) => {
          if (cancelled) return;
          console.error('[DailyMeeting] join failed:', err);
          setConnectionState('error');
        });
      })
      .catch((err) => {
        console.error('[DailyMeeting] init failed:', err);
        if (!cancelled) setConnectionState('error');
      });

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
      if (callRef.current) {
        try { callRef.current.destroy(); } catch { /* ignore */ }
        callRef.current = null;
      }
    };
  // retryKey triggers a full remount on user-initiated retry
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, isModerator, retryKey]);

  const handleRetry = useCallback(() => {
    if (callRef.current) {
      try { callRef.current.destroy(); } catch { /* ignore */ }
      callRef.current = null;
    }
    setConnectionState('loading');
    setParticipantCount(1);
    setDeviceWarning(null);
    setDeviceWarningDismissed(false);
    setRetryKey((k) => k + 1);
  }, []);

  return (
    <div
      className="bg-[#1a1a2e]"
      style={{ position: 'absolute', inset: 0 }}
    >

      {/* ── Daily mount point ─────────────────────────────────── */}
      {/* Kept at opacity-0 until joined-meeting fires so users never
          see the Daily splash/loading screen bleeding through. */}
      <div
        ref={containerRef}
        className={`absolute inset-0 transition-opacity duration-500 ${
          connectionState === 'connected' ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* ── Loading / lobby overlay ───────────────────────────── */}
      {(connectionState === 'loading' || connectionState === 'lobby') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-3 bg-[#1a1a2e]">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
          <p className="text-sm text-white/50">
            {connectionState === 'lobby'
              ? 'Waiting for the host to admit you…'
              : isModerator
              ? 'Setting up your room…'
              : 'Joining room…'}
          </p>
        </div>
      )}

      {/* ── Error state ───────────────────────────────────────── */}
      {connectionState === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-4 bg-[#1a1a2e]">
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
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full text-sm font-bold active:scale-95 transition-all"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      )}

      {/* ── Device warning banner (non-blocking) ──────────────── */}
      {deviceWarning && !deviceWarningDismissed && (
        <div className="absolute bottom-0 inset-x-0 z-30 px-3 pb-3 pointer-events-none">
          <div className="flex items-start gap-3 bg-amber-500/20 border border-amber-400/40 backdrop-blur-sm rounded-2xl px-4 py-3 pointer-events-auto">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 flex items-center justify-center shrink-0 mt-0.5">
              <MicOff size={15} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              {deviceWarning === 'not_found' ? (
                <>
                  <p className="text-xs font-bold text-amber-200 mb-0.5">
                    No camera or microphone found
                  </p>
                  <p className="text-[11px] text-amber-200/70 leading-relaxed">
                    Others can't see or hear you, but your session is running — chat
                    and reactions still work. Check that a device is plugged in and
                    not in use by another app, then tap <strong className="text-amber-200">Retry</strong>.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-amber-200 mb-0.5">
                    Camera &amp; microphone blocked
                  </p>
                  <p className="text-[11px] text-amber-200/70 leading-relaxed">
                    Your browser has blocked access. Tap the camera icon in your
                    address bar, choose <strong className="text-amber-200">Allow</strong>,
                    then tap <strong className="text-amber-200">Retry</strong>.
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

      {/* ── Participant count badge ────────────────────────────── */}
      {connectionState === 'connected' && participantCount > 1 && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1 z-10 pointer-events-none">
          <Users size={11} className="text-white/70" />
          <span className="text-[11px] font-bold text-white/80 tabular-nums">
            {participantCount}
          </span>
        </div>
      )}

    </div>
  );
}
