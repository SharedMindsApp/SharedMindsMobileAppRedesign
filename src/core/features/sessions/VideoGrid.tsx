/**
 * VideoGrid — responsive grid of ParticipantTiles.
 *
 * Layout rules (mobile-first):
 *   1 participant → centered solo tile
 *   2 participants → side-by-side
 *   3-4 participants → 2×2
 *   5-9 participants → 3×3
 *   10+ participants → 4-wide, scrollable
 */

import { useParticipantIds, useLocalSessionId } from '@daily-co/daily-react';
import { ParticipantTile } from './ParticipantTile';

interface Props {
  /** SharedMinds focus_sessions.id — threaded through to each tile so the
   *  in-session Report flow can attach a chat-transcript evidence snapshot. */
  focusSessionId?: string;
}

export function VideoGrid({ focusSessionId }: Props = {}) {
  const ids = useParticipantIds({ sort: 'user_name', filter: 'screen' });
  // useParticipantIds with filter 'screen' returns only NON-screen-share participants.
  // For now we render everyone as a tile and ignore screenshares for v1.
  const localId = useLocalSessionId();
  const allIds = useParticipantIds();

  // Push local participant first so they always see themselves top-left
  const ordered = [localId, ...allIds.filter((id) => id !== localId)].filter(Boolean) as string[];
  const count = ordered.length;

  const gridClass =
    count <= 1
      ? 'grid-cols-1'
      : count === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : count <= 4
      ? 'grid-cols-2'
      : count <= 9
      ? 'grid-cols-2 md:grid-cols-3'
      : 'grid-cols-3 md:grid-cols-4';

  // Avoid an unused-var TS warning while filter='screen' is unused
  void ids;

  return (
    <div className="w-full h-full p-3 sm:p-4 overflow-y-auto">
      <div className={`grid ${gridClass} gap-3 sm:gap-4 h-full`}>
        {ordered.map((id) => (
          <ParticipantTile
            key={id}
            sessionId={id}
            isLocal={id === localId}
            focusSessionId={focusSessionId}
          />
        ))}
      </div>
    </div>
  );
}
