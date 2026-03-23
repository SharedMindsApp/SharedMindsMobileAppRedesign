import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Eye,
  Palette,
  Type,
  Maximize2,
  Check,
  RotateCcw,
  Moon,
  Sun,
  Zap,
  Navigation,
  Star,
  ChevronUp,
  ChevronDown,
  Home,
  Users,
  Calendar,
  Target,
  MessageCircle,
  FileText,
  Shield,
  UtensilsCrossed,
  MapPin,
  Globe,
  X,
} from 'lucide-react';
import { useUIPreferences } from '../contexts/UIPreferencesContext';
import { COLOR_THEMES, ALL_NAVIGATION_TABS, DEFAULT_FAVOURITE_NAV_TABS } from '../lib/uiPreferencesTypes';
import type {
  LayoutMode,
  UIDensity,
  FontScale,
  ColorTheme,
  ContrastLevel,
  AppTheme,
  NavigationTabId,
  MeasurementSystem,
} from '../lib/uiPreferencesTypes';
import { useAuth } from '../core/auth/AuthProvider';

const NAV_ICON_MAP: Record<string, any> = {
  Home,
  Users,
  Calendar,
  Target,
  Zap,
  MessageCircle,
  FileText,
  Shield,
};

export function UIPreferencesSettings() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const {
    config,
    preferences,
    neurotypeProfiles,
    loading,
    updatePreferences,
    setNeurotypeProfile,
    resetToDefaults,
  } = useUIPreferences();

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [defaultLocation, setDefaultLocation] = useState(config.recipeLocation || '');
  const [overrideLocation, setOverrideLocation] = useState(config.recipeLocationOverride || '');
  const [showOverride, setShowOverride] = useState(!!config.recipeLocationOverride);

  const handleUpdate = async (updates: any) => {
    try {
      setSaving(true);
      await updatePreferences(updates);
      setSaveMessage('Preferences saved!');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSaveMessage('Error saving preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleSetNeurotype = async (profileId: string) => {
    try {
      setSaving(true);
      await setNeurotypeProfile(profileId);
      setSaveMessage('Neurotype profile applied!');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (error) {
      console.error('Error setting neurotype:', error);
      setSaveMessage('Error applying profile');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Reset all UI preferences to defaults?')) {
      try {
        setSaving(true);
        await resetToDefaults();
        setSaveMessage('Reset to defaults!');
        setTimeout(() => setSaveMessage(''), 2000);
      } catch (error) {
        console.error('Error resetting preferences:', error);
        setSaveMessage('Error resetting preferences');
      } finally {
        setSaving(false);
      }
    }
  };

  const favouriteNavTabs = config.favouriteNavTabs || DEFAULT_FAVOURITE_NAV_TABS;

  // Sync location state with config when it changes
  useEffect(() => {
    setDefaultLocation(config.recipeLocation || '');
    setOverrideLocation(config.recipeLocationOverride || '');
    setShowOverride(!!config.recipeLocationOverride);
  }, [config.recipeLocation, config.recipeLocationOverride]);

  const availableNavTabs = ALL_NAVIGATION_TABS.filter((tab) => {
    if (tab.requiresAdmin && !isAdmin) return false;
    return true;
  });

  const favouritedNavTabs = availableNavTabs.filter((tab) =>
    favouriteNavTabs.includes(tab.id)
  );

  const nonFavouritedNavTabs = availableNavTabs.filter((tab) =>
    !favouriteNavTabs.includes(tab.id)
  );

  const toggleNavFavourite = async (tabId: NavigationTabId) => {
    const isFavourited = favouriteNavTabs.includes(tabId);

    if (isFavourited) {
      if (favouriteNavTabs.length === 1) {
        return;
      }
      const newFavourites = favouriteNavTabs.filter((id) => id !== tabId);
      await handleUpdate({ favouriteNavTabs: newFavourites });
    } else {
      if (favouriteNavTabs.length >= 8) {
        return;
      }
      const newFavourites = [...favouriteNavTabs, tabId];
      await handleUpdate({ favouriteNavTabs: newFavourites });
    }
  };

  const moveNavFavourite = async (tabId: NavigationTabId, direction: 'up' | 'down') => {
    const currentIndex = favouriteNavTabs.indexOf(tabId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= favouriteNavTabs.length) return;

    const newFavourites = [...favouriteNavTabs];
    [newFavourites[currentIndex], newFavourites[newIndex]] = [
      newFavourites[newIndex],
      newFavourites[currentIndex],
    ];

    await handleUpdate({ favouriteNavTabs: newFavourites });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading preferences...</p>
      </div>
    );
  }

  const layoutOptions: { value: LayoutMode; label: string; description: string }[] = [
    {
      value: 'standard',
      label: 'Standard Layout',
      description: 'Compact view with all information visible at once',
    },
    {
      value: 'nd-optimized',
      label: 'Focused Layout',
      description: 'Simplified view with single task focus and reduced clutter',
    },
  ];

  const densityOptions: { value: UIDensity; label: string }[] = [
    { value: 'compact', label: 'Compact' },
    { value: 'standard', label: 'Standard' },
    { value: 'spacious', label: 'Spacious' },
  ];

  const fontOptions: { value: FontScale; label: string }[] = [
    { value: 's', label: 'Small' },
    { value: 'm', label: 'Medium' },
    { value: 'l', label: 'Large' },
    { value: 'xl', label: 'Extra Large' },
  ];

  const contrastOptions: { value: ContrastLevel; label: string }[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'reduced', label: 'Reduced' },
  ];

  const themeOptions: { value: AppTheme; label: string; icon: any; description: string }[] = [
    {
      value: 'light',
      label: 'Light',
      icon: Sun,
      description: 'Bright and clean interface',
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: Moon,
      description: 'Easy on the eyes in low light',
    },
    {
      value: 'neon-dark',
      label: 'Neon Dark',
      icon: Zap,
      description: 'Vibrant colors on dark background',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">UI Preferences</h1>
          <p className="text-gray-600">
            Customize your interface for accessibility and comfort
          </p>
        </div>

        {saveMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {saveMessage}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Moon size={24} className="text-slate-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Theme Mode</h2>
                <p className="text-sm text-gray-600">
                  Choose your preferred color scheme
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleUpdate({ appTheme: option.value })}
                    disabled={saving}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${config.appTheme === option.value
                        ? 'border-slate-500 bg-slate-50'
                        : 'border-gray-200 hover:border-slate-300'
                      } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon size={20} className="text-slate-600" />
                        <h3 className="font-semibold text-gray-900">{option.label}</h3>
                      </div>
                      {config.appTheme === option.value && (
                        <Check size={20} className="text-slate-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <UtensilsCrossed size={24} className="text-orange-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Measurement System</h2>
                <p className="text-sm text-gray-600">
                  Choose how recipe ingredients are displayed
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { value: 'metric' as MeasurementSystem, label: 'Metric', description: 'Grams, milliliters, liters' },
                { value: 'imperial' as MeasurementSystem, label: 'US Imperial', description: 'Ounces, cups, pounds' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleUpdate({ measurementSystem: option.value })}
                  disabled={saving}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${(config.measurementSystem || 'metric') === option.value
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300'
                    } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{option.label}</h3>
                    {(config.measurementSystem || 'metric') === option.value && (
                      <Check size={20} className="text-orange-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <MapPin size={24} className="text-orange-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Recipe Location</h2>
                <p className="text-sm text-gray-600">
                  Set your location to get culturally relevant recipes with local ingredients
                </p>
              </div>
            </div>

            {/* Active Location Display */}
            {(config.recipeLocationOverride || config.recipeLocation) && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1.5">
                  <Globe size={16} className="text-green-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-green-900">Active Location:</span>
                </div>
                <p className="text-base font-semibold text-green-800 break-words">
                  {config.recipeLocationOverride || config.recipeLocation}
                </p>
                {config.recipeLocationOverride && (
                  <p className="text-xs text-green-700 mt-1.5">(Temporary override - will use default when cleared)</p>
                )}
              </div>
            )}

            {/* Default Location */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Location
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Your home location (e.g., "United Kingdom", "London, UK", "New York, USA")
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  defaultValue={config.recipeLocation || ''}
                  onBlur={(e) => {
                    const value = e.target.value.trim() || null;
                    if (value !== config.recipeLocation) {
                      handleUpdate({ recipeLocation: value });
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const value = (e.target as HTMLInputElement).value.trim() || null;
                      if (value !== config.recipeLocation) {
                        handleUpdate({ recipeLocation: value });
                      }
                    }
                  }}
                  placeholder="e.g., United Kingdom"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Location Override */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Temporary Location Override
                </label>
                {!config.recipeLocationOverride && (
                  <button
                    onClick={() => {
                      const input = document.getElementById('override-location-input') as HTMLInputElement;
                      if (input) {
                        input.focus();
                        input.style.display = 'block';
                      }
                    }}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Set Override
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Use when traveling (e.g., on holiday). Overrides default location for recipe searches.
              </p>
              {(config.recipeLocationOverride || document.getElementById('override-location-input')) && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      id="override-location-input"
                      type="text"
                      defaultValue={config.recipeLocationOverride || ''}
                      onBlur={(e) => {
                        const value = e.target.value.trim() || null;
                        if (value !== config.recipeLocationOverride) {
                          handleUpdate({ recipeLocationOverride: value });
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const value = (e.target as HTMLInputElement).value.trim() || null;
                          if (value !== config.recipeLocationOverride) {
                            handleUpdate({ recipeLocationOverride: value });
                          }
                        }
                      }}
                      placeholder="e.g., Spain, Barcelona"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      disabled={saving}
                    />
                  </div>
                  {config.recipeLocationOverride && (
                    <button
                      onClick={() => handleUpdate({ recipeLocationOverride: null })}
                      disabled={saving}
                      className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Clear Override
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Navigation size={24} className="text-sky-600" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">Navigation Tabs</h2>
                <p className="text-sm text-gray-600">
                  Customize which tabs appear in your main navigation
                </p>
              </div>
              <div className="text-sm font-medium text-gray-600">
                {favouriteNavTabs.length} / 8 tabs
              </div>
            </div>

            {favouriteNavTabs.length >= 8 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                You have reached the maximum of 8 favourite tabs. Remove a tab to add another.
              </div>
            )}

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Favourited Tabs {favouritedNavTabs.length > 0 && `(${favouritedNavTabs.length})`}
                </h3>
                <div className="space-y-2">
                  {favouritedNavTabs.map((tab, index) => {
                    const Icon = NAV_ICON_MAP[tab.icon];
                    return (
                      <div
                        key={tab.id}
                        className="flex items-center gap-3 p-3 bg-sky-50 border border-sky-200 rounded-lg"
                      >
                        <Icon size={18} className="text-sky-600 flex-shrink-0" />
                        <span className="flex-1 text-sm font-medium text-gray-900">
                          {tab.label}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => moveNavFavourite(tab.id, 'up')}
                            disabled={index === 0 || saving}
                            className={`p-1 rounded hover:bg-sky-100 transition-colors ${index === 0 || saving
                                ? 'opacity-30 cursor-not-allowed'
                                : 'text-sky-600'
                              }`}
                            title={index === 0 ? 'Already at top' : 'Move up'}
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            onClick={() => moveNavFavourite(tab.id, 'down')}
                            disabled={index === favouritedNavTabs.length - 1 || saving}
                            className={`p-1 rounded hover:bg-sky-100 transition-colors ${index === favouritedNavTabs.length - 1 || saving
                                ? 'opacity-30 cursor-not-allowed'
                                : 'text-sky-600'
                              }`}
                            title={index === favouritedNavTabs.length - 1 ? 'Already at bottom' : 'Move down'}
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button
                            onClick={() => toggleNavFavourite(tab.id)}
                            disabled={favouriteNavTabs.length === 1 || saving}
                            className={`p-1 rounded hover:bg-amber-100 transition-colors ${favouriteNavTabs.length === 1 || saving
                                ? 'opacity-30 cursor-not-allowed'
                                : 'text-amber-600'
                              }`}
                            title={favouriteNavTabs.length === 1 ? 'Must have at least 1 favourite tab' : 'Remove from favourites'}
                          >
                            <Star size={16} fill="currentColor" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {nonFavouritedNavTabs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Available Tabs {nonFavouritedNavTabs.length > 0 && `(${nonFavouritedNavTabs.length})`}
                  </h3>
                  <div className="space-y-2">
                    {nonFavouritedNavTabs.map((tab) => {
                      const Icon = NAV_ICON_MAP[tab.icon];
                      const canAdd = favouriteNavTabs.length < 8;
                      return (
                        <div
                          key={tab.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                        >
                          <Icon size={18} className="text-gray-600 flex-shrink-0" />
                          <span className="flex-1 text-sm font-medium text-gray-900">
                            {tab.label}
                          </span>
                          <button
                            onClick={() => toggleNavFavourite(tab.id)}
                            disabled={!canAdd || saving}
                            className={`p-1 rounded hover:bg-sky-100 transition-colors ${!canAdd || saving
                                ? 'opacity-30 cursor-not-allowed'
                                : 'text-sky-600'
                              }`}
                            title={!canAdd ? 'Maximum 8 favourites reached' : 'Add to favourites'}
                          >
                            <Star size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Eye size={24} className="text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Neurotype Profiles</h2>
                <p className="text-sm text-gray-600">
                  Choose a preset optimized for your needs
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {neurotypeProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleSetNeurotype(profile.id)}
                  disabled={saving}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${preferences?.neurotype_profile_id === profile.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                    } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{profile.display_name}</h3>
                    {preferences?.neurotype_profile_id === profile.id && (
                      <Check size={20} className="text-blue-600" />
                    )}
                  </div>
                  {profile.description && (
                    <p className="text-sm text-gray-600">{profile.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Maximize2 size={24} className="text-teal-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Layout Mode</h2>
                <p className="text-sm text-gray-600">Choose your preferred dashboard layout</p>
              </div>
            </div>

            <div className="space-y-3">
              {layoutOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleUpdate({ layoutMode: option.value })}
                  disabled={saving}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${config.layoutMode === option.value
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-teal-300'
                    } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{option.label}</h3>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                    {config.layoutMode === option.value && (
                      <Check size={20} className="text-teal-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Palette size={24} className="text-purple-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Color Theme</h2>
                <p className="text-sm text-gray-600">Select a background color for readability</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(Object.keys(COLOR_THEMES) as ColorTheme[]).map((theme) => (
                <button
                  key={theme}
                  onClick={() => handleUpdate({ colorTheme: theme })}
                  disabled={saving}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${config.colorTheme === theme
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                    } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div
                    className={`w-full h-12 rounded mb-2 ${COLOR_THEMES[theme].bg}`}
                  ></div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {theme.replace('-', ' ')}
                    </span>
                    {config.colorTheme === theme && (
                      <Check size={16} className="text-purple-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Type size={24} className="text-orange-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Text & Spacing</h2>
                <p className="text-sm text-gray-600">Adjust font size and interface density</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Font Size
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {fontOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleUpdate({ fontScale: option.value })}
                      disabled={saving}
                      className={`p-3 rounded-lg border-2 transition-all ${config.fontScale === option.value
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300'
                        } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Interface Density
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {densityOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleUpdate({ uiDensity: option.value })}
                      disabled={saving}
                      className={`p-3 rounded-lg border-2 transition-all ${config.uiDensity === option.value
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300'
                        } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Contrast Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {contrastOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleUpdate({ contrastLevel: option.value })}
                      disabled={saving}
                      className={`p-3 rounded-lg border-2 transition-all ${config.contrastLevel === option.value
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300'
                        } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.reducedMotion}
                    onChange={(e) => handleUpdate({ reducedMotion: e.target.checked })}
                    disabled={saving}
                    className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Reduced Motion</span>
                    <p className="text-xs text-gray-600">Minimize animations and transitions</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <button
              onClick={handleReset}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors ${saving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              <RotateCcw size={20} />
              <span className="font-medium">Reset to Defaults</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
