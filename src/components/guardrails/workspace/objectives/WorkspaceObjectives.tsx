/**
 * WorkspaceObjectives Component
 * 
 * Phase 3.2: Objectives Micro-App (Focused Intent Surface)
 * 
 * A dedicated, distraction-free surface for defining intent and success.
 * This is where users think clearly about what the track/subtrack is trying
 * to achieve and what "done" actually means.
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * 
 * What this component CAN do:
 * - ✅ Display and edit objective, definition_of_done (via service layer)
 * - ✅ Mutate universal_track_info (via service layer)
 * - ✅ Maintain local draft state
 * - ✅ Warn about unsaved changes
 * 
 * What this component MUST NOT do:
 * - ❌ Query Supabase directly (use service layer only)
 * - ❌ Render roadmap logic
 * - ❌ Render timeline/bucket logic
 * - ❌ Shape projection data
 * - ❌ Auto-save
 * - ❌ Rich text editing (plain text only)
 * 
 * Phase 3.2 Scope:
 * - Read/Write: universal_track_info (objective, definition_of_done)
 * - Same data as Overview, different UX
 * - Changes must sync with Overview
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, X, AlertCircle } from 'lucide-react';
import { getUniversalTrackInfoByTrackId, saveUniversalTrackInfo } from '../../../../lib/guardrails/universalTrackInfo';
import type { UniversalTrackInfo } from '../../../../lib/guardrails/universalTrackInfo';

export interface WorkspaceObjectivesProps {
  // Context data
  projectId: string;
  trackId: string;
  
  // Callback to refresh parent component when data changes
  onObjectivesChange?: () => void;
  
  // Callback to notify about unsaved changes (for tab switching guard)
  onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void;
}

interface DraftState {
  objective: string;
  definitionOfDone: string;
}

export function WorkspaceObjectives({
  projectId,
  trackId,
  onObjectivesChange,
  onUnsavedChangesChange,
}: WorkspaceObjectivesProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackInfo, setTrackInfo] = useState<UniversalTrackInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [draftState, setDraftState] = useState<DraftState>({
    objective: '',
    definitionOfDone: '',
  });
  const [originalState, setOriginalState] = useState<DraftState | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load track info on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const info = await getUniversalTrackInfoByTrackId(trackId);
        setTrackInfo(info);

        // Initialize draft state from loaded data
        const state: DraftState = {
          objective: info?.objective || '',
          definitionOfDone: info?.definition_of_done || '',
        };
        setDraftState(state);
        setOriginalState(state);
        setHasUnsavedChanges(false);
      } catch (err) {
        console.error('[WorkspaceObjectives] Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load objectives');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [trackId]);

  // Notify parent about unsaved changes
  useEffect(() => {
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(hasUnsavedChanges);
    }
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  // Check if draft differs from original
  useEffect(() => {
    if (originalState) {
      const hasChanges =
        draftState.objective !== originalState.objective ||
        draftState.definitionOfDone !== originalState.definitionOfDone;
      setHasUnsavedChanges(hasChanges);
    }
  }, [draftState, originalState]);

  // Handle objective change
  const handleObjectiveChange = useCallback((value: string) => {
    setDraftState(prev => ({ ...prev, objective: value }));
  }, []);

  // Handle definition of done change
  const handleDefinitionOfDoneChange = useCallback((value: string) => {
    setDraftState(prev => ({ ...prev, definitionOfDone: value }));
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      // Save universal track info (upsert)
      const savedInfo = await saveUniversalTrackInfo({
        master_project_id: projectId,
        track_id: trackId,
        objective: draftState.objective.trim(),
        definition_of_done: draftState.definitionOfDone.trim(),
        time_mode: trackInfo?.time_mode || 'unscheduled',
        start_date: trackInfo?.start_date || null,
        end_date: trackInfo?.end_date || null,
        target_date: trackInfo?.target_date || null,
        track_category_id: trackInfo?.track_category_id || null,
      });

      setTrackInfo(savedInfo);
      setOriginalState({
        objective: savedInfo.objective || '',
        definitionOfDone: savedInfo.definition_of_done || '',
      });
      setHasUnsavedChanges(false);

      // Notify parent of changes
      if (onObjectivesChange) {
        onObjectivesChange();
      }
    } catch (err) {
      console.error('[WorkspaceObjectives] Error saving:', err);
      setError(err instanceof Error ? err.message : 'Failed to save objectives');
    } finally {
      setSaving(false);
    }
  }, [draftState, projectId, trackId, trackInfo, onObjectivesChange]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (originalState) {
      setDraftState(originalState);
      setHasUnsavedChanges(false);
      setError(null);
    }
  }, [originalState]);

  // Character count helper (soft guidance, not enforced)
  const getCharacterCount = (text: string): number => {
    return text.trim().length;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading objectives...</p>
        </div>
      </div>
    );
  }

  // Error state (if failed to load)
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

  const objectiveCharCount = getCharacterCount(draftState.objective);
  const definitionOfDoneCharCount = getCharacterCount(draftState.definitionOfDone);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full p-4 md:p-6 space-y-8">
          {/* Error banner (if error during save) */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <div className="flex items-start gap-2">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Error saving objectives</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Objective Editor (Primary) */}
          <div className="space-y-3">
            <label htmlFor="objective" className="block text-sm font-semibold text-gray-900">
              Objective
            </label>
            <div className="space-y-2">
              <textarea
                id="objective"
                value={draftState.objective}
                onChange={(e) => handleObjectiveChange(e.target.value)}
                placeholder="What is this track fundamentally trying to achieve?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white text-gray-900 placeholder-gray-400"
                rows={8}
              />
              <div className="flex items-center justify-end">
                <span className={`text-xs ${objectiveCharCount > 500 ? 'text-gray-500' : 'text-gray-400'}`}>
                  {objectiveCharCount} characters
                </span>
              </div>
            </div>
          </div>

          {/* Definition of Done (Secondary) */}
          <div className="space-y-3">
            <label htmlFor="definition-of-done" className="block text-sm font-semibold text-gray-900">
              Definition of Done
            </label>
            <div className="space-y-2">
              <textarea
                id="definition-of-done"
                value={draftState.definitionOfDone}
                onChange={(e) => handleDefinitionOfDoneChange(e.target.value)}
                placeholder="How will you know this track is complete?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white text-gray-900 placeholder-gray-400"
                rows={6}
              />
              <div className="flex items-center justify-end">
                <span className={`text-xs ${definitionOfDoneCharCount > 300 ? 'text-gray-500' : 'text-gray-400'}`}>
                  {definitionOfDoneCharCount} characters
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar (Sticky on Mobile) */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white safe-bottom">
        <div className="max-w-3xl mx-auto w-full p-4">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleCancel}
              disabled={saving || !hasUnsavedChanges}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={16} />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
