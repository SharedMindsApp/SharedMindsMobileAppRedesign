import { useState, useEffect, useCallback, Suspense, lazy, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Calendar, Share2, Loader2, AlertCircle, Users, BarChart3, ChevronDown, ChevronUp, Clock, LayoutGrid } from 'lucide-react';
import { getTracker } from '../../lib/trackerStudio/trackerService';
import { getEntryByDate } from '../../lib/trackerStudio/trackerEntryService';
import { resolveTrackerPermissions } from '../../lib/trackerStudio/trackerPermissionResolver';
import type { Tracker, TrackerEntry } from '../../lib/trackerStudio/types';
import { TrackerEntryForm } from './TrackerEntryForm';
import { TrackerEntryList } from './TrackerEntryList';
import { TrackerSharingDrawer } from './TrackerSharingDrawer';
import { TrackerReminderSettings } from './TrackerReminderSettings';
import { InterpretationTimelinePanel } from './InterpretationTimelinePanel';
import { ShareTrackerToProjectModal } from './ShareTrackerToProjectModal';
import { TrackerObservationList } from './TrackerObservationList';

// Lazy load analytics panel for code splitting (only loads when shown)
const TrackerAnalyticsPanel = lazy(() => 
  import('./analytics/TrackerAnalyticsPanel').then(module => ({
    default: module.TrackerAnalyticsPanel
  }))
);
import { getTrackerTheme } from '../../lib/trackerStudio/trackerThemeUtils';
import { isMoodTracker, shouldUseLowFrictionUX } from '../../lib/trackerStudio/emotionWords';
import { AddTrackerToSpaceModal } from './AddTrackerToSpaceModal';
import { isScreenTimeTracker } from '../../lib/trackerStudio/screenTimeUtils';
import { ScreenTimeAppView } from './ScreenTimeAppView';
import { ReminderSuggestionModal } from './ReminderSuggestionModal';
import { getTrackerReminders } from '../../lib/trackerStudio/trackerReminderService';
import { isFitnessTrackerByName } from '../../lib/fitnessTracker/fitnessTrackerUtils';
import { isHabitTracker } from '../../lib/trackerStudio/habitTrackerUtils';
import { HabitTrackerCore } from '../activities/habits/HabitTrackerCore';
import { useAuth } from '../../contexts/AuthContext';

