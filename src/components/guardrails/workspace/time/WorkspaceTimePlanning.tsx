/**
 * WorkspaceTimePlanning Component
 * 
 * Phase 3.5: Time Planning Micro-App (Workspace)
 * 
 * Time intent management for Track & Subtrack Workspaces.
 * Uses existing universal_track_info fields (no new tables).
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * 
 * What this component CAN do:
 * - ✅ Display time intent (via service layer)
 * - ✅ Edit time intent (via service layer)
 * - ✅ Validate time intent rules
 * - ✅ Manage local draft state
 * - ✅ Warn about unsaved changes
 * 
 * What this component MUST NOT do:
 * - ❌ Query Supabase directly (use service layer only)
 * - ❌ Render roadmap logic
 * - ❌ Render timeline/bucket logic
 * - ❌ Shape projection data
 * - ❌ Create roadmap items
 * 
 * Phase 3.5 Scope:
 * - Read/Write: universal_track_info (time_mode, dates via service layer)
 * - Time planning belongs to Workspaces, not Roadmap
 */

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Target, CalendarRange, Infinity, Save, X, AlertCircle } from 'lucide-react';
import {
  getTimePlanningIntent,
  saveTimePlanningIntent,
  type TimePlanningIntent,
  type TimeMode,
} from '../../../../lib/guardrails/workspace/timePlanningService';

export interface WorkspaceTimePlanningProps {
  // Context data
  projectId: string;
  trackId: string; // Parent track ID (for subtracks, this is the parent; for tracks, this is the track)
  subtrackId?: string | null; // Subtrack ID (null for main tracks)
  
  // Callback to refresh parent component when data changes
  onTimePlanningChange?: () => void;
  
  // Callback to notify about unsaved changes (for tab switching guard)
  onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void;
}

