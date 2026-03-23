/**
 * Meal Planner Settings Component
 * 
 * Combined settings panel for:
 * - Meal schedule management
 * - Measurement system preference
 */

import { useState, useEffect } from 'react';
import { X, Calendar, UtensilsCrossed, Settings, Heart, MapPin } from 'lucide-react';
import { MealScheduleSettings } from './MealScheduleSettings';
import { FoodPreferences } from './FoodPreferences';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import { showToast } from '../Toast';
import type { MeasurementSystem } from '../../lib/uiPreferencesTypes';

interface MealPlannerSettingsProps {
  spaceId: string;
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'schedule' | 'units' | 'preferences' | 'location';

function LocationSettings() {
  const { config, updatePreferences } = useUIPreferences();
  const [saving, setSaving] = useState(false);
  const [defaultLocation, setDefaultLocation] = useState(config.recipeLocation || '');
  const [overrideLocation, setOverrideLocation] = useState(config.recipeLocationOverride || '');
  const [showOverride, setShowOverride] = useState(!!config.recipeLocationOverride);
  const [includeLocationInAI, setIncludeLocationInAI] = useState(config.includeLocationInAI !== false); // Default to true

  // Sync state with config when it changes (e.g., when preferences are loaded)
  useEffect(() => {
    setDefaultLocation(config.recipeLocation || '');
    setOverrideLocation(config.recipeLocationOverride || '');
    setShowOverride(!!config.recipeLocationOverride);
    setIncludeLocationInAI(config.includeLocationInAI !== false);
  }, [config.recipeLocation, config.recipeLocationOverride, config.includeLocationInAI]);

  const handleSaveDefaultLocation = async () => {
    try {
      setSaving(true);
      await updatePreferences({ recipeLocation: defaultLocation.trim() || null });
      showToast('success', 'Default location updated');
    } catch (error) {
      console.error('Failed to update default location:', error);
      showToast('error', 'Failed to update default location');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOverrideLocation = async () => {
    try {
      setSaving(true);
      await updatePreferences({ recipeLocationOverride: overrideLocation.trim() || null });
      showToast('success', 'Location override updated');
    } catch (error) {
      console.error('Failed to update location override:', error);
      showToast('error', 'Failed to update location override');
    } finally {
      setSaving(false);
    }
  };

  const handleClearOverride = async () => {
    try {
      setSaving(true);
      await updatePreferences({ recipeLocationOverride: null });
      setOverrideLocation('');
      setShowOverride(false);
      showToast('success', 'Location override cleared');
    } catch (error) {
      console.error('Failed to clear location override:', error);
      showToast('error', 'Failed to clear location override');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLocationInAI = async () => {
    const newValue = !includeLocationInAI;
    try {
      setSaving(true);
      await updatePreferences({ includeLocationInAI: newValue });
      setIncludeLocationInAI(newValue);
      showToast('success', newValue ? 'Location will be included in AI prompts' : 'Location will not be included in AI prompts');
    } catch (error) {
      console.error('Failed to update location AI setting:', error);
      showToast('error', 'Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  const activeLocation = config.recipeLocationOverride || config.recipeLocation || null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-start gap-3 mb-4 sm:mb-6">
          <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
            <MapPin size={20} className="text-orange-600 sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">Recipe Location</h2>
            <p className="text-xs sm:text-sm text-gray-600">
              Set your location to get culturally relevant recipes with local ingredients
            </p>
          </div>
        </div>

        {/* Active Location Display */}
        {activeLocation && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1.5">
              <MapPin size={14} className="text-green-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-green-900">Active Location:</span>
            </div>
            <p className="text-sm sm:text-base font-semibold text-green-800 break-words">{activeLocation}</p>
            {config.recipeLocationOverride && (
              <p className="text-xs text-green-700 mt-1.5">(Temporary override - will use default when cleared)</p>
            )}
          </div>
        )}

        {/* Default Location */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1.5 sm:mb-2">
            Default Location
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Your home location (e.g., "United Kingdom", "London, UK", "New York, USA")
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
            <input
              type="text"
              value={defaultLocation}
              onChange={(e) => setDefaultLocation(e.target.value)}
              placeholder="e.g., United Kingdom"
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 touch-manipulation"
              disabled={saving}
            />
            <button
              onClick={handleSaveDefaultLocation}
              disabled={saving || defaultLocation.trim() === (config.recipeLocation || '')}
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation active:scale-[0.98]"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Location Override */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2">
            <label className="block text-sm sm:text-base font-medium text-gray-700">
              Temporary Location Override
            </label>
            {!showOverride && (
              <button
                onClick={() => setShowOverride(true)}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium touch-manipulation active:scale-[0.98] self-start sm:self-auto"
              >
                Set Override
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Use when traveling (e.g., on holiday). Overrides default location for recipe searches.
          </p>
          {showOverride && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                <input
                  type="text"
                  value={overrideLocation}
                  onChange={(e) => setOverrideLocation(e.target.value)}
                  placeholder="e.g., Spain, Barcelona"
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 touch-manipulation"
                  disabled={saving}
                />
                <button
                  onClick={handleSaveOverrideLocation}
                  disabled={saving || overrideLocation.trim() === (config.recipeLocationOverride || '')}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation active:scale-[0.98]"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
              {config.recipeLocationOverride && (
                <button
                  onClick={handleClearOverride}
                  disabled={saving}
                  className="w-full px-4 py-2.5 sm:py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation active:scale-[0.98]"
                >
                  Clear Override
                </button>
              )}
            </div>
          )}
        </div>

        {/* Include Location in AI Toggle */}
        <div className="bg-gray-50 rounded-lg p-4 sm:p-5 border border-gray-200">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              <label className="block text-sm sm:text-base font-medium text-gray-900 mb-1">
                Include Location in AI Prompts
              </label>
              <p className="text-xs sm:text-sm text-gray-600">
                When enabled, your location will be included in AI recipe searches to get culturally relevant recipes with local ingredients. When disabled, location information will not be sent to the AI.
              </p>
            </div>
            <button
              onClick={handleToggleLocationInAI}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 sm:h-7 sm:w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 touch-manipulation ${
                includeLocationInAI ? 'bg-orange-500' : 'bg-gray-300'
              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              role="switch"
              aria-checked={includeLocationInAI}
              aria-label="Include location in AI prompts"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 sm:h-6 sm:w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  includeLocationInAI ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {!includeLocationInAI && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs sm:text-sm text-amber-800">
                <strong>Note:</strong> Location information will not be included in AI recipe searches. Recipes will be more generic and may not reflect local ingredients or cultural preferences.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MealPlannerSettings({ spaceId, isOpen, onClose }: MealPlannerSettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('schedule');
  const { config, updatePreferences } = useUIPreferences();
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleMeasurementSystemChange = async (system: MeasurementSystem) => {
    try {
      setSaving(true);
      await updatePreferences({ measurementSystem: system });
      showToast('success', 'Measurement system updated');
    } catch (error) {
      console.error('Failed to update measurement system:', error);
      showToast('error', 'Failed to update measurement system');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-0 sm:p-6 safe-top safe-bottom">
      <div className="bg-white rounded-0 sm:rounded-2xl w-full h-full sm:max-w-4xl sm:max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-4 sm:px-6 py-4 sm:py-5 flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Settings size={24} className="text-white" />
              <h2 className="text-xl sm:text-2xl font-bold text-white">Meal Planner Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 active:bg-white/30 rounded-xl p-2 transition-colors touch-manipulation"
              aria-label="Close settings"
            >
              <X size={24} className="sm:w-7 sm:h-7" />
            </button>
          </div>

          {/* Tabs - Horizontal scroll on mobile, grid on desktop */}
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 pb-2 sm:pb-0">
            <div className="flex sm:grid sm:grid-cols-4 gap-2 min-w-max sm:min-w-0">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`min-w-[120px] sm:min-w-0 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 sm:gap-2 touch-manipulation ${
                  activeTab === 'schedule'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'bg-white/20 text-white hover:bg-white/30 active:bg-white/40'
                }`}
              >
                <Calendar size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="text-sm sm:text-base whitespace-nowrap">Schedule</span>
              </button>
              <button
                onClick={() => setActiveTab('preferences')}
                className={`min-w-[120px] sm:min-w-0 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 sm:gap-2 touch-manipulation ${
                  activeTab === 'preferences'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'bg-white/20 text-white hover:bg-white/30 active:bg-white/40'
                }`}
              >
                <Heart size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="text-sm sm:text-base whitespace-nowrap">Preferences</span>
              </button>
              <button
                onClick={() => setActiveTab('units')}
                className={`min-w-[120px] sm:min-w-0 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 sm:gap-2 touch-manipulation ${
                  activeTab === 'units'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'bg-white/20 text-white hover:bg-white/30 active:bg-white/40'
                }`}
              >
                <UtensilsCrossed size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="text-sm sm:text-base whitespace-nowrap">Units</span>
              </button>
              <button
                onClick={() => setActiveTab('location')}
                className={`min-w-[120px] sm:min-w-0 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 sm:gap-2 touch-manipulation ${
                  activeTab === 'location'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'bg-white/20 text-white hover:bg-white/30 active:bg-white/40'
                }`}
              >
                <MapPin size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="text-sm sm:text-base whitespace-nowrap">Location</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
          {activeTab === 'schedule' ? (
            <MealScheduleSettings spaceId={spaceId} onClose={onClose} embedded={true} />
          ) : activeTab === 'preferences' ? (
            <FoodPreferences spaceId={spaceId} />
          ) : activeTab === 'location' ? (
            <LocationSettings />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-start gap-3 mb-4 sm:mb-6">
                <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                  <UtensilsCrossed size={20} className="text-orange-600 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">Measurement System</h2>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Choose how recipe ingredients are displayed
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <button
                  onClick={() => handleMeasurementSystemChange('metric')}
                  disabled={saving || config.measurementSystem === 'metric'}
                  className={`text-center p-4 sm:p-5 rounded-lg border-2 transition-all touch-manipulation active:scale-[0.98] ${
                    config.measurementSystem === 'metric'
                      ? 'border-orange-500 bg-orange-50 shadow-sm'
                      : 'border-gray-200 hover:border-orange-300 active:border-orange-400'
                  } ${saving || config.measurementSystem === 'metric' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <h3 className="font-semibold text-gray-900 mb-1 text-base sm:text-lg">Metric</h3>
                  <p className="text-xs sm:text-sm text-gray-600">g, ml, kg, l</p>
                </button>
                <button
                  onClick={() => handleMeasurementSystemChange('imperial')}
                  disabled={saving || config.measurementSystem === 'imperial'}
                  className={`text-center p-4 sm:p-5 rounded-lg border-2 transition-all touch-manipulation active:scale-[0.98] ${
                    config.measurementSystem === 'imperial'
                      ? 'border-orange-500 bg-orange-50 shadow-sm'
                      : 'border-gray-200 hover:border-orange-300 active:border-orange-400'
                  } ${saving || config.measurementSystem === 'imperial' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <h3 className="font-semibold text-gray-900 mb-1 text-base sm:text-lg">Imperial</h3>
                  <p className="text-xs sm:text-sm text-gray-600">oz, lb, cups, fl oz</p>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
