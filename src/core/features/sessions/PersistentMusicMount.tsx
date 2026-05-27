// PersistentMusicMount
//
// Renders the SessionMusicPlayer at the Layout level so its <audio>
// element survives navigation. Previously the player lived inside
// ActiveSessionPage — minimising the timer (which routes away from
// /session/:id) tore down the audio element and killed playback
// mid-track.
//
// Mount conditions:
//   • There's an active focus session (otherwise no music to play).
//   • We're NOT inside /session/:id itself — that page renders its
//     own richer in-context music control, and we don't want two
//     audio elements competing on the same page.
//
// The host/participant + group/solo derivations live here so Layout
// doesn't need to know about session internals.

import { useLocation } from 'react-router-dom';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { useAuth } from '../../auth/AuthProvider';
import { SessionMusicPlayer } from './SessionMusicPlayer';
import type { MusicCategory } from '../../services/SessionMusicService';

export function PersistentMusicMount() {
  const { activeSession } = useFocusSession();
  const { user } = useAuth();
  const location = useLocation();

  // No session → nothing to play.
  if (!activeSession) return null;

  // The session page renders its own player (with richer chrome + the
  // ambient peers strip nearby). Don't double-mount.
  if (location.pathname.startsWith('/session/')) return null;

  const isGroupSession = activeSession.session_mode === 'group';
  const isHost = activeSession.user_id === user?.id;

  // Default category is 'flow' — the player honours the user's
  // localStorage override anyway (LS_CATEGORY_OVERRIDE), so this is
  // just the fallback for first-time users.
  const category: MusicCategory = 'flow';

  return (
    <SessionMusicPlayer
      category={category}
      sessionId={activeSession.id}
      isGroupSession={isGroupSession}
      isHost={isHost}
    />
  );
}
