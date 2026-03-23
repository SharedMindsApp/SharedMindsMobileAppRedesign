/**
 * WorkspaceOverview Component
 * 
 * Phase 3.1: Overview Micro-App (Workspace Mutation Surface)
 * 
 * First mutation surface in the workspace layer. Provides overview and editing
 * capabilities for track/subtrack core intent fields.
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * 
 * What this component CAN do:
 * - ✅ Display track/subtrack metadata
 * - ✅ Edit objective, definition_of_done, time_intent (via service layer)
 * - ✅ Mutate universal_track_info (via service layer)
 * - ✅ Mutate track metadata (name, description, color via service layer)
 * 
 * What this component MUST NOT do:
 * - ❌ Query Supabase directly (use service layer only)
 * - ❌ Render roadmap logic
 * - ❌ Render timeline/bucket logic
 * - ❌ Shape projection data
 * - ❌ Direct roadmap mutation/refresh calls
 * 
 * Phase 3.1 Scope:
 * - Read/Write: guardrails_tracks (name, description, color)
 * - Read/Write: universal_track_info (objective, definition_of_done, time_mode, dates)
 * - Read Only: project_track_categories (display only)
 * - Read Only: subtrack_categories (display only, for subtracks)
 */

import { useState, useEffect, useCallback } from 'react';
import { Edit2, Save, X, Calendar, Target, CheckCircle2, Tag } from 'lucide-react';
import { getUniversalTrackInfoByTrackId, saveUniversalTrackInfo } from '../../../../lib/guardrails/universalTrackInfo';
import { updateTrack } from '../../../../lib/guardrails/tracksHierarchy';
import { getCategoryById } from '../../../../lib/guardrails/trackCategories';
import type { UniversalTrackInfo } from '../../../../lib/guardrails/universalTrackInfo';
import type { ProjectTrackCategory } from '../../../../lib/guardrails/trackCategories';
import { ENABLE_ENTITY_GRANTS } from '../../../../lib/featureFlags';
import { WorkspacePermissionsSection } from './WorkspacePermissionsSection';

export interface WorkspaceOverviewProps {
  // Context data
  projectId: string;
  trackId: string;
  trackName: string;
  trackDescription: string | null;
  trackColor: string | null;
  isSubtrack?: boolean;
  
  // Callback to refresh parent component when track metadata changes
  onTrackMetadataChange?: () => void;
}

type TimeMode = 'unscheduled' | 'target' | 'ranged' | 'ongoing';

interface EditState {
  objective: string;
  definitionOfDone: string;
  timeMode: TimeMode;
  startDate: string;
  endDate: string;
  targetDate: string;
}

