/**
 * RoadmapSettingsSheet
 * 
 * Phase 4: Functional settings menu for Roadmap.
 * 
 * Provides:
 * - View Options (zoom, default view, today indicator)
 * - Track Visibility & Inclusion (per-track instance controls)
 * - Display Preferences (compact mode, icons, progress bars)
 * - Sharing & Export actions
 * - Link to Project Settings
 * 
 * ⚠️ CRITICAL: This component is render-only. All mutations happen via callbacks.
 */

import { useState, useMemo } from 'react';
import { BottomSheet } from '../../shared/BottomSheet';
import { Share2, Copy, Image, FileText, Settings, Eye, EyeOff, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useRoadmapViewPreferences, type RoadmapViewPreferences, type RoadmapDisplayPreferences } from '../../../hooks/useRoadmapViewPreferences';
import { useRoadmapProjection } from '../../../hooks/useRoadmapProjection';
import type { ZoomLevel } from '../../../lib/guardrails/infiniteTimelineUtils';
import type { TrackInstanceVisibility } from '../../../lib/guardrails/tracksTypes';
import type { RoadmapProjectionTrack } from '../../../lib/guardrails/roadmapProjectionTypes';
import { RecycleBinSection } from './RecycleBinSection';

interface RoadmapSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  masterProjectId: string;
  currentZoomLevel: ZoomLevel;
  onZoomLevelChange: (zoom: ZoomLevel) => void;
  onUpdateTrackInstance: (trackId: string, updates: { includeInRoadmap?: boolean; visibilityState?: TrackInstanceVisibility }) => Promise<void>;
  onOpenProjectSettings: () => void;
}

