/**
 * CalendarSettingsSheet
 * 
 * Settings panel for calendar preferences.
 * Shared by Planner and SpacesOS calendars.
 * 
 * Opens as bottom sheet (mobile) / modal (desktop).
 */

import { useState, useEffect } from 'react';
import { Settings, RefreshCw, ChevronRight, Info, Shield, X, Plus } from 'lucide-react';
import { BottomSheet } from '../shared/BottomSheet';
import { useCalendarSettings, type CalendarSettings } from '../../hooks/useCalendarSettings';
import { useEventTypeColors, DEFAULT_EVENT_TYPE_COLORS } from '../../hooks/useEventTypeColors';
import { EventTypeColorPicker } from './EventTypeColorPicker';
import type { CalendarView } from '../calendarCore/types';
import type { CalendarEventType } from '../../lib/personalSpaces/calendarService';
import { GuardRailsCalendarSyncSheet } from './GuardRailsCalendarSyncSheet';
import { ENABLE_GROUP_DISTRIBUTION } from '../../lib/featureFlags';
import { useCalendarVisibilityDefaults, type VisibilityAudienceType } from '../../hooks/useCalendarVisibilityDefaults';

interface CalendarSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Calendar Visibility Defaults Section
 * 
 * Phase 6.3 - Prompt 2: UI for managing default visibility audiences
 * 
 * Allows calendar owner to define who should automatically receive visibility
 * on newly created events and tasks.
 */
