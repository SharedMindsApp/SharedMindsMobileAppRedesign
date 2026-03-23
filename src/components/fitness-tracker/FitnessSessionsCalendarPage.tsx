/**
 * Fitness Sessions Calendar Page
 * 
 * Full-page calendar view for all fitness sessions (previous and scheduled)
 * Similar to Spaces Calendar UI - takes over the entire viewport
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Calendar, Clock, History, ChevronLeft, ChevronRight, X, CalendarDays, Repeat, Edit2, Trash2, Download } from 'lucide-react';
import { MovementSessionService } from '../../lib/fitnessTracker/movementSessionService';
import { ScheduledSessionService, type ScheduledSession } from '../../lib/fitnessTracker/scheduledSessionService';
import { DiscoveryService } from '../../lib/fitnessTracker/discoveryService';
import type { UserMovementProfile, MovementDomain, MovementSession } from '../../lib/fitnessTracker/types';
import { getDisplayActivities } from '../../lib/fitnessTracker/activityDisplayHelper';

export function FitnessSessionsCalendarPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserMovementProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Get tab and month from URL params
  const activeTab = (searchParams.get('tab') as 'previous' | 'scheduled') || 'previous';
  const monthParam = searchParams.get('month');
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (monthParam) {
      const parsed = new Date(monthParam);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });
  
  // Sessions state
  const [allPreviousSessions, setAllPreviousSessions] = useState<MovementSession[]>([]);
  const [allScheduledSessions, setAllScheduledSessions] = useState<ScheduledSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [selectedDayForPopup, setSelectedDayForPopup] = useState<Date | null>(null);

  const discoveryService = new DiscoveryService();
  const sessionService = new MovementSessionService();
  const scheduledService = new ScheduledSessionService();

  useEffect(() => {
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (profile && user) {
      loadAllPreviousSessions();
      loadAllScheduledSessions();
    }
  }, [profile, user]);

  const loadProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const fetchedProfile = await discoveryService.getProfile(user.id);
      setProfile(fetchedProfile);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllPreviousSessions = useCallback(async () => {
    if (!profile || !user) return;

    try {
      setLoadingSessions(true);
      const allSessions: MovementSession[] = [];
      
      const displayActivities = getDisplayActivities(profile);
      const uniqueDomains = [...new Set(displayActivities.map(a => a.domain))] as MovementDomain[];
      
      for (const domain of uniqueDomains) {
        try {
          const domainSessions = await sessionService.listSessions(user.id, domain, {
            limit: 100,
          });
          allSessions.push(...domainSessions);
        } catch (error) {
          console.error(`Failed to load sessions for domain ${domain}:`, error);
        }
      }
      
      allSessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAllPreviousSessions(allSessions);
    } catch (error) {
      console.error('Failed to load all previous sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  }, [profile, user]);

  const loadAllScheduledSessions = useCallback(async () => {
    if (!profile || !user) return;

    try {
      const displayActivities = getDisplayActivities(profile);
      const uniqueDomains = [...new Set(displayActivities.map(a => a.domain))] as MovementDomain[];
      
      const allScheduled: ScheduledSession[] = [];
      for (const domain of uniqueDomains) {
        try {
          const domainScheduled = await scheduledService.getScheduledSessions(user.id, {
            activityDomain: domain,
            isActive: true,
          });
          allScheduled.push(...domainScheduled);
        } catch (error) {
          console.error(`Failed to load scheduled sessions for domain ${domain}:`, error);
        }
      }
      
      allScheduled.sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime());
      setAllScheduledSessions(allScheduled);
    } catch (error) {
      console.error('Failed to load all scheduled sessions:', error);
    }
  }, [profile, user]);

  // Group sessions by date
  const previousSessionsByDate = useMemo(() => {
    const grouped: Record<string, MovementSession[]> = {};
    allPreviousSessions.forEach(session => {
      const date = new Date(session.timestamp);
      const dateKey = date.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });
    return grouped;
  }, [allPreviousSessions]);

  const scheduledSessionsByDate = useMemo(() => {
    const grouped: Record<string, ScheduledSession[]> = {};
    allScheduledSessions.forEach(session => {
      const date = new Date(session.startDatetime);
      const dateKey = date.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });
    return grouped;
  }, [allScheduledSessions]);

  // Helper functions
  const formatTime = (datetime: string): string => {
    const date = new Date(datetime);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

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

  // Navigation handlers
  const handleTabChange = (tab: 'previous' | 'scheduled') => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    navigate(`/fitness-tracker/calendar?${params.toString()}`, { replace: true });
  };

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
    const params = new URLSearchParams(searchParams);
    params.set('month', month.toISOString().split('T')[0]);
    navigate(`/fitness-tracker/calendar?${params.toString()}`, { replace: true });
  };

  const handlePreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    handleMonthChange(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    handleMonthChange(newMonth);
  };

  const handleToday = () => {
    handleMonthChange(new Date());
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const now = new Date();
  const currentMonthNum = currentMonth.getMonth();
  const currentYear = currentMonth.getFullYear();
  
  const firstDay = new Date(currentYear, currentMonthNum, 1);
  const lastDay = new Date(currentYear, currentMonthNum + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const days: (Date | null)[] = [];
  
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(currentYear, currentMonthNum, day));
  }

  // Handlers for previous sessions
  const handleEditPreviousSession = async (session: MovementSession) => {
    if (!user || !session.id) return;
    
    try {
      // Navigate to activity page or show edit modal
      // For now, log and refresh
      console.log('Edit previous session:', session);
      // TODO: Implement edit modal or navigate to edit page
      loadAllPreviousSessions();
    } catch (error) {
      console.error('Failed to edit session:', error);
    }
  };

  const handleDeletePreviousSession = async (session: MovementSession) => {
    if (!user || !session.id) return;
    
    if (!confirm(`Are you sure you want to delete this session from ${session.activity}?`)) {
      return;
    }
    
    try {
      // Since entries are append-only, we'll mark as archived or update with a flag
      // For now, log it - actual delete would need to be implemented in the service
      console.log('Delete previous session:', session);
      // TODO: Implement delete/archive functionality
      loadAllPreviousSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  // Handlers for scheduled sessions
  const handleEditScheduledSession = (session: ScheduledSession) => {
    // Navigate to activity page or show modal with domain context
    console.log('Edit scheduled session:', session);
  };

  const handleDeleteSession = async (session: ScheduledSession) => {
    if (!user || !session.id) return;
    
    if (!confirm(`Are you sure you want to delete this scheduled session "${session.activityName}"?`)) {
      return;
    }
    
    try {
      await scheduledService.deleteScheduledSession(user.id, session.id);
      loadAllScheduledSessions();
    } catch (error) {
      console.error('Failed to delete scheduled session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  const handleDownloadICal = (session: ScheduledSession) => {
    scheduledService.downloadICalFile(session);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 flex flex-col">
      {/* Header - Similar to CalendarPageWrapper */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Back Button */}
            <button
              onClick={() => navigate('/fitness-tracker')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>

            {/* Tabs */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleTabChange('previous')}
                className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === 'previous'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                Previous Sessions
              </button>
              <button
                onClick={() => handleTabChange('scheduled')}
                className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === 'scheduled'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                Scheduled Sessions
              </button>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Previous month"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <button
                onClick={handleToday}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Next month"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Month Header */}
          <div className="mt-4 text-center">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
              {firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h1>
          </div>
        </div>
      </div>

      {/* Calendar Grid - Full Page */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden p-4 md:p-6 lg:p-8">
            <div className="grid grid-cols-7 gap-2 md:gap-3 lg:gap-4">
              {/* Day Headers */}
              {dayNames.map(day => (
                <div key={day} className="text-center text-sm md:text-base lg:text-lg font-semibold text-gray-600 md:text-gray-700 py-2 md:py-3">
                  <span className="hidden sm:inline">{day.slice(0, 3)}</span>
                  <span className="sm:hidden">{day.slice(0, 1)}</span>
                </div>
              ))}
              
              {/* Calendar Days */}
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
                    onClick={() => setSelectedDayForPopup(date)}
                    className={`aspect-square rounded-lg md:rounded-xl border-2 p-2 md:p-3 lg:p-4 transition-all text-left hover:shadow-md active:scale-95 ${
                      isToday
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-sm'
                        : daySessions.length > 0
                          ? 'border-gray-200 bg-gray-50/80 hover:border-blue-300 hover:bg-blue-50/30'
                          : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50'
                    }`}
                  >
                    <div className={`text-base md:text-lg lg:text-xl font-bold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {date.getDate()}
                    </div>
                    {daySessions.length > 0 && (
                      <div className="flex items-center justify-center mt-1">
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

      {/* Day Sessions Popup */}
      {selectedDayForPopup && (
        <DaySessionsPopup
          date={selectedDayForPopup}
          activeTab={activeTab}
          previousSessionsByDate={previousSessionsByDate}
          scheduledSessions={allScheduledSessions}
          scheduledSessionsByDate={scheduledSessionsByDate}
          formatTime={formatTime}
          formatRecurrence={formatRecurrence}
          onEditPreviousSession={handleEditPreviousSession}
          onDeletePreviousSession={handleDeletePreviousSession}
          onEditScheduledSession={handleEditScheduledSession}
          onDeleteSession={handleDeleteSession}
          onDownloadICal={handleDownloadICal}
          onClose={() => setSelectedDayForPopup(null)}
        />
      )}
    </div>
  );
}

/**
 * Day Sessions Popup Component
 */
function DaySessionsPopup({
  date,
  activeTab,
  previousSessionsByDate,
  scheduledSessions,
  scheduledSessionsByDate,
  formatTime,
  formatRecurrence,
  onEditPreviousSession,
  onDeletePreviousSession,
  onEditScheduledSession,
  onDeleteSession,
  onDownloadICal,
  onClose,
}: {
  date: Date;
  activeTab: 'previous' | 'scheduled';
  previousSessionsByDate: Record<string, MovementSession[]>;
  scheduledSessions: ScheduledSession[];
  scheduledSessionsByDate: Record<string, ScheduledSession[]>;
  formatTime: (datetime: string) => string;
  formatRecurrence: (session: ScheduledSession) => string;
  onEditPreviousSession?: (session: MovementSession) => void;
  onDeletePreviousSession?: (session: MovementSession) => void;
  onEditScheduledSession?: (session: ScheduledSession) => void;
  onDeleteSession: (session: ScheduledSession) => void;
  onDownloadICal: (session: ScheduledSession) => void;
  onClose: () => void;
}) {
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
      
      {/* Premium Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl rounded-t-3xl shadow-2xl z-[110] max-h-[85vh] overflow-y-auto border-t border-gray-200/60 animate-slide-up">
        {/* Handle */}
        <div className="flex items-center justify-center pt-4 pb-3">
          <div className="w-14 h-1.5 bg-gray-300/60 rounded-full" />
        </div>

        {/* Header */}
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
                (daySessions as MovementSession[]).map((session, index) => {
                  // Create unique key combining domain, id, timestamp, and index
                  const uniqueKey = session.id 
                    ? `${session.domain}-${session.id}-${session.timestamp}-${index}`
                    : `session-${session.domain}-${session.timestamp}-${session.activity}-${index}`;
                  
                  return (
                  <div
                    key={uniqueKey}
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
                      {(onEditPreviousSession || onDeletePreviousSession) && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {onEditPreviousSession && (
                            <button
                              onClick={() => onEditPreviousSession(session)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit session"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          {onDeletePreviousSession && (
                            <button
                              onClick={() => onDeletePreviousSession(session)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete session"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })
              ) : (
                (daySessions as ScheduledSession[]).map((session, index) => {
                  // Create unique key combining domain, id, startDatetime, and index
                  const uniqueKey = session.id 
                    ? `${session.activityDomain}-${session.id}-${session.startDatetime}-${index}`
                    : `scheduled-${session.activityDomain}-${session.startDatetime}-${session.activityName}-${index}`;
                  
                  return (
                  <div
                    key={uniqueKey}
                    className="bg-gray-50 rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start gap-3">
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
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => onDeleteSession(session)}
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
                  );
                })
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-base font-medium mb-1">No sessions on this day</p>
              <p className="text-sm">This day has no logged sessions</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
