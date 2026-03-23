import { useState, useEffect } from 'react';
import { X, ChevronDown, CheckCircle, Calendar as CalendarIcon, Target } from 'lucide-react';
import { AlignmentCalendarSpineV2 } from './AlignmentCalendarSpineV2';
import { AlignmentWorkPickerHierarchical } from './AlignmentWorkPickerHierarchical';
import { AlignmentSettingsModal } from './AlignmentSettingsModal';
import {
  getTodaysAlignment,
  createTodaysAlignment,
  dismissAlignment,
  hideAlignment,
  completeAlignment,
} from '../../lib/regulation/dailyAlignmentService';
import type { DailyAlignmentWithBlocks } from '../../lib/regulation/dailyAlignmentTypes';
import { supabase } from '../../lib/supabase';
import {
  deriveTaskStatus,
  deriveEventStatus,
  getTaskStatusDisplay,
  getEventStatusDisplay,
  isDueToday,
  isHappeningToday,
} from '../../lib/taskEventViewModel';
import {
  getCalendarSyncSettings,
  type CalendarSyncSettings,
} from '../../lib/calendarSyncSettings';

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  date: string;
}

interface RoadmapTaskEvent {
  id: string;
  title: string;
  type: 'task' | 'event';
  status: string;
  metadata: any;
  start_date: string | null;
  end_date: string | null;
  projectName: string;
  trackName: string;
  trackColor: string | null;
}

interface DailyAlignmentPanelProps {
  userId: string;
  /**
   * Phase 11: If true, renders as standalone page (no widget framing).
   * If false, renders as embedded widget (legacy dashboard behavior).
   */
  standalone?: boolean;
}

