/**
 * JitsiMeeting — proper Jitsi External API integration
 *
 * Replaces the raw <iframe src="https://meet.jit.si/..."> with the real
 * Jitsi iFrame API. Benefits over the raw iframe:
 *   • Loading overlay — spinner until the conference is actually joined
 *   • Error state — "Try again" button if connection fails
 *   • Participant events — callbacks for partner join/leave
 *   • Hangup event — onHangup fires when user clicks End in Jitsi toolbar
 *   • Clean teardown — api.dispose() on unmount prevents memory leaks
 *
 * The external API script is loaded lazily on first render and cached on
 * window.JitsiMeetExternalAPI — subsequent mounts are instant.
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2, WifiOff, Users, RefreshCw } from 'lucide-react';

// ── Jitsi External API type shim ─────────────────────────────────────────────

interface JitsiEventListeners {
  videoConferenceJoined?: () => void;
  videoConferenceLeft?: () => void;
  participantJoined?: (data: { id: string; displayName: string }) => void;
  participantLeft?: (data: { id: string }) => void;
  connectionFailed?: () => void;
  errorOccurred?: (data: { error: string }) => void;
}

interface JitsiAPI {
  addEventListeners: (listeners: JitsiEventListeners) => void;
  dispose: () => void;
  getNumberOfParticipants: () => number;
  executeCommand: (command: string, ...args: unknown[]) => void;
}

interface JitsiMeetExternalAPIConstructor {
  new (domain: string, options: Record<string, unknown>): JitsiAPI;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiMeetExternalAPIConstructor;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ConnectionState = 'loading' | 'connected' | 'error';

export interface JitsiMeetingProps {
  roomName: string;
  displayName: string;
  startAudioMuted?: boolean;
  startVideoMuted?: boolean;
  /** Called whenever the participant count changes (your count + others) */
  onParticipantCountChanged?: (count: number) => void;
  /** Called when a NEW participant joins (count > 1 means partner arrived) */
  onParticipantJoined?: () => void;
  /** Called when the user clicks End / hangs up from inside Jitsi */
  onHangup?: () => void;
}

// ── Script loader (singleton promise) ────────────────────────────────────────

let scriptPromise: Promise<void> | null = null;

function loadJitsiScript(): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[src*="meet.jit.si/external_api.js"]');
    if (existing) {
      // Script tag exists but hasn't fired onload yet — wait
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Jitsi script failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Jitsi External API'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function JitsiMeeting({
  roomName,
  displayName,
  startAudioMuted = false,
  startVideoMuted = false,
  onParticipantCountChanged,
  onParticipantJoined,
  onHangup,
}: JitsiMeetingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiAPI | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('loading');
  const [participantCount, setParticipantCount] = useState(1);
  const [retryKey, setRetryKey] = useState(0);

  // Stable refs for callbacks so we don't restart the effect on re-render
  const onParticipantCountChangedRef = useRef(onParticipantCountChanged);
  const onParticipantJoinedRef = useRef(onParticipantJoined);
  const onHangupRef = useRef(onHangup);
  useEffect(() => {
    onParticipantCountChangedRef.current = onParticipantCountChanged;
    onParticipantJoinedRef.current = onParticipantJoined;
    onHangupRef.current = onHangup;
  });

  useEffect(() => {
    let cancelled = false;
    setConnectionState('loading');

    loadJitsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;

        const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
          roomName,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          configOverwrite: {
            startWithAudioMuted: startAudioMuted,
            startWithVideoMuted: startVideoMuted,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            disableInviteFunctions: true,
            enableWelcomePage: false,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            MOBILE_APP_PROMO: false,
            HIDE_INVITE_MORE_HEADER: true,
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'desktop', 'hangup',
              'chat', 'raisehand', 'tileview', 'select-background', 'shortcuts',
            ],
          },
          userInfo: { displayName },
        });

        apiRef.current = api;

        api.addEventListeners({
          videoConferenceJoined: () => {
            if (cancelled) return;
            setConnectionState('connected');
            const count = api.getNumberOfParticipants();
            setParticipantCount(count);
            onParticipantCountChangedRef.current?.(count);
          },

          videoConferenceLeft: () => {
            if (cancelled) return;
            onHangupRef.current?.();
          },

          participantJoined: () => {
            if (cancelled) return;
            const count = api.getNumberOfParticipants();
            setParticipantCount(count);
            onParticipantCountChangedRef.current?.(count);
            onParticipantJoinedRef.current?.();
          },

          participantLeft: () => {
            if (cancelled) return;
            const count = api.getNumberOfParticipants();
            setParticipantCount(count);
            onParticipantCountChangedRef.current?.(count);
          },

          connectionFailed: () => {
            if (cancelled) return;
            setConnectionState('error');
          },

          errorOccurred: () => {
            if (cancelled) return;
            setConnectionState('error');
          },
        });
      })
      .catch(() => {
        if (!cancelled) setConnectionState('error');
      });

    return () => {
      cancelled = true;
      if (apiRef.current) {
        try { apiRef.current.dispose(); } catch { /* ignore dispose errors */ }
        apiRef.current = null;
      }
    };
  // retryKey triggers a full remount on user-initiated retry
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, retryKey]);

  function handleRetry() {
    if (apiRef.current) {
      try { apiRef.current.dispose(); } catch { /* ignore */ }
      apiRef.current = null;
    }
    scriptPromise = null; // allow re-fetch of script if needed
    setConnectionState('loading');
    setParticipantCount(1);
    setRetryKey((k) => k + 1);
  }

  return (
    <div className="relative w-full h-full bg-[#1a1a2e]">

      {/* ── Loading overlay ──────────────────────────────────── */}
      {connectionState === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-3 pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
          <p className="text-sm text-white/50">Connecting to room…</p>
        </div>
      )}

      {/* ── Error state ──────────────────────────────────────── */}
      {connectionState === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-4">
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

      {/* ── Jitsi mount point ────────────────────────────────── */}
      <div ref={containerRef} className="w-full h-full" />

      {/* ── Participant count badge ──────────────────────────── */}
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
