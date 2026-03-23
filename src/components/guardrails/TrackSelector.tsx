import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Layers, MoreHorizontal, Calendar } from 'lucide-react';
import { useActiveDataContext } from '../../state/useActiveDataContext';
import { setActiveTrackId, setActiveSubtrackId, resetTrackContext } from '../../state/activeDataContext';
import { getTracksForProject } from '../../lib/guardrails/tracks';
import { getSubTracksForTrack } from '../../lib/guardrails/subtracks';
import type { Track } from '../../lib/guardrails/tracksTypes';
import type { SubTrack } from '../../lib/guardrails/subtracksTypes';
import { SubtrackCalendarSyncModal } from './settings/SubtrackCalendarSyncModal';
import { useActiveDataContext as useADC } from '../../contexts/ActiveDataContext';

interface TrackSelectorProps {
  compact?: boolean;
}

export function TrackSelector({ compact = false }: TrackSelectorProps) {
  const { activeProjectId, activeTrackId, activeSubtrackId } = useActiveDataContext();
  const { activeProjectId: adcProjectId, activeProject } = useADC();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [subtracks, setSubtracks] = useState<SubTrack[]>([]);
  const [showSubtracks, setShowSubtracks] = useState(true);
  const [loading, setLoading] = useState(false);
  const [subtrackMenuOpen, setSubtrackMenuOpen] = useState<string | null>(null);
  const [calendarSyncModal, setCalendarSyncModal] = useState<{
    trackId: string;
    trackName: string;
    subtrackId: string;
    subtrackName: string;
  } | null>(null);

  const effectiveProjectId = activeProjectId || adcProjectId || '';
  const effectiveProjectName = activeProject?.name || '';

  useEffect(() => {
    if (!activeProjectId) {
      setTracks([]);
      setSubtracks([]);
      return;
    }

    loadTracks();
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeTrackId) {
      setSubtracks([]);
      return;
    }

    loadSubtracks();
  }, [activeTrackId]);

  async function loadTracks() {
    if (!activeProjectId) return;

    try {
      setLoading(true);
      const tracksData = await getTracksForProject(activeProjectId);
      setTracks(tracksData);
    } catch (error) {
      console.error('Failed to load tracks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSubtracks() {
    if (!activeTrackId) return;

    try {
      const subtracksData = await getSubTracksForTrack(activeTrackId);
      setSubtracks(subtracksData);
    } catch (error) {
      console.error('Failed to load subtracks:', error);
      setSubtracks([]);
    }
  }

  function handleSelectTrack(trackId: string | null) {
    if (trackId === null) {
      resetTrackContext();
    } else {
      setActiveTrackId(trackId);
    }
  }

  function handleSelectSubtrack(subtrackId: string | null) {
    setActiveSubtrackId(subtrackId);
  }

  if (loading) {
    return (
      <div className={`bg-white border-b border-gray-200 ${compact ? 'px-4 py-2' : 'px-6 py-3'}`}>
        <div className="animate-pulse flex items-center gap-2">
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (tracks.length === 0) {
    return null;
  }

  const activeTrack = tracks.find(t => t.id === activeTrackId);
  const hasSubtracks = subtracks.length > 0;

  return (
    <div className={`bg-white border-b border-gray-200 ${compact ? 'px-4 py-2' : 'px-6 py-3'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Layers size={16} className="text-gray-500" />
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Track Filter
        </span>
        {activeTrack && hasSubtracks && (
          <button
            onClick={() => setShowSubtracks(!showSubtracks)}
            className="ml-auto p-1 hover:bg-gray-100 rounded transition-colors"
            title={showSubtracks ? 'Hide subtracks' : 'Show subtracks'}
          >
            {showSubtracks ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <button
          onClick={() => handleSelectTrack(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            !activeTrackId
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Tracks
        </button>

        {tracks.map((track) => {
          const isActive = track.id === activeTrackId;
          const trackColor = track.color || '#6B7280';

          return (
            <button
              key={track.id}
              onClick={() => handleSelectTrack(track.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={isActive ? { backgroundColor: trackColor } : undefined}
              title={track.description || track.name}
            >
              {track.name}
            </button>
          );
        })}
      </div>

      {activeTrack && hasSubtracks && showSubtracks && (
        <div className="flex items-center gap-2 overflow-x-auto mt-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => handleSelectSubtrack(null)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              !activeSubtrackId
                ? 'bg-gray-700 text-white'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            All {activeTrack.name}
          </button>

          {subtracks.map((subtrack) => {
            const isActive = subtrack.id === activeSubtrackId;
            const trackColor = activeTrack.color || '#6B7280';
            const isMenuOpen = subtrackMenuOpen === subtrack.id;

            return (
              <div key={subtrack.id} className="relative flex-shrink-0 flex items-center gap-1">
                <button
                  onClick={() => handleSelectSubtrack(subtrack.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? 'text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                  style={isActive ? { backgroundColor: trackColor, opacity: 0.8 } : undefined}
                  title={subtrack.description || subtrack.name}
                >
                  {subtrack.name}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSubtrackMenuOpen(isMenuOpen ? null : subtrack.id);
                  }}
                  className={`p-1 rounded transition-colors ${
                    isMenuOpen
                      ? 'bg-gray-200 text-gray-700'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Subtrack options"
                >
                  <MoreHorizontal size={12} />
                </button>
                {isMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setSubtrackMenuOpen(null)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeTrack && effectiveProjectId && effectiveProjectName) {
                            setCalendarSyncModal({
                              trackId: activeTrack.id,
                              trackName: activeTrack.name,
                              subtrackId: subtrack.id,
                              subtrackName: subtrack.name,
                            });
                          }
                          setSubtrackMenuOpen(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Calendar size={14} />
                        Calendar Sync Settings
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(activeTrackId || activeSubtrackId) && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              Viewing:{' '}
              <span className="font-semibold text-gray-900">
                {activeTrack?.name}
                {activeSubtrackId && subtracks.find(s => s.id === activeSubtrackId) && (
                  <span> → {subtracks.find(s => s.id === activeSubtrackId)?.name}</span>
                )}
              </span>
            </span>
            <button
              onClick={() => resetTrackContext()}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear Filter
            </button>
          </div>
        </div>
      )}

      {/* Subtrack Calendar Sync Modal */}
      {calendarSyncModal && effectiveProjectId && effectiveProjectName && (
        <SubtrackCalendarSyncModal
          isOpen={!!calendarSyncModal}
          onClose={() => setCalendarSyncModal(null)}
          projectId={effectiveProjectId}
          projectName={effectiveProjectName}
          trackId={calendarSyncModal.trackId}
          trackName={calendarSyncModal.trackName}
          subtrackId={calendarSyncModal.subtrackId}
          subtrackName={calendarSyncModal.subtrackName}
        />
      )}
    </div>
  );
}
