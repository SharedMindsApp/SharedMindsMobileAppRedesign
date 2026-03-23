/**
 * Tracker App Widget
 * 
 * Full-featured tracker app view for Spaces. This provides a complete
 * tracker interface similar to Tracker Studio, but embedded in Spaces.
 * 
 * Note: Delete functionality removed - navigation handled by parent Layout.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { BarChart3, Loader2, AlertCircle } from 'lucide-react';
import { useTracker } from '../../../hooks/trackerStudio/useTracker';
import { getEntryByDate } from '../../../lib/trackerStudio/trackerEntryService';
import { resolveTrackerPermissions } from '../../../lib/trackerStudio/trackerPermissionResolver';
import type { Tracker, TrackerEntry } from '../../../lib/trackerStudio/types';
import { TrackerEntryForm } from '../../tracker-studio/TrackerEntryForm';
import { TrackerEntryList } from '../../tracker-studio/TrackerEntryList';
import { TrackerAnalyticsPanel } from '../../tracker-studio/analytics/TrackerAnalyticsPanel';
import { getTrackerTheme } from '../../../lib/trackerStudio/trackerThemeUtils';
import { isHabitTracker } from '../../../lib/trackerStudio/habitTrackerUtils';
import { HabitTrackerCore } from '../../activities/habits/HabitTrackerCore';
import { useAuth } from '../../../contexts/AuthContext';
import type { TrackerContent } from '../../../lib/fridgeCanvasTypes';

interface TrackerAppWidgetProps {
  content: TrackerContent;
}

export function TrackerAppWidget({ content }: TrackerAppWidgetProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { tracker, loading, error } = useTracker(content.tracker_id);
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
  const [showAnalytics, setShowAnalytics] = useState(false);

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
    if (tracker) {
      resolveTrackerPermissions(tracker.id).then(setPermissions);
    }
  }, [tracker]);

  useEffect(() => {
    if (tracker && selectedDate) {
      loadEntryForDate();
    }
  }, [tracker, selectedDate, loadEntryForDate]);

  const handleEntrySaved = () => {
    setRefreshKey(prev => prev + 1);
    loadEntryForDate();
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
  };

  if (loading) {
    return (
      <div className="min-h-screen-safe bg-white safe-top safe-bottom flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading tracker...</p>
        </div>
      </div>
    );
  }

  if (error || !tracker) {
    return (
      <div className="min-h-screen-safe bg-white safe-top safe-bottom flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-2">{error || 'Tracker not found'}</p>
          <p className="text-sm text-gray-500">This tracker may have been deleted or you may not have access.</p>
        </div>
      </div>
    );
  }

  if (tracker.archived_at) {
    return (
      <div className="min-h-screen-safe bg-white safe-top safe-bottom flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-gray-600 font-medium mb-2">Tracker archived</p>
          <p className="text-sm text-gray-500">This tracker is no longer active.</p>
        </div>
      </div>
    );
  }

  // Use canonical HabitTrackerCore for habit trackers - render identical to TrackerDetailPage
  if (tracker && user && isHabitTracker(tracker)) {
    return (
      <div className="min-h-screen-safe bg-white safe-top safe-bottom">
        {/* Minimal App Shell Header - Navigation only, no hero */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 safe-top">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
            {tracker && (
              <h1 className="text-base font-medium text-gray-900 truncate">
                {tracker.name}
              </h1>
            )}
          </div>
        </div>

        {/* Tracker Content - Direct render, no wrapper cards */}
        <div className="max-w-4xl mx-auto">
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
        </div>

      </div>
    );
  }

  const theme = getTrackerTheme(tracker.name || '');

  return (
    <div className="min-h-screen-safe bg-white safe-top safe-bottom">
      {/* Minimal App Shell Header - Navigation only, no hero */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 safe-top">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
          {tracker && (
            <h1 className="text-base font-medium text-gray-900 truncate">
              {tracker.name}
            </h1>
          )}
        </div>
      </div>

      {/* Tracker Content - Direct render, no wrapper cards */}
      <div className="max-w-4xl mx-auto">
        {/* Entry Form Section - Owns its own UI */}
        <div className="px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-gray-900">
              Add Entry
            </h2>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {loadingEntry ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <TrackerEntryForm
              tracker={tracker}
              entryDate={selectedDate}
              existingEntry={existingEntry}
              onEntrySaved={handleEntrySaved}
              theme={theme}
            />
          )}
        </div>

        {/* Entry History Section - Owns its own UI */}
        <div className="px-4 sm:px-6 py-6 border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-gray-900">
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
          <TrackerEntryList key={refreshKey} tracker={tracker} theme={theme} />
        </div>

        {/* Analytics Section - Owns its own UI */}
        {showAnalytics && (
          <div className="px-4 sm:px-6 py-6 border-t border-gray-100 animate-in fade-in duration-200">
            <h2 className="text-base font-medium text-gray-900 mb-4">
              Analytics
            </h2>
            <TrackerAnalyticsPanel tracker={tracker} />
          </div>
        )}
      </div>

    </div>
  );
}
