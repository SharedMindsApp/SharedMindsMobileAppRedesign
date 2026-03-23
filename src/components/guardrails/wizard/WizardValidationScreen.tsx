import { useState, useEffect, useMemo } from 'react';
import { Check, Loader2, Target, ChevronDown, ChevronRight } from 'lucide-react';
import { getTracksForProject } from '../../../lib/guardrails/tracks';
import { getTrackChildren } from '../../../lib/guardrails/trackService';
import type { Track } from '../../../lib/guardrails/tracksTypes';

interface TrackValidationState {
  trackId: string;
  trackName: string;
  isValidated: boolean;
  subtracks: Array<{
    subtrackId: string;
    subtrackName: string;
    isValidated: boolean;
  }>;
}

interface WizardValidationScreenProps {
  projectId: string;
  expectedTracks: Track[];
  expectedSubtracks: Array<{ id: string; track_id: string; name: string }>;
  onValidationComplete: () => void;
}

export function WizardValidationScreen({
  projectId,
  expectedTracks,
  expectedSubtracks,
  onValidationComplete,
}: WizardValidationScreenProps) {
  const [validationState, setValidationState] = useState<Map<string, TrackValidationState>>(new Map());
  const [isValidating, setIsValidating] = useState(true);
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set());

  // Initialize validation state from expected tracks and subtracks
  useEffect(() => {
    const initialState = new Map<string, TrackValidationState>();

    for (const track of expectedTracks) {
      const subtracksForTrack = expectedSubtracks.filter(st => st.track_id === track.id);
      initialState.set(track.id, {
        trackId: track.id,
        trackName: track.name,
        isValidated: false,
        subtracks: subtracksForTrack.map(st => ({
          subtrackId: st.id,
          subtrackName: st.name,
          isValidated: false,
        })),
      });
    }

    setValidationState(initialState);
    setIsValidating(true);
  }, [expectedTracks, expectedSubtracks]);

  // Validation logic
  useEffect(() => {
    if (!isValidating || validationState.size === 0) return;

    let isMounted = true;
    let validationInterval: NodeJS.Timeout;

    const validateTracksAndSubtracks = async () => {
      try {
        // Fetch all tracks for the project from Supabase
        const actualTracks = await getTracksForProject(projectId);

        // Update tracks validation
        setValidationState(prev => {
          const next = new Map(prev);
          for (const [trackId, state] of next.entries()) {
            const actualTrack = actualTracks.find(t => t.id === trackId);
            if (actualTrack && !state.isValidated) {
              next.set(trackId, {
                ...state,
                isValidated: true,
              });
            }
          }
          return next;
        });

        // Validate subtracks for validated tracks (async, separate from state update)
        setValidationState(prevState => {
          const validatedTracksList = Array.from(prevState.entries()).filter(([_, state]) => state.isValidated && state.subtracks.some(st => !st.isValidated));
          
          if (validatedTracksList.length > 0) {
            // Validate subtracks asynchronously
            Promise.all(
              validatedTracksList.map(async ([trackId]) => {
                try {
                  const children = await getTrackChildren(trackId);
                  return { trackId, children };
                } catch (error) {
                  console.error(`Failed to validate subtracks for track ${trackId}:`, error);
                  return { trackId, children: [] };
                }
              })
            ).then(results => {
              if (!isMounted) return;

              setValidationState(prevState => {
                const nextState = new Map(prevState);
                
                for (const result of results) {
                  const { trackId, children } = result;
                  const state = nextState.get(trackId);
                  if (!state) continue;

                  const updatedSubtracks = state.subtracks.map(subtrack => {
                    const exists = children.some(child => child.id === subtrack.subtrackId);
                    return {
                      ...subtrack,
                      isValidated: exists,
                    };
                  });

                  nextState.set(trackId, {
                    ...state,
                    subtracks: updatedSubtracks,
                  });
                }

                // Check if all validation is complete
                const states = Array.from(nextState.values());
                const allTracksDone = states.length > 0 && states.every(t => t.isValidated);
                const allSubtracksDone = states.every(t => 
                  t.subtracks.length === 0 || t.subtracks.every(st => st.isValidated)
                );

                if (allTracksDone && allSubtracksDone && isMounted) {
                  setIsValidating(false);
                  setTimeout(() => {
                    if (isMounted) {
                      onValidationComplete();
                    }
                  }, 500);
                }

                return nextState;
              });
            });
          }
          
          return prevState;
        });
      } catch (error) {
        console.error('Validation error:', error);
        // Continue validation on error
      }
    };

    // Initial validation
    validateTracksAndSubtracks();

    // Poll every 500ms for validation
    validationInterval = setInterval(() => {
      if (isMounted && isValidating) {
        validateTracksAndSubtracks();
      }
    }, 500);

    return () => {
      isMounted = false;
      if (validationInterval) {
        clearInterval(validationInterval);
      }
    };
  }, [projectId, isValidating, onValidationComplete]);

  // Check if all validation is complete
  const validationComplete = useMemo(() => {
    const states = Array.from(validationState.values());
    const allTracksDone = states.length > 0 && states.every(t => t.isValidated);
    const allSubtracksDone = states.every(t => 
      t.subtracks.length === 0 || t.subtracks.every(st => st.isValidated)
    );
    return allTracksDone && allSubtracksDone;
  }, [validationState]);

  const toggleTrackExpansion = (trackId: string) => {
    setExpandedTracks(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  };

  const tracksArray = Array.from(validationState.values());
  const totalTracks = tracksArray.length;
  const totalSubtracks = tracksArray.reduce((sum, t) => sum + t.subtracks.length, 0);
  const validatedTracks = tracksArray.filter(t => t.isValidated).length;
  const validatedSubtracks = tracksArray.reduce((sum, t) => 
    sum + t.subtracks.filter(st => st.isValidated).length, 0
  );

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
      {/* Header */}
      <div className="text-center mb-8 md:mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">
          Creating Your Project
        </h2>
        <p className="text-gray-600 text-base md:text-lg">
          Validating tracks and subtracks...
        </p>
      </div>

      {/* Progress Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              {validationComplete ? (
                <Check className="w-5 h-5 text-white" />
              ) : (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              )}
            </div>
            <div>
              <div className="text-sm md:text-base font-semibold text-blue-900">
                {validationComplete ? 'Validation Complete' : 'Validating...'}
              </div>
              <div className="text-xs md:text-sm text-blue-700">
                {validatedTracks} of {totalTracks} tracks • {validatedSubtracks} of {totalSubtracks} subtracks
              </div>
            </div>
          </div>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${totalTracks + totalSubtracks > 0 
                ? ((validatedTracks + validatedSubtracks) / (totalTracks + totalSubtracks)) * 100 
                : 100}%`,
            }}
          />
        </div>
      </div>

      {/* Validation List */}
      <div className="space-y-3 md:space-y-4">
        {tracksArray.map((trackState) => {
          const isExpanded = expandedTracks.has(trackState.trackId);
          const hasSubtracks = trackState.subtracks.length > 0;

          return (
            <div
              key={trackState.trackId}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Track Row */}
              <div className="p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {trackState.isValidated ? (
                        <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Target className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
                      <span className="text-base md:text-lg font-semibold text-gray-900 truncate">
                        {trackState.trackName}
                      </span>
                    </div>
                  </div>
                  {hasSubtracks && (
                    <button
                      type="button"
                      onClick={() => toggleTrackExpansion(trackState.trackId)}
                      className="flex-shrink-0 ml-3 p-1 text-gray-500 hover:text-gray-700"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Subtracks List */}
              {hasSubtracks && isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <div className="p-4 md:p-5 space-y-3">
                    {trackState.subtracks.map((subtrack) => (
                      <div
                        key={subtrack.subtrackId}
                        className="flex items-center gap-3 pl-6 md:pl-8"
                      >
                        <div className="flex-shrink-0">
                          {subtrack.isValidated ? (
                            <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                              <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                            </div>
                          )}
                        </div>
                        <span className="text-sm md:text-base text-gray-700">
                          {subtrack.subtrackName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