export function WorkspaceOverview({
  projectId,
  trackId,
  trackName,
  trackDescription,
  trackColor,
  isSubtrack = false,
  onTrackMetadataChange,
}: WorkspaceOverviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackInfo, setTrackInfo] = useState<UniversalTrackInfo | null>(null);
  const [category, setCategory] = useState<ProjectTrackCategory | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editState, setEditState] = useState<EditState>({
    objective: '',
    definitionOfDone: '',
    timeMode: 'unscheduled',
    startDate: '',
    endDate: '',
    targetDate: '',
  });
  const [originalState, setOriginalState] = useState<EditState | null>(null);

  // Load track info and category
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Load universal track info
        const info = await getUniversalTrackInfoByTrackId(trackId);
        setTrackInfo(info);

        // Initialize edit state from loaded data
        if (info) {
          const state: EditState = {
            objective: info.objective || '',
            definitionOfDone: info.definition_of_done || '',
            timeMode: info.time_mode,
            startDate: info.start_date ? info.start_date.split('T')[0] : '',
            endDate: info.end_date ? info.end_date.split('T')[0] : '',
            targetDate: info.target_date ? info.target_date.split('T')[0] : '',
          };
          setEditState(state);
          setOriginalState(state);

          // Load category if available
          if (info.track_category_id) {
            const cat = await getCategoryById(info.track_category_id);
            setCategory(cat);
          }
        } else {
          // No track info exists yet - initialize with defaults
          const defaultState: EditState = {
            objective: '',
            definitionOfDone: '',
            timeMode: 'unscheduled',
            startDate: '',
            endDate: '',
            targetDate: '',
          };
          setEditState(defaultState);
          setOriginalState(defaultState);
        }
      } catch (err) {
        console.error('[WorkspaceOverview] Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load overview data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [trackId]);

  // Handle edit mode toggle
  const handleStartEdit = useCallback(() => {
    if (trackInfo) {
      setOriginalState({
        objective: trackInfo.objective || '',
        definitionOfDone: trackInfo.definition_of_done || '',
        timeMode: trackInfo.time_mode,
        startDate: trackInfo.start_date ? trackInfo.start_date.split('T')[0] : '',
        endDate: trackInfo.end_date ? trackInfo.end_date.split('T')[0] : '',
        targetDate: trackInfo.target_date ? trackInfo.target_date.split('T')[0] : '',
      });
    }
    setIsEditing(true);
  }, [trackInfo]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    if (originalState) {
      setEditState(originalState);
    }
    setIsEditing(false);
  }, [originalState]);

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      // Convert date strings to ISO format (or null)
      const startDate = editState.startDate ? `${editState.startDate}T00:00:00.000Z` : null;
      const endDate = editState.endDate ? `${editState.endDate}T00:00:00.000Z` : null;
      const targetDate = editState.targetDate ? `${editState.targetDate}T00:00:00.000Z` : null;

      // Save universal track info (upsert)
      const savedInfo = await saveUniversalTrackInfo({
        master_project_id: projectId,
        track_id: trackId,
        objective: editState.objective.trim(),
        definition_of_done: editState.definitionOfDone.trim(),
        time_mode: editState.timeMode,
        start_date: startDate,
        end_date: endDate,
        target_date: editState.timeMode === 'target' ? targetDate : null,
        track_category_id: trackInfo?.track_category_id || null,
      });

      setTrackInfo(savedInfo);
      setIsEditing(false);

      // Refresh parent if callback provided
      if (onTrackMetadataChange) {
        onTrackMetadataChange();
      }
    } catch (err) {
      console.error('[WorkspaceOverview] Error saving:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [editState, projectId, trackId, trackInfo?.track_category_id, onTrackMetadataChange]);

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading overview...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !trackInfo) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Format time intent display
  const formatTimeIntent = (): string => {
    if (!trackInfo) return 'Not set';
    
    switch (trackInfo.time_mode) {
      case 'unscheduled':
        return 'Unscheduled / exploratory';
      case 'target':
        if (trackInfo.target_date) {
          const date = new Date(trackInfo.target_date);
          return `Target: ${date.toLocaleDateString()}`;
        }
        return 'Target date (not set)';
      case 'ranged':
        const start = trackInfo.start_date ? new Date(trackInfo.start_date).toLocaleDateString() : 'Not set';
        const end = trackInfo.end_date ? new Date(trackInfo.end_date).toLocaleDateString() : 'Not set';
        return `${start} - ${end}`;
      case 'ongoing':
        return 'Ongoing';
      default:
        return 'Not set';
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto w-full p-4 md:p-6 space-y-6">
        {/* Error banner (if error during save) */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <p className="font-medium">Error saving changes</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Header Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-semibold text-gray-900 truncate">{trackName}</h2>
                {trackColor && (
                  <div
                    className="w-5 h-5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: trackColor }}
                    aria-label="Track color"
                  />
                )}
              </div>
              {trackDescription && (
                <p className="text-gray-600 mb-4">{trackDescription}</p>
              )}
              {category && (
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-gray-400" />
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    {category.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Objective Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target size={20} className="text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Objective</h3>
            </div>
            {!isEditing && (
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Edit2 size={16} />
                <span>Edit</span>
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <textarea
                value={editState.objective}
                onChange={(e) => setEditState({ ...editState, objective: e.target.value })}
                placeholder="What is the main objective of this track?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">
              {trackInfo?.objective || 'No objective set. Click Edit to add one.'}
            </p>
          )}
        </div>

        {/* Definition of Done Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Definition of Done</h3>
            </div>
            {!isEditing && (
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Edit2 size={16} />
                <span>Edit</span>
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <textarea
                value={editState.definitionOfDone}
                onChange={(e) => setEditState({ ...editState, definitionOfDone: e.target.value })}
                placeholder="How will you know this track is complete?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
              <p className="text-xs text-gray-500">1–2 sentences max</p>
            </div>
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">
              {trackInfo?.definition_of_done || 'No definition of done set. Click Edit to add one.'}
            </p>
          )}
        </div>

        {/* Time Intent Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Time Intent</h3>
            </div>
            {!isEditing && (
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Edit2 size={16} />
                <span>Edit</span>
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              {/* Time Mode Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Mode</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(['unscheduled', 'target', 'ranged', 'ongoing'] as TimeMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setEditState({ ...editState, timeMode: mode })}
                      className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        editState.timeMode === mode
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {mode === 'unscheduled' && 'Unscheduled'}
                      {mode === 'target' && 'Target Date'}
                      {mode === 'ranged' && 'Date Range'}
                      {mode === 'ongoing' && 'Ongoing'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Date Inputs */}
              {editState.timeMode === 'target' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Date</label>
                  <input
                    type="date"
                    value={editState.targetDate}
                    onChange={(e) => setEditState({ ...editState, targetDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {editState.timeMode === 'ranged' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={editState.startDate}
                      onChange={(e) => setEditState({ ...editState, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={editState.endDate}
                      onChange={(e) => setEditState({ ...editState, endDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-700">{formatTimeIntent()}</p>
          )}
        </div>

        {/* Phase 6.2: Access & Permissions Section */}
        {ENABLE_ENTITY_GRANTS && (
          <WorkspacePermissionsSection
            projectId={projectId}
            trackId={trackId}
            isSubtrack={isSubtrack}
          />
        )}

        {/* Edit Mode Actions */}
        {isEditing && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleCancelEdit}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={16} />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
