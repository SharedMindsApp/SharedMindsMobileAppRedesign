/**
 * Fitness Tracker Home Page
 * 
 * Shows activity cards for each movement domain the user has selected.
 * Each card is a gateway to that activity's dedicated space.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, AlertCircle, Plus, Settings, ArrowLeft, Calendar, Clock, Flame, TrendingUp, Target, LayoutGrid, History, List, Maximize2, ChevronLeft, ChevronRight, X, CalendarDays, Edit2, Trash2, Download, Repeat } from 'lucide-react';
import { DiscoveryService } from '../../lib/fitnessTracker/discoveryService';
import { MovementSessionService } from '../../lib/fitnessTracker/movementSessionService';
import { ActivityStateService } from '../../lib/fitnessTracker/activityStateService';
import { ScheduledSessionService, type ScheduledSession } from '../../lib/fitnessTracker/scheduledSessionService';
import type { UserMovementProfile, MovementDomain, MovementSession } from '../../lib/fitnessTracker/types';
import { getActivityMetadata } from '../../lib/fitnessTracker/activityMetadata';
import { getSportEmoji } from '../../lib/fitnessTracker/sportEmojis';
import { getDisplayActivities, getActivityStateForCategory, type DisplayActivity } from '../../lib/fitnessTracker/activityDisplayHelper';
import { ReconfigurationModal } from './ReconfigurationModal';
import { DynamicQuickLog } from './DynamicQuickLog';
import { PauseActivityModal } from './PauseActivityModal';
import { PremiumActivityCard } from './PremiumActivityCard';
import { SkeletonLoader } from './SkeletonLoader';
import { BodyTransformationDashboard } from './BodyTransformationDashboard';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import { Eye } from 'lucide-react';
import { showToast } from '../Toast';

export function FitnessTrackerHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getCustomOverride, updateCustomOverride } = useUIPreferences();
  const [profile, setProfile] = useState<UserMovementProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showReconfiguration, setShowReconfiguration] = useState(false);
  const [pausingDomain, setPausingDomain] = useState<MovementDomain | null>(null);
  const [activitySessions, setActivitySessions] = useState<Record<MovementDomain, MovementSession[]>>({} as Record<MovementDomain, MovementSession[]>);
  const [todaySessions, setTodaySessions] = useState<MovementSession[]>([]);
  
  // Unified sessions state (all activities combined)
  const [allPreviousSessions, setAllPreviousSessions] = useState<MovementSession[]>([]);
  const [allScheduledSessions, setAllScheduledSessions] = useState<ScheduledSession[]>([]);
  const [loadingAllSessions, setLoadingAllSessions] = useState(true);
  const [sessionsTab, setSessionsTab] = useState<'previous' | 'scheduled'>('previous');
  const [sessionsViewType, setSessionsViewType] = useState<'list' | 'calendar'>('list');
  const [isSessionsCalendarExpanded, setIsSessionsCalendarExpanded] = useState(false);
  const [expandedSessionsCalendarMonth, setExpandedSessionsCalendarMonth] = useState(new Date());
  const [selectedDayForPopup, setSelectedDayForPopup] = useState<Date | null>(null);

  const discoveryService = new DiscoveryService();
  const sessionService = new MovementSessionService();
  const stateService = new ActivityStateService();
  const scheduledService = new ScheduledSessionService();

  useEffect(() => {
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (profile && user) {
      loadRecentSessions();
      loadTodaySessions();
      loadAllPreviousSessions();
      loadAllScheduledSessions();
    }
  }, [profile, user]);

  const loadAllPreviousSessions = useCallback(async () => {
    if (!profile || !user) return;

    try {
      setLoadingAllSessions(true);
      const allSessions: MovementSession[] = [];
      
      // Get all domains from display activities
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
      
      // Sort by timestamp descending (newest first)
      allSessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAllPreviousSessions(allSessions);
    } catch (error) {
      console.error('Failed to load all previous sessions:', error);
    } finally {
      setLoadingAllSessions(false);
    }
  }, [profile, user]);

  const loadAllScheduledSessions = useCallback(async () => {
    if (!profile || !user) return;

    try {
      // Load scheduled sessions for all activity domains
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
      
      // Sort by startDatetime ascending
      allScheduled.sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime());
      setAllScheduledSessions(allScheduled);
    } catch (error) {
      console.error('Failed to load all scheduled sessions:', error);
    }
  }, [profile, user]);

  const loadTodaySessions = async () => {
    if (!profile || !user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const allSessions: MovementSession[] = [];
      for (const domain of profile.primaryDomains || []) {
        try {
          const domainSessions = await sessionService.listSessions(user.id, domain, {
            startDate: todayStr,
            endDate: todayStr,
            limit: 100,
          });
          allSessions.push(...domainSessions);
        } catch (error) {
          // Ignore errors
        }
      }

      setTodaySessions(allSessions);
    } catch (error) {
      console.error('Failed to load today sessions:', error);
    }
  };

  // Calculate today's metrics
  const todayMetrics = useMemo(() => {
    const sessions = todaySessions;
    const totalDuration = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const estimatedCalories = Math.round(totalDuration * 10);
    const avgIntensity = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.perceivedIntensity || 3), 0) / sessions.length
      : 0;

    return {
      sessionsCount: sessions.length,
      totalDuration,
      estimatedCalories,
      avgIntensity: Math.round(avgIntensity * 10) / 10,
    };
  }, [todaySessions]);

  const loadProfile = async (forceRefresh?: boolean) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userProfile = await discoveryService.getProfile(user.id, { forceRefresh });

      if (!userProfile || !userProfile.discoveryCompleted) {
        navigate('/fitness-tracker/discovery');
        return;
      }

      setProfile(userProfile);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load fitness tracker');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentSessions = async () => {
    if (!profile || !user) return;

    try {
      // Get unique domains from display activities
      const displayActivities = getDisplayActivities(profile);
      const uniqueDomains = [...new Set(displayActivities.map(a => a.domain))] as MovementDomain[];
      
      const sessionsMap: Record<MovementDomain, MovementSession[]> = {} as Record<MovementDomain, MovementSession[]>;

      for (const domain of uniqueDomains) {
        try {
          const domainSessions = await sessionService.listSessions(user.id, domain, {
            limit: 3, // Get last 3 sessions for "last session" display
          });
          sessionsMap[domain] = domainSessions;
        } catch (error) {
          sessionsMap[domain] = [];
        }
      }

      setActivitySessions(sessionsMap);
    } catch (error) {
      console.error('Failed to load recent sessions:', error);
    }
  };

  const getLastSession = (domain: MovementDomain): MovementSession | null => {
    const sessions = activitySessions[domain] || [];
    return sessions.length > 0 ? sessions[0] : null;
  };

  const formatLastSessionTime = (session: MovementSession): string => {
    if (!session.timestamp) return '';
    
    const sessionDate = new Date(session.timestamp);
    const now = new Date();
    const diffMs = now.getTime() - sessionDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  // Get display activities (categories as separate activities, including sports)
  // MUST be called before any conditional returns (Rules of Hooks)
  const displayActivities = useMemo(() => {
    if (!profile) return [];
    return getDisplayActivities(profile);
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <SkeletonLoader variant="text" width={200} height={32} className="mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonLoader key={i} variant="card" className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => loadProfile()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  // Group activities by state
  const activeActivities: DisplayActivity[] = [];
  const pausedActivities: DisplayActivity[] = [];
  const seasonalActivities: DisplayActivity[] = [];

  for (const activity of displayActivities) {
    const state = getActivityStateForCategory(profile, activity.id) || 
                  profile.domainDetails[activity.domain]?.state;
    
    if (!state || state.state === 'active') {
      activeActivities.push(activity);
    } else if (state.state === 'paused') {
      pausedActivities.push(activity);
    } else if (state.state === 'seasonal' || (state.state === 'active' && state.isSeasonal)) {
      seasonalActivities.push(activity);
    } else if (state.state !== 'archived' && state.state !== 'dormant') {
      activeActivities.push(activity);
    }
  }

  // Sort activities by most recent session
  const sortByRecency = (activities: DisplayActivity[]) => {
    return [...activities].sort((a, b) => {
      const aLastSession = getLastSession(a.domain);
      const bLastSession = getLastSession(b.domain);
      
      if (aLastSession && !bLastSession) return -1;
      if (!aLastSession && bLastSession) return 1;
      if (aLastSession && bLastSession) {
        return new Date(bLastSession.timestamp).getTime() - new Date(aLastSession.timestamp).getTime();
      }
      return 0;
    });
  };

  const sortedActiveActivities = sortByRecency(activeActivities);
  const sortedPausedActivities = sortByRecency([...pausedActivities, ...seasonalActivities]);

  // Calculate activity stats for dashboard cards
  const getActivityStats = (domain: MovementDomain) => {
    const sessions = activitySessions[domain] || [];
    const thisWeek = sessions.filter(s => {
      const sessionDate = new Date(s.timestamp);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return sessionDate >= weekAgo;
    });
    const totalDuration = thisWeek.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

    return {
      thisWeekCount: thisWeek.length,
      totalDuration,
    };
  };

  // Get motivational message
  const getMotivationalMessage = () => {
    if (!profile) return "Ready to start your journey?";
    
    const totalThisWeek = sortedActiveActivities.reduce((sum, activity) => {
      return sum + getActivityStats(activity.domain).thisWeekCount;
    }, 0);

    if (totalThisWeek === 0) {
      return "Ready to start your journey? Log your first session today!";
    } else if (totalThisWeek < 3) {
      return "Great start! Keep building your momentum.";
    } else if (totalThisWeek < 7) {
      return "You're building strong habits. Keep it up!";
    } else {
      return "Amazing consistency! You're crushing your goals.";
    }
  };

  // Handlers for previous sessions (MovementSession) - for day popup
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

  // Handlers for scheduled sessions - for day popup
  const handleEditScheduledSession = (session: ScheduledSession) => {
    // Navigate to activity page or show modal with domain context
    console.log('Edit scheduled session:', session);
  };

  const handleDeleteScheduledSession = async (session: ScheduledSession) => {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      {/* Subtle Back Button - Top Left */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => navigate('/tracker-studio/my-trackers')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-xs font-medium transition-colors px-2 py-1 rounded-md hover:bg-white/50"
          title="Back to Trackers"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Back</span>
        </button>
      </div>

      {/* Compact Premium Header */}
      <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white pt-16 pb-6 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />
        
        <div className="relative max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div className="animate-fade-in">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 tracking-tight">Your Activities</h1>
              <p className="text-sm text-white/80">{getMotivationalMessage()}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowReconfiguration(true)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                title="Add Activity"
              >
                <Plus size={20} />
              </button>
              <button
                onClick={() => navigate('/tracker-studio/my-trackers')}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                title="Tracker Studio"
              >
                <LayoutGrid size={20} />
              </button>
              <button
                onClick={() => setShowReconfiguration(true)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>

          {/* Compact Today's Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
            {[
              { icon: Calendar, label: 'Today', value: todayMetrics.sessionsCount, unit: 'sessions' },
              { icon: Clock, label: 'Duration', value: todayMetrics.totalDuration, unit: 'minutes' },
              { icon: Flame, label: 'Calories', value: todayMetrics.estimatedCalories, unit: 'est. kcal' },
              { icon: Target, label: 'Intensity', value: todayMetrics.avgIntensity || '—', unit: 'avg /5' },
            ].map((metric, idx) => (
              <div
                key={metric.label}
                className="bg-white/15 backdrop-blur-xl rounded-xl border border-white/20 p-3 hover:bg-white/20 transition-all duration-300"
                style={{
                  animationDelay: `${idx * 50}ms`,
                }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <metric.icon size={14} className="text-white/90" />
                  <span className="text-[10px] text-white/80 font-semibold uppercase tracking-wide">{metric.label}</span>
                </div>
                <div className="text-xl font-bold text-white mb-0.5">{metric.value}</div>
                <div className="text-[10px] text-white/70">{metric.unit}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Compact Quick Log Section */}
      {profile?.uiConfiguration?.quickLogButtons && profile.uiConfiguration.quickLogButtons.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 -mt-4">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/60 shadow-xl p-4 hover:shadow-2xl transition-shadow duration-500">
            <h2 className="text-base font-bold text-gray-900 mb-3">Quick Log</h2>
            <DynamicQuickLog buttons={profile.uiConfiguration.quickLogButtons} profile={profile} />
          </div>
        </div>
      )}

      {/* Activity Cards Grid - Compact */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 -mt-4 space-y-5">
        {/* Active Activities */}
        {sortedActiveActivities.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Active Now</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {sortedActiveActivities.map((activity, idx) => {
                const lastSession = getLastSession(activity.domain);
                const stats = getActivityStats(activity.domain);
                const state = getActivityStateForCategory(profile, activity.id);

                // For sport categories, use category name and emoji instead of domain metadata
                const metadata = activity.id.startsWith('team_sport_') || activity.id.startsWith('individual_sport_')
                  ? {
                      displayName: activity.name,
                      description: '',
                      icon: activity.icon, // Deprecated - kept for backwards compatibility
                      emoji: getSportEmoji(activity.name), // Use sport-specific emoji
                      color: activity.color,
                      // Use domain base gradients with color tinting (simpler approach)
                      gradient: activity.domain === 'team_sports' 
                        ? 'from-purple-600 via-violet-500 to-purple-600'
                        : 'from-fuchsia-600 via-pink-500 to-fuchsia-600',
                      lightGradient: activity.domain === 'team_sports'
                        ? 'from-purple-50 via-violet-50 to-purple-50'
                        : 'from-fuchsia-50 via-pink-50 to-fuchsia-50',
                    }
                  : getActivityMetadata(activity.domain);

                return (
                  <div
                    key={activity.id}
                    className="animate-scale-in"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <PremiumActivityCard
                      domain={activity.domain}
                      profile={profile}
                      lastSession={lastSession}
                      stats={stats}
                      isPaused={false}
                      state={state}
                      customMetadata={metadata}
                      activityId={activity.id}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Paused / Seasonal Activities */}
        {sortedPausedActivities.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Paused / Seasonal</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {sortedPausedActivities.map((activity, idx) => {
                const lastSession = getLastSession(activity.domain);
                const stats = getActivityStats(activity.domain);
                const state = getActivityStateForCategory(profile, activity.id);

                const metadata = activity.id.startsWith('team_sport_') || activity.id.startsWith('individual_sport_')
                  ? {
                      displayName: activity.name,
                      description: '',
                      icon: activity.icon, // Deprecated - kept for backwards compatibility
                      emoji: getSportEmoji(activity.name), // Use sport-specific emoji
                      color: activity.color,
                      gradient: activity.domain === 'team_sports' 
                        ? 'from-purple-600 via-violet-500 to-purple-600'
                        : 'from-fuchsia-600 via-pink-500 to-fuchsia-600',
                      lightGradient: activity.domain === 'team_sports'
                        ? 'from-purple-50 via-violet-50 to-purple-50'
                        : 'from-fuchsia-50 via-pink-50 to-fuchsia-50',
                    }
                  : getActivityMetadata(activity.domain);

                return (
                  <div
                    key={activity.id}
                    className="animate-scale-in"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <PremiumActivityCard
                      domain={activity.domain}
                      profile={profile}
                      lastSession={lastSession}
                      stats={stats}
                      isPaused={true}
                      state={state}
                      customMetadata={metadata}
                      activityId={activity.id}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Body Transformation Section */}
        {getCustomOverride('bodyTransformationVisible', true) ? (
          <div className="mt-8" key={`body-transformation-${refreshKey}`}>
            <BodyTransformationDashboard 
              onHide={() => {
                setRefreshKey(prev => prev + 1);
              }}
            />
          </div>
        ) : (
          <div className="mt-8" key={`body-transformation-restore-${refreshKey}`}>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-200 rounded-lg">
                  <Eye className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Body Transformation tracker is hidden</p>
                  <p className="text-xs text-gray-600">Show it again to track how your body adapts to training</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  await updateCustomOverride('bodyTransformationVisible', true);
                  showToast('success', 'Body Transformation tracker restored');
                  setRefreshKey(prev => prev + 1);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Eye size={16} />
                <span>Show Tracker</span>
              </button>
            </div>
          </div>
        )}

        {/* Unified Sessions Section - All Activities Combined */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">All Sessions</h2>
          <UnifiedSessionsView
            profile={profile}
            previousSessions={allPreviousSessions}
            scheduledSessions={allScheduledSessions}
            loading={loadingAllSessions}
            activeTab={sessionsTab}
            viewType={sessionsViewType}
            isCalendarExpanded={isSessionsCalendarExpanded}
            expandedCalendarMonth={expandedSessionsCalendarMonth}
            selectedDayForPopup={selectedDayForPopup}
            onTabChange={setSessionsTab}
            onViewTypeChange={setSessionsViewType}
            onCalendarExpand={setIsSessionsCalendarExpanded}
            onMonthChange={setExpandedSessionsCalendarMonth}
            onDayClick={setSelectedDayForPopup}
            onRefresh={() => {
              loadAllPreviousSessions();
              loadAllScheduledSessions();
            }}
          />
        </div>

        {/* Expanded Full-Screen Calendar Modal - Unified View */}
        {isSessionsCalendarExpanded && (
          <UnifiedExpandedCalendarModal
            isOpen={isSessionsCalendarExpanded}
            onClose={() => setIsSessionsCalendarExpanded(false)}
            activeTab={sessionsTab}
            previousSessions={allPreviousSessions}
            previousSessionsByDate={(() => {
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
            })()}
            scheduledSessions={allScheduledSessions}
            scheduledSessionsByDate={(() => {
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
            })()}
            formatDate={(timestamp: string) => {
              const date = new Date(timestamp);
              const now = new Date();
              const diffMs = now.getTime() - date.getTime();
              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              if (diffDays === 0) return 'Today';
              if (diffDays === 1) return 'Yesterday';
              if (diffDays < 7) return `${diffDays} days ago`;
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }}
            formatTime={(datetime: string) => {
              const date = new Date(datetime);
              return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            }}
            formatRecurrence={(session: ScheduledSession) => {
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
            }}
            currentMonth={expandedSessionsCalendarMonth}
            onMonthChange={setExpandedSessionsCalendarMonth}
            onDayClick={setSelectedDayForPopup}
          />
        )}

        {/* Day Sessions Popup - Unified View */}
        {selectedDayForPopup && (
          <UnifiedDaySessionsPopup
            date={selectedDayForPopup}
            activeTab={sessionsTab}
            previousSessionsByDate={(() => {
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
            })()}
            scheduledSessions={allScheduledSessions}
            scheduledSessionsByDate={(() => {
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
            })()}
            formatDate={(timestamp: string) => {
              const date = new Date(timestamp);
              const now = new Date();
              const diffMs = now.getTime() - date.getTime();
              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              if (diffDays === 0) return 'Today';
              if (diffDays === 1) return 'Yesterday';
              if (diffDays < 7) return `${diffDays} days ago`;
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }}
            formatTime={(datetime: string) => {
              const date = new Date(datetime);
              return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            }}
            formatRecurrence={(session: ScheduledSession) => {
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
            }}
            onEditPreviousSession={handleEditPreviousSession}
            onDeletePreviousSession={handleDeletePreviousSession}
            onEditScheduledSession={handleEditScheduledSession}
            onDeleteScheduledSession={handleDeleteScheduledSession}
            onDownloadICal={handleDownloadICal}
            onClose={() => setSelectedDayForPopup(null)}
          />
        )}
      </div>

      {/* Pause Activity Modal */}
      {pausingDomain && profile && (
        <PauseActivityModal
          isOpen={!!pausingDomain}
          onClose={() => setPausingDomain(null)}
          profile={profile}
          activityDomain={pausingDomain}
          onPaused={(updatedProfile) => {
            setProfile(updatedProfile);
            setPausingDomain(null);
            loadProfile(true);
          }}
        />
      )}

      {/* Reconfiguration Modal */}
      {showReconfiguration && profile && (
        <ReconfigurationModal
          profile={profile}
          isOpen={showReconfiguration}
          onClose={() => setShowReconfiguration(false)}
          onReconfigured={(newProfile) => {
            setProfile(newProfile);
            setShowReconfiguration(false);
            loadProfile(true);
            window.dispatchEvent(new CustomEvent('fitness-profile-reconfigured'));
          }}
        />
      )}
    </div>
  );
}

/**
 * Unified Sessions View Component
 * Shows all sessions from all activities combined in tabs with list/calendar views
 */
function UnifiedSessionsView({
  profile,
  previousSessions,
  scheduledSessions,
  loading,
  activeTab,
  viewType,
  isCalendarExpanded,
  expandedCalendarMonth,
  selectedDayForPopup,
  onTabChange,
  onViewTypeChange,
  onCalendarExpand,
  onMonthChange,
  onDayClick,
  onRefresh,
}: {
  profile: UserMovementProfile;
  previousSessions: MovementSession[];
  scheduledSessions: ScheduledSession[];
  loading: boolean;
  activeTab: 'previous' | 'scheduled';
  viewType: 'list' | 'calendar';
  isCalendarExpanded: boolean;
  expandedCalendarMonth: Date;
  selectedDayForPopup: Date | null;
  onTabChange: (tab: 'previous' | 'scheduled') => void;
  onViewTypeChange: (view: 'list' | 'calendar') => void;
  onCalendarExpand: (expand: boolean) => void;
  onMonthChange: (month: Date) => void;
  onDayClick: (date: Date | null) => void;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // Group previous sessions by date
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

  // Get upcoming scheduled sessions for this week
  const upcomingScheduledSessions = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return scheduledSessions
      .filter(s => {
        const sessionDate = new Date(s.startDatetime);
        return sessionDate >= now && sessionDate <= endOfWeek;
      })
      .sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime());
  }, [scheduledSessions]);

  // Historical scheduled sessions
  const historicalScheduledSessions = useMemo(() => {
    const now = new Date();
    return scheduledSessions
      .filter(s => new Date(s.startDatetime) < now)
      .sort((a, b) => new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime())
      .slice(0, 20);
  }, [scheduledSessions]);

  // Handlers for previous sessions (MovementSession)
  const handleEditPreviousSession = async (session: MovementSession) => {
    if (!user || !session.id) return;
    
    try {
      // Navigate to activity page or show edit modal
      // For now, log and refresh
      console.log('Edit previous session:', session);
      // TODO: Implement edit modal or navigate to edit page
      onRefresh();
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
      onRefresh();
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  // Handlers for scheduled sessions
  const handleEditSession = (session: ScheduledSession) => {
    // Navigate to activity page or show modal with domain context
    console.log('Edit session:', session);
  };

  const handleDeleteSession = async (session: ScheduledSession) => {
    if (!user || !session.id) return;
    
    if (!confirm(`Are you sure you want to delete this scheduled session "${session.activityName}"?`)) {
      return;
    }
    
    try {
      const scheduledService = new ScheduledSessionService();
      await scheduledService.deleteScheduledSession(user.id, session.id);
      onRefresh();
    } catch (error) {
      console.error('Failed to delete scheduled session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  const handleDownloadICal = (session: ScheduledSession) => {
    const scheduledService = new ScheduledSessionService();
    scheduledService.downloadICalFile(session);
  };

  // Navigate to full-page calendar
  const handleExpandCalendar = () => {
    const params = new URLSearchParams();
    params.set('tab', activeTab);
    params.set('month', expandedCalendarMonth.toISOString().split('T')[0]);
    navigate(`/fitness-tracker/calendar?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-1">
          <button
            onClick={() => onTabChange('previous')}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'previous'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            Previous Sessions
          </button>
          <button
            onClick={() => onTabChange('scheduled')}
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
              onClick={() => onViewTypeChange('list')}
              className={`p-1.5 rounded transition-colors ${
                viewType === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="List view"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => onViewTypeChange('calendar')}
              className={`p-1.5 rounded transition-colors ${
                viewType === 'calendar'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Calendar view"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Previous Sessions Tab */}
      {activeTab === 'previous' && (
        <UnifiedPreviousSessionsView
          sessions={previousSessions}
          sessionsByDate={previousSessionsByDate}
          viewType={viewType}
          formatDate={formatDate}
          formatTime={formatTime}
          loading={loading}
          onExpand={handleExpandCalendar}
          onDayClick={onDayClick}
          onEdit={handleEditPreviousSession}
          onDelete={handleDeletePreviousSession}
        />
      )}

      {/* Scheduled Sessions Tab */}
      {activeTab === 'scheduled' && (
        <UnifiedScheduledSessionsView
          upcomingSessions={upcomingScheduledSessions}
          historicalSessions={historicalScheduledSessions}
          formatRecurrence={formatRecurrence}
          formatTime={formatTime}
          onEdit={handleEditSession}
          onDelete={handleDeleteSession}
          onDownloadICal={handleDownloadICal}
          loading={loading}
          onExpand={handleExpandCalendar}
          scheduledSessions={scheduledSessions}
        />
      )}
    </div>
  );
}

/**
 * Unified Previous Sessions View (all activities combined)
 */
function UnifiedPreviousSessionsView({
  sessions,
  sessionsByDate,
  viewType,
  formatDate,
  formatTime,
  loading,
  onExpand,
  onDayClick,
  onEdit,
  onDelete,
}: {
  sessions: MovementSession[];
  sessionsByDate: Record<string, MovementSession[]>;
  viewType: 'list' | 'calendar';
  formatDate: (timestamp: string) => string;
  formatTime: (datetime: string) => string;
  loading: boolean;
  onExpand: () => void;
  onDayClick: (date: Date) => void;
  onEdit: (session: MovementSession) => void;
  onDelete: (session: MovementSession) => void;
}) {
  if (loading && sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
        <p className="text-xs text-gray-600">Loading sessions...</p>
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
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days: (Date | null)[] = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(currentYear, currentMonth, day));
    }

    return (
      <div className="space-y-3">
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

        <div className="grid grid-cols-7 gap-1">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
              {day}
            </div>
          ))}
          
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
      {sessions.map((session, index) => {
        const dateStr = formatDate(session.timestamp);
        const timeStr = formatTime(session.timestamp);
        
        // Create unique key combining domain, id, timestamp, and index
        const uniqueKey = session.id 
          ? `${session.domain}-${session.id}-${session.timestamp}-${index}`
          : `session-${session.domain}-${session.timestamp}-${session.activity}-${index}`;
        
        return (
          <div
            key={uniqueKey}
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
              <div className="flex items-center gap-1 flex-shrink-0">
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
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Unified Scheduled Sessions View (all activities combined)
 */
function UnifiedScheduledSessionsView({
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

  return (
    <div className="space-y-4">
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

      {upcomingSessions.length > 0 ? (
        <div className="space-y-2">
          {upcomingSessions.map((session, index) => {
            const sessionDate = new Date(session.startDatetime);
            const dateStr = sessionDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            
            return (
              <div
                key={session.id || `scheduled-${session.startDatetime}-${session.activityName}-${index}`}
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
                  <div className="flex items-center gap-1 flex-shrink-0">
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-xs font-medium mb-1">No scheduled sessions this week</p>
        </div>
      )}

      {historicalSessions.length > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <History size={14} className="text-gray-500" />
            <h4 className="text-sm font-semibold text-gray-900">Past Scheduled Sessions</h4>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {historicalSessions.map((session, index) => {
              const sessionDate = new Date(session.startDatetime);
              const dateStr = sessionDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
              
              return (
                <div
                  key={session.id || `historical-${session.startDatetime}-${session.activityName}-${index}`}
                  className="bg-gray-50 rounded-lg border border-gray-200 p-3 hover:border-gray-300 transition-colors opacity-75"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock size={12} className="text-gray-500 flex-shrink-0" />
                        <span className="text-xs font-medium text-gray-700">{session.activityName}</span>
                      </div>
                      <div className="text-xs text-gray-500 ml-4">
                        {dateStr} at {formatTime(session.startDatetime)}
                        {session.durationMinutes && ` • ${session.durationMinutes} min`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
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
 * Unified Expanded Calendar Modal (all activities combined)
 */
function UnifiedExpandedCalendarModal({
  isOpen,
  onClose,
  activeTab,
  previousSessions,
  previousSessionsByDate,
  scheduledSessions,
  scheduledSessionsByDate,
  formatDate,
  formatTime,
  formatRecurrence,
  currentMonth,
  onMonthChange,
  onDayClick,
}: {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'previous' | 'scheduled';
  previousSessions: MovementSession[];
  previousSessionsByDate: Record<string, MovementSession[]>;
  scheduledSessions: ScheduledSession[];
  scheduledSessionsByDate: Record<string, ScheduledSession[]>;
  formatDate: (timestamp: string) => string;
  formatTime: (datetime: string) => string;
  formatRecurrence: (session: ScheduledSession) => string;
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
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
            All Activities - {activeTab === 'previous' ? 'Previous Sessions' : 'Scheduled Sessions'}
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
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
 * Unified Day Sessions Popup (all activities combined)
 */
function UnifiedDaySessionsPopup({
  date,
  activeTab,
  previousSessionsByDate,
  scheduledSessions,
  scheduledSessionsByDate,
  formatDate,
  formatTime,
  formatRecurrence,
  onEditPreviousSession,
  onDeletePreviousSession,
  onEditScheduledSession,
  onDeleteScheduledSession,
  onDownloadICal,
  onClose,
}: {
  date: Date;
  activeTab: 'previous' | 'scheduled';
  previousSessionsByDate: Record<string, MovementSession[]>;
  scheduledSessions: ScheduledSession[];
  scheduledSessionsByDate: Record<string, ScheduledSession[]>;
  formatDate: (timestamp: string) => string;
  formatTime: (datetime: string) => string;
  formatRecurrence: (session: ScheduledSession) => string;
  onEditPreviousSession: (session: MovementSession) => void;
  onDeletePreviousSession: (session: MovementSession) => void;
  onEditScheduledSession: (session: ScheduledSession) => void;
  onDeleteScheduledSession: (session: ScheduledSession) => void;
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
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => onEditPreviousSession(session)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit session"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => onDeletePreviousSession(session)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete session"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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
                          onClick={() => onEditScheduledSession(session)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit session"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => onDeleteScheduledSession(session)}
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
