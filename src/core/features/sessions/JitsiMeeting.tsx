/**
 * JitsiMeeting — JaaS (8x8 Jitsi as a Service) integration
 *
 * Upgrades from the public meet.jit.si server to JaaS so that:
 *   • The session creator is always the moderator (JWT moderator:true)
 *   • Participants sit in the lobby until the host admits them
 *   • Emoji reactions, participants pane, and room security controls are enabled
 *   • Tokens are signed server-side (private key never reaches the browser)
 *
 * Flow:
 *   1. Fetch a signed JaaS JWT from the `get-jaas-token` Edge Function
 *   2. Load the 8x8.vc external_api.js script (cached singleton)
 *   3. Mount JitsiMeetExternalAPI on the container div
 *   4. Wire events → React state + parent callbacks
 *   5. Dispose on unmount
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2, WifiOff, Users, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

// ── Constants ─────────────────────────────────────────────────────────────────

const JAAS_APP_ID = (import.meta.env.VITE_JAAS_APP_ID as string | undefined)
  ?? 'vpaas-magic-cookie-7bdbb65dfc884656b9832f9662e6046e';

const JAAS_DOMAIN = '8x8.vc';

// ── Jitsi External API type shim ─────────────────────────────────────────────

interface JitsiEventListeners {
  videoConferenceJoined?: () => void;
  videoConferenceLeft?: () => void;
  participantJoined?: (data: { id: string; displayName: string }) => void;
  participantLeft?: (data: { id: string }) => void;
  connectionFailed?: () => void;
  errorOccurred?: (data: { error: string }) => void;
  lobbyUserJoined?: (data: { id: string; name: string }) => void;
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

type ConnectionState = 'loading' | 'lobby' | 'connected' | 'error';

export interface JitsiMeetingProps {
  roomName: string;
  displayName: string;
  /** True for the session creator — grants moderator role + enables lobby management */
  isModerator?: boolean;
  startAudioMuted?: boolean;
  startVideoMuted?: boolean;
  /** Called whenever the participant count changes */
  onParticipantCountChanged?: (count: number) => void;
  /** Called when a NEW participant joins */
  onParticipantJoined?: () => void;
  /** Called when the user clicks End / hangs up */
  onHangup?: () => void;
}

// ── Script loader (singleton promise) ────────────────────────────────────────

let scriptPromise: Promise<void> | null = null;

function loadJitsiScript(): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  // JaaS serves the External API from /libs/external_api.min.js
  const SCRIPT_URL = `https://${JAAS_DOMAIN}/libs/external_api.min.js`;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src*="${JAAS_DOMAIN}/libs/external_api"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Jitsi script failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load JaaS External API'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

// ── JWT fetcher ───────────────────────────────────────────────────────────────

async function fetchJaasToken(
  roomName: string,
  displayName: string,
  isModerator: boolean,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('get-jaas-token', {
    body: { roomName, displayName, isModerator },
  });
  if (error || !data?.token) {
    throw new Error(error?.message ?? 'Failed to get JaaS token');
  }
  return data.token as string;
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
  const apiRef = useRef<JitsiAPI | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('loading');
  const [participantCount, setParticipantCount] = useState(1);
  const [retryKey, setRetryKey] = useState(0);

  // Stable refs for callbacks — avoids restarting the effect on every render
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

    // Fetch JWT + load script in parallel for fastest startup
    Promise.all([
      fetchJaasToken(roomName, displayName, isModerator),
      loadJitsiScript(),
    ])
      .then(([jwt]) => {
        if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;

        // JaaS room names are namespaced under the app ID
        const jaasRoom = `${JAAS_APP_ID}/${roomName}`;

        const api = new window.JitsiMeetExternalAPI(JAAS_DOMAIN, {
          roomName: jaasRoom,
          jwt,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          configOverwrite: {
            startWithAudioMuted: startAudioMuted,
            startWithVideoMuted: startVideoMuted,
            // Disable prejoin — use both old + new API keys for compatibility
            prejoinPageEnabled: false,
            prejoinConfig: { enabled: false },
            disableDeepLinking: true,
            disableInviteFunctions: true,
            enableWelcomePage: false,
            // Don't fail hard when no camera/mic is present
            disableAudioLevels: true,
            disableInitialGUM: false,
            // Lobby: enabled so participants wait until the host admits them.
            // Moderators see the "Admit / Deny" controls automatically.
            lobbyModeEnabled: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            MOBILE_APP_PROMO: false,
            HIDE_INVITE_MORE_HEADER: true,
            TOOLBAR_BUTTONS: [
              // Core A/V
              'microphone', 'camera', 'desktop', 'hangup',
              // Collaboration
              'chat', 'raisehand', 'reactions',
              // Room management (host gets extra controls here)
              'participants-pane', 'security',
              // View + misc
              'tileview', 'select-background', 'shortcuts',
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

          // Non-moderators land in the lobby — show a waiting state
          // instead of the raw JaaS lobby screen.
          lobbyUserJoined: () => {
            if (cancelled) return;
            if (!isModerator) setConnectionState('lobby');
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
      .catch((err) => {
        console.error('[JitsiMeeting] init failed:', err);
        if (!cancelled) setConnectionState('error');
      });

    return () => {
      cancelled = true;
      if (apiRef.current) {
        try { apiRef.current.dispose(); } catch { /* ignore dispose errors */ }
        apiRef.current = null;
      }
    };
  // retryKey forces a full remount on user-initiated retry
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, isModerator, retryKey]);

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

      {/* ── Jitsi mount point ────────────────────────────────── */}
      {/* Fade in the iframe only once JaaS has joined to avoid the white
          prejoin/loading screen bleeding through our custom overlay. */}
      <div
        ref={containerRef}
        className={`w-full h-full transition-opacity duration-500 ${
          connectionState === 'connected' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* ── Loading / lobby overlay (above the iframe — rendered after in DOM) ── */}
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

      {/* ── Error state ──────────────────────────────────────── */}
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
