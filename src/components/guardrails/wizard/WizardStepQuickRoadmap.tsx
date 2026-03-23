import { useState, useMemo } from 'react';
import { Target, Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useProjectWizard } from '../../../contexts/ProjectWizardContext';
import type { AnyTrackTemplateWithSubTracks } from '../../../lib/guardrails/templateTypes';

interface TrackPreview {
  templateId: string;
  trackName: string;
  subtracks: Array<{
    subtrackId: string;
    subtrackName: string;
  }>;
}

export function WizardStepQuickRoadmap() {
  const {
    state,
    setGenerateInitialRoadmap,
    setQuickGoal,
    setFirstPriorityTrackId,
  } = useProjectWizard();

  const [expandedPreview, setExpandedPreview] = useState(false);
  const [quickGoalInput, setQuickGoalInput] = useState(state.quickGoal || '');

  // Build track preview from selected templates
  const trackPreview: TrackPreview[] = useMemo(() => {
    const preview: TrackPreview[] = [];
    
    // Get all selected templates
    const allSelectedTemplateIds = [
      ...state.selectedDefaultTemplateIds,
      ...state.selectedSystemTemplateIds,
      ...state.selectedUserTemplateIds,
    ];

    // Find templates in availableTemplates
    allSelectedTemplateIds.forEach(templateId => {
      const template = state.availableTemplates.find(
        t => t.id === templateId
      ) as AnyTrackTemplateWithSubTracks | undefined;

      if (template && 'subtracks' in template) {
        preview.push({
          templateId: template.id,
          trackName: template.name,
          subtracks: template.subtracks.map(st => ({
            subtrackId: st.id,
            subtrackName: st.name,
          })),
        });
      }
    });

    return preview;
  }, [
    state.selectedDefaultTemplateIds,
    state.selectedSystemTemplateIds,
    state.selectedUserTemplateIds,
    state.availableTemplates,
  ]);

  // Calculate total items that will be created
  const totalItemsCount = useMemo(() => {
    return trackPreview.reduce((sum, track) => sum + track.subtracks.length, 0);
  }, [trackPreview]);

  // Check if a track is the priority track
  const isPriorityTrack = (templateId: string) => {
    return state.firstPriorityTrackId === templateId;
  };

  // Handle priority track selection
  const handleSelectPriorityTrack = (templateId: string) => {
    if (isPriorityTrack(templateId)) {
      // Deselect if already selected
      setFirstPriorityTrackId(null);
    } else {
      setFirstPriorityTrackId(templateId);
    }
  };

  // Handle quick goal change
  const handleQuickGoalChange = (value: string) => {
    setQuickGoalInput(value);
    setQuickGoal(value);
  };

  // Generate roadmap item title from subtrack name
  const generateItemTitle = (subtrackName: string): string => {
    // Capitalize first letter and add "Complete" prefix if not already present
    const normalized = subtrackName.trim();
    if (normalized.toLowerCase().startsWith('complete')) {
      return normalized;
    }
    return `Complete ${normalized}`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-3">
          Ready to Start Your Project
        </h2>
        <p className="text-gray-600 text-base md:text-lg px-2">
          Add a quick focus and create starter items to get you going
        </p>
      </div>

      <div className="space-y-6">
        {/* Section 1: Quick Focus (Optional) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Quick Focus (Optional)</h3>
          </div>

          {/* Quick Goal Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Main goal
            </label>
            <textarea
              value={quickGoalInput}
              onChange={(e) => handleQuickGoalChange(e.target.value)}
              placeholder="e.g., Launch a mobile app for local food delivery"
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm md:text-base"
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional: One sentence about what you want to achieve
            </p>
          </div>

          {/* Priority Track Selection */}
          {trackPreview.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority track
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Which track should you focus on first? (Optional)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {trackPreview.map((track) => (
                  <button
                    key={track.templateId}
                    type="button"
                    onClick={() => handleSelectPriorityTrack(track.templateId)}
                    className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                      isPriorityTrack(track.templateId)
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium text-sm ${
                        isPriorityTrack(track.templateId)
                          ? 'text-blue-900'
                          : 'text-gray-900'
                      }`}>
                        {track.trackName}
                      </span>
                      {isPriorityTrack(track.templateId) && (
                        <div className="flex-shrink-0 ml-2">
                          <Check className="w-5 h-5 text-blue-600" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Starter Roadmap */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Starter Roadmap</h3>
          </div>

          <p className="text-sm text-gray-600">
            We'll create starter items based on your subtracks to help you begin working immediately.
          </p>

          {/* Preview */}
          {state.generateInitialRoadmap && totalItemsCount > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedPreview(!expandedPreview)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
              >
                <div>
                  <span className="font-medium text-gray-900">
                    Preview ({totalItemsCount} items will be created)
                  </span>
                  {state.firstPriorityTrackId && (
                    <span className="ml-2 text-xs text-blue-600 font-medium">
                      • Priority track selected
                    </span>
                  )}
                </div>
                {expandedPreview ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedPreview && (
                <div className="px-4 pb-4 space-y-4 border-t border-gray-200">
                  {trackPreview.map((track) => (
                    <div key={track.templateId} className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`font-medium text-sm ${
                          isPriorityTrack(track.templateId)
                            ? 'text-blue-900'
                            : 'text-gray-900'
                        }`}>
                          {track.trackName}
                        </span>
                        {isPriorityTrack(track.templateId) && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                            Priority
                          </span>
                        )}
                      </div>
                      <ul className="ml-4 space-y-1">
                        {track.subtracks.map((subtrack) => (
                          <li key={subtrack.subtrackId} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-gray-400 mt-1">•</span>
                            <span>{generateItemTitle(subtrack.subtrackName)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Main Toggle */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <label className="flex items-start gap-4 cursor-pointer group">
              <input
                type="checkbox"
                checked={state.generateInitialRoadmap}
                onChange={(e) => setGenerateInitialRoadmap(e.target.checked)}
                className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-900 mb-1">
                  Create Smart Starter Items
                </div>
                <p className="text-sm text-gray-600">
                  Automatically create one roadmap item per subtrack. You can edit, delete, or add more anytime.
                </p>
              </div>
            </label>
          </div>

          {!state.generateInitialRoadmap && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900">
                <strong>Note:</strong> Your roadmap will start empty. You can add items later from the Roadmap view.
              </p>
            </div>
          )}
        </div>

        {/* Section 3: Value Proposition */}
        {state.generateInitialRoadmap && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 font-medium mb-1">
                  These items will help you begin working immediately
                </p>
                <p className="text-xs text-blue-700">
                  You can edit, delete, or add more items anytime after project creation.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