export function TrackerDetailPage() {
  const { trackerId } = useParams<{ trackerId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  // Read date and habit_id from URL params or location state (calendar navigation)
  const calendarDate = useMemo(() => {
    const paramDate = searchParams.get('date');
    const stateDate = (location.state as any)?.date;
    return paramDate || stateDate || null;
  }, [searchParams, location.state]);
  
  const focusedHabitId = useMemo(() => {
    const paramHabitId = searchParams.get('habit_id');
    const stateHabitId = (location.state as any)?.habit_id;
    return paramHabitId || stateHabitId || null;
  }, [searchParams, location.state]);
  const [existingEntry, setExistingEntry] = useState<TrackerEntry | null>(null);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [permissions, setPermissions] = useState<{ canView: boolean; canEdit: boolean; canManage: boolean; isOwner: boolean; role: 'owner' | 'editor' | 'viewer' | null } | null>(null);
  const [showSharingDrawer, setShowSharingDrawer] = useState(false);
  const [showShareToProjectModal, setShowShareToProjectModal] = useState(false);
  const [observationRefreshKey, setObservationRefreshKey] = useState(0);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddToSpaceModal, setShowAddToSpaceModal] = useState(false);
  const [showReminderSuggestion, setShowReminderSuggestion] = useState(false);
  const [hasCheckedReminders, setHasCheckedReminders] = useState(false);

  const loadTracker = useCallback(async () => {
    if (!trackerId) return;

    try {
      setLoading(true);
      setError(null);
      
      // Parallelize tracker and permissions loading for faster initial render
      const [data, perms] = await Promise.all([
        getTracker(trackerId),
        resolveTrackerPermissions(trackerId),
      ]);
      
      if (!data) {
        setError('Tracker not found or you do not have access');
        return;
      }
      
      // Redirect Fitness Tracker to its dedicated page
      if (isFitnessTrackerByName(data)) {
        navigate('/fitness-tracker', { replace: true });
        return;
      }
      
      setTracker(data);
      setPermissions(perms);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tracker');
    } finally {
      setLoading(false);
    }
  }, [trackerId]);

  const loadEntryForDate = useCallback(async () => {
    if (!tracker || !selectedDate) return;

    try {
      setLoadingEntry(true);
      const entry = await getEntryByDate(tracker.id, selectedDate);
      setExistingEntry(entry);
    } catch (err) {
      console.error('Failed to load entry:', err);
      setExistingEntry(null);
    } finally {
      setLoadingEntry(false);
    }
  }, [tracker, selectedDate]);

  useEffect(() => {
    if (trackerId) {
      loadTracker();
    }
  }, [trackerId, loadTracker]);

  useEffect(() => {
    if (tracker && selectedDate) {
      loadEntryForDate();
    }
  }, [tracker, selectedDate, loadEntryForDate]);

  const handleEntrySaved = async () => {
    setRefreshKey(prev => prev + 1);
    loadEntryForDate();
    
    // Check if we should show reminder suggestion (only once per session)
    if (!hasCheckedReminders && tracker && permissions?.canEdit) {
      try {
        const reminders = await getTrackerReminders(tracker.id);
        if (reminders.length === 0) {
          // No reminders exist, show suggestion
          setShowReminderSuggestion(true);
        }
        setHasCheckedReminders(true);
      } catch (err) {
        console.error('Failed to check reminders:', err);
        // Don't show suggestion if we can't check
      }
    }
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading tracker...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tracker) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-red-900 mb-1">Error loading tracker</h2>
              <p className="text-red-800 mb-4">{error || 'Tracker not found or you do not have access'}</p>
              <button
                onClick={() => navigate('/tracker-studio/my-trackers')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Back to Trackers
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const theme = tracker ? getTrackerTheme(tracker.name) : null;
  const Icon = theme?.icon;
  const isMood = tracker ? isMoodTracker(tracker.name, tracker.field_schema_snapshot) : false;
  const useLowFriction = tracker ? shouldUseLowFrictionUX(tracker.name, tracker.field_schema_snapshot) : false;

  return (
    <div className="min-h-screen bg-white">
      {/* Minimal App Shell Header - Navigation only, no hero */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {tracker && (
              <h1 className="text-base font-medium text-gray-900 truncate">
                {tracker.name}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {permissions?.canView && (
              <button
                onClick={() => setShowAddToSpaceModal(true)}
                className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
                title="Add to Spaces"
              >
                <LayoutGrid size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tracker Content - Direct render, no wrapper cards */}
      <div className="max-w-4xl mx-auto">
        {/* Habit Tracker - Owns its own UI */}
        {tracker && user && isHabitTracker(tracker) ? (
          <HabitTrackerCore
            ownerUserId={user.id}
            context={{
              mode: 'planner',
              scope: 'self',
            }}
            permissions={{
              can_view: permissions?.canView ?? true,
              can_edit: permissions?.canEdit ?? false,
              can_manage: permissions?.isOwner ?? false,
              detail_level: permissions?.canEdit ? 'detailed' : 'overview',
              can_comment: false,
              scope: 'this_only',
            }}
            layout="full"
            activeDate={calendarDate}
            focusedHabitId={focusedHabitId}
          />
        ) : tracker && isScreenTimeTracker(tracker) ? (
          /* Screen Time App View - Owns its own UI */
          <ScreenTimeAppView tracker={tracker} />
        ) : (
          <>
            {/* Generic Tracker Entry Form - Owns its own UI, no wrapper cards */}
            <div className="px-4 sm:px-6 py-6">
              {/* Date Picker - Hidden for mood trackers, collapsible for low-friction trackers */}
              {!isMood && (
                <div className="mb-6">
                  {useLowFriction ? (
                    // Collapsible date picker for low-friction trackers
                    <div>
                      {!showDatePicker ? (
                        <button
                          type="button"
                          onClick={() => setShowDatePicker(true)}
                          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          <Clock size={16} />
                          <span>
                            {selectedDate === new Date().toISOString().split('T')[0] 
                              ? 'Logging for today' 
                              : `Logging for ${new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                            }
                          </span>
                          <ChevronDown size={16} />
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label htmlFor="entry-date" className="block text-sm font-semibold text-gray-700">
                              <Calendar className="inline mr-2" size={18} />
                              Entry Date
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowDatePicker(false)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              aria-label="Hide date picker"
                            >
                              <ChevronUp size={16} />
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              id="entry-date"
                              type="date"
                              value={selectedDate}
                              onChange={(e) => handleDateChange(e.target.value)}
                              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-base"
                            />
                            {selectedDate === new Date().toISOString().split('T')[0] && (
                              <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
                                Today
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Always visible for other trackers
                    <div>
                      <label htmlFor="entry-date" className="block text-sm font-medium text-gray-700 mb-3">
                        Entry Date
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          id="entry-date"
                          type="date"
                          value={selectedDate}
                          onChange={(e) => handleDateChange(e.target.value)}
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-base"
                        />
                        {selectedDate === new Date().toISOString().split('T')[0] && (
                          <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
                            Today
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {loadingEntry ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Loading entry...</p>
                </div>
              ) : (
                <TrackerEntryForm
                  tracker={tracker!}
                  entryDate={selectedDate}
                  existingEntry={existingEntry}
                  onEntrySaved={handleEntrySaved}
                  readOnly={!permissions?.canEdit}
                  theme={theme!}
                />
              )}
            </div>

            {/* Entry History Section - Owns its own UI */}
            <div className="px-4 sm:px-6 py-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Entry History
                </h2>
                <button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <BarChart3 size={16} />
                  <span>{showAnalytics ? 'Hide' : 'Show'} Analytics</span>
                </button>
              </div>
              <TrackerEntryList key={refreshKey} tracker={tracker!} theme={theme!} />
            </div>

            {/* Analytics Section - Lazy Loaded, owns its own UI */}
            {showAnalytics && (
              <div className="px-4 sm:px-6 py-6 border-t border-gray-100 animate-in fade-in duration-200">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Analytics
                </h2>
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-3 text-gray-600">Loading analytics...</span>
              </div>
            }>
              <TrackerAnalyticsPanel tracker={tracker!} />
            </Suspense>
          </div>
        )}

        {/* Your Notes Section */}
        <InterpretationTimelinePanel
          trackerId={tracker.id}
        />

        {/* Reminders Section */}
        {permissions?.canEdit && (
          <TrackerReminderSettings
            tracker={tracker}
            canEdit={permissions.canEdit}
          />
        )}

        {/* Shared Access Section */}
        {permissions?.isOwner && (
          <TrackerObservationList
            key={observationRefreshKey}
            tracker={tracker}
            onRevoked={() => setObservationRefreshKey(prev => prev + 1)}
          />
        )}

            {/* Share Buttons Section - Owns its own UI */}
            {permissions?.canManage && (
              <div className="px-4 sm:px-6 py-6 border-t border-gray-100">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Sharing
                </h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setShowShareToProjectModal(true)}
                    disabled={tracker.archived_at !== null}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] text-sm"
                    aria-label="Share tracker to Guardrails projects"
                  >
                    <Users size={16} />
                    <span className="hidden sm:inline">Share to Project</span>
                    <span className="sm:hidden">To Project</span>
                  </button>
                  <button
                    onClick={() => setShowSharingDrawer(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg active:scale-[0.98] transition-all font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] text-sm"
                  >
                    <Share2 size={16} />
                    <span className="hidden sm:inline">Share with Users</span>
                    <span className="sm:hidden">With Users</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sharing Drawer */}
      {tracker && permissions && (
        <TrackerSharingDrawer
          trackerId={tracker.id}
          isOpen={showSharingDrawer}
          onClose={() => setShowSharingDrawer(false)}
        />
      )}

      {/* Share to Project Modal */}
      {tracker && permissions?.isOwner && (
        <ShareTrackerToProjectModal
          isOpen={showShareToProjectModal}
          onClose={() => setShowShareToProjectModal(false)}
          tracker={tracker}
          onShared={() => {
            setObservationRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {/* Add to Spaces Modal */}
      {tracker && (
        <AddTrackerToSpaceModal
          isOpen={showAddToSpaceModal}
          onClose={() => setShowAddToSpaceModal(false)}
          tracker={tracker}
          onAdded={() => {
            // Optionally refresh or show success message
          }}
        />
      )}

      {tracker && (
        <ReminderSuggestionModal
          isOpen={showReminderSuggestion}
          onClose={() => setShowReminderSuggestion(false)}
          tracker={tracker}
          onReminderCreated={() => {
            // Refresh to update reminder list
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

    </div>
  );
}
