/**
 * Sessions Calendar Component
 * 
 * Displays sessions in two tabs:
 * - Previous Sessions: Historical logged sessions with list/calendar view
 * - Scheduled Sessions: Upcoming/recurring scheduled sessions
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar as CalendarIcon, Clock, Repeat, Plus, Download, X, Link2, CalendarDays, Edit2, Trash2, History, List, LayoutGrid, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScheduledSessionService, type ScheduledSession, type CreateScheduledSessionInput } from '../../lib/fitnessTracker/scheduledSessionService';
import { MovementSessionService } from '../../lib/fitnessTracker/movementSessionService';
import { getUserSpaces } from '../../lib/sharedSpacesManagement';
import { getMasterProjects } from '../../lib/guardrails';
import type { UserMovementProfile, MovementDomain, MovementSession } from '../../lib/fitnessTracker/types';
import type { SpaceListItem } from '../../lib/sharedSpacesManagement';
import type { MasterProject } from '../../lib/guardrailsTypes';

type SessionsCalendarProps = {
  profile: UserMovementProfile;
  activityDomain: MovementDomain;
};

export function SessionsCalendar({ profile, activityDomain }: SessionsCalendarProps) {
  const [activeTab, setActiveTab] = useState<'previous' | 'scheduled'>('previous');
  const [previousViewType, setPreviousViewType] = useState<'list' | 'calendar'>('list');
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [expandedCalendarMonth, setExpandedCalendarMonth] = useState(new Date());
  const [selectedDayForPopup, setSelectedDayForPopup] = useState<Date | null>(null);
  
  // Scheduled sessions state
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSession, setEditingSession] = useState<ScheduledSession | null>(null);
  const [deletingSession, setDeletingSession] = useState<ScheduledSession | null>(null);
  
  // Previous sessions state
  const [previousSessions, setPreviousSessions] = useState<MovementSession[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const scheduledService = new ScheduledSessionService();
  const movementSessionService = new MovementSessionService();

  const loadScheduledSessions = useCallback(async () => {
    if (!profile.userId) return;

    try {
      setLoadingScheduled(true);
      const sessions = await scheduledService.getScheduledSessions(profile.userId, {
        activityDomain,
        isActive: true,
      });
      setScheduledSessions(sessions);
    } catch (error) {
      console.error('Failed to load scheduled sessions:', error);
    } finally {
      setLoadingScheduled(false);
    }
  }, [profile.userId, activityDomain]);

  const loadPreviousSessions = useCallback(async () => {
    if (!profile.userId) return;

    try {
      setLoadingPrevious(true);
      const sessions = await movementSessionService.listSessions(profile.userId, activityDomain, {
        limit: 100,
      });
      // Sort by timestamp descending (newest first)
      sessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setPreviousSessions(sessions);
    } catch (error) {
      console.error('Failed to load previous sessions:', error);
    } finally {
      setLoadingPrevious(false);
    }
  }, [profile.userId, activityDomain]);

  useEffect(() => {
    loadScheduledSessions();
  }, [loadScheduledSessions]);

  useEffect(() => {
    if (activeTab === 'previous') {
      loadPreviousSessions();
    }
  }, [activeTab, loadPreviousSessions]);

  // Group sessions by date for display
  const sessionsByDate = useMemo(() => {
    const grouped: Record<string, ScheduledSession[]> = {};
    
    scheduledSessions.forEach(session => {
      const startDate = new Date(session.startDatetime);
      const dateKey = startDate.toISOString().split('T')[0];
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });

    return grouped;
  }, [scheduledSessions]);

  // Get upcoming sessions for this week only
  const upcomingSessions = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek); // Start of week (Sunday)
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999); // End of week (Saturday)
    
    return scheduledSessions
      .filter(s => {
        const sessionDate = new Date(s.startDatetime);
        return sessionDate >= now && sessionDate <= endOfWeek;
      })
      .sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime());
  }, [scheduledSessions]);

  // Get historical sessions (past sessions)
  const historicalSessions = useMemo(() => {
    const now = new Date();
    return scheduledSessions
      .filter(s => {
        const sessionDate = new Date(s.startDatetime);
        return sessionDate < now;
      })
      .sort((a, b) => new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime())
      .slice(0, 20); // Show last 20 historical sessions
  }, [scheduledSessions]);

  const formatRecurrence = (session: ScheduledSession): string => {
    if (session.recurrenceType === 'none') return 'One-time';
    if (session.recurrenceType === 'daily') return 'Daily';
    if (session.recurrenceType === 'weekly') {
      if (session.recurrenceConfig?.daysOfWeek && session.recurrenceConfig.daysOfWeek.length > 0) {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const days = session.recurrenceConfig.daysOfWeek.map(d => dayNames[d]).join(', ');
        const interval = session.recurrenceConfig.interval || 1;
        return interval > 1 ? `Every ${interval} weeks (${days})` : `Weekly (${days})`;
      }
      return 'Weekly';
    }
    if (session.recurrenceType === 'monthly') return 'Monthly';
    return 'Custom';
  };


  const handleDownloadICal = (session: ScheduledSession) => {
    scheduledService.downloadICalFile(session);
  };

  const handleDeleteSession = async (session: ScheduledSession) => {
    try {
      await scheduledService.deleteScheduledSession(session.id);
      await loadScheduledSessions();
      setDeletingSession(null);
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  const handleEditSession = async (updatedSession: ScheduledSession) => {
    try {
      await loadScheduledSessions();
      setEditingSession(null);
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  };

  const formatTime = (datetime: string): string => {
    const date = new Date(datetime);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Group previous sessions by date for calendar view
  const previousSessionsByDate = useMemo(() => {
    const grouped: Record<string, MovementSession[]> = {};
    previousSessions.forEach(session => {
      const date = new Date(session.timestamp);
      const dateKey = date.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });
    return grouped;
  }, [previousSessions]);

  const isLoading = activeTab === 'previous' ? loadingPrevious : loadingScheduled;

  if (isLoading && activeTab === 'previous' && previousSessions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
        <p className="text-xs text-gray-600">Loading sessions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('previous')}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'previous'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            Previous Sessions
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'scheduled'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            Scheduled Sessions
          </button>
        </div>
        {activeTab === 'previous' && (
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setPreviousViewType('list')}
              className={`p-1.5 rounded transition-colors ${
                previousViewType === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="List view"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setPreviousViewType('calendar')}
              className={`p-1.5 rounded transition-colors ${
                previousViewType === 'calendar'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Calendar view"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        )}
        {activeTab === 'scheduled' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Plus size={14} />
            Add Session
          </button>
        )}
      </div>

      {/* Previous Sessions Tab */}
      {activeTab === 'previous' && (
        <PreviousSessionsView
          sessions={previousSessions}
          sessionsByDate={previousSessionsByDate}
          viewType={previousViewType}
          formatDate={formatDate}
          formatTime={formatTime}
          loading={loadingPrevious}
          onExpand={() => setIsCalendarExpanded(true)}
          onDayClick={(date) => setSelectedDayForPopup(date)}
        />
      )}

      {/* Scheduled Sessions Tab */}
      {activeTab === 'scheduled' && (
        <ScheduledSessionsView
          upcomingSessions={upcomingSessions}
          historicalSessions={historicalSessions}
          formatRecurrence={formatRecurrence}
          formatTime={formatTime}
          onEdit={setEditingSession}
          onDelete={setDeletingSession}
          onDownloadICal={handleDownloadICal}
          loading={loadingScheduled}
          onExpand={() => setIsCalendarExpanded(true)}
          scheduledSessions={scheduledSessions}
        />
      )}

      {/* Expanded Full-Screen Calendar Modal */}
      {isCalendarExpanded && (
        <ExpandedCalendarModal
          isOpen={isCalendarExpanded}
          onClose={() => setIsCalendarExpanded(false)}
          activeTab={activeTab}
          previousSessions={previousSessions}
          previousSessionsByDate={previousSessionsByDate}
          scheduledSessions={scheduledSessions}
          formatDate={formatDate}
          formatTime={formatTime}
          formatRecurrence={formatRecurrence}
          onEditSession={setEditingSession}
          onDeleteSession={setDeletingSession}
          onDownloadICal={handleDownloadICal}
          currentMonth={expandedCalendarMonth}
          onMonthChange={setExpandedCalendarMonth}
          onDayClick={(date) => setSelectedDayForPopup(date)}
        />
      )}

      {/* Day Sessions Popup */}
      {selectedDayForPopup && (
        <DaySessionsPopup
          date={selectedDayForPopup}
          activeTab={activeTab}
          previousSessionsByDate={previousSessionsByDate}
          scheduledSessions={scheduledSessions}
          formatDate={formatDate}
          formatTime={formatTime}
          formatRecurrence={formatRecurrence}
          onEditSession={setEditingSession}
          onDeleteSession={setDeletingSession}
          onDownloadICal={handleDownloadICal}
          onClose={() => setSelectedDayForPopup(null)}
        />
      )}

      {/* Add Session Modal */}
      {showAddModal && (
        <AddScheduledSessionModal
          profile={profile}
          activityDomain={activityDomain}
          onClose={() => setShowAddModal(false)}
          onSave={async (session) => {
            setScheduledSessions(prev => [...prev, session]);
            setShowAddModal(false);
            await loadScheduledSessions();
          }}
        />
      )}

      {/* Edit Session Modal */}
      {editingSession && (
        <EditScheduledSessionModal
          profile={profile}
          activityDomain={activityDomain}
          session={editingSession}
          onClose={() => setEditingSession(null)}
          onSave={handleEditSession}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingSession && (
        <DeleteSessionModal
          session={deletingSession}
          onClose={() => setDeletingSession(null)}
          onConfirm={() => handleDeleteSession(deletingSession)}
        />
      )}
    </div>
  );
}