function CalendarVisibilityDefaultsSection() {
  const { defaults, isLoaded, updateDefaults, addAudience, removeAudience } = useCalendarVisibilityDefaults();
  const [newGroupId, setNewGroupId] = useState('');
  const [newAudienceType, setNewAudienceType] = useState<VisibilityAudienceType>('group');

  if (!isLoaded) {
    return null;
  }

  const handleToggleEnabled = () => {
    updateDefaults({ enabled: !defaults.enabled });
  };

  const handleAddAudience = () => {
    if (!newGroupId.trim()) {
      return;
    }
    addAudience({
      id: newGroupId.trim(),
      type: newAudienceType,
    });
    setNewGroupId('');
  };

  const groupAudiences = defaults.audiences.filter(a => a.type === 'group');
  const userAudiences = defaults.audiences.filter(a => a.type === 'user');
  const householdAudiences = defaults.audiences.filter(a => a.type === 'household');
  const totalAudiences = defaults.audiences.length;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Shield size={18} className="text-gray-700" />
        <h3 className="text-base font-semibold text-gray-900">Default Visibility & Sharing</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Choose who can automatically see new events and tasks you create in this calendar.
          </p>
          <p className="text-xs text-gray-500 mb-4">
            These defaults apply only when creating new events or tasks. Existing items are not affected, and visibility can still be adjusted per event or task.
          </p>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center justify-between py-2 border-b border-gray-200 pb-4">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Automatically share new items
            </label>
            <p className="text-xs text-gray-500 mt-0.5">
              Enable default visibility sharing
            </p>
          </div>
          <button
            onClick={handleToggleEnabled}
            className={`
              relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px] min-w-[44px] items-center justify-center
              ${defaults.enabled ? 'bg-blue-600' : 'bg-gray-200'}
            `}
            role="switch"
            aria-checked={defaults.enabled}
          >
            <span
              className={`
                pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                ${defaults.enabled ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>

        {/* Audience Selection (shown when enabled) */}
        {defaults.enabled && (
          <div className="space-y-4 pt-2">
            {/* Add Audience */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Add Audience
                </label>
                <div className="flex gap-2">
                  <select
                    value={newAudienceType}
                    onChange={(e) => setNewAudienceType(e.target.value as VisibilityAudienceType)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="group">Group</option>
                    <option value="user">User</option>
                    <option value="household">Household</option>
                  </select>
                  <input
                    type="text"
                    value={newGroupId}
                    onChange={(e) => setNewGroupId(e.target.value)}
                    placeholder={`Enter ${newAudienceType} ID`}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleAddAudience}
                    disabled={!newGroupId.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Audience List */}
            {totalAudiences > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Current Audiences
                </label>
                <div className="space-y-2">
                  {defaults.audiences.map((audience) => (
                    <div
                      key={`${audience.type}-${audience.id}`}
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {audience.type}
                        </span>
                        <span className="text-sm text-gray-600">:</span>
                        <span className="text-sm text-gray-700 font-mono">
                          {audience.id}
                        </span>
                      </div>
                      <button
                        onClick={() => removeAudience(audience.id, audience.type)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={`Remove ${audience.type}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="pt-2 border-t border-gray-200">
              {totalAudiences === 0 ? (
                <p className="text-sm text-amber-600">
                  No recipients selected — new items will not be shared
                </p>
              ) : (
                <p className="text-sm text-gray-700">
                  New items will be shared with{' '}
                  <span className="font-medium text-gray-900">
                    {totalAudiences} {totalAudiences === 1 ? 'audience' : 'audiences'}
                  </span>
                  {groupAudiences.length > 0 && (
                    <span className="text-gray-600">
                      {' '}({groupAudiences.length} {groupAudiences.length === 1 ? 'group' : 'groups'}
                      {userAudiences.length > 0 && `, ${userAudiences.length} ${userAudiences.length === 1 ? 'user' : 'users'}`}
                      {householdAudiences.length > 0 && `, ${householdAudiences.length} ${householdAudiences.length === 1 ? 'household' : 'households'}`})
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Summary when disabled */}
        {!defaults.enabled && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              No default visibility configured
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export function CalendarSettingsSheet({ isOpen, onClose }: CalendarSettingsSheetProps) {
  const { settings, updateSettings, resetSettings, isLoaded } = useCalendarSettings();
  const { colors: eventTypeColors, updateColor, resetColor, hasDuplicates, duplicateGroups } = useEventTypeColors();
  const [localSettings, setLocalSettings] = useState<CalendarSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [guardRailsSyncOpen, setGuardRailsSyncOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<CalendarEventType | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync local settings when settings change
  useEffect(() => {
    if (isLoaded) {
      setLocalSettings(settings);
      setHasChanges(false);
    }
  }, [settings, isLoaded]);

  // Check for changes
  useEffect(() => {
    if (isLoaded) {
      const changed = JSON.stringify(localSettings) !== JSON.stringify(settings);
      setHasChanges(changed);
    }
  }, [localSettings, settings, isLoaded]);

  const handleUpdate = (updates: Partial<CalendarSettings>) => {
    setLocalSettings(prev => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
  };

  const handleCancel = () => {
    setLocalSettings(settings);
    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    if (confirm('Reset all calendar settings to defaults?')) {
      resetSettings();
      onClose();
    }
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={hasChanges ? handleCancel : onClose}
      title="Calendar Settings"
      maxHeight="90vh"
      closeOnBackdrop={!hasChanges}
      preventClose={hasChanges}
      footer={
        <div className={`flex gap-3 ${isMobile ? 'pb-20' : ''}`}>
          <button
            onClick={handleReset}
            className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium min-h-[44px]"
            type="button"
          >
            Reset
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all font-medium min-h-[44px]"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex-1 px-4 py-2.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium min-h-[44px]"
            type="button"
          >
            Save
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* GuardRails Sync */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">GuardRails Integration</h3>
          <button
            onClick={() => {
              onClose();
              setGuardRailsSyncOpen(true);
            }}
            className="w-full px-4 py-3 text-left border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all min-h-[44px] flex items-center gap-3"
          >
            <RefreshCw size={20} className="text-gray-600" />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Sync from GuardRails</div>
              <div className="text-xs text-gray-500">Select projects, tracks, and items to sync to your calendar</div>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        </section>

        {/* Display Settings */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Display Settings</h3>
          <div className="space-y-4">
            {/* Default Calendar View */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Calendar View
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['day', 'week', 'month', 'year', 'agenda'] as CalendarView[]).map((view) => (
                  <button
                    key={view}
                    onClick={() => handleUpdate({ defaultView: view })}
                    className={`
                      px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all min-h-[44px]
                      ${localSettings.defaultView === view
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    {view === 'agenda' ? 'Events' : view.charAt(0).toUpperCase() + view.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Week Start Day */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Week Start Day
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['monday', 'sunday'] as const).map((day) => (
                  <button
                    key={day}
                    onClick={() => handleUpdate({ weekStartDay: day })}
                    className={`
                      px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all min-h-[44px]
                      ${localSettings.weekStartDay === day
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['12h', '24h'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => handleUpdate({ timeFormat: format })}
                    className={`
                      px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all min-h-[44px]
                      ${localSettings.timeFormat === format
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    {format === '12h' ? '12-hour' : '24-hour'}
                  </button>
                ))}
              </div>
            </div>

            {/* Show Week Numbers */}
            <div className="flex items-center justify-between py-2">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Show Week Numbers
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Display week numbers in month and year views
                </p>
              </div>
              <button
                onClick={() => handleUpdate({ showWeekNumbers: !localSettings.showWeekNumbers })}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px] min-w-[44px] items-center justify-center
                  ${localSettings.showWeekNumbers ? 'bg-blue-600' : 'bg-gray-200'}
                `}
                role="switch"
                aria-checked={localSettings.showWeekNumbers}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${localSettings.showWeekNumbers ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Behaviour Settings */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Behaviour Settings</h3>
          <div className="space-y-4">
            {/* Auto-scroll to Current Time */}
            <div className="flex items-center justify-between py-2">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Auto-scroll to Current Time
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Automatically scroll to current time in Day & Week views
                </p>
              </div>
              <button
                onClick={() => handleUpdate({ autoScrollToCurrentTime: !localSettings.autoScrollToCurrentTime })}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px] min-w-[44px] items-center justify-center
                  ${localSettings.autoScrollToCurrentTime ? 'bg-blue-600' : 'bg-gray-200'}
                `}
                role="switch"
                aria-checked={localSettings.autoScrollToCurrentTime}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${localSettings.autoScrollToCurrentTime ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>

            {/* Month View Double-Tap Behaviour */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Double-tap Behaviour (Month View)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'select' as const, label: 'Select day only' },
                  { value: 'navigate' as const, label: 'Open Day view' },
                ]).map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleUpdate({ monthViewDoubleTapBehavior: option.value })}
                    className={`
                      px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all min-h-[44px]
                      ${localSettings.monthViewDoubleTapBehavior === option.value
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Event Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Event Duration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 60, 90].map((minutes) => (
                  <button
                    key={minutes}
                    onClick={() => handleUpdate({ defaultEventDuration: minutes })}
                    className={`
                      px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all min-h-[44px]
                      ${localSettings.defaultEventDuration === minutes
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    {minutes}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* View Preferences */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">View Preferences</h3>
          <div className="space-y-4">
            {/* Remember Last View */}
            <div className="flex items-center justify-between py-2">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Remember Last View
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Restore the last calendar view when reopening
                </p>
              </div>
              <button
                onClick={() => handleUpdate({ rememberLastView: !localSettings.rememberLastView })}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px] min-w-[44px] items-center justify-center
                  ${localSettings.rememberLastView ? 'bg-blue-600' : 'bg-gray-200'}
                `}
                role="switch"
                aria-checked={localSettings.rememberLastView}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${localSettings.rememberLastView ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>

            {/* Remember Last Date */}
            <div className="flex items-center justify-between py-2">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Remember Last Selected Date
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Restore the last selected date when reopening
                </p>
              </div>
              <button
                onClick={() => handleUpdate({ rememberLastDate: !localSettings.rememberLastDate })}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px] min-w-[44px] items-center justify-center
                  ${localSettings.rememberLastDate ? 'bg-blue-600' : 'bg-gray-200'}
                `}
                role="switch"
                aria-checked={localSettings.rememberLastDate}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${localSettings.rememberLastDate ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Event Type Colors */}
        <section>
          <h3 className="text-base font-semibold text-gray-900 mb-3">Event Type Colors</h3>
          
          {/* Duplicate Color Info Banner */}
          {hasDuplicates && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Some event types are using the same colour. This is totally fine, but you may want to differentiate them for clarity.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {(Object.keys(DEFAULT_EVENT_TYPE_COLORS) as CalendarEventType[]).map((eventType) => {
              const color = eventTypeColors[eventType];
              const isCustom = eventTypeColors[eventType] !== DEFAULT_EVENT_TYPE_COLORS[eventType];
              
              return (
                <div
                  key={eventType}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Color Swatch */}
                    <div
                      className="w-8 h-8 rounded-lg border-2 border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    {/* Label */}
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {eventType.charAt(0).toUpperCase() + eventType.slice(1).replace('_', ' ')}
                      </span>
                      {isCustom && (
                        <span className="text-xs text-gray-500 ml-2">(Custom)</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {isCustom && (
                      <button
                        onClick={() => resetColor(eventType)}
                        className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors min-h-[32px]"
                        aria-label={`Reset ${eventType} color to default`}
                      >
                        Reset
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedEventType(eventType);
                        setColorPickerOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors min-h-[32px]"
                      aria-label={`Change ${eventType} color`}
                    >
                      Change
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reset All Button */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                if (confirm('Reset all event type colors to defaults?')) {
                  Object.keys(DEFAULT_EVENT_TYPE_COLORS).forEach((type) => {
                    resetColor(type as CalendarEventType);
                  });
                }
              }}
              className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all min-h-[44px]"
            >
              Reset All to Defaults
            </button>
          </div>
        </section>

        {/* GuardRails Integration */}
        <section>
          <h3 className="text-base font-semibold text-gray-900 mb-3">GuardRails Integration</h3>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select GuardRails projects, tracks, and items to sync to your calendar.
            </p>
            <button
              onClick={() => setGuardRailsSyncOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 active:bg-blue-200 transition-colors min-h-[44px]"
            >
              <Settings size={18} />
              Sync from GuardRails
            </button>
          </div>
        </section>

        {/* Default Visibility & Sharing */}
        {ENABLE_GROUP_DISTRIBUTION && (
          <CalendarVisibilityDefaultsSection />
        )}
      </div>

      {/* Event Type Color Picker */}
      {colorPickerOpen && selectedEventType && (
        <EventTypeColorPicker
          eventType={selectedEventType}
          currentColor={eventTypeColors[selectedEventType]}
          onColorChange={(color) => {
            updateColor(selectedEventType, color);
          }}
          onClose={() => {
            setColorPickerOpen(false);
            setSelectedEventType(null);
          }}
        />
      )}

      {/* GuardRails Sync Sheet */}
      <GuardRailsCalendarSyncSheet
        isOpen={guardRailsSyncOpen}
        onClose={() => setGuardRailsSyncOpen(false)}
      />
    </BottomSheet>
  );
}
