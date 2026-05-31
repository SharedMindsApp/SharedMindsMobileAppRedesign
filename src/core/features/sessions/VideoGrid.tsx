/**
 * VideoGrid — Zoom-style video layout with three configurations.
 *
 *   • Gallery  → every participant as an equal tile (the default; best for
 *                groups where everyone's presence matters equally).
 *   • Speaker  → the active speaker (or your partner, 1-on-1) fills the
 *                stage; everyone else rides a filmstrip along the bottom.
 *   • Screen   → automatic whenever someone shares their screen: the screen
 *                fills the stage and people drop to the filmstrip. Switching
 *                between Gallery/Speaker is disabled while a screen is up.
 *
 * Plus a "minimise me" toggle — pop your own tile into a small draggable-free
 * corner PiP (or back into the layout). Handy in 1-on-1s when you'd rather
 * look at the other person than yourself.
 */

import { useMemo, useState } from 'react';
import {
  useParticipantIds,
  useLocalSessionId,
  useScreenShare,
  useActiveSpeakerId,
} from '@daily-co/daily-react';
import { LayoutGrid, User, Minimize2, Maximize2 } from 'lucide-react';
import { ParticipantTile } from './ParticipantTile';
import { ScreenShareTile } from './ScreenShareTile';

type ViewMode = 'gallery' | 'speaker';

interface Props {
  /** SharedMinds focus_sessions.id — threaded through to each tile so the
   *  in-session Report flow can attach a chat-transcript evidence snapshot. */
  focusSessionId?: string;
}

export function VideoGrid({ focusSessionId }: Props = {}) {
  const localId = useLocalSessionId();
  const allIds = useParticipantIds({ sort: 'user_name' });
  const { screens } = useScreenShare();
  const activeSpeakerId = useActiveSpeakerId();

  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [selfMinimized, setSelfMinimized] = useState(false);

  const remoteIds = allIds.filter((id): id is string => !!id && id !== localId);
  const everyone = ([localId, ...remoteIds].filter(Boolean)) as string[];
  const count = everyone.length;

  // Primary screen share (we spotlight one at a time — the most common case).
  const screen = screens[0] ?? null;
  const hasScreen = !!screen;

  // What goes on the stage in speaker mode: the active speaker if they're a
  // real present participant, else the first remote person, else ourselves.
  const spotlightId = useMemo(() => {
    if (activeSpeakerId && everyone.includes(activeSpeakerId)) return activeSpeakerId;
    return remoteIds[0] ?? localId ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSpeakerId, remoteIds.join(','), localId]);

  // A screen share forces the spotlight layout regardless of the chosen mode.
  const layout: 'gallery' | 'speaker' | 'screen' = hasScreen ? 'screen' : viewMode;

  // Tiles that appear in the gallery / filmstrip. Drop self when minimised
  // (it's shown as a corner PiP instead).
  const tileIds = selfMinimized && localId ? remoteIds : everyone;

  // In speaker mode the stage shows the spotlight person, so the filmstrip
  // lists everyone *except* them (avoids showing the same face twice).
  const filmstripIds =
    layout === 'speaker' ? tileIds.filter((id) => id !== spotlightId) : tileIds;

  return (
    <div className="relative w-full h-full">
      {/* ── Layout toolbar (top-right) ─────────────────────────────── */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
        {!hasScreen && count > 1 && (
          <ToolbarButton
            onClick={() => setViewMode((m) => (m === 'gallery' ? 'speaker' : 'gallery'))}
            label={viewMode === 'gallery' ? 'Speaker view' : 'Gallery view'}
          >
            {viewMode === 'gallery' ? <User size={15} /> : <LayoutGrid size={15} />}
          </ToolbarButton>
        )}
        {localId && (
          <ToolbarButton
            onClick={() => setSelfMinimized((v) => !v)}
            label={selfMinimized ? 'Show me in the layout' : 'Minimise me to a corner'}
          >
            {selfMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
          </ToolbarButton>
        )}
      </div>

      {/* ── Stage ───────────────────────────────────────────────────── */}
      {layout === 'gallery' ? (
        <GalleryStage ids={tileIds} localId={localId} focusSessionId={focusSessionId} />
      ) : (
        <SpotlightStage
          screenSessionId={layout === 'screen' ? screen!.session_id : null}
          screenIsLocal={layout === 'screen' ? !!screen!.local : false}
          spotlightId={layout === 'speaker' ? spotlightId : null}
          filmstripIds={filmstripIds}
          localId={localId}
          focusSessionId={focusSessionId}
        />
      )}

      {/* ── Self PiP when minimised ─────────────────────────────────── */}
      {selfMinimized && localId && (
        <div className="absolute bottom-4 right-4 z-30 w-28 h-20 sm:w-36 sm:h-24 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/15">
          <ParticipantTile sessionId={localId} isLocal compact />
        </div>
      )}
    </div>
  );
}

// ── Gallery: equal tiles ──────────────────────────────────────────────────────

function GalleryStage({
  ids, localId, focusSessionId,
}: { ids: string[]; localId: string | null; focusSessionId?: string }) {
  const count = ids.length;
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

  return (
    <div className="w-full h-full p-3 sm:p-4 overflow-y-auto">
      {/* auto-rows-fr makes every row an equal fraction of the height, so a
          single tile (or any count) fills the available space instead of
          collapsing to its min-height and leaving a dead gap below. */}
      <div className={`grid ${gridClass} auto-rows-fr gap-3 sm:gap-4 h-full`}>
        {ids.map((id) => (
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

// ── Spotlight: big stage + filmstrip (speaker & screen-share modes) ───────────

function SpotlightStage({
  screenSessionId, screenIsLocal, spotlightId, filmstripIds, localId, focusSessionId,
}: {
  screenSessionId: string | null;
  screenIsLocal: boolean;
  spotlightId: string | null;
  filmstripIds: string[];
  localId: string | null;
  focusSessionId?: string;
}) {
  return (
    <div className="w-full h-full flex flex-col p-3 sm:p-4 gap-3">
      {/* Stage */}
      <div className="flex-1 min-h-0">
        {screenSessionId ? (
          <ScreenShareTile sessionId={screenSessionId} isLocal={screenIsLocal} />
        ) : spotlightId ? (
          <ParticipantTile
            sessionId={spotlightId}
            isLocal={spotlightId === localId}
            focusSessionId={focusSessionId}
          />
        ) : null}
      </div>

      {/* Filmstrip */}
      {filmstripIds.length > 0 && (
        <div className="shrink-0 flex gap-2 sm:gap-3 overflow-x-auto pb-1">
          {filmstripIds.map((id) => (
            <div
              key={id}
              className="shrink-0 w-28 h-20 sm:w-40 sm:h-28"
            >
              <ParticipantTile
                sessionId={id}
                isLocal={id === localId}
                focusSessionId={focusSessionId}
                compact
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Small frosted toolbar button ──────────────────────────────────────────────

function ToolbarButton({
  onClick, label, children,
}: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-9 h-9 grid place-items-center rounded-full bg-black/50 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/70 transition-all active:scale-95"
    >
      {children}
    </button>
  );
}