/**
 * Previous Sessions View Component
 * Shows historical logged sessions in list or calendar view
 */
function PreviousSessionsView({
  sessions,
  sessionsByDate,
  viewType,
  formatDate,
  formatTime,
  loading,
  onExpand,
  onDayClick,
}: {
  sessions: MovementSession[];
  sessionsByDate: Record<string, MovementSession[]>;
  viewType: 'list' | 'calendar';
  formatDate: (timestamp: string) => string;
  formatTime: (datetime: string) => string;
  loading: boolean;
  onExpand: () => void;
  onDayClick: (date: Date) => void;
}) {
  if (loading && sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
        <p className="text-xs text-gray-600">Loading previous sessions...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-xs font-medium mb-1">No previous sessions</p>
        <p className="text-xs">Your logged sessions will appear here</p>
      </div>
    );
  }

  if (viewType === 'calendar') {
    // Calendar view - simple month grid
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days: (Date | null)[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(currentYear, currentMonth, day));
    }

    return (
      <div className="space-y-3">
        {/* Month Header with Expand Button */}
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900 flex-1 text-center">
            {firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h4>
          <button
            onClick={onExpand}
            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Expand calendar"
          >
            <Maximize2 size={16} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day Headers */}
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
              {day}
            </div>
          ))}
          
          {/* Calendar Days */}
          {days.map((date, index) => {
            if (!date) {
              return <div key={index} className="aspect-square" />;
            }
            
            const dateKey = date.toISOString().split('T')[0];
            const daySessions = sessionsByDate[dateKey] || [];
            const isToday = date.toDateString() === now.toDateString();
            
            return (
              <button
                key={index}
                onClick={() => onDayClick(date)}
                className={`aspect-square rounded-lg border-2 p-1 transition-colors text-left ${
                  isToday
                    ? 'border-blue-500 bg-blue-50 hover:bg-blue-100'
                    : daySessions.length > 0
                      ? 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300'
                      : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div className={`text-xs font-medium mb-0.5 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                  {date.getDate()}
                </div>
                {daySessions.length > 0 && (
                  <div className="text-[10px] text-gray-600 truncate">
                    {daySessions.length} session{daySessions.length !== 1 ? 's' : ''}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto">
      {sessions.map(session => {
        const sessionDate = new Date(session.timestamp);
        const dateStr = formatDate(session.timestamp);
        const timeStr = formatTime(session.timestamp);
        
        return (
          <div
            key={session.id}
            className="bg-gray-50 rounded-lg border border-gray-200 p-3 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={12} className="text-gray-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-900">{session.activity}</span>
                  {session.sessionType && (
                    <span className="text-xs text-gray-600 px-1.5 py-0.5 bg-gray-200 rounded">
                      {session.sessionType}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600 ml-4">
                  {dateStr} at {timeStr}
                  {session.durationMinutes && ` • ${session.durationMinutes} min`}
                  {session.perceivedIntensity && ` • Intensity: ${session.perceivedIntensity}/5`}
                </div>
                {session.notes && (
                  <div className="text-xs text-gray-500 mt-1 ml-4 italic truncate">
                    {session.notes}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Scheduled Sessions View Component
 * Shows upcoming and historical scheduled sessions
 */
function ScheduledSessionsView({
  upcomingSessions,
  historicalSessions,
  formatRecurrence,
  formatTime,
  onEdit,
  onDelete,
  onDownloadICal,
  loading,
  onExpand,
  scheduledSessions,
}: {
  upcomingSessions: ScheduledSession[];
  historicalSessions: ScheduledSession[];
  formatRecurrence: (session: ScheduledSession) => string;
  formatTime: (datetime: string) => string;
  onEdit: (session: ScheduledSession) => void;
  onDelete: (session: ScheduledSession) => void;
  onDownloadICal: (session: ScheduledSession) => void;
  loading: boolean;
  onExpand: () => void;
  scheduledSessions: ScheduledSession[];
}) {
  if (loading && upcomingSessions.length === 0 && historicalSessions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
        <p className="text-xs text-gray-600">Loading scheduled sessions...</p>
      </div>
    );
  }

  // Group scheduled sessions by date for calendar view
  const scheduledSessionsByDate = useMemo(() => {
    const grouped: Record<string, ScheduledSession[]> = {};
    scheduledSessions.forEach(session => {
      const date = new Date(session.startDatetime);
      const dateKey = date.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });
    return grouped;
  }, [scheduledSessions]);

  return (
    <div className="space-y-4">
      {/* Calendar View Toggle */}
      <div className="flex items-center justify-end mb-2">
        <button
          onClick={onExpand}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          title="View calendar"
        >
          <Maximize2 size={14} />
          <span>View Calendar</span>
        </button>
      </div>

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 ? (
        <div className="space-y-2">
          {upcomingSessions.map(session => {
            const sessionDate = new Date(session.startDatetime);
            const dateStr = sessionDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            
            return (
              <div
                key={session.id}
                className="bg-gray-50 rounded-lg border border-gray-200 p-3 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={12} className="text-gray-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-gray-900">{session.activityName}</span>
                      {session.recurrenceType !== 'none' && (
                        <span className="flex items-center gap-0.5 text-xs text-gray-600">
                          <Repeat size={10} />
                          {formatRecurrence(session)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 ml-4">
                      {dateStr} at {formatTime(session.startDatetime)}
                      {session.durationMinutes && ` • ${session.durationMinutes} min`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(session)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit session"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(session)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete session"
                    >
                      <Trash2 size={14} />
                    </button>
                    {session.calendarSyncEnabled && (
                      <button
                        onClick={() => onDownloadICal(session)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Download iCal"
                      >
                        <Download size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-xs font-medium mb-1">No scheduled sessions this week</p>
          <p className="text-xs">Click "Add Session" to schedule recurring sessions</p>
        </div>
      )}

      {/* Historical Scheduled Sessions */}
      {historicalSessions.length > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <History size={14} className="text-gray-500" />
            <h4 className="text-sm font-semibold text-gray-900">Past Scheduled Sessions</h4>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {historicalSessions.map(session => {
              const sessionDate = new Date(session.startDatetime);
              const dateStr = sessionDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
              
              return (
                <div
                  key={session.id}
                  className="bg-gray-50 rounded-lg border border-gray-200 p-3 hover:border-gray-300 transition-colors opacity-75"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock size={12} className="text-gray-500 flex-shrink-0" />
                        <span className="text-xs font-medium text-gray-700">{session.activityName}</span>
                        {session.recurrenceType !== 'none' && (
                          <span className="flex items-center gap-0.5 text-xs text-gray-500">
                            <Repeat size={10} />
                            {formatRecurrence(session)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 ml-4">
                        {dateStr} at {formatTime(session.startDatetime)}
                        {session.durationMinutes && ` • ${session.durationMinutes} min`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEdit(session)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit session"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => onDelete(session)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete session"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Modal for adding a scheduled/recurring session
 */
function AddScheduledSessionModal({
  profile,
  activityDomain,
  onClose,
  onSave,
}: {
  profile: UserMovementProfile;
  activityDomain: MovementDomain;
  onClose: () => void;
  onSave: (session: ScheduledSession) => void;
}) {
  const [activityName, setActivityName] = useState('');
  const [useCustomActivity, setUseCustomActivity] = useState(false);
  const [customActivityName, setCustomActivityName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>(60);
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedDays, setSelectedDays] = useState<number[]>([]); // Days of week (0=Sun, 1=Mon, etc.)
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Calendar sync options
  const [syncToPersonal, setSyncToPersonal] = useState(false);
  const [syncToSharedSpace, setSyncToSharedSpace] = useState(false);
  const [selectedSharedSpaceId, setSelectedSharedSpaceId] = useState<string>('');
  const [syncToGuardrailsProject, setSyncToGuardrailsProject] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // Load available spaces and projects
  const [sharedSpaces, setSharedSpaces] = useState<SpaceListItem[]>([]);
  const [projects, setProjects] = useState<MasterProject[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const scheduledService = new ScheduledSessionService();

  useEffect(() => {
    if (syncToSharedSpace || syncToGuardrailsProject) {
      loadCalendarOptions();
    }
  }, [syncToSharedSpace, syncToGuardrailsProject]);

  const loadCalendarOptions = async () => {
    try {
      setLoadingOptions(true);
      
      if (syncToSharedSpace) {
        const spaces = await getUserSpaces();
        setSharedSpaces(spaces.filter(s => s.type === 'shared' || s.type === 'household'));
      }
      
      if (syncToGuardrailsProject) {
        const projectsData = await getMasterProjects();
        setProjects(projectsData.filter(p => p.status === 'active' && !p.is_archived));
      }
    } catch (error) {
      console.error('Failed to load calendar options:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  // Get quick log button labels for this activity
  const activityButtons = useMemo(() => {
    return profile.uiConfiguration?.quickLogButtons?.filter(btn => btn.category === activityDomain) || [];
  }, [profile.uiConfiguration?.quickLogButtons, activityDomain]);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayAbbreviations = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    // Set default to today's date
    const today = new Date();
    setStartDate(today.toISOString().split('T')[0]);
  }, []);

  const handleDayToggle = (dayIndex: number) => {
    setSelectedDays(prev => 
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalActivityName = useCustomActivity ? customActivityName.trim() : activityName.trim();
    
    if (!finalActivityName || !startDate) {
      return;
    }

    // For weekly recurrence, require at least one day
    if (recurrenceType === 'weekly' && selectedDays.length === 0) {
      return;
    }

    try {
      setSubmitting(true);

      // Combine date and time
      const startDatetime = new Date(`${startDate}T${startTime}`);
      if (isNaN(startDatetime.getTime())) {
        throw new Error('Invalid date/time');
      }

      const recurrenceConfig: CreateScheduledSessionInput['recurrenceConfig'] = {};
      if (recurrenceType === 'weekly' && selectedDays.length > 0) {
        recurrenceConfig.daysOfWeek = selectedDays;
        recurrenceConfig.interval = 1;
      }

      const finalActivityName = useCustomActivity ? customActivityName.trim() : activityName.trim();
      
      const newSession = await scheduledService.createScheduledSession(profile.userId, {
        activityDomain,
        activityName: finalActivityName,
        startDatetime: startDatetime.toISOString(),
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
        recurrenceType,
        recurrenceConfig: Object.keys(recurrenceConfig).length > 0 ? recurrenceConfig : undefined,
        notes: notes.trim() || undefined,
      });

      // Sync to selected calendars
      try {
        if (syncToPersonal) {
          await scheduledService.syncToPersonalCalendar(newSession);
        }
        if (syncToSharedSpace && selectedSharedSpaceId) {
          await scheduledService.syncToSharedSpace(newSession, selectedSharedSpaceId);
        }
        if (syncToGuardrailsProject && selectedProjectId) {
          await scheduledService.syncToGuardrailsProject(newSession, selectedProjectId);
        }
      } catch (syncError) {
        console.error('Failed to sync to calendar:', syncError);
        // Don't throw - session was created, sync can be retried later
      }

      onSave(newSession);
    } catch (error) {
      console.error('Failed to create scheduled session:', error);
      alert(error instanceof Error ? error.message : 'Failed to create scheduled session');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Premium Bottom Sheet with Glassmorphism */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl rounded-t-3xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto border-t border-gray-200/60 animate-slide-up">
        {/* Premium Handle */}
        <div className="flex items-center justify-center pt-4 pb-3">
          <div className="w-14 h-1.5 bg-gray-300/60 rounded-full" />
        </div>

        {/* Premium Header */}
        <div className="px-6 pb-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <CalendarDays size={24} className="text-blue-600" />
                Schedule Session
              </h2>
              <p className="text-sm text-gray-500 mt-1.5 font-medium">Set up recurring workout sessions</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
              disabled={submitting}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Activity Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2.5">
                Activity Name *
              </label>
              {activityButtons.length > 0 ? (
                <div className="space-y-3">
                  <select
                    value={useCustomActivity ? 'custom' : activityName}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setUseCustomActivity(true);
                        setActivityName('');
                      } else {
                        setUseCustomActivity(false);
                        setActivityName(e.target.value);
                        setCustomActivityName('');
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-300"
                    required={!useCustomActivity}
                  >
                    <option value="">Select activity...</option>
                    {activityButtons.map(btn => (
                      <option key={btn.id} value={btn.label}>{btn.label}</option>
                    ))}
                    <option value="custom">+ Add your own...</option>
                  </select>
                  
                  {useCustomActivity && (
                    <div className="animate-slide-up">
                      <input
                        type="text"
                        value={customActivityName}
                        onChange={(e) => setCustomActivityName(e.target.value)}
                        placeholder="Enter custom activity name..."
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-300"
                        required
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                  placeholder="e.g., Boxing Session"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-300"
                  required
                />
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4 pb-6 border-b border-gray-100">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                  <CalendarIcon size={14} className="text-gray-500" />
                  Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-300"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                  <Clock size={14} className="text-gray-500" />
                  Time *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-300"
                  required
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2.5">
                Duration <span className="text-gray-400 font-normal normal-case">(minutes)</span>
              </label>
              <input
                type="number"
                min="1"
                max="600"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-300"
                placeholder="e.g., 60"
              />
            </div>

            {/* Recurrence Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                <Repeat size={14} className="text-gray-500" />
                Repeat
              </label>
              <select
                value={recurrenceType}
                onChange={(e) => setRecurrenceType(e.target.value as any)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-300"
              >
                <option value="none">One-time (no repeat)</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {/* Days of Week (for weekly recurrence) */}
            {recurrenceType === 'weekly' && (
              <div className="pb-6 border-b border-gray-100">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Days of Week *
                </label>
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {dayNames.map((day, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleDayToggle(index)}
                      className={`
                        relative px-2 py-2.5 sm:px-3 rounded-lg sm:rounded-xl border-2 text-[10px] sm:text-xs font-semibold transition-all duration-200 min-h-[36px] sm:min-h-[44px]
                        ${selectedDays.includes(index)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 hover:scale-[1.02]'
                        }
                        active:scale-95
                      `}
                      title={day}
                    >
                      <span className="block leading-tight">{dayAbbreviations[index]}</span>
                      {selectedDays.includes(index) && (
                        <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-400/20 to-transparent pointer-events-none" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2.5">
                Notes <span className="text-gray-400 font-normal normal-case">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-300 resize-none"
                placeholder="Any additional notes..."
              />
            </div>

            {/* Calendar Sync Options */}
            <div className="border-t border-gray-200 pt-6 space-y-4">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Link2 size={16} className="text-blue-600" />
                </div>
                <label className="text-sm font-semibold text-gray-900">Sync to Calendar</label>
              </div>

              {/* Personal Calendar */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-200">
                <input
                  type="checkbox"
                  id="syncPersonal"
                  checked={syncToPersonal}
                  onChange={(e) => setSyncToPersonal(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="syncPersonal" className="text-sm text-gray-700 cursor-pointer font-medium flex-1">
                  Personal Calendar
                </label>
              </div>

              {/* Shared Spaces */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-200">
                  <input
                    type="checkbox"
                    id="syncSharedSpace"
                    checked={syncToSharedSpace}
                    onChange={(e) => setSyncToSharedSpace(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <label htmlFor="syncSharedSpace" className="text-sm text-gray-700 cursor-pointer font-medium flex-1">
                    Shared Space
                  </label>
                </div>
                {syncToSharedSpace && (
                  <div className="ml-11 mr-3">
                    <select
                      value={selectedSharedSpaceId}
                      onChange={(e) => setSelectedSharedSpaceId(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 hover:border-gray-300"
                      disabled={loadingOptions}
                      required={syncToSharedSpace}
                    >
                      <option value="">Select shared space...</option>
                      {sharedSpaces.map(space => (
                        <option key={space.id} value={space.id}>{space.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Guardrails Project */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-200">
                  <input
                    type="checkbox"
                    id="syncGuardrails"
                    checked={syncToGuardrailsProject}
                    onChange={(e) => setSyncToGuardrailsProject(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <label htmlFor="syncGuardrails" className="text-sm text-gray-700 cursor-pointer font-medium flex-1">
                    Guardrails Project
                  </label>
                </div>
                {syncToGuardrailsProject && (
                  <div className="ml-11 mr-3">
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 hover:border-gray-300"
                      disabled={loadingOptions}
                      required={syncToGuardrailsProject}
                    >
                      <option value="">Select project...</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-4 py-3.5 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (recurrenceType === 'weekly' && selectedDays.length === 0)}
                className="flex-1 px-4 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
              >
                {submitting ? 'Saving...' : 'Schedule Session'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

/**
 * Modal for editing a scheduled session
 */
function EditScheduledSessionModal({
  profile,
  activityDomain,
  session,
  onClose,
  onSave,
}: {
  profile: UserMovementProfile;
  activityDomain: MovementDomain;
  session: ScheduledSession;
  onClose: () => void;
  onSave: (session: ScheduledSession) => void;
}) {
  // Prefill with session data
  const sessionDate = new Date(session.startDatetime);
  const [activityName, setActivityName] = useState(session.activityName);
  const [startDate, setStartDate] = useState(sessionDate.toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(sessionDate.toTimeString().slice(0, 5));
  const [durationMinutes, setDurationMinutes] = useState<number | ''>(session.durationMinutes || 60);
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'weekly' | 'monthly'>(session.recurrenceType as any);
  const [selectedDays, setSelectedDays] = useState<number[]>(session.recurrenceConfig?.daysOfWeek || []);
  const [notes, setNotes] = useState(session.notes || '');
  const [submitting, setSubmitting] = useState(false);

  const scheduledService = new ScheduledSessionService();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayAbbreviations = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleDayToggle = (dayIndex: number) => {
    setSelectedDays(prev => 
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activityName.trim() || !startDate) {
      return;
    }

    if (recurrenceType === 'weekly' && selectedDays.length === 0) {
      return;
    }

    try {
      setSubmitting(true);

      const startDatetime = new Date(`${startDate}T${startTime}`);
      if (isNaN(startDatetime.getTime())) {
        throw new Error('Invalid date/time');
      }

      const recurrenceConfig: CreateScheduledSessionInput['recurrenceConfig'] = {};
      if (recurrenceType === 'weekly' && selectedDays.length > 0) {
        recurrenceConfig.daysOfWeek = selectedDays;
        recurrenceConfig.interval = 1;
      }

      const updatedSession = await scheduledService.updateScheduledSession(session.id, {
        activityName: activityName.trim(),
        startDatetime: startDatetime.toISOString(),
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
        recurrenceType,
        recurrenceConfig: Object.keys(recurrenceConfig).length > 0 ? recurrenceConfig : undefined,
        notes: notes.trim() || undefined,
      });

      onSave(updatedSession);
    } catch (error) {
      console.error('Failed to update scheduled session:', error);
      alert(error instanceof Error ? error.message : 'Failed to update scheduled session');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl rounded-t-3xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto border-t border-gray-200/60 animate-slide-up">
        <div className="flex items-center justify-center pt-4 pb-3">
          <div className="w-14 h-1.5 bg-gray-300/60 rounded-full" />
        </div>

        <div className="px-6 pb-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <Edit2 size={24} className="text-blue-600" />
                Edit Session
              </h2>
              <p className="text-sm text-gray-500 mt-1.5 font-medium">Update scheduled session details</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
              disabled={submitting}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2.5">
                Activity Name *
              </label>
              <input
                type="text"
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-300"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pb-6 border-b border-gray-100">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                  <CalendarIcon size={14} className="text-gray-500" />
                  Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-300"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                  <Clock size={14} className="text-gray-500" />
                  Time *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-300"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2.5">
                Duration <span className="text-gray-400 font-normal normal-case">(minutes)</span>
              </label>
              <input
                type="number"
                min="1"
                max="600"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-300"
                placeholder="e.g., 60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                <Repeat size={14} className="text-gray-500" />
                Repeat
              </label>
              <select
                value={recurrenceType}
                onChange={(e) => setRecurrenceType(e.target.value as any)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-300"
              >
                <option value="none">One-time (no repeat)</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {recurrenceType === 'weekly' && (
              <div className="pb-6 border-b border-gray-100">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Days of Week *
                </label>
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {dayNames.map((day, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleDayToggle(index)}
                      className={`
                        relative px-2 py-2.5 sm:px-3 rounded-lg sm:rounded-xl border-2 text-[10px] sm:text-xs font-semibold transition-all duration-200 min-h-[36px] sm:min-h-[44px]
                        ${selectedDays.includes(index)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 hover:scale-[1.02]'
                        }
                        active:scale-95
                      `}
                      title={day}
                    >
                      <span className="block leading-tight">{dayAbbreviations[index]}</span>
                      {selectedDays.includes(index) && (
                        <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-400/20 to-transparent pointer-events-none" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2.5">
                Notes <span className="text-gray-400 font-normal normal-case">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-300 resize-none"
                placeholder="Any additional notes..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-4 py-3.5 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (recurrenceType === 'weekly' && selectedDays.length === 0)}
                className="flex-1 px-4 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
              >
                {submitting ? 'Saving...' : 'Update Session'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

/**
 * Modal for confirming session deletion
 */
function DeleteSessionModal({
  session,
  onClose,
  onConfirm,
}: {
  session: ScheduledSession;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    onConfirm();
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Premium Bottom Sheet with Glassmorphism */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl rounded-t-3xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto border-t border-gray-200/60 animate-slide-up">
        {/* Premium Handle */}
        <div className="flex items-center justify-center pt-4 pb-3">
          <div className="w-14 h-1.5 bg-gray-300/60 rounded-full" />
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-red-50 rounded-full flex-shrink-0">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Session?</h3>
              <p className="text-sm text-gray-600">
                Are you sure you want to delete <strong>"{session.activityName}"</strong>? This action cannot be undone.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 flex-shrink-0"
              disabled={deleting}
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="flex-1 px-4 py-3.5 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 px-4 py-3.5 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-lg hover:shadow-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
            >
              {deleting ? 'Deleting...' : 'Delete Session'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Expanded Full-Screen Calendar Modal
 * Shows a large, full-screen calendar view with month navigation
 */
function ExpandedCalendarModal({
  isOpen,
  onClose,
  activeTab,
  previousSessions,
  previousSessionsByDate,
  scheduledSessions,
  formatDate,
  formatTime,
  formatRecurrence,
  onEditSession,
  onDeleteSession,
  onDownloadICal,
  currentMonth,
  onMonthChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'previous' | 'scheduled';
  previousSessions: MovementSession[];
  previousSessionsByDate: Record<string, MovementSession[]>;
  scheduledSessions: ScheduledSession[];
  formatDate: (timestamp: string) => string;
  formatTime: (datetime: string) => string;
  formatRecurrence: (session: ScheduledSession) => string;
  onEditSession: (session: ScheduledSession) => void;
  onDeleteSession: (session: ScheduledSession) => void;
  onDownloadICal: (session: ScheduledSession) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDayClick: (date: Date) => void;
}) {

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Group scheduled sessions by date
  const scheduledSessionsByDate = useMemo(() => {
    const grouped: Record<string, ScheduledSession[]> = {};
    scheduledSessions.forEach(session => {
      const date = new Date(session.startDatetime);
      const dateKey = date.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });
    return grouped;
  }, [scheduledSessions]);

  const now = new Date();
  const currentMonthNum = currentMonth.getMonth();
  const currentYear = currentMonth.getFullYear();
  
  // Get first day of month and number of days
  const firstDay = new Date(currentYear, currentMonthNum, 1);
  const lastDay = new Date(currentYear, currentMonthNum + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const days: (Date | null)[] = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  
  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(currentYear, currentMonthNum, day));
  }

  const handlePreviousMonth = () => {
    const newMonth = new Date(currentYear, currentMonthNum - 1, 1);
    onMonthChange(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentYear, currentMonthNum + 1, 1);
    onMonthChange(newMonth);
  };

  const handleToday = () => {
    onMonthChange(new Date());
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      {/* Header - Mobile Optimized */}
      <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-gray-200 bg-white flex-shrink-0 safe-top">
        <div className="flex items-center gap-3 flex-1">
          <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 truncate">
            {activeTab === 'previous' ? 'Previous Sessions' : 'Scheduled Sessions'}
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Month Navigation */}
          <button
            onClick={handlePreviousMonth}
            className="p-2 md:p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
            title="Previous month"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-2 md:px-4 md:py-2 text-xs md:text-sm font-medium text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
          >
            Today
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 md:p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
            title="Next month"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
          <button
            onClick={onClose}
            className="p-2 md:p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation ml-2"
            title="Close (ESC)"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendar Content - Mobile Optimized */}
      <div className="flex-1 overflow-hidden flex flex-col px-3 py-4 md:px-6 md:py-6 lg:px-10 lg:py-8 safe-bottom">
        {/* Month Header */}
        <div className="text-center mb-4 md:mb-6 lg:mb-8">
          <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
            {firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
        </div>

        {/* Calendar Grid - Full Width Mobile */}
        <div className="flex-1 overflow-y-auto -mx-3 px-3 md:mx-0 md:px-0">
          <div className="grid grid-cols-7 gap-1.5 md:gap-2 lg:gap-3 w-full max-w-7xl mx-auto">
              {/* Day Headers */}
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs md:text-sm lg:text-base font-semibold text-gray-600 md:text-gray-700 py-2 md:py-3">
                  <span className="hidden sm:inline">{day.slice(0, 3)}</span>
                  <span className="sm:hidden">{day.slice(0, 1)}</span>
                </div>
              ))}
              
              {/* Calendar Days - Premium Mobile Design */}
              {days.map((date, index) => {
                if (!date) {
                  return <div key={index} className="aspect-square" />;
                }
                
                const dateKey = date.toISOString().split('T')[0];
                const daySessions = activeTab === 'previous'
                  ? (previousSessionsByDate[dateKey] || [])
                  : (scheduledSessionsByDate[dateKey] || []);
                const isToday = date.toDateString() === now.toDateString();
                
                return (
                  <button
                    key={index}
                    onClick={() => onDayClick(date)}
                    className={`aspect-square rounded-lg md:rounded-xl border-2 p-1.5 md:p-2 lg:p-3 transition-all text-left touch-manipulation active:scale-95 ${
                      isToday
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-sm'
                        : daySessions.length > 0
                          ? 'border-gray-200 bg-gray-50/80 hover:border-blue-300 hover:bg-blue-50/30'
                          : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50'
                    }`}
                  >
                    <div className={`text-sm md:text-base lg:text-lg font-bold mb-0.5 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {date.getDate()}
                    </div>
                    {daySessions.length > 0 && (
                      <div className="flex items-center justify-center mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          isToday ? 'bg-blue-500' : daySessions.length > 1 ? 'bg-blue-400' : 'bg-gray-400'
                        }`} />
                        {daySessions.length > 1 && (
                          <span className={`ml-0.5 text-[9px] md:text-[10px] font-medium ${
                            isToday ? 'text-blue-600' : 'text-gray-500'
                          }`}>
                            {daySessions.length}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
    </div>
  );
}

/**
 * Day Sessions Popup
 * Shows all sessions for a selected day in a bottom sheet
 */
function DaySessionsPopup({
  date,
  activeTab,
  previousSessionsByDate,
  scheduledSessions,
  formatDate,
  formatTime,
  formatRecurrence,
  onEditSession,
  onDeleteSession,
  onDownloadICal,
  onClose,
}: {
  date: Date;
  activeTab: 'previous' | 'scheduled';
  previousSessionsByDate: Record<string, MovementSession[]>;
  scheduledSessions: ScheduledSession[];
  formatDate: (timestamp: string) => string;
  formatTime: (datetime: string) => string;
  formatRecurrence: (session: ScheduledSession) => string;
  onEditSession: (session: ScheduledSession) => void;
  onDeleteSession: (session: ScheduledSession) => void;
  onDownloadICal: (session: ScheduledSession) => void;
  onClose: () => void;
}) {
  // Group scheduled sessions by date
  const scheduledSessionsByDate = useMemo(() => {
    const grouped: Record<string, ScheduledSession[]> = {};
    scheduledSessions.forEach(session => {
      const date = new Date(session.startDatetime);
      const dateKey = date.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });
    return grouped;
  }, [scheduledSessions]);

  const dateKey = date.toISOString().split('T')[0];
  const daySessions = activeTab === 'previous'
    ? (previousSessionsByDate[dateKey] || [])
    : (scheduledSessionsByDate[dateKey] || []);

  const fullDateString = date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110]"
        onClick={onClose}
      />
      
      {/* Premium Bottom Sheet with Glassmorphism */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl rounded-t-3xl shadow-2xl z-[110] max-h-[85vh] overflow-y-auto border-t border-gray-200/60 animate-slide-up">
        {/* Premium Handle */}
        <div className="flex items-center justify-center pt-4 pb-3">
          <div className="w-14 h-1.5 bg-gray-300/60 rounded-full" />
        </div>

        {/* Premium Header */}
        <div className="px-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <CalendarDays size={24} className="text-blue-600" />
                {fullDateString}
              </h2>
              <p className="text-sm text-gray-500 mt-1.5 font-medium">
                {daySessions.length} {daySessions.length === 1 ? 'session' : 'sessions'} on this day
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Sessions List */}
        <div className="px-6 py-6">
          {daySessions.length > 0 ? (
            <div className="space-y-3">
              {activeTab === 'previous' ? (
                (daySessions as MovementSession[]).map(session => (
                  <div
                    key={session.id}
                    className="bg-gray-50 rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                        <Clock size={18} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-base font-semibold text-gray-900">{session.activity}</h3>
                          {session.sessionType && (
                            <span className="text-xs text-gray-600 px-2 py-0.5 bg-gray-200 rounded-full">
                              {session.sessionType}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1.5 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-gray-400" />
                            <span>{formatTime(session.timestamp)}</span>
                          </div>
                          {session.durationMinutes && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">⏱</span>
                              <span>{session.durationMinutes} minutes</span>
                            </div>
                          )}
                          {session.perceivedIntensity && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">🔥</span>
                              <span>Intensity: {session.perceivedIntensity}/5</span>
                            </div>
                          )}
                          {session.bodyState && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">💪</span>
                              <span className="capitalize">{session.bodyState}</span>
                            </div>
                          )}
                          {session.notes && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-500 italic">{session.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                (daySessions as ScheduledSession[]).map(session => (
                  <div
                    key={session.id}
                    className="bg-gray-50 rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                          <Clock size={18} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="text-base font-semibold text-gray-900">{session.activityName}</h3>
                            {session.recurrenceType !== 'none' && (
                              <span className="flex items-center gap-1 text-xs text-gray-600 px-2 py-0.5 bg-gray-200 rounded-full">
                                <Repeat size={10} />
                                {formatRecurrence(session)}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1.5 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-gray-400" />
                              <span>{formatTime(session.startDatetime)}</span>
                            </div>
                            {session.durationMinutes && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">⏱</span>
                                <span>{session.durationMinutes} minutes</span>
                              </div>
                            )}
                            {session.notes && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-xs text-gray-500 italic">{session.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => {
                            onEditSession(session);
                            onClose();
                          }}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit session"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            onDeleteSession(session);
                            onClose();
                          }}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete session"
                        >
                          <Trash2 size={16} />
                        </button>
                        {session.calendarSyncEnabled && (
                          <button
                            onClick={() => onDownloadICal(session)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download iCal"
                          >
                            <Download size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-base font-medium mb-1">No sessions on this day</p>
              <p className="text-sm">This day has no logged sessions</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
