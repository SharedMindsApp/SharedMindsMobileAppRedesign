import { useState, useEffect } from 'react';
import { X, Check, GripVertical, Eye, EyeOff, Star } from 'lucide-react';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import { useAuth } from '../../contexts/AuthContext';
import { CategoryColorSettings } from '../tags/CategoryColorSettings';
import { FEATURE_CONTEXT_TAGGING } from '../../lib/featureFlags';
import { BottomSheet } from '../shared/BottomSheet';
import {
  PlannerSettings as PlannerSettingsType,
  PlannerStylePreset,
  PLANNER_STYLE_PRESETS,
  DEFAULT_PLANNER_SETTINGS,
  PlannerTabConfig,
} from '../../lib/plannerTypes';

type PlannerSettingsProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function PlannerSettings({ isOpen, onClose }: PlannerSettingsProps) {
  const { getCustomOverride, updateCustomOverride } = useUIPreferences();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const currentSettings: PlannerSettingsType = getCustomOverride('planner_settings', DEFAULT_PLANNER_SETTINGS);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Ensure favouriteTabs and quickActions exist (backwards compatibility)
  const settingsWithDefaults = {
    ...currentSettings,
    favouriteTabs: currentSettings.favouriteTabs?.length
      ? currentSettings.favouriteTabs
      : DEFAULT_PLANNER_SETTINGS.favouriteTabs,
    quickActions: currentSettings.quickActions?.length
      ? currentSettings.quickActions
      : DEFAULT_PLANNER_SETTINGS.quickActions,
  };

  const [settings, setSettings] = useState<PlannerSettingsType>(settingsWithDefaults);
  const [activeTab, setActiveTab] = useState<'style' | 'favourites' | 'tabs' | 'comfort' | 'quickActions'>('style');

  if (!isOpen) return null;

  const handleSave = async () => {
    await updateCustomOverride('planner_settings', settings);
    onClose();
  };

  const handlePresetChange = (preset: PlannerStylePreset) => {
    setSettings({ ...settings, stylePreset: preset });
  };

  const toggleTabEnabled = (path: string) => {
    // Core tabs cannot be disabled
    const coreTabs = ['/planner', '/planner/calendar'];
    if (coreTabs.includes(path)) return;

    setSettings({
      ...settings,
      tabConfig: settings.tabConfig.map((tab) =>
        tab.path === path ? { ...tab, enabled: !tab.enabled } : tab
      ),
    });
  };

  const moveTab = (path: string, direction: 'up' | 'down') => {
    const tab = settings.tabConfig.find((t) => t.path === path);
    if (!tab) return;

    const sameSideTabs = settings.tabConfig
      .filter((t) => t.side === tab.side)
      .sort((a, b) => a.order - b.order);

    const currentIndex = sameSideTabs.findIndex((t) => t.path === path);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === sameSideTabs.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const swapTab = sameSideTabs[newIndex];

    setSettings({
      ...settings,
      tabConfig: settings.tabConfig.map((t) => {
        if (t.path === path) return { ...t, order: swapTab.order };
        if (t.path === swapTab.path) return { ...t, order: tab.order };
        return t;
      }),
    });
  };

  const toggleFavourite = (path: string) => {
    const currentFavourites = settings.favouriteTabs || [];
    const isFavourited = currentFavourites.includes(path);

    if (isFavourited) {
      // Must keep at least 1 favourite
      if (currentFavourites.length <= 1) return;

      setSettings({
        ...settings,
        favouriteTabs: currentFavourites.filter(p => p !== path),
      });
    } else {
      // Max 10 favourites
      if (currentFavourites.length >= 10) return;

      setSettings({
        ...settings,
        favouriteTabs: [...currentFavourites, path],
      });
    }
  };

  const moveFavourite = (path: string, direction: 'up' | 'down') => {
    const currentFavourites = settings.favouriteTabs || [];
    const currentIndex = currentFavourites.indexOf(path);

    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === currentFavourites.length - 1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newFavourites = [...currentFavourites];
    [newFavourites[currentIndex], newFavourites[newIndex]] = [newFavourites[newIndex], newFavourites[currentIndex]];

    setSettings({
      ...settings,
      favouriteTabs: newFavourites,
    });
  };

  const leftTabs = settings.tabConfig
    .filter((t) => t.side === 'left')
    .sort((a, b) => a.order - b.order);

  const rightTabs = settings.tabConfig
    .filter((t) => t.side === 'right')
    .sort((a, b) => a.order - b.order);

  const coreTabs = ['/planner', '/planner/calendar'];

  const allPlannerTabs = [...leftTabs, ...rightTabs];
  const currentFavourites = settings.favouriteTabs || [];
  const favouriteCount = currentFavourites.length;

  // Render tabs - horizontally scrollable on mobile
  const renderTabs = () => (
    <div className={`flex border-b border-gray-200 ${isMobile ? 'overflow-x-auto scrollbar-hide' : ''}`}>
      <button
        onClick={() => setActiveTab('style')}
        className={`${isMobile ? 'px-4 py-3 whitespace-nowrap flex-shrink-0' : 'flex-1 px-6 py-3'} text-sm font-medium transition-colors min-h-[44px] ${
          activeTab === 'style'
            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        {isMobile ? 'Style' : 'Visual Style'}
      </button>
      <button
        onClick={() => setActiveTab('favourites')}
        className={`${isMobile ? 'px-4 py-3 whitespace-nowrap flex-shrink-0' : 'flex-1 px-6 py-3'} text-sm font-medium transition-colors min-h-[44px] ${
          activeTab === 'favourites'
            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        Favourites
      </button>
      <button
        onClick={() => setActiveTab('tabs')}
        className={`${isMobile ? 'px-4 py-3 whitespace-nowrap flex-shrink-0' : 'flex-1 px-6 py-3'} text-sm font-medium transition-colors min-h-[44px] ${
          activeTab === 'tabs'
            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        {isMobile ? 'Tabs' : 'Edge Tabs'}
      </button>
      <button
        onClick={() => setActiveTab('comfort')}
        className={`${isMobile ? 'px-4 py-3 whitespace-nowrap flex-shrink-0' : 'flex-1 px-6 py-3'} text-sm font-medium transition-colors min-h-[44px] ${
          activeTab === 'comfort'
            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        Comfort
      </button>
      <button
        onClick={() => setActiveTab('quickActions')}
        className={`${isMobile ? 'px-4 py-3 whitespace-nowrap flex-shrink-0' : 'flex-1 px-6 py-3'} text-sm font-medium transition-colors min-h-[44px] ${
          activeTab === 'quickActions'
            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        {isMobile ? 'Actions' : 'Quick Actions'}
      </button>
    </div>
  );

  // Render footer buttons
  const renderFooter = () => (
    <div className={`flex items-center justify-between ${isMobile ? 'p-4' : 'p-6'} border-t border-gray-200 bg-gray-50`}>
      <button
        onClick={() => {
          setSettings(DEFAULT_PLANNER_SETTINGS);
        }}
        className={`${isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm'} font-medium text-gray-700 hover:text-gray-900 transition-colors min-h-[44px]`}
      >
        {isMobile ? 'Reset' : 'Reset to Defaults'}
      </button>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className={`${isMobile ? 'px-4 py-2 text-sm' : 'px-4 py-2 text-sm'} font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]`}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className={`${isMobile ? 'px-4 py-2 text-sm' : 'px-4 py-2 text-sm'} font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]`}
        >
          Save
        </button>
      </div>
    </div>
  );

  // Mobile: Use BottomSheet
  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Planner Settings"
        maxHeight="90vh"
        footer={renderFooter()}
      >
        <div className="space-y-0">
          {/* Tabs - Sticky on mobile */}
          <div className="sticky top-0 bg-white z-10 -mx-4 px-4">
            {renderTabs()}
          </div>

          {/* Content */}
          <div className="overflow-y-auto -mx-4 px-4 py-4">
            {/* Content sections remain the same but with mobile spacing */}
            {activeTab === 'favourites' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      Select up to 10 planner tabs to appear in the top header.
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">{favouriteCount} / 10</div>
                    <div className="text-xs text-gray-500">Favourites</div>
                  </div>
                </div>

                {/* Favourited Tabs */}
                {currentFavourites.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm">Favourited Tabs</h3>
                    <div className="space-y-2">
                      {currentFavourites.map((path, index) => {
                        const tab = allPlannerTabs.find(t => t.path === path);
                        if (!tab) return null;
                        return (
                          <div
                            key={path}
                            className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border-2 border-blue-200"
                          >
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => moveFavourite(path, 'up')}
                                disabled={index === 0}
                                className="text-blue-600 hover:text-blue-800 disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
                              >
                                <GripVertical className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => moveFavourite(path, 'down')}
                                disabled={index === currentFavourites.length - 1}
                                className="text-blue-600 hover:text-blue-800 disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
                              >
                                <GripVertical className="w-4 h-4 rotate-180" />
                              </button>
                            </div>
                            <div className="flex-1 font-medium text-gray-900 text-sm">{tab.label}</div>
                            <button
                              onClick={() => toggleFavourite(path)}
                              disabled={currentFavourites.length <= 1}
                              className={`p-2 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                                currentFavourites.length <= 1
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-amber-500 hover:bg-amber-50'
                              }`}
                              title={currentFavourites.length <= 1 ? 'At least 1 favourite required' : 'Remove from favourites'}
                            >
                              <Star className="w-5 h-5 fill-current" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Available Tabs */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">Available Tabs</h3>
                  {favouriteCount >= 10 && (
                    <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                      Maximum of 10 favourites reached.
                    </div>
                  )}
                  <div className="space-y-2">
                    {allPlannerTabs
                      .filter(tab => !currentFavourites.includes(tab.path))
                      .map((tab) => (
                        <div
                          key={tab.path}
                          className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex-1 font-medium text-gray-900 text-sm">{tab.label}</div>
                          <button
                            onClick={() => toggleFavourite(tab.path)}
                            disabled={favouriteCount >= 10}
                            className={`p-2 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                              favouriteCount >= 10
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                            }`}
                            title={favouriteCount >= 10 ? 'Maximum favourites reached' : 'Add to favourites'}
                          >
                            <Star className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Style Presets */}
            {activeTab === 'style' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">Visual Style Presets</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose a visual style for your planner.
                  </p>
                  <div className="space-y-3">
                    {Object.values(PLANNER_STYLE_PRESETS).map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handlePresetChange(preset.id)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all min-h-[44px] ${
                          settings.stylePreset === preset.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1 text-sm">{preset.name}</h3>
                            <p className="text-xs text-gray-600">{preset.description}</p>
                          </div>
                          {settings.stylePreset === preset.id && (
                            <Check className="w-5 h-5 text-blue-600 flex-shrink-0 ml-3" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tag Category Colors */}
                {FEATURE_CONTEXT_TAGGING && user?.id && (
                  <div className="border-t border-gray-200 pt-4">
                    <CategoryColorSettings userId={user.id} compact={true} />
                  </div>
                )}
              </div>
            )}

            {/* Tab Layout */}
            {activeTab === 'tabs' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Customize the edge tabs that appear on the left and right sides of the planner.
                </p>

                {/* Left Tabs */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">Left Edge Tabs</h3>
                  <div className="space-y-2">
                    {leftTabs.map((tab, index) => (
                      <div
                        key={tab.path}
                        className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveTab(tab.path, 'up')}
                            disabled={index === 0}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
                          >
                            <GripVertical className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveTab(tab.path, 'down')}
                            disabled={index === leftTabs.length - 1}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
                          >
                            <GripVertical className="w-4 h-4 rotate-180" />
                          </button>
                        </div>
                        <div className="flex-1 font-medium text-gray-900 text-sm">{tab.label}</div>
                        <button
                          onClick={() => toggleTabEnabled(tab.path)}
                          disabled={coreTabs.includes(tab.path)}
                          className={`p-2 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                            coreTabs.includes(tab.path)
                              ? 'text-gray-300 cursor-not-allowed'
                              : tab.enabled
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                        >
                          {tab.enabled ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Tabs */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">Right Edge Tabs</h3>
                  <div className="space-y-2">
                    {rightTabs.map((tab, index) => (
                      <div
                        key={tab.path}
                        className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveTab(tab.path, 'up')}
                            disabled={index === 0}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
                          >
                            <GripVertical className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveTab(tab.path, 'down')}
                            disabled={index === rightTabs.length - 1}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
                          >
                            <GripVertical className="w-4 h-4 rotate-180" />
                          </button>
                        </div>
                        <div className="flex-1 font-medium text-gray-900 text-sm">{tab.label}</div>
                        <button
                          onClick={() => toggleTabEnabled(tab.path)}
                          className={`p-2 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                            tab.enabled
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                        >
                          {tab.enabled ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Comfort Settings */}
            {activeTab === 'comfort' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Adjust spacing and visual intensity to suit your comfort level.
                </p>

                {/* Spacing */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">Spacing</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setSettings({
                          ...settings,
                          comfort: { ...settings.comfort, spacing: 'compact' },
                        })
                      }
                      className={`flex-1 p-3 rounded-lg border-2 transition-all min-h-[44px] ${
                        settings.comfort.spacing === 'compact'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900 text-sm">Compact</div>
                      <div className="text-xs text-gray-600 mt-1">More content visible</div>
                    </button>
                    <button
                      onClick={() =>
                        setSettings({
                          ...settings,
                          comfort: { ...settings.comfort, spacing: 'comfortable' },
                        })
                      }
                      className={`flex-1 p-3 rounded-lg border-2 transition-all min-h-[44px] ${
                        settings.comfort.spacing === 'comfortable'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900 text-sm">Comfortable</div>
                      <div className="text-xs text-gray-600 mt-1">Easier to read</div>
                    </button>
                  </div>
                </div>

                {/* Toggle Options */}
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 min-h-[44px]">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">Hide secondary sections</div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        Simplify planner pages
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.comfort.hideSecondary}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          comfort: { ...settings.comfort, hideSecondary: e.target.checked },
                        })
                      }
                      className="w-5 h-5 rounded border-gray-300"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 min-h-[44px]">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">Reduce color intensity</div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        Softer tab colors
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.comfort.reduceColorIntensity}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          comfort: { ...settings.comfort, reduceColorIntensity: e.target.checked },
                        })
                      }
                      className="w-5 h-5 rounded border-gray-300"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            {activeTab === 'quickActions' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Customize quick actions available from the floating action button.
                </p>

                <div className="space-y-2">
                  {(settings.quickActions || []).map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={action.enabled}
                        onChange={(e) => {
                          setSettings({
                            ...settings,
                            quickActions: (settings.quickActions || []).map((a) =>
                              a.id === action.id ? { ...a, enabled: e.target.checked } : a
                            ),
                          });
                        }}
                        className="w-5 h-5 rounded border-gray-300"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm">{action.label}</div>
                        {action.description && (
                          <div className="text-xs text-gray-600 mt-0.5">{action.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const actions = [...(settings.quickActions || [])];
                            const currentIndex = actions.findIndex((a) => a.id === action.id);
                            if (currentIndex > 0) {
                              [actions[currentIndex], actions[currentIndex - 1]] = [
                                actions[currentIndex - 1],
                                actions[currentIndex],
                              ];
                              setSettings({
                                ...settings,
                                quickActions: actions.map((a, i) => ({ ...a, order: i })),
                              });
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Move up"
                        >
                          <GripVertical className="w-4 h-4 rotate-90" />
                        </button>
                        <button
                          onClick={() => {
                            const actions = [...(settings.quickActions || [])];
                            const currentIndex = actions.findIndex((a) => a.id === action.id);
                            if (currentIndex < actions.length - 1) {
                              [actions[currentIndex], actions[currentIndex + 1]] = [
                                actions[currentIndex + 1],
                                actions[currentIndex],
                              ];
                              setSettings({
                                ...settings,
                                quickActions: actions.map((a, i) => ({ ...a, order: i })),
                              });
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Move down"
                        >
                          <GripVertical className="w-4 h-4 -rotate-90" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </BottomSheet>
    );
  }

  // Desktop: Keep existing modal
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 safe-top safe-bottom">
      <div className="bg-white rounded-xl shadow-2xl max-w-full sm:max-w-3xl w-full max-h-screen-safe overflow-hidden flex flex-col overscroll-contain">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Planner Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        {renderTabs()}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 overscroll-contain">
          {/* Favourites */}
          {activeTab === 'favourites' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-gray-600">
                    Select up to 10 planner tabs to appear in the top header. Drag to reorder.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    All tabs remain accessible via edge tabs and Index, even if not favourited.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{favouriteCount} / 10</div>
                  <div className="text-xs text-gray-500">Favourites</div>
                </div>
              </div>

              {/* Favourited Tabs */}
              {currentFavourites.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Favourited Tabs (Top Header)</h3>
                  <div className="space-y-2">
                    {currentFavourites.map((path, index) => {
                      const tab = allPlannerTabs.find(t => t.path === path);
                      if (!tab) return null;
                      return (
                        <div
                          key={path}
                          className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border-2 border-blue-200"
                        >
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => moveFavourite(path, 'up')}
                              disabled={index === 0}
                              className="text-blue-600 hover:text-blue-800 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <GripVertical className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveFavourite(path, 'down')}
                              disabled={index === currentFavourites.length - 1}
                              className="text-blue-600 hover:text-blue-800 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <GripVertical className="w-4 h-4 rotate-180" />
                            </button>
                          </div>
                          <div className="flex-1 font-medium text-gray-900">{tab.label}</div>
                          <button
                            onClick={() => toggleFavourite(path)}
                            disabled={currentFavourites.length <= 1}
                            className={`p-2 rounded transition-colors ${
                              currentFavourites.length <= 1
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-amber-500 hover:bg-amber-50'
                            }`}
                            title={currentFavourites.length <= 1 ? 'At least 1 favourite required' : 'Remove from favourites'}
                          >
                            <Star className="w-5 h-5 fill-current" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Available Tabs */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Available Tabs</h3>
                {favouriteCount >= 10 && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    Maximum of 10 favourites reached. Remove a favourite to add more.
                  </div>
                )}
                <div className="space-y-2">
                  {allPlannerTabs
                    .filter(tab => !currentFavourites.includes(tab.path))
                    .map((tab) => (
                      <div
                        key={tab.path}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1 font-medium text-gray-900">{tab.label}</div>
                        <button
                          onClick={() => toggleFavourite(tab.path)}
                          disabled={favouriteCount >= 10}
                          className={`p-2 rounded transition-colors ${
                            favouriteCount >= 10
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                          }`}
                          title={favouriteCount >= 10 ? 'Maximum favourites reached' : 'Add to favourites'}
                        >
                          <Star className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Style Presets */}
          {activeTab === 'style' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Visual Style Presets</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Choose a visual style for your planner. This affects colors, tones, and overall aesthetic.
                </p>
                <div className="space-y-4">
                  {Object.values(PLANNER_STYLE_PRESETS).map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetChange(preset.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        settings.stylePreset === preset.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{preset.name}</h3>
                          <p className="text-sm text-gray-600">{preset.description}</p>
                        </div>
                        {settings.stylePreset === preset.id && (
                          <Check className="w-5 h-5 text-blue-600 flex-shrink-0 ml-3" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tag Category Colors */}
              {FEATURE_CONTEXT_TAGGING && user?.id && (
                <div className="border-t border-gray-200 pt-6">
                  <CategoryColorSettings userId={user.id} compact={true} />
                </div>
              )}
            </div>
          )}

          {/* Tab Layout */}
          {activeTab === 'tabs' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600">
                Customize the edge tabs that appear on the left and right sides of the planner book.
                These show your complete planner structure, independent of your favourites.
              </p>
              <p className="text-xs text-gray-500">
                Core tabs (Index, Daily, Weekly, Monthly) cannot be hidden.
              </p>

              {/* Left Tabs */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Left Edge Tabs</h3>
                <div className="space-y-2">
                  {leftTabs.map((tab, index) => (
                    <div
                      key={tab.path}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveTab(tab.path, 'up')}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveTab(tab.path, 'down')}
                          disabled={index === leftTabs.length - 1}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <GripVertical className="w-4 h-4 rotate-180" />
                        </button>
                      </div>
                      <div className="flex-1 font-medium text-gray-900">{tab.label}</div>
                      <button
                        onClick={() => toggleTabEnabled(tab.path)}
                        disabled={coreTabs.includes(tab.path)}
                        className={`p-2 rounded transition-colors ${
                          coreTabs.includes(tab.path)
                            ? 'text-gray-300 cursor-not-allowed'
                            : tab.enabled
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {tab.enabled ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Tabs */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Right Edge Tabs</h3>
                <div className="space-y-2">
                  {rightTabs.map((tab, index) => (
                    <div
                      key={tab.path}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveTab(tab.path, 'up')}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveTab(tab.path, 'down')}
                          disabled={index === rightTabs.length - 1}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <GripVertical className="w-4 h-4 rotate-180" />
                        </button>
                      </div>
                      <div className="flex-1 font-medium text-gray-900">{tab.label}</div>
                      <button
                        onClick={() => toggleTabEnabled(tab.path)}
                        className={`p-2 rounded transition-colors ${
                          tab.enabled
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {tab.enabled ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Comfort Settings */}
          {activeTab === 'comfort' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 mb-6">
                Adjust spacing and visual intensity to suit your comfort level.
              </p>

              {/* Spacing */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Spacing</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      setSettings({
                        ...settings,
                        comfort: { ...settings.comfort, spacing: 'compact' },
                      })
                    }
                    className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                      settings.comfort.spacing === 'compact'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">Compact</div>
                    <div className="text-sm text-gray-600 mt-1">More content visible</div>
                  </button>
                  <button
                    onClick={() =>
                      setSettings({
                        ...settings,
                        comfort: { ...settings.comfort, spacing: 'comfortable' },
                      })
                    }
                    className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                      settings.comfort.spacing === 'comfortable'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">Comfortable</div>
                    <div className="text-sm text-gray-600 mt-1">Easier to read</div>
                  </button>
                </div>
              </div>

              {/* Toggle Options */}
              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <div className="font-medium text-gray-900">Hide secondary sections</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Simplify planner pages by hiding optional sections
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.comfort.hideSecondary}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        comfort: { ...settings.comfort, hideSecondary: e.target.checked },
                      })
                    }
                    className="w-5 h-5 rounded border-gray-300"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <div className="font-medium text-gray-900">Reduce color intensity</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Soften tab colors for a more subtle appearance
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.comfort.reduceColorIntensity}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        comfort: { ...settings.comfort, reduceColorIntensity: e.target.checked },
                      })
                    }
                    className="w-5 h-5 rounded border-gray-300"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {activeTab === 'quickActions' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 mb-6">
                Customize quick actions available from the floating action button. Enable or disable actions and reorder them.
              </p>

              <div className="space-y-3">
                {(settings.quickActions || []).map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <input
                      type="checkbox"
                      checked={action.enabled}
                      onChange={(e) => {
                        setSettings({
                          ...settings,
                          quickActions: (settings.quickActions || []).map((a) =>
                            a.id === action.id ? { ...a, enabled: e.target.checked } : a
                          ),
                        });
                      }}
                      className="w-5 h-5 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">{action.label}</div>
                      {action.description && (
                        <div className="text-sm text-gray-600 mt-0.5">{action.description}</div>
                      )}
                      {action.path && (
                        <div className="text-xs text-gray-500 mt-1">Path: {action.path}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const actions = [...(settings.quickActions || [])];
                          const currentIndex = actions.findIndex((a) => a.id === action.id);
                          if (currentIndex > 0) {
                            [actions[currentIndex], actions[currentIndex - 1]] = [
                              actions[currentIndex - 1],
                              actions[currentIndex],
                            ];
                            setSettings({
                              ...settings,
                              quickActions: actions.map((a, i) => ({ ...a, order: i })),
                            });
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Move up"
                      >
                        <GripVertical className="w-4 h-4 rotate-90" />
                      </button>
                      <button
                        onClick={() => {
                          const actions = [...(settings.quickActions || [])];
                          const currentIndex = actions.findIndex((a) => a.id === action.id);
                          if (currentIndex < actions.length - 1) {
                            [actions[currentIndex], actions[currentIndex + 1]] = [
                              actions[currentIndex + 1],
                              actions[currentIndex],
                            ];
                            setSettings({
                              ...settings,
                              quickActions: actions.map((a, i) => ({ ...a, order: i })),
                            });
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Move down"
                      >
                        <GripVertical className="w-4 h-4 -rotate-90" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {renderFooter()}
      </div>
    </div>
  );
}