export function DailyAlignmentPanel({ userId, standalone = false }: DailyAlignmentPanelProps) {
  const [alignment, setAlignment] = useState<DailyAlignmentWithBlocks | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [roadmapItems, setRoadmapItems] = useState<RoadmapTaskEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  /**
   * Calendar Sync Settings (READ-ONLY for now)
   *
   * ❌ NOT USED YET - This is foundation work only
   * ❌ Does not affect current behavior
   * ❌ No syncing logic implemented
   *
   * ✅ Available for future prompts
   * ✅ Confirms wiring works
   *
   * Future use: Will control whether Guardrails items appear in Personal Spaces calendar
   */
  const [calendarSyncSettings, setCalendarSyncSettings] = useState<CalendarSyncSettings | null>(null);

  useEffect(() => {
    loadAlignment();
    loadCalendarEvents();
    loadRoadmapItems();
    loadCalendarSyncSettings();

    const subscription = supabase
      .channel('calendar_events_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendar_events',
      }, () => {
        loadCalendarEvents();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  const loadAlignment = async () => {
    setLoading(true);
    const data = await getTodaysAlignment(userId);
    if (!data) {
      await initializeAlignment();
    } else {
      setAlignment(data);
    }
    setLoading(false);
  };

  const initializeAlignment = async () => {
    setInitializing(true);
    const newAlignment = await createTodaysAlignment(userId);
    if (newAlignment) {
      const fullAlignment = await getTodaysAlignment(userId);
      setAlignment(fullAlignment);
    }
    setInitializing(false);
  };

  const loadCalendarEvents = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const todayStart = new Date(today + 'T00:00:00Z').toISOString();
      const todayEnd = new Date(today + 'T23:59:59Z').toISOString();

      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, title, start_at, end_at, all_day')
        .gte('start_at', todayStart)
        .lte('start_at', todayEnd)
        .order('start_at');

      if (error) throw error;

      setCalendarEvents(data || []);
    } catch (error) {
      console.error('[DailyAlignment] Error loading calendar events:', error);
      setCalendarEvents([]);
    }
  };

  const loadRoadmapItems = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Load tasks and events from Guardrails roadmap
      const { data, error } = await supabase
        .from('roadmap_items')
        .select(`
          id,
          title,
          type,
          status,
          metadata,
          start_date,
          end_date,
          track_id,
          guardrails_tracks!track_id(
            id,
            name,
            color,
            master_project_id,
            master_projects!master_project_id(
              id,
              name,
              user_id
            )
          )
        `)
        .eq('guardrails_tracks.master_projects.user_id', userId)
        .in('type', ['task', 'event']);

      if (error) throw error;

      // Filter to today's items
      const todayItems = (data || []).filter((item: any) => {
        if (item.type === 'task') {
          // Include tasks that are: due today, in progress, or completed today
          const status = deriveTaskStatus(item.status);
          const dueAt = item.metadata?.dueAt || item.end_date;
          return status === 'in_progress' || (dueAt && isDueToday(dueAt));
        } else if (item.type === 'event') {
          // Include events happening today
          const startsAt = item.metadata?.startsAt || item.start_date;
          const endsAt = item.metadata?.endsAt || item.end_date;
          return startsAt && isHappeningToday(startsAt, endsAt);
        }
        return false;
      });

      // Map to RoadmapTaskEvent structure
      const mappedItems: RoadmapTaskEvent[] = todayItems.map((item: any) => {
        const track = item.guardrails_tracks;
        const project = track?.master_projects;

        return {
          id: item.id,
          title: item.title,
          type: item.type,
          status: item.status,
          metadata: item.metadata,
          start_date: item.start_date,
          end_date: item.end_date,
          projectName: project?.name || 'Unknown Project',
          trackName: track?.name || 'Unknown Track',
          trackColor: track?.color || null,
        };
      });

      setRoadmapItems(mappedItems);
    } catch (error) {
      console.error('[DailyAlignment] Error loading roadmap items:', error);
      setRoadmapItems([]);
    }
  };

  /**
   * Load calendar sync settings for this user.
   *
   * ❌ NOT USED YET - Settings are loaded but not acted upon
   * ❌ No behavior changes based on these settings
   * ❌ This is foundation work only
   *
   * ✅ Confirms settings are accessible
   * ✅ Available for future sync implementation
   *
   * Note: If settings don't exist, we silently skip (user hasn't onboarded yet)
   */
  const loadCalendarSyncSettings = async () => {
    try {
      const settings = await getCalendarSyncSettings(userId);
      setCalendarSyncSettings(settings);
      console.log('[DailyAlignment] Calendar sync settings loaded (not used yet):', settings);
    } catch (error) {
      // Settings don't exist yet - this is expected for users who haven't onboarded
      console.log('[DailyAlignment] Calendar sync settings not found (expected for new users)');
      setCalendarSyncSettings(null);
    }
  };

  const handleHide = async () => {
    if (!alignment) return;

    const success = await hideAlignment(alignment.id);
    if (success) {
      await loadAlignment();
    }
  };

  const handleDismiss = async () => {
    if (!alignment) return;

    const success = await dismissAlignment(alignment.id);
    if (success) {
      await loadAlignment();
    }
  };

  const handleComplete = async () => {
    if (!alignment) return;

    const success = await completeAlignment(alignment.id);
    if (success) {
      await loadAlignment();
    }
  };

  if (loading || initializing) {
    return (
      <div className={standalone ? "text-center text-sm text-gray-500 py-8" : "bg-white rounded-lg shadow-sm border border-gray-200 p-6"}>
        <div className="text-center text-sm text-gray-500">Loading daily alignment...</div>
      </div>
    );
  }

  // Phase 11: In standalone mode, show empty state for dismissed/completed
  // In widget mode, return null (don't show widget)
  if (!alignment || alignment.status === 'dismissed' || alignment.status === 'completed') {
    if (standalone) {
      return (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <CalendarIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {alignment?.status === 'completed' ? 'Alignment Completed' : 'No Alignment Today'}
          </h3>
          <p className="text-gray-600 mb-6">
            {alignment?.status === 'completed'
              ? "You've completed today's alignment. Come back tomorrow for a fresh start."
              : "You haven't set up today's alignment yet."}
          </p>
          {alignment?.status !== 'completed' && (
            <button
              onClick={initializeAlignment}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Start Daily Alignment
            </button>
          )}
        </div>
      );
    }
    return null;
  }

  if (alignment.status === 'hidden') {
    // Phase 11: In standalone mode, hidden state should still show the full UI
    // (user navigated here intentionally). In widget mode, show "Show" button.
    if (!standalone) {
      return (
        <button
          onClick={loadAlignment}
          className="w-full bg-blue-50 border border-blue-200 rounded-lg p-3 text-left hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ChevronDown className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Show Daily Alignment</span>
          </div>
        </button>
      );
    }
    // In standalone mode, continue to show full UI even if status is 'hidden'
    // The user navigated here intentionally, so respect that intent
  }

  // Phase 11: Standalone mode - remove widget framing, use full width
  const containerClass = standalone
    ? "w-full" // Full width, no card styling
    : "bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden"; // Widget card

  const headerClass = standalone
    ? "mb-6" // No background/border in standalone
    : "bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50 p-6 border-b-2 border-blue-200"; // Widget header

  const contentClass = standalone
    ? "space-y-6" // No padding/bg in standalone (handled by page)
    : "p-6 bg-gray-50 space-y-6"; // Widget content

  return (
    <>
      <div className={containerClass}>
        <div className={headerClass}>
          {!standalone && (
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <CalendarIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Daily Alignment</h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Set a loose plan for today—nothing here is binding
                  </p>
                </div>
              </div>
              <button
                onClick={handleHide}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                title="Hide for now"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Phase 11: Actions - sticky at bottom on mobile in standalone mode */}
          <div className={`flex flex-wrap gap-2 ${standalone ? 'sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 -mx-4 sm:-mx-6 lg:-mx-8 mt-6 z-30 safe-bottom' : 'mt-4'}`}>
            <button
              onClick={handleHide}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm min-h-[44px]"
            >
              Hide for now
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm min-h-[44px]"
            >
              Dismiss for today
            </button>
            <button
              onClick={handleComplete}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md flex items-center gap-2 min-h-[44px]"
            >
              <CheckCircle className="w-4 h-4" />
              Complete alignment
            </button>
          </div>
        </div>

        <div className={contentClass}>
          {/* Guardrails Tasks & Events Section */}
          {roadmapItems.length > 0 && (
            <div className="bg-white border-2 border-purple-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-900">Today's Guardrails Work</h3>
                <span className="text-xs text-gray-500">({roadmapItems.length} items)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {roadmapItems.map((item) => {
                  const isTask = item.type === 'task';
                  const status = isTask
                    ? deriveTaskStatus(item.status)
                    : deriveEventStatus(
                        item.metadata?.startsAt || item.start_date || '',
                        item.metadata?.endsAt || item.end_date
                      );
                  const display = isTask
                    ? getTaskStatusDisplay(status as any)
                    : getEventStatusDisplay(status as any);

                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-xs font-medium ${isTask ? 'text-green-600' : 'text-orange-600'}`}>
                              {isTask ? '✓' : '📅'} {isTask ? 'Task' : 'Event'}
                            </span>
                          </div>
                          <h4 className="font-semibold text-sm text-gray-900 mb-1 truncate">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                            <span className="font-medium">{item.projectName}</span>
                            <span>→</span>
                            <span className="truncate">{item.trackName}</span>
                          </div>
                        </div>
                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${display.bgColor} ${display.color} border ${display.borderColor} flex-shrink-0`}>
                          <span>{display.icon}</span>
                          <span className="font-medium text-[10px]">{display.label}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 italic">
                        Managed in {isTask ? 'Task Flow' : 'Roadmap'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={`grid grid-cols-1 ${standalone ? 'lg:grid-cols-3' : 'lg:grid-cols-3'} gap-4 ${standalone ? 'sm:gap-6' : 'gap-6'}`}>
            <div className={`lg:col-span-1 ${standalone ? 'border border-gray-200' : 'border-2 border-gray-200'} rounded-xl overflow-hidden shadow-sm bg-white`}>
              <AlignmentWorkPickerHierarchical userId={userId} />
            </div>

            <div className={`lg:col-span-2 bg-white ${standalone ? 'border border-gray-200' : 'border-2 border-gray-200'} rounded-xl p-4 ${standalone ? 'sm:p-6' : 'p-6'} shadow-sm ${standalone ? 'max-h-[calc(100vh-300px)]' : 'max-h-[700px]'} overflow-y-auto`}>
              <AlignmentCalendarSpineV2
                alignmentId={alignment.id}
                blocks={alignment.blocks}
                calendarEvents={calendarEvents}
                userId={userId}
                onUpdate={loadAlignment}
                onOpenSettings={() => setShowSettings(true)}
              />
            </div>
          </div>
        </div>
      </div>

      {showSettings && (
        <AlignmentSettingsModal
          userId={userId}
          onClose={() => {
            setShowSettings(false);
            loadAlignment();
          }}
        />
      )}
    </>
  );
}
