/**
 * Activity Customization Modal
 * 
 * Allows users to customize quick log buttons and fields for a specific activity
 */

import { useState, useEffect, useMemo } from 'react';
import { X, Settings, Check, Plus, Trash2, GripVertical, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DiscoveryService } from '../../lib/fitnessTracker/discoveryService';
import type { UserMovementProfile, MovementDomain, ActivityCustomization } from '../../lib/fitnessTracker/types';

type ActivityCustomizationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  profile: UserMovementProfile;
  activityDomain: MovementDomain;
  onSaved: (updatedProfile: UserMovementProfile) => void;
};

export function ActivityCustomizationModal({
  isOpen,
  onClose,
  profile,
  activityDomain,
  onSaved,
}: ActivityCustomizationModalProps) {
  const discoveryService = new DiscoveryService();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'buttons' | 'fields'>('fields');

  // Get current customization or default
  const customization = profile.uiConfiguration?.activityCustomizations?.[activityDomain];
  
  // Get available fields for this domain
  const availableFields = useMemo(() => {
    const allFields = profile.trackerStructure?.availableFields || [];
    // Core fields always available
    const coreFields = ['duration_minutes', 'perceived_intensity', 'body_state', 'notes', 'bodyweight_kg'];
    
    // Domain-specific field mappings
    const domainFields: Record<MovementDomain, string[]> = {
      gym: ['exercises', 'sets', 'reps', 'weight', 'rpe', 'training_volume', 'rest_seconds', 'muscle_groups', 'exercise_type', 'tempo', 'to_failure', 'machine_type', 'cardio_type', 'class_type'],
      running: ['distance_km', 'pace_per_km', 'terrain', 'elevation_meters', 'avg_heart_rate', 'max_heart_rate', 'heart_rate_zones', 'cadence', 'splits', 'surface_type', 'weather', 'temperature_celsius', 'effort_level'],
      cycling: ['distance_km', 'pace_per_km', 'terrain', 'elevation_meters', 'avg_power', 'max_power', 'avg_cadence', 'avg_heart_rate', 'max_heart_rate', 'bike_type', 'weather', 'temperature_celsius'],
      swimming: ['distance_meters', 'stroke_type', 'pool_length', 'laps', 'stroke_count', 'intervals', 'kick_pull_focus', 'water_type', 'water_temperature'],
      team_sports: ['match_type', 'position', 'minutes_played', 'goals', 'assists', 'saves', 'cards', 'substituted', 'team_score', 'opponent_score', 'result', 'surface', 'weather'],
      individual_sports: ['sport_type', 'opponent', 'match_type', 'your_score', 'opponent_score', 'result', 'sets_games', 'surface'],
      martial_arts: ['rounds', 'round_duration', 'rest_seconds', 'session_type', 'sparring_type', 'technique_focus', 'partner_level', 'discipline', 'gear_worn'],
      yoga: ['yoga_style', 'focus_area', 'difficulty_level', 'temperature', 'props_used', 'instructor_led'],
      rehab: ['injury_area', 'pain_level_before', 'pain_level_after', 'mobility_score', 'exercise_type', 'therapist_notes', 'homework'],
      other: ['activity_name', 'location', 'indoor_outdoor'],
    };
    
    const relevantFieldIds = [...coreFields, ...(domainFields[activityDomain] || [])];
    return allFields.filter(field => relevantFieldIds.includes(field.id));
  }, [profile.trackerStructure, activityDomain]);

  // Get quick log buttons for this activity
  const activityButtons = useMemo(() => {
    const allButtons = profile.uiConfiguration?.quickLogButtons || [];
    return allButtons.filter(btn => btn.category === activityDomain || btn.category === 'martial_arts');
  }, [profile.uiConfiguration?.quickLogButtons, activityDomain]);

  // Current selected fields (limit to 7 max for quick log)
  const [selectedFields, setSelectedFields] = useState<string[]>(
    customization?.quickLogFields || availableFields.slice(0, 5).map(f => f.id)
  );

  // Hidden buttons (buttons to hide from quick log)
  const [hiddenButtons, setHiddenButtons] = useState<Set<string>>(
    new Set(customization?.hiddenQuickLogButtons || [])
  );

  useEffect(() => {
    if (customization) {
      setSelectedFields(customization.quickLogFields || []);
      setHiddenButtons(new Set(customization.hiddenQuickLogButtons || []));
    }
  }, [customization]);

  const handleToggleField = (fieldId: string) => {
    setSelectedFields(prev => {
      if (prev.includes(fieldId)) {
        return prev.filter(id => id !== fieldId);
      } else {
        // Limit to 7 fields max
        if (prev.length >= 7) {
          return prev; // Can't add more
        }
        return [...prev, fieldId];
      }
    });
  };

  const handleMoveField = (fromIndex: number, toIndex: number) => {
    setSelectedFields(prev => {
      const newFields = [...prev];
      const [moved] = newFields.splice(fromIndex, 1);
      newFields.splice(toIndex, 0, moved);
      return newFields;
    });
  };

  const handleToggleButton = (buttonId: string) => {
    setHiddenButtons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(buttonId)) {
        newSet.delete(buttonId);
      } else {
        newSet.add(buttonId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Get current UI config
      const currentUIConfig = profile.uiConfiguration || {
        quickLogButtons: [],
        patternVisualizations: [],
        insightTypes: [],
        unlockedFeatures: [],
        preferences: {
          showInsights: true,
          showPatternVisualizations: true,
          reminderPreferences: {},
        },
      };

      // Update activity customization
      const updatedCustomizations = {
        ...(currentUIConfig.activityCustomizations || {}),
        [activityDomain]: {
          domain: activityDomain,
          quickLogFields: selectedFields,
          hiddenQuickLogButtons: Array.from(hiddenButtons),
        } as ActivityCustomization,
      };

      // Update profile in database
      const { error } = await supabase
        .from('user_movement_profiles')
        .update({
          ui_configuration: {
            ...currentUIConfig,
            activityCustomizations: updatedCustomizations,
          },
        })
        .eq('user_id', profile.userId);

      if (error) {
        throw new Error(`Failed to save customization: ${error.message}`);
      }

      // Reload profile
      const updatedProfile = await discoveryService.getProfile(profile.userId, { forceRefresh: true });
      if (updatedProfile) {
        onSaved(updatedProfile);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save customization:', error);
      alert(error instanceof Error ? error.message : 'Failed to save customization');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedFieldDefinitions = selectedFields
    .map(id => availableFields.find(f => f.id === id))
    .filter(Boolean);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Customize Activity</h2>
              <p className="text-sm text-gray-600 mt-1">Tailor quick log to your needs</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 px-6">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('fields')}
                className={`py-3 px-2 border-b-2 transition-colors ${
                  activeTab === 'fields'
                    ? 'border-blue-600 text-blue-600 font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Quick Log Fields
              </button>
              <button
                onClick={() => setActiveTab('buttons')}
                className={`py-3 px-2 border-b-2 transition-colors ${
                  activeTab === 'buttons'
                    ? 'border-blue-600 text-blue-600 font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Quick Log Buttons
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {activeTab === 'fields' && (
              <div className="space-y-4">
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Quick Log Fields (max 7)</p>
                    <p className="text-blue-700">Select up to 7 fields to show in the quick log form. Drag to reorder priority.</p>
                  </div>
                </div>

                {/* Selected Fields (in order) */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Selected Fields ({selectedFields.length}/7)
                  </h3>
                  <div className="space-y-2">
                    {selectedFieldDefinitions.map((field, index) => (
                      <div
                        key={field!.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <GripVertical size={18} className="text-gray-400 cursor-move" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{field!.label}</p>
                          <p className="text-xs text-gray-500">{field!.type}</p>
                        </div>
                        {index > 0 && (
                          <button
                            onClick={() => handleMoveField(index, index - 1)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Move up"
                          >
                            ↑
                          </button>
                        )}
                        {index < selectedFieldDefinitions.length - 1 && (
                          <button
                            onClick={() => handleMoveField(index, index + 1)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Move down"
                          >
                            ↓
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleField(field!.id)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Available Fields */}
                {selectedFields.length < 7 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Available Fields</h3>
                    <div className="space-y-2">
                      {availableFields
                        .filter(field => !selectedFields.includes(field.id))
                        .map(field => (
                          <button
                            key={field.id}
                            onClick={() => handleToggleField(field.id)}
                            className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">{field.label}</p>
                              <p className="text-xs text-gray-500">{field.type}</p>
                            </div>
                            <Plus size={18} className="text-gray-400" />
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'buttons' && (
              <div className="space-y-4">
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Quick Log Buttons</p>
                    <p className="text-blue-700">Hide buttons you don't use to simplify your quick log.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {activityButtons.map(button => {
                    const isHidden = hiddenButtons.has(button.id);
                    return (
                      <div
                        key={button.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          isHidden
                            ? 'bg-gray-50 border-gray-200 opacity-60'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{button.label}</p>
                        </div>
                        <button
                          onClick={() => handleToggleButton(button.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            isHidden
                              ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {isHidden ? 'Show' : 'Hide'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || selectedFields.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Customization'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