export function WorkspaceTimePlanning({
  projectId,
  trackId,
  subtrackId = null,
  onTimePlanningChange,
  onUnsavedChangesChange,
}: WorkspaceTimePlanningProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [intent, setIntent] = useState<TimePlanningIntent | null>(null);
  
  // Draft state
  const [draftTimeMode, setDraftTimeMode] = useState<TimeMode>('unscheduled');
  const [draftStartDate, setDraftStartDate] = useState<string>('');
  const [draftEndDate, setDraftEndDate] = useState<string>('');
  const [draftTargetDate, setDraftTargetDate] = useState<string>('');
  
  // Original state for comparison
  const [originalState, setOriginalState] = useState<{
    timeMode: TimeMode;
    startDate: string;
    endDate: string;
    targetDate: string;
  } | null>(null);

  // Load intent on mount
  useEffect(() => {
    loadIntent();
  }, [trackId, subtrackId]);

  const loadIntent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const loadedIntent = await getTimePlanningIntent(trackId, subtrackId);
      setIntent(loadedIntent);

      // Initialize draft state from loaded intent
      const startDateStr = loadedIntent.startDate ? loadedIntent.startDate.split('T')[0] : '';
      const endDateStr = loadedIntent.endDate ? loadedIntent.endDate.split('T')[0] : '';
      const targetDateStr = loadedIntent.targetDate ? loadedIntent.targetDate.split('T')[0] : '';

      setDraftTimeMode(loadedIntent.timeMode);
      setDraftStartDate(startDateStr);
      setDraftEndDate(endDateStr);
      setDraftTargetDate(targetDateStr);

      setOriginalState({
        timeMode: loadedIntent.timeMode,
        startDate: startDateStr,
        endDate: endDateStr,
        targetDate: targetDateStr,
      });
    } catch (err) {
      console.error('[WorkspaceTimePlanning] Error loading intent:', err);
      setError(err instanceof Error ? err.message : 'Failed to load time planning intent');
    } finally {
      setLoading(false);
    }
  }, [trackId, subtrackId]);

  // Detect unsaved changes
  useEffect(() => {
    const hasChanges = originalState && (
      draftTimeMode !== originalState.timeMode ||
      draftStartDate !== originalState.startDate ||
      draftEndDate !== originalState.endDate ||
      draftTargetDate !== originalState.targetDate
    );
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(hasChanges || false);
    }
  }, [draftTimeMode, draftStartDate, draftEndDate, draftTargetDate, originalState, onUnsavedChangesChange]);

  // Handle time mode change (clear invalid fields)
  const handleTimeModeChange = useCallback((newMode: TimeMode) => {
    setDraftTimeMode(newMode);
    
    // Clear invalid fields based on mode
    switch (newMode) {
      case 'unscheduled':
        setDraftStartDate('');
        setDraftEndDate('');
        setDraftTargetDate('');
        break;
      case 'target':
        setDraftStartDate('');
        setDraftEndDate('');
        break;
      case 'ranged':
        setDraftTargetDate('');
        break;
      case 'ongoing':
        setDraftEndDate('');
        setDraftTargetDate('');
        break;
    }
    setError(null);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      // Convert date strings to ISO format (or null)
      const startDate = draftStartDate ? `${draftStartDate}T00:00:00.000Z` : null;
      const endDate = draftEndDate ? `${draftEndDate}T00:00:00.000Z` : null;
      const targetDate = draftTargetDate ? `${draftTargetDate}T00:00:00.000Z` : null;

      const savedIntent = await saveTimePlanningIntent(
        trackId,
        projectId,
        subtrackId,
        {
          timeMode: draftTimeMode,
          startDate,
          endDate,
          targetDate,
        }
      );

      setIntent(savedIntent);

      // Update original state
      const startDateStr = savedIntent.startDate ? savedIntent.startDate.split('T')[0] : '';
      const endDateStr = savedIntent.endDate ? savedIntent.endDate.split('T')[0] : '';
      const targetDateStr = savedIntent.targetDate ? savedIntent.targetDate.split('T')[0] : '';

      setOriginalState({
        timeMode: savedIntent.timeMode,
        startDate: startDateStr,
        endDate: endDateStr,
        targetDate: targetDateStr,
      });

      // Notify parent
      if (onTimePlanningChange) {
        onTimePlanningChange();
      }
    } catch (err) {
      console.error('[WorkspaceTimePlanning] Error saving intent:', err);
      setError(err instanceof Error ? err.message : 'Failed to save time planning intent');
    } finally {
      setSaving(false);
    }
  }, [draftTimeMode, draftStartDate, draftEndDate, draftTargetDate, trackId, projectId, subtrackId, onTimePlanningChange]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (originalState) {
      setDraftTimeMode(originalState.timeMode);
      setDraftStartDate(originalState.startDate);
      setDraftEndDate(originalState.endDate);
      setDraftTargetDate(originalState.targetDate);
      setError(null);
    }
  }, [originalState]);

  // Format intent for display
  const formatIntentDisplay = useCallback((intent: TimePlanningIntent | null): string => {
    if (!intent) return 'Unscheduled';
    
    switch (intent.timeMode) {
      case 'unscheduled':
        return 'Unscheduled';
      case 'target':
        if (intent.targetDate) {
          const date = new Date(intent.targetDate);
          return `Target: ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
        return 'Target date not set';
      case 'ranged':
        if (intent.startDate && intent.endDate) {
          const start = new Date(intent.startDate);
          const end = new Date(intent.endDate);
          return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
        return 'Date range not set';
      case 'ongoing':
        if (intent.startDate) {
          const date = new Date(intent.startDate);
          return `Ongoing (since ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
        }
        return 'Ongoing';
      default:
        return 'Unscheduled';
    }
  }, []);

  // Check if draft has changes
  const hasChanges = originalState && (
    draftTimeMode !== originalState.timeMode ||
    draftStartDate !== originalState.startDate ||
    draftEndDate !== originalState.endDate ||
    draftTargetDate !== originalState.targetDate
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading time planning...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={20} className="text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Current Time Intent</h3>
          </div>
          <p className="text-gray-700">{formatIntentDisplay(intent)}</p>
        </div>

        {/* Time Intent Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Intent</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="timeMode"
                value="unscheduled"
                checked={draftTimeMode === 'unscheduled'}
                onChange={() => handleTimeModeChange('unscheduled')}
                className="form-radio"
              />
              <Calendar size={20} className="text-gray-400" />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Unscheduled</div>
                <div className="text-sm text-gray-500">No specific time commitment</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="timeMode"
                value="target"
                checked={draftTimeMode === 'target'}
                onChange={() => handleTimeModeChange('target')}
                className="form-radio"
              />
              <Target size={20} className="text-blue-400" />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Target Date</div>
                <div className="text-sm text-gray-500">Aim to complete by a specific date</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="timeMode"
                value="ranged"
                checked={draftTimeMode === 'ranged'}
                onChange={() => handleTimeModeChange('ranged')}
                className="form-radio"
              />
              <CalendarRange size={20} className="text-green-400" />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Date Range</div>
                <div className="text-sm text-gray-500">Work within a start and end date</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="timeMode"
                value="ongoing"
                checked={draftTimeMode === 'ongoing'}
                onChange={() => handleTimeModeChange('ongoing')}
                className="form-radio"
              />
              <Infinity size={20} className="text-purple-400" />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Ongoing</div>
                <div className="text-sm text-gray-500">Continuous work with no end date</div>
              </div>
            </label>
          </div>
        </div>

        {/* Conditional Fields */}
        {draftTimeMode === 'target' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={draftTargetDate}
              onChange={(e) => setDraftTargetDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        )}

        {draftTimeMode === 'ranged' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={draftStartDate}
                onChange={(e) => setDraftStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={draftEndDate}
                onChange={(e) => setDraftEndDate(e.target.value)}
                min={draftStartDate || undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        )}

        {draftTimeMode === 'ongoing' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date (Optional)
            </label>
            <input
              type="date"
              value={draftStartDate}
              onChange={(e) => setDraftStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-2">When did or will this ongoing work begin?</p>
          </div>
        )}

        {/* Action Bar */}
        {hasChanges && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end gap-3 shadow-lg">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              <X size={20} className="inline-block mr-2" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                !saving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
              disabled={saving}
            >
              {saving ? (
                <span className="flex items-center">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </span>
              ) : (
                <>
                  <Save size={20} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
