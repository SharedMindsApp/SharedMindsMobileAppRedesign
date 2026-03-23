/**
 * GuardRailsCalendarSyncSheet
 * 
 * Full-screen sheet for user-initiated, selective GuardRails → Calendar sync.
 * 
 * Features:
 * - Project-driven selection
 * - Nested hierarchy (projects → tracks → subtracks → items)
 * - Cascading checkbox logic
 * - Visual indicators for synced items
 */

import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown, Check, X, Loader2 } from 'lucide-react';
import { BottomSheet } from '../shared/BottomSheet';
import { useAuth } from '../../core/auth/AuthProvider';
import {
  getGuardRailsProjects,
  getSyncEntries,
  applyCalendarSync,
  removeCalendarSync,
  type ProjectHierarchy,
  type TrackHierarchy,
  type SubTrackHierarchy,
  type RoadmapItemSummary,
  type SyncSelection,
} from '../../lib/calendarIntegrations/guardrailsProjection';

interface GuardRailsCalendarSyncSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

type SelectionState = 'none' | 'partial' | 'all';

interface SelectionNode {
  projectId: string;
  trackId?: string;
  subtrackId?: string;
  itemId?: string;
  selected: boolean;
  indeterminate: boolean;
}

export function GuardRailsCalendarSyncSheet({ isOpen, onClose }: GuardRailsCalendarSyncSheetProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectHierarchy[]>([]);
  const [syncEntries, setSyncEntries] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set());
  const [expandedSubtracks, setExpandedSubtracks] = useState<Set<string>>(new Set());
  const [selections, setSelections] = useState<Map<string, SelectionNode>>(new Map());

  // Load projects and sync entries
  useEffect(() => {
    if (!isOpen || !user) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [projectsData, syncEntriesData] = await Promise.all([
          getGuardRailsProjects(user.id),
          getSyncEntries(user.id),
        ]);

        setProjects(projectsData);

        // Build set of synced entity keys
        const syncedKeys = new Set<string>();
        syncEntriesData.forEach(entry => {
          const key = buildSelectionKey(entry.projectId, entry.trackId, entry.subtrackId, entry.itemId);
          syncedKeys.add(key);
        });
        setSyncEntries(syncedKeys);

        // Initialize selections from sync entries
        const initialSelections = new Map<string, SelectionNode>();
        syncEntriesData.forEach(entry => {
          const key = buildSelectionKey(entry.projectId, entry.trackId, entry.subtrackId, entry.itemId);
          initialSelections.set(key, {
            projectId: entry.projectId,
            trackId: entry.trackId || undefined,
            subtrackId: entry.subtrackId || undefined,
            itemId: entry.itemId || undefined,
            selected: true,
            indeterminate: false,
          });
        });
        setSelections(initialSelections);
      } catch (error) {
        console.error('Failed to load GuardRails data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, user]);

  // Build selection key
  const buildSelectionKey = (projectId: string, trackId?: string | null, subtrackId?: string | null, itemId?: string | null): string => {
    return `${projectId}:${trackId || ''}:${subtrackId || ''}:${itemId || ''}`;
  };

  // Get selection state for a node
  const getSelectionState = (projectId: string, trackId?: string, subtrackId?: string, itemId?: string): SelectionState => {
    const key = buildSelectionKey(projectId, trackId, subtrackId, itemId);
    const node = selections.get(key);
    if (!node) return 'none';
    if (node.indeterminate) return 'partial';
    return node.selected ? 'all' : 'none';
  };

  // Toggle selection
  const toggleSelection = (projectId: string, trackId?: string, subtrackId?: string, itemId?: string) => {
    const key = buildSelectionKey(projectId, trackId, subtrackId, itemId);
    const current = selections.get(key);
    const newSelected = !current?.selected;

    const newSelections = new Map(selections);

    if (itemId) {
      // Toggle individual item
      newSelections.set(key, {
        projectId,
        trackId,
        subtrackId,
        itemId,
        selected: newSelected,
        indeterminate: false,
      });

      // Update parent subtrack
      if (subtrackId) {
        updateParentSelection(newSelections, projectId, trackId, subtrackId);
      }
    } else if (subtrackId) {
      // Toggle subtrack (and all its items)
      const project = projects.find(p => p.id === projectId);
      const track = project?.tracks.find(t => t.id === trackId);
      const subtrack = track?.subtracks.find(s => s.id === subtrackId);

      if (subtrack) {
        // Select/deselect all items in subtrack
        subtrack.items.forEach(item => {
          const itemKey = buildSelectionKey(projectId, trackId, subtrackId, item.id);
          newSelections.set(itemKey, {
            projectId,
            trackId,
            subtrackId,
            itemId: item.id,
            selected: newSelected,
            indeterminate: false,
          });
        });

        // Update subtrack itself
        newSelections.set(key, {
          projectId,
          trackId,
          subtrackId,
          selected: newSelected,
          indeterminate: false,
        });

        // Update parent track
        updateParentSelection(newSelections, projectId, trackId);
      }
    } else if (trackId) {
      // Toggle track (and all its subtracks and items)
      const project = projects.find(p => p.id === projectId);
      const track = project?.tracks.find(t => t.id === trackId);

      if (track) {
        // Select/deselect all subtracks
        track.subtracks.forEach(subtrack => {
          const subtrackKey = buildSelectionKey(projectId, trackId, subtrack.id);
          newSelections.set(subtrackKey, {
            projectId,
            trackId,
            subtrackId: subtrack.id,
            selected: newSelected,
            indeterminate: false,
          });

          // Select/deselect all items in subtrack
          subtrack.items.forEach(item => {
            const itemKey = buildSelectionKey(projectId, trackId, subtrack.id, item.id);
            newSelections.set(itemKey, {
              projectId,
              trackId,
              subtrackId: subtrack.id,
              itemId: item.id,
              selected: newSelected,
              indeterminate: false,
            });
          });
        });

        // Select/deselect all items directly in track
        track.items.forEach(item => {
          const itemKey = buildSelectionKey(projectId, trackId, undefined, item.id);
          newSelections.set(itemKey, {
            projectId,
            trackId,
            itemId: item.id,
            selected: newSelected,
            indeterminate: false,
          });
        });

        // Update track itself
        newSelections.set(key, {
          projectId,
          trackId,
          selected: newSelected,
          indeterminate: false,
        });

        // Update parent project
        updateParentSelection(newSelections, projectId);
      }
    } else {
      // Toggle project (and all its tracks, subtracks, and items)
      const project = projects.find(p => p.id === projectId);

      if (project) {
        project.tracks.forEach(track => {
          const trackKey = buildSelectionKey(projectId, track.id);
          newSelections.set(trackKey, {
            projectId,
            trackId: track.id,
            selected: newSelected,
            indeterminate: false,
          });

          track.subtracks.forEach(subtrack => {
            const subtrackKey = buildSelectionKey(projectId, track.id, subtrack.id);
            newSelections.set(subtrackKey, {
              projectId,
              trackId: track.id,
              subtrackId: subtrack.id,
              selected: newSelected,
              indeterminate: false,
            });

            subtrack.items.forEach(item => {
              const itemKey = buildSelectionKey(projectId, track.id, subtrack.id, item.id);
              newSelections.set(itemKey, {
                projectId,
                trackId: track.id,
                subtrackId: subtrack.id,
                itemId: item.id,
                selected: newSelected,
                indeterminate: false,
              });
            });
          });

          track.items.forEach(item => {
            const itemKey = buildSelectionKey(projectId, track.id, undefined, item.id);
            newSelections.set(itemKey, {
              projectId,
              trackId: track.id,
              itemId: item.id,
              selected: newSelected,
              indeterminate: false,
            });
          });
        });

        // Update project itself
        newSelections.set(key, {
          projectId,
          selected: newSelected,
          indeterminate: false,
        });
      }
    }

    setSelections(newSelections);
  };

  // Update parent selection state based on children
  const updateParentSelection = (
    selections: Map<string, SelectionNode>,
    projectId: string,
    trackId?: string,
    subtrackId?: string
  ) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    if (subtrackId && trackId) {
      // Update subtrack based on its items
      const track = project.tracks.find(t => t.id === trackId);
      const subtrack = track?.subtracks.find(s => s.id === subtrackId);
      if (!subtrack) return;

      const itemKeys = subtrack.items.map(item => buildSelectionKey(projectId, trackId, subtrackId, item.id));
      const selectedItems = itemKeys.filter(key => selections.get(key)?.selected).length;
      const totalItems = itemKeys.length;

      const subtrackKey = buildSelectionKey(projectId, trackId, subtrackId);
      if (totalItems === 0) {
        selections.delete(subtrackKey);
      } else {
        selections.set(subtrackKey, {
          projectId,
          trackId,
          subtrackId,
          selected: selectedItems === totalItems,
          indeterminate: selectedItems > 0 && selectedItems < totalItems,
        });
      }

      // Update parent track
      updateParentSelection(selections, projectId, trackId);
    } else if (trackId) {
      // Update track based on its subtracks and items
      const track = project.tracks.find(t => t.id === trackId);
      if (!track) return;

      const subtrackKeys = track.subtracks.map(s => buildSelectionKey(projectId, trackId, s.id));
      const itemKeys = track.items.map(item => buildSelectionKey(projectId, trackId, undefined, item.id));
      const allKeys = [...subtrackKeys, ...itemKeys];

      const selectedCount = allKeys.filter(key => {
        const node = selections.get(key);
        return node?.selected || (node?.indeterminate && node.selected);
      }).length;
      const totalCount = allKeys.length;

      const trackKey = buildSelectionKey(projectId, trackId);
      if (totalCount === 0) {
        selections.delete(trackKey);
      } else {
        const allSelected = allKeys.every(key => selections.get(key)?.selected);
        selections.set(trackKey, {
          projectId,
          trackId,
          selected: allSelected,
          indeterminate: selectedCount > 0 && !allSelected,
        });
      }

      // Update parent project
      updateParentSelection(selections, projectId);
    } else {
      // Update project based on its tracks
      const trackKeys = project.tracks.map(t => buildSelectionKey(projectId, t.id));
      const selectedCount = trackKeys.filter(key => {
        const node = selections.get(key);
        return node?.selected || (node?.indeterminate && node.selected);
      }).length;
      const totalCount = trackKeys.length;

      const projectKey = buildSelectionKey(projectId);
      if (totalCount === 0) {
        selections.delete(projectKey);
      } else {
        const allSelected = trackKeys.every(key => selections.get(key)?.selected);
        selections.set(projectKey, {
          projectId,
          selected: allSelected,
          indeterminate: selectedCount > 0 && !allSelected,
        });
      }
    }
  };

  // Save sync selections
  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Build sync selections
      const toSync: SyncSelection[] = [];
      const toUnsync: SyncSelection[] = [];

      selections.forEach((node, key) => {
        // Only process leaf nodes (items) or parent nodes that are fully selected
        if (node.itemId) {
          // Individual item
          if (node.selected) {
            toSync.push({
              projectId: node.projectId,
              trackId: node.trackId,
              subtrackId: node.subtrackId,
              itemId: node.itemId,
              syncLevel: 'item',
            });
          } else if (syncEntries.has(key)) {
            toUnsync.push({
              projectId: node.projectId,
              trackId: node.trackId,
              subtrackId: node.subtrackId,
              itemId: node.itemId,
              syncLevel: 'item',
            });
          }
        } else if (node.subtrackId && node.selected && !node.indeterminate) {
          // Fully selected subtrack
          toSync.push({
            projectId: node.projectId,
            trackId: node.trackId,
            subtrackId: node.subtrackId,
            syncLevel: 'subtrack',
          });
        } else if (node.trackId && node.selected && !node.indeterminate) {
          // Fully selected track
          toSync.push({
            projectId: node.projectId,
            trackId: node.trackId,
            syncLevel: 'track',
          });
        } else if (!node.trackId && node.selected && !node.indeterminate) {
          // Fully selected project
          toSync.push({
            projectId: node.projectId,
            syncLevel: 'project',
          });
        }
      });

      // Apply sync
      if (toSync.length > 0) {
        await applyCalendarSync(user.id, toSync);
      }

      // Remove sync
      if (toUnsync.length > 0) {
        await removeCalendarSync(user.id, toUnsync);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save sync:', error);
      alert('Failed to save sync. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Render checkbox
  const renderCheckbox = (state: SelectionState, onToggle: () => void) => {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`
          min-w-[44px] min-h-[44px] flex items-center justify-center rounded border-2 transition-all
          ${state === 'all'
            ? 'border-blue-600 bg-blue-600 text-white'
            : state === 'partial'
              ? 'border-blue-600 bg-blue-100 text-blue-600'
              : 'border-gray-300 bg-white text-gray-400 hover:border-gray-400'
          }
        `}
        aria-label={state === 'all' ? 'Selected' : state === 'partial' ? 'Partially selected' : 'Not selected'}
      >
        {state === 'all' && <Check size={20} />}
        {state === 'partial' && <div className="w-3 h-0.5 bg-blue-600" />}
      </button>
    );
  };

  if (!isOpen) return null;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Sync from GuardRails"
      maxHeight="90vh"
      footer={
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all font-medium min-h-[44px]"
            type="button"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium min-h-[44px]"
            type="button"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No GuardRails projects found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map(project => {
            const projectState = getSelectionState(project.id);
            const isExpanded = expandedProjects.has(project.id);

            return (
              <div key={project.id} className="border-b border-gray-200 last:border-b-0">
                {/* Project Row */}
                <div className="flex items-center gap-3 py-3 px-2">
                  <button
                    onClick={() => {
                      setExpandedProjects(prev => {
                        const next = new Set(prev);
                        if (next.has(project.id)) {
                          next.delete(project.id);
                        } else {
                          next.add(project.id);
                        }
                        return next;
                      });
                    }}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>
                  {renderCheckbox(projectState, () => toggleSelection(project.id))}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{project.name}</div>
                    <div className="text-xs text-gray-500">
                      {project.tracks.length} track{project.tracks.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Tracks (collapsed) */}
                {isExpanded && (
                  <div className="pl-12 space-y-1">
                    {project.tracks.map(track => {
                      const trackState = getSelectionState(project.id, track.id);
                      const isTrackExpanded = expandedTracks.has(track.id);

                      return (
                        <div key={track.id} className="border-l-2 border-gray-100 pl-3">
                          {/* Track Row */}
                          <div className="flex items-center gap-3 py-2">
                            <button
                              onClick={() => {
                                setExpandedTracks(prev => {
                                  const next = new Set(prev);
                                  if (next.has(track.id)) {
                                    next.delete(track.id);
                                  } else {
                                    next.add(track.id);
                                  }
                                  return next;
                                });
                              }}
                              className="min-w-[44px] min-h-[44px] flex items-center justify-center"
                            >
                              {isTrackExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>
                            {renderCheckbox(trackState, () => toggleSelection(project.id, track.id))}
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-800">{track.name}</div>
                              <div className="text-xs text-gray-500">
                                {track.subtracks.length} subtrack{track.subtracks.length !== 1 ? 's' : ''}, {track.items.length} item{track.items.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>

                          {/* Subtracks and Items (collapsed) */}
                          {isTrackExpanded && (
                            <div className="pl-8 space-y-1">
                              {/* Subtracks */}
                              {track.subtracks.map(subtrack => {
                                const subtrackState = getSelectionState(project.id, track.id, subtrack.id);
                                const isSubtrackExpanded = expandedSubtracks.has(subtrack.id);

                                return (
                                  <div key={subtrack.id} className="border-l-2 border-gray-50 pl-3">
                                    {/* Subtrack Row */}
                                    <div className="flex items-center gap-3 py-2">
                                      <button
                                        onClick={() => {
                                          setExpandedSubtracks(prev => {
                                            const next = new Set(prev);
                                            if (next.has(subtrack.id)) {
                                              next.delete(subtrack.id);
                                            } else {
                                              next.add(subtrack.id);
                                            }
                                            return next;
                                          });
                                        }}
                                        className="min-w-[44px] min-h-[44px] flex items-center justify-center"
                                      >
                                        {isSubtrackExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                      </button>
                                      {renderCheckbox(subtrackState, () => toggleSelection(project.id, track.id, subtrack.id))}
                                      <div className="flex-1">
                                        <div className="font-medium text-sm text-gray-700">{subtrack.name}</div>
                                        <div className="text-xs text-gray-500">
                                          {subtrack.items.length} item{subtrack.items.length !== 1 ? 's' : ''}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Items (collapsed) */}
                                    {isSubtrackExpanded && (
                                      <div className="pl-8 space-y-1">
                                        {subtrack.items.map(item => {
                                          const itemState = getSelectionState(project.id, track.id, subtrack.id, item.id);
                                          const isSynced = syncEntries.has(buildSelectionKey(project.id, track.id, subtrack.id, item.id));

                                          return (
                                            <div key={item.id} className="flex items-center gap-3 py-1.5 pl-3">
                                              {renderCheckbox(itemState, () => toggleSelection(project.id, track.id, subtrack.id, item.id))}
                                              <div className="flex-1">
                                                <div className="text-sm text-gray-800">{item.title}</div>
                                                {isSynced && (
                                                  <div className="text-xs text-blue-600">In your calendar</div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Items directly in track */}
                              {track.items.map(item => {
                                const itemState = getSelectionState(project.id, track.id, undefined, item.id);
                                const isSynced = syncEntries.has(buildSelectionKey(project.id, track.id, undefined, item.id));

                                return (
                                  <div key={item.id} className="flex items-center gap-3 py-1.5 pl-3">
                                    {renderCheckbox(itemState, () => toggleSelection(project.id, track.id, undefined, item.id))}
                                    <div className="flex-1">
                                      <div className="text-sm text-gray-800">{item.title}</div>
                                      {isSynced && (
                                        <div className="text-xs text-blue-600">In your calendar</div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </BottomSheet>
  );
}