export function RoadmapSettingsSheet({
  isOpen,
  onClose,
  masterProjectId,
  currentZoomLevel,
  onZoomLevelChange,
  onUpdateTrackInstance,
  onOpenProjectSettings,
}: RoadmapSettingsSheetProps) {
  const { viewPrefs, displayPrefs, updateViewPrefs, updateDisplayPrefs } = useRoadmapViewPreferences();
  const projection = useRoadmapProjection(masterProjectId);
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['view']));
  const [updatingTracks, setUpdatingTracks] = useState<Set<string>>(new Set());

  // Get all tracks (including subtracks) for visibility controls
  const allTracks = useMemo(() => {
    const tracks: Array<{ trackId: string; trackName: string; isSubtrack: boolean; instance: RoadmapProjectionTrack['instance']; canEdit: boolean }> = [];
    
    projection.tracks.forEach(track => {
      // Add main track
      tracks.push({
        trackId: track.track.id,
        trackName: track.track.name,
        isSubtrack: false,
        instance: track.instance,
        canEdit: track.canEdit,
      });
      
      // Add subtracks
      track.subtracks.forEach(subtrack => {
        tracks.push({
          trackId: subtrack.track.id,
          trackName: subtrack.track.name,
          isSubtrack: true,
          instance: subtrack.instance,
          canEdit: subtrack.canEdit,
        });
      });
    });
    
    return tracks;
  }, [projection.tracks]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleUpdateTrackInstance = async (trackId: string, updates: { includeInRoadmap?: boolean; visibilityState?: TrackInstanceVisibility }) => {
    setUpdatingTracks(prev => new Set(prev).add(trackId));
    try {
      await onUpdateTrackInstance(trackId, updates);
      // Refresh projection to reflect changes
      await projection.refresh();
    } catch (error) {
      console.error('[RoadmapSettingsSheet] Failed to update track instance:', error);
    } finally {
      setUpdatingTracks(prev => {
        const next = new Set(prev);
        next.delete(trackId);
        return next;
      });
    }
  };
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Roadmap Settings"
      maxHeight="90vh"
      closeOnBackdrop={true}
    >
      <div className="space-y-4">
        {/* Phase 4: View Options Section */}
        <section>
          <button
            onClick={() => toggleSection('view')}
            className="w-full flex items-center justify-between py-2"
          >
            <h3 className="text-sm font-semibold text-gray-900">View Options</h3>
            {expandedSections.has('view') ? (
              <ChevronDown size={16} className="text-gray-500" />
            ) : (
              <ChevronRight size={16} className="text-gray-500" />
            )}
          </button>
          {expandedSections.has('view') && (
            <div className="space-y-3 mt-3 pl-2 border-l-2 border-gray-100">
              {/* Current Zoom Level (Phase 4: immediate control) */}
              {/* Phase 2: Only shown if currentZoomLevel and onZoomLevelChange are provided (InfiniteRoadmapView only) */}
              {currentZoomLevel !== undefined && onZoomLevelChange && (
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-2 block">Zoom Level</label>
                  <div className="flex gap-2">
                    {(['day', 'week', 'month'] as ZoomLevel[]).map(zoom => (
                      <button
                        key={zoom}
                        onClick={() => {
                          updateViewPrefs({ defaultZoomLevel: zoom });
                          onZoomLevelChange(zoom);
                        }}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                          currentZoomLevel === zoom
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {zoom === 'day' ? 'Day' : zoom === 'week' ? 'Week' : 'Month'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">This also sets your default zoom level</p>
                </div>
              )}

              {/* Default View (future-ready) */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block">Default View</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateViewPrefs({ defaultView: 'timeline' })}
                    disabled
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                      viewPrefs.defaultView === 'timeline'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Timeline
                  </button>
                  <button
                    onClick={() => updateViewPrefs({ defaultView: 'list' })}
                    disabled
                    className="flex-1 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-gray-50 text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="List view coming soon"
                  >
                    List
                  </button>
                </div>
              </div>

              {/* Show Today Indicator */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Show Today Indicator</label>
                <button
                  onClick={() => updateViewPrefs({ showTodayIndicator: !viewPrefs.showTodayIndicator })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    viewPrefs.showTodayIndicator ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      viewPrefs.showTodayIndicator ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Phase 4: Track Visibility & Inclusion Section */}
        <section>
          <button
            onClick={() => toggleSection('tracks')}
            className="w-full flex items-center justify-between py-2"
          >
            <h3 className="text-sm font-semibold text-gray-900">Track Visibility</h3>
            {expandedSections.has('tracks') ? (
              <ChevronDown size={16} className="text-gray-500" />
            ) : (
              <ChevronRight size={16} className="text-gray-500" />
            )}
          </button>
          {expandedSections.has('tracks') && (
            <div className="space-y-2 mt-3 pl-2 border-l-2 border-gray-100 max-h-64 overflow-y-auto">
              {allTracks.length === 0 ? (
                <p className="text-xs text-gray-500 py-2">No tracks available</p>
              ) : (
                allTracks.map(({ trackId, trackName, isSubtrack, instance, canEdit }) => {
                  const isUpdating = updatingTracks.has(trackId);
                  const includeInRoadmap = instance?.includeInRoadmap ?? true;
                  const visibilityState = instance?.visibilityState ?? 'visible';

                  return (
                    <div
                      key={trackId}
                      className={`p-3 rounded-lg border border-gray-200 bg-white ${isSubtrack ? 'ml-4' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-900 truncate flex-1">
                          {isSubtrack && '  '}
                          {trackName}
                        </span>
                        {!canEdit && (
                          <span className="text-xs text-gray-500 ml-2">Read-only</span>
                        )}
                      </div>

                      {/* Include in Roadmap Toggle */}
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-gray-600">Include in Roadmap</label>
                        {canEdit ? (
                          <button
                            onClick={() => handleUpdateTrackInstance(trackId, { includeInRoadmap: !includeInRoadmap })}
                            disabled={isUpdating}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              includeInRoadmap ? 'bg-blue-600' : 'bg-gray-300'
                            } disabled:opacity-50`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                includeInRoadmap ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {includeInRoadmap ? 'Yes' : 'No'}
                          </span>
                        )}
                      </div>

                      {/* Visibility State Dropdown */}
                      {includeInRoadmap && canEdit && (
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Visibility</label>
                          <select
                            value={visibilityState}
                            onChange={(e) => handleUpdateTrackInstance(trackId, { visibilityState: e.target.value as TrackInstanceVisibility })}
                            disabled={isUpdating}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="visible">Visible</option>
                            <option value="collapsed">Collapsed</option>
                            <option value="hidden">Hidden</option>
                          </select>
                        </div>
                      )}
                      {includeInRoadmap && !canEdit && (
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Visibility</label>
                          <div className="px-2 py-1 text-xs border border-gray-200 rounded-md bg-gray-50 text-gray-500">
                            {visibilityState === 'visible' ? 'Visible' : visibilityState === 'collapsed' ? 'Collapsed' : 'Hidden'}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>

        {/* Phase 4: Display Preferences Section */}
        <section>
          <button
            onClick={() => toggleSection('display')}
            className="w-full flex items-center justify-between py-2"
          >
            <h3 className="text-sm font-semibold text-gray-900">Display Preferences</h3>
            {expandedSections.has('display') ? (
              <ChevronDown size={16} className="text-gray-500" />
            ) : (
              <ChevronRight size={16} className="text-gray-500" />
            )}
          </button>
          {expandedSections.has('display') && (
            <div className="space-y-3 mt-3 pl-2 border-l-2 border-gray-100">
              {/* Compact Mode */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Compact Mode</label>
                <button
                  onClick={() => updateDisplayPrefs({ compactMode: !displayPrefs.compactMode })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    displayPrefs.compactMode ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      displayPrefs.compactMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Show Status Icons */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Show Status Icons</label>
                <button
                  onClick={() => updateDisplayPrefs({ showStatusIcons: !displayPrefs.showStatusIcons })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    displayPrefs.showStatusIcons ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      displayPrefs.showStatusIcons ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Show Progress Bars */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Show Progress Bars</label>
                <button
                  onClick={() => updateDisplayPrefs({ showProgressBars: !displayPrefs.showProgressBars })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    displayPrefs.showProgressBars ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      displayPrefs.showProgressBars ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Show Subtracks by Default (UI-only, overridden by manual collapse) */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Show Subtracks by Default</label>
                <button
                  onClick={() => updateDisplayPrefs({ showSubtracksByDefault: !displayPrefs.showSubtracksByDefault })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    displayPrefs.showSubtracksByDefault ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      displayPrefs.showSubtracksByDefault ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Phase 4a: Sharing & Export Section - Collapsible */}
        <section>
          <button
            onClick={() => toggleSection('sharing')}
            className="w-full flex items-center justify-between py-2"
          >
            <h3 className="text-sm font-semibold text-gray-900">Sharing & Export</h3>
            {expandedSections.has('sharing') ? (
              <ChevronDown size={16} className="text-gray-500" />
            ) : (
              <ChevronRight size={16} className="text-gray-500" />
            )}
          </button>
          {expandedSections.has('sharing') && (
            <div className="space-y-2 mt-3 pl-2 border-l-2 border-gray-100">
              <button
                onClick={() => {
                  console.log('[RoadmapSettingsSheet] Share Project placeholder clicked');
                  onClose();
                }}
                className="w-full px-4 py-3 text-left border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all min-h-[44px] flex items-center gap-3"
              >
                <Share2 size={20} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Share Project</span>
              </button>

              <button
                onClick={() => {
                  console.log('[RoadmapSettingsSheet] Copy Link placeholder clicked');
                  onClose();
                }}
                className="w-full px-4 py-3 text-left border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all min-h-[44px] flex items-center gap-3"
              >
                <Copy size={20} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Copy Link</span>
              </button>

              <button
                onClick={() => {
                  console.log('[RoadmapSettingsSheet] Export as Image placeholder clicked');
                  onClose();
                }}
                className="w-full px-4 py-3 text-left border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all min-h-[44px] flex items-center gap-3"
              >
                <Image size={20} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Export as Image</span>
              </button>

              <button
                onClick={() => {
                  console.log('[RoadmapSettingsSheet] Generate Report placeholder clicked');
                  onClose();
                }}
                className="w-full px-4 py-3 text-left border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all min-h-[44px] flex items-center gap-3"
              >
                <FileText size={20} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Generate Report</span>
              </button>
            </div>
          )}
        </section>

        {/* Recycle Bin Section */}
        <section>
          <button
            onClick={() => toggleSection('recycle')}
            className="w-full px-4 py-3 text-left border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all min-h-[44px] flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Trash2 size={20} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Recycle Bin</span>
            </div>
            {expandedSections.has('recycle') ? (
              <ChevronDown size={20} className="text-gray-400" />
            ) : (
              <ChevronRight size={20} className="text-gray-400" />
            )}
          </button>
          
          {expandedSections.has('recycle') && (
            <div className="mt-3 px-4 pb-4">
              <RecycleBinSection
                masterProjectId={masterProjectId}
                onRestore={async () => {
                  // Refresh projection after restore
                  await projection.refresh();
                }}
              />
            </div>
          )}
        </section>

        {/* Phase 4: Project Settings Link */}
        <section>
          <button
            onClick={() => {
              onOpenProjectSettings();
              onClose();
            }}
            className="w-full px-4 py-3 text-left border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all min-h-[44px] flex items-center gap-3"
          >
            <Settings size={20} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Open Project Settings</span>
          </button>
        </section>
      </div>
    </BottomSheet>
  );
}
