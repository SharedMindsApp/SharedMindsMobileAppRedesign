/**
 * HabitSurface - Premium Habit Card Component
 * 
 * A soft, calm surface for displaying a habit. Designed to feel like a daily ritual,
 * not a task list item. The primary action (Done) visually dominates.
 * 
 * Design Philosophy:
 * - Soft surfaces, not boxes (minimal borders, tonal backgrounds)
 * - Action first, data second
 * - Mobile-first (44px+ tap targets, thumb-reachable)
 * - No visual noise (reduced badges, icons, borders)
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSwipeGesture } from '../../../hooks/useSwipeGesture';
import { CheckCircle2, XCircle, Minus, ChevronDown, ChevronUp, MoreVertical, Sparkles, Clock, Edit, Archive, Home, Users, UserPlus, Users as UsersIcon } from 'lucide-react';
import { ConfirmDialog } from '../../ConfirmDialog';
import type { Activity } from '../../../lib/activities/activityTypes';
import type { PermissionFlags } from '../../../lib/permissions/types';
import { upsertHabitCheckin, getHabitSummary, type HabitCheckinStatus } from '../../../lib/habits/habitsService';
import { getGoalsForHabit, getSkillsForHabit, getHabitMicroFeedback } from '../../../lib/habits/habitContextHelpers';
import { getWhyThisMattersForHabit } from '../../../lib/trackerContext/meaningHelpers';
import { getHabitColorTheme, type HabitColorTheme } from '../../../lib/habits/habitColorHelpers';
import { getHabitSchedule, formatScheduleDisplay } from '../../../lib/habits/habitScheduleService';
import { getTimeOfDayAnnotation } from '../../../lib/habits/habitDayAwareHelpers';
import { HabitContextSection } from './HabitContextSection';
import { WhyThisMattersSection } from '../../shared/WhyThisMattersSection';
import { HabitScheduleSheet } from './HabitScheduleSheet';
import { HabitWeekStrip } from './HabitWeekStrip';
import { HabitEditModal } from './HabitEditModal';
import { HabitParticipantManagementSheet } from './HabitParticipantManagementSheet';
import { isUserParticipating, joinTracker, getUserParticipation, getTrackerParticipants } from '../../../lib/activities/trackerParticipationService';
import { getHabitAggregateProgress, type ParticipantProgress } from '../../../lib/activities/trackerAggregateService';
import { Avatar } from '../../messaging/Avatar';
import { supabase } from '../../../lib/supabase';
import { getCollaborationMode, type CollaborationMode } from '../../../lib/activities/activityTypes';
import { Handshake, Eye, Trophy } from 'lucide-react';

interface HabitSurfaceProps {
  habit: Activity;
  userId: string;
  permissions: PermissionFlags;
  layout: 'full' | 'compact';
  onUpdate: () => void;
  onCheckinClick?: (date: string) => void;
  activeDate?: string; // YYYY-MM-DD - Date context (optional)
  dayContext?: {
    isScheduled: boolean;
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'exact';
    exactTime?: string;
    scheduleDisplay?: string;
  };
}

export function HabitSurface({
  habit,
  userId,
  permissions,
  layout,
  onUpdate,
  onCheckinClick,
  activeDate,
  dayContext,
}: HabitSurfaceProps) {
  const [summary, setSummary] = useState<any>(null);
  const [goalContexts, setGoalContexts] = useState<Array<{ goal: any; activity: { title: string; description: string | null } }>>([]);
  const [skillContexts, setSkillContexts] = useState<Array<{ skill: { id: string; name: string; description: string | null }; link: any }>>([]);
  const [microFeedback, setMicroFeedback] = useState<string | null>(null);
  const [whyThisMatters, setWhyThisMatters] = useState<any>(null);
  const [skillPracticeInfo, setSkillPracticeInfo] = useState<{ skillId: string; skillName: string } | null>(null);
  const [showPracticeRecorded, setShowPracticeRecorded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showContextDetails, setShowContextDetails] = useState(false);
  const [colorTheme, setColorTheme] = useState<HabitColorTheme | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showMilestoneCelebration, setShowMilestoneCelebration] = useState<number | null>(null);
  const [weekStripKey, setWeekStripKey] = useState(0); // Force re-render of week strip after check-in // Phase 1: Milestone days
  const [completionFeedback, setCompletionFeedback] = useState<string | null>(null);
  const [scheduleInfo, setScheduleInfo] = useState<any>(null);
  const [showScheduleSheet, setShowScheduleSheet] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const [showParticipantManagement, setShowParticipantManagement] = useState(false);
  const [isParticipating, setIsParticipating] = useState<boolean | null>(null);
  const [userParticipation, setUserParticipation] = useState<any>(null);
  const [aggregateProgress, setAggregateProgress] = useState<any>(null);
  const [participantProfiles, setParticipantProfiles] = useState<Array<{ id: string; name: string; userId: string }>>([]);
  const [joining, setJoining] = useState(false);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const isCompact = layout === 'compact';
  const canEdit = permissions.can_edit;
  const showDetailsMode = permissions.detail_level === 'detailed';
  
  // Mobile detection for responsive sizing
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (showDetailsMode) {
      loadSummary();
    }
    loadHabitContext();
    loadSkillPracticeInfo();
    loadWhyThisMatters();
    loadColorTheme();
    loadScheduleInfo();
    loadParticipationStatus();
  }, [habit.id, showDetailsMode, userId, dayContext?.timeOfDay, scheduleInfo?.timeOfDay]);

  // Load participation status and aggregate progress for household/team habits
  const loadParticipationStatus = async () => {
    const ownerType = (habit as any).owner_type || 'user';
    
    // Only check participation for household/team habits
    if (ownerType === 'household' || ownerType === 'team') {
      try {
        const participating = await isUserParticipating(habit.id, userId);
        setIsParticipating(participating);
        
        if (participating) {
          // Load user's participation details
          const participation = await getUserParticipation(habit.id, userId);
          setUserParticipation(participation);
          
          // Load aggregate progress
          const progress = await getHabitAggregateProgress(habit.id);
          setAggregateProgress(progress);
          
          // Load participant profiles for avatars
          const participants = await getTrackerParticipants(habit.id);
          const userIds = participants.map(p => p.user_id);
          
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', userIds);
            
            if (profiles) {
              setParticipantProfiles(
                profiles.map(p => ({
                  id: p.id,
                  name: p.full_name || 'User',
                  userId: p.user_id,
                }))
              );
            }
          }
        }
      } catch (error) {
        console.error('[HabitSurface] Error loading participation status:', error);
        setIsParticipating(false);
      }
    } else {
      // Personal habit - always participating
      setIsParticipating(true);
    }
  };

  const handleJoin = async () => {
    setJoining(true);
    try {
      await joinTracker({
        activityId: habit.id,
        userId: userId,
        participationMode: 'individual',
      });
      await loadParticipationStatus();
      onUpdate();
    } catch (error) {
      console.error('[HabitSurface] Error joining habit:', error);
      alert('Failed to join habit. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const loadScheduleInfo = async () => {
    try {
      const schedule = await getHabitSchedule(habit.id);
      setScheduleInfo(schedule);
    } catch (error) {
      console.error('[HabitSurface] Error loading schedule:', error);
      setScheduleInfo(null);
    }
  };

  const loadColorTheme = async () => {
    try {
      // Get time of day from schedule or day context
      const timeOfDay = dayContext?.timeOfDay || scheduleInfo?.timeOfDay;
      const theme = await getHabitColorTheme(habit, userId, timeOfDay);
      setColorTheme(theme);
    } catch (error) {
      console.error('[HabitSurface] Error loading color theme:', error);
      // Fallback to default theme
      const { HABIT_COLOR_THEMES } = await import('../../../lib/habits/habitColorHelpers');
      setColorTheme(HABIT_COLOR_THEMES.default);
    }
  };

  useEffect(() => {
    if (summary) {
      getHabitMicroFeedback(userId, habit.id, summary).then(feedback => {
        setMicroFeedback(feedback?.insight || null);
      }).catch(() => {});
    }
  }, [summary, habit.id, userId]);

  const loadSummary = async () => {
    try {
      const habitSummary = await getHabitSummary(userId, habit.id);
      setSummary(habitSummary);
    } catch (err) {
      console.error('[HabitSurface] Error loading habit summary:', err);
    }
  };

  const loadHabitContext = async () => {
    try {
      const [goals, skills] = await Promise.all([
        getGoalsForHabit(userId, habit.id),
        getSkillsForHabit(userId, habit.id),
      ]);
      setGoalContexts(goals);
      setSkillContexts(skills);
    } catch (error) {
      console.error('[HabitSurface] Error loading habit context:', error);
    }
  };

  const loadSkillPracticeInfo = async () => {
    try {
      const { hasSkillPracticeMapping, getSkillPracticeConfig } = await import('../../../lib/skills/skillEvidenceFromHabit');
      if (hasSkillPracticeMapping(habit.metadata)) {
        const config = getSkillPracticeConfig(habit.metadata);
        if (config) {
          const { skillsService } = await import('../../../lib/skillsService');
          const skill = await skillsService.getById(config.skill_id);
          if (skill) {
            setSkillPracticeInfo({
              skillId: config.skill_id,
              skillName: skill.name,
            });
          }
        }
      }
    } catch (error) {
      console.error('[HabitSurface] Error loading skill practice info:', error);
    }
  };

  const loadWhyThisMatters = async () => {
    try {
      const context = await getWhyThisMattersForHabit(userId, habit.id);
      setWhyThisMatters(context);
    } catch (error) {
      console.error('[HabitSurface] Error loading why this matters:', error);
    }
  };

  const handleCheckIn = async (status: HabitCheckinStatus) => {
    if (!canEdit) return;
    
    if (onCheckinClick) {
      onCheckinClick(today);
    } else {
      try {
        // Determine metric type from habit metadata
        const metricType = habit.metadata?.metric_type || 'boolean';
        
        // Build payload based on status and metric type
        // Both values must be explicitly set (null or value) per constraint
        const payload: {
          status: HabitCheckinStatus;
          value_boolean: boolean | null;
          value_numeric: number | null;
        } = {
          status,
          value_numeric: null,
          value_boolean: null,
        };
        
        // For 'missed' or 'skipped', both values must be explicitly NULL
        if (status === 'done') {
          if (metricType === 'boolean') {
            payload.value_boolean = true;
            payload.value_numeric = null;
          }
          // For numeric habits, we'd need the actual value, but quick check-in assumes boolean
          // If it's not boolean, the check-in sheet should be used instead
          // For now, default to boolean behavior
        }
        // For 'missed' or 'skipped', both values remain null (explicitly set above)
        
        await upsertHabitCheckin(userId, habit.id, today, payload);
        
        // Emit activity change event for real-time sync
        const { emitActivityChanged } = await import('../../../lib/activities/activityEvents');
        emitActivityChanged(habit.id);
        
        // Refresh week strip after check-in
        setWeekStripKey(prev => prev + 1);
        
        // Success animation and feedback for "done"
        if (status === 'done') {
          setShowSuccessAnimation(true);
          setTimeout(() => setShowSuccessAnimation(false), 600);
          
          // Phase 1: Check for milestone celebrations (7, 30 days)
          // Note: Summary will be reloaded after check-in, so we check after a brief delay
          setTimeout(async () => {
            try {
              const updatedSummary = await getHabitSummary(userId, habit.id);
              if (updatedSummary) {
                const currentStreak = updatedSummary.currentStreak || 0;
                const milestoneDays = [7, 30];
                if (milestoneDays.includes(currentStreak)) {
                  setShowMilestoneCelebration(currentStreak);
                  setTimeout(() => setShowMilestoneCelebration(null), 2000);
                }
              }
            } catch (err) {
              // Non-fatal: milestone check failed
              console.warn('[HabitSurface] Error checking milestone:', err);
            }
          }, 300);
          
          // Generate completion feedback
          const feedbackMessages: string[] = [];
          
          // Check if habit is scheduled
          const isScheduled = dayContext?.isScheduled || scheduleInfo;
          
          if (isScheduled) {
            feedbackMessages.push('Done for today — shows on your calendar');
          } else {
            feedbackMessages.push('Logged for today');
          }
          
          if (skillPracticeInfo) {
            feedbackMessages.push(`Practice recorded for ${skillPracticeInfo.skillName}`);
          } else if (summary && !isScheduled) {
            const recentCount = summary.completionRate7d > 0 ? Math.round(summary.completionRate7d / 14.3) : 0;
            if (recentCount >= 3) {
              feedbackMessages.push(`You've done this ${recentCount} times recently`);
            }
          }
          if (goalContexts.length > 0 && !isScheduled) {
            feedbackMessages.push(`This supports your ${goalContexts[0].activity.title} goal`);
          }
          
          if (feedbackMessages.length > 0) {
            setCompletionFeedback(feedbackMessages[0]);
            setTimeout(() => setCompletionFeedback(null), 3000);
          }
          
          if (skillPracticeInfo) {
            setShowPracticeRecorded(true);
            setTimeout(() => setShowPracticeRecorded(false), 3000);
          }
        }
        
        // Reload summary after check-in to get updated streak
        await loadSummary();
        onUpdate();
      } catch (err) {
        console.error('[HabitSurface] Error checking in:', err);
      }
    }
  };

  // Premium surface styling - soft gradient, accent edge, subtle glow
  const theme = colorTheme || { 
    gradient: 'from-gray-50 to-white', 
    accentBorder: 'border-l-gray-300',
    buttonBg: 'bg-gray-900',
    buttonHover: 'hover:bg-gray-800',
    glow: 'shadow-gray-100'
  };
  
  const surfaceClass = `
    relative
    bg-gradient-to-br ${theme.gradient}
    ${theme.accentBorder}
    border-l-4
    rounded-2xl
    ${isMobile ? 'p-4' : isCompact ? 'p-5' : 'p-6'}
    transition-all duration-200
    hover:shadow-md
    ${theme.glow}
    ${habit.status === 'inactive' ? 'opacity-60' : ''}
  `;

  // Phase 1: Swipe gestures for mobile
  const { ref: swipeRef } = useSwipeGesture({
    onSwipeRight: () => {
      // Swipe right = Quick check-in (done)
      if (canEdit && !showSuccessAnimation) {
        handleCheckIn('done');
      }
    },
    onSwipeLeft: () => {
      // Swipe left = Show schedule/edit options
      if (canEdit && !showScheduleSheet) {
        setShowScheduleSheet(true);
      }
    },
    threshold: 50,
    enabled: canEdit,
    preventDefault: true,
    axisLock: true,
  });

  // Determine ownership type
  const ownerType = (habit as any).owner_type || 'user';
  const isPersonal = ownerType === 'user';
  const isHousehold = ownerType === 'household';
  const isTeam = ownerType === 'team';
  
  // Get collaboration mode (for household/team habits)
  const collaborationMode: CollaborationMode = !isPersonal ? getCollaborationMode(habit) : 'collaborative';
  
  // Check if user is an observer (can't check in) - only after participation is loaded
  const isObserver = isParticipating && userParticipation?.role === 'observer';

  // Show collapsed preview if not participating in household/team habit
  if ((isHousehold || isTeam) && isParticipating === false) {
    return (
      <div className={`
        relative
        bg-gradient-to-br from-gray-50 to-white
        border-l-4 border-l-gray-300
        rounded-2xl
        ${isMobile ? 'p-4' : isCompact ? 'p-5' : 'p-6'}
        transition-all duration-200
        hover:shadow-md
      `}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Ownership Indicator */}
            <div className="flex-shrink-0" title={isHousehold ? 'Household habit' : 'Team habit'}>
              {isHousehold ? (
                <Home size={16} className="text-amber-600" />
              ) : (
                <Users size={16} className="text-blue-600" />
              )}
            </div>
            
            <h3 className={`
              ${isMobile ? 'text-base' : isCompact ? 'text-lg' : 'text-xl'} 
              font-medium text-gray-900 leading-tight truncate
            `}>
              {habit.title}
            </h3>
          </div>
          
          <button
            onClick={handleJoin}
            disabled={joining}
            className={`
              flex-shrink-0
              ${isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'}
              rounded-lg
              font-medium
              bg-indigo-600 text-white
              hover:bg-indigo-700
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
              flex items-center gap-1.5
              active:scale-[0.98]
            `}
          >
            {joining ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Joining...</span>
              </>
            ) : (
              <>
                <UserPlus size={isMobile ? 12 : 14} />
                <span>Join</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={swipeRef} className={surfaceClass}>
      {/* Habit Title - Intention, not task */}
      <div className={isMobile ? 'mb-3' : 'mb-6'}>
        <div className={`flex items-start justify-between gap-2 sm:gap-3 ${isMobile ? 'mb-1.5' : 'mb-2'}`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Ownership Indicator */}
            {!isPersonal && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div title={isHousehold ? 'Household habit' : 'Team habit'}>
                  {isHousehold ? (
                    <Home size={isMobile ? 14 : 16} className="text-amber-600" />
                  ) : (
                    <Users size={isMobile ? 14 : 16} className="text-blue-600" />
                  )}
                </div>
                {/* Collaboration Mode Indicator */}
                {collaborationMode === 'collaborative' && (
                  <div title="Collaborative">
                    <Handshake size={isMobile ? 12 : 14} className="text-indigo-500" />
                  </div>
                )}
                {collaborationMode === 'visible' && (
                  <div title="Visible">
                    <Eye size={isMobile ? 12 : 14} className="text-purple-500" />
                  </div>
                )}
                {collaborationMode === 'competitive' && (
                  <div title="Competitive">
                    <Trophy size={isMobile ? 12 : 14} className="text-amber-500" />
                  </div>
                )}
              </div>
            )}
            
            <h3 className={`
              ${isMobile ? 'text-base' : isCompact ? 'text-lg' : 'text-xl'} 
              font-medium text-gray-900 leading-tight flex-1
            `}>
              {habit.title}
            </h3>
          </div>
        </div>
        {/* Schedule Indicator (Under Title) - Tap to edit */}
        {scheduleInfo && (
          <button
            onClick={() => setShowScheduleSheet(true)}
            className={`
              flex items-center gap-1.5 
              ${isMobile ? 'text-[10px] mb-1.5' : 'text-xs mb-2'} 
              text-gray-500 hover:text-gray-700 
              transition-colors
              group
            `}
          >
            <Clock size={isMobile ? 10 : 12} className="text-gray-400 group-hover:text-gray-600" />
            <span className="italic">
              {formatScheduleDisplay(scheduleInfo)}
            </span>
          </button>
        )}
        
        {/* Day-specific schedule info (if viewing specific date) */}
        {dayContext?.isScheduled && !scheduleInfo && (
          <div className={`flex items-center gap-1.5 ${isMobile ? 'text-[10px] mb-1.5' : 'text-xs mb-2'} text-gray-500`}>
            <Clock size={isMobile ? 10 : 12} />
            <span>
              {dayContext?.scheduleDisplay || 'Scheduled today'}
            </span>
          </div>
        )}
        
        {/* Time-of-Day Annotation (informational only) */}
        {dayContext && dayContext.isScheduled && (
          (() => {
            const annotation = getTimeOfDayAnnotation(dayContext.timeOfDay, dayContext.exactTime);
            return annotation ? (
              <div className={`${isMobile ? 'text-[10px] mb-1.5' : 'text-xs mb-2'} text-gray-400 italic`}>
                {annotation}
              </div>
            ) : null;
          })()
        )}
        {habit.status === 'inactive' && (
          <span className={`inline-block mt-1 ${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-400`}>
            Paused
          </span>
        )}
      </div>

      {/* Observer Notice - For observers who can't check in */}
      {isObserver && habit.status === 'active' && (
        <div className={`${isMobile ? 'mb-3 px-3 py-2' : 'mb-4 px-4 py-3'} bg-purple-50 border border-purple-200 rounded-lg`}>
          <div className="flex items-center gap-2">
            <Eye size={isMobile ? 14 : 16} className="text-purple-600 flex-shrink-0" />
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-purple-700`}>
              You're observing this habit
            </p>
          </div>
        </div>
      )}

      {/* Primary Action Zone - One dominant action only */}
      {canEdit && habit.status === 'active' && !isObserver && (
        <div className={isMobile ? 'mb-3 relative' : 'mb-6 relative'}>
          {/* Success Animation Overlay */}
          {showSuccessAnimation && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-white/80 rounded-xl blur-xl animate-ping" />
                <div className={`relative bg-white/90 rounded-xl ${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'} flex items-center gap-2 shadow-lg`}>
                  <Sparkles size={isMobile ? 14 : 18} className="text-amber-500 animate-pulse" />
                  <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-900`}>Done!</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Primary Action - Done (The Star) */}
          <button
            onClick={() => handleCheckIn('done')}
            className={`
              w-full 
              ${isMobile ? 'min-h-[44px]' : 'min-h-[52px]'}
              ${theme.buttonBg} 
              text-white 
              rounded-xl 
              font-medium 
              ${isMobile ? 'text-sm' : 'text-base'}
              flex 
              items-center 
              justify-center 
              gap-2 
              transition-all 
              duration-200
              ${theme.buttonHover}
              active:scale-[0.98] 
              disabled:opacity-50 
              disabled:cursor-not-allowed
              relative
              overflow-hidden
              ${showSuccessAnimation ? 'ring-2 ring-offset-2 ring-amber-400' : ''}
            `}
            disabled={!canEdit}
          >
            {showSuccessAnimation ? (
              <>
                <Sparkles size={isMobile ? 16 : 20} className="animate-pulse" />
                <span>Done!</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={isMobile ? 16 : 20} />
                <span>Done</span>
              </>
            )}
          </button>

          {/* Secondary Actions - Visually de-emphasized, grouped */}
          <div className={`flex items-center gap-2 ${isMobile ? 'mt-2' : 'mt-3'}`}>
            <button
              onClick={() => handleCheckIn('missed')}
              className={`
                flex-1 
                ${isMobile ? 'h-9' : 'h-10'} 
                ${isMobile ? 'text-xs' : 'text-sm'} 
                text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors 
                flex items-center justify-center gap-1.5 disabled:opacity-50
              `}
              disabled={!canEdit}
            >
              <XCircle size={isMobile ? 14 : 16} />
              <span>Missed</span>
            </button>
            <button
              onClick={() => handleCheckIn('skipped')}
              className={`
                flex-1 
                ${isMobile ? 'h-9' : 'h-10'} 
                ${isMobile ? 'text-xs' : 'text-sm'} 
                text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors 
                flex items-center justify-center gap-1.5 disabled:opacity-50
              `}
              disabled={!canEdit}
            >
              <Minus size={isMobile ? 14 : 16} />
              <span>Skip</span>
            </button>
          </div>
        </div>
      )}

      {/* Participant Avatars & Aggregate Progress - For household/team habits */}
      {!isPersonal && isParticipating && aggregateProgress && aggregateProgress.totalParticipants > 0 && (
        <div className={`${isMobile ? 'mb-3' : 'mb-4'} flex items-center justify-between gap-3`}>
          {/* Participant Avatars */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {participantProfiles.slice(0, 5).map((profile, index) => (
                <div
                  key={profile.id}
                  className="relative"
                  style={{ zIndex: 10 - index }}
                >
                  <Avatar
                    userId={profile.id}
                    name={profile.name}
                    size="xs"
                    className="border-2 border-white"
                  />
                </div>
              ))}
              {participantProfiles.length > 5 && (
                <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                  +{participantProfiles.length - 5}
                </div>
              )}
            </div>
          </div>
          
          {/* Aggregate Progress - Different display based on collaboration mode */}
          {aggregateProgress.totalParticipants > 1 && (
            <div className="text-xs text-gray-600">
              {collaborationMode === 'collaborative' && (
                <span>{aggregateProgress.completedToday} of {aggregateProgress.totalParticipants} completed today</span>
              )}
              {collaborationMode === 'visible' && (
                <span>{aggregateProgress.completedToday} completed today</span>
              )}
              {collaborationMode === 'competitive' && (
                <span>
                  {(() => {
                    const userProgress = aggregateProgress.participantProgress.find((p: ParticipantProgress) => p.userId === userId);
                    const completedCount = userProgress?.completedCount || 0;
                    const maxCompleted = Math.max(...aggregateProgress.participantProgress.map((p: ParticipantProgress) => p.completedCount), 0);
                    const aheadCount = maxCompleted - completedCount;
                    
                    if (completedCount === maxCompleted && maxCompleted > 0) {
                      const tiedCount = aggregateProgress.participantProgress.filter((p: ParticipantProgress) => p.completedCount === maxCompleted).length;
                      return tiedCount > 1 ? `Tied for 1st (${completedCount})` : `Leading (${completedCount})`;
                    } else if (aheadCount > 0) {
                      return `${aheadCount} behind (${completedCount})`;
                    } else {
                      return `${completedCount} completions`;
                    }
                  })()}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 7-Day Visual Completion Strip - Always visible for active habits */}
      {habit.status === 'active' && (
        <div className={isMobile ? 'mb-3' : 'mb-4'}>
          <HabitWeekStrip
            key={weekStripKey}
            habitId={habit.id}
            userId={userId}
            colorTheme={colorTheme || undefined}
            isMobile={isMobile}
          />
        </div>
      )}

      {/* Paused State - Quiet */}
      {habit.status === 'inactive' && (
        <div className={isMobile ? 'mb-3 py-2 text-center' : 'mb-6 py-3 text-center'}>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-400`}>Paused</p>
          {permissions.can_manage && (
            <button
              onClick={async () => {
                const { updateHabitActivity } = await import('../../../lib/habits/habitsService');
                await updateHabitActivity(habit.id, { status: 'active' });
                onUpdate();
              }}
              className={`mt-2 ${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 hover:text-gray-700 underline`}
            >
              Resume
            </button>
          )}
        </div>
      )}

      {/* Completion Feedback - Micro-feedback after completion */}
      {completionFeedback && (
        <div className={`${isMobile ? 'mb-3 px-2.5 py-1.5 text-[10px]' : 'mb-4 px-3 py-2 text-xs'} text-gray-600 bg-white/60 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200`}>
          {completionFeedback}
        </div>
      )}

        {/* Scheduling Hint (if unscheduled and no schedule info) */}
        {!scheduleInfo && !dayContext?.isScheduled && permissions.can_edit && (
          <div className={`${isMobile ? 'mb-3 px-2.5 py-2' : 'mb-4 px-3 py-2'} bg-amber-50/50 border border-amber-100 rounded-lg`}>
            <div className="flex items-start gap-2">
              <Clock size={isMobile ? 12 : 14} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600 leading-relaxed`}>
                  You could add this to your calendar
                </p>
                <button
                  onClick={() => setShowScheduleSheet(true)}
                  className={`${isMobile ? 'text-[10px] mt-0.5' : 'text-xs mt-1'} text-amber-600 hover:text-amber-700 underline`}
                >
                  Schedule habit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Skill Practice Indicator - Whisper text, only if exists */}
        {skillPracticeInfo && !showPracticeRecorded && !completionFeedback && (
          <div className={`${isMobile ? 'mb-3 text-[10px]' : 'mb-5 text-xs'} text-gray-400`}>
            Contributes to <span className="font-medium text-gray-500">{skillPracticeInfo.skillName}</span>
          </div>
        )}

      {/* Practice Recorded Feedback - Gentle, temporary */}
      {showPracticeRecorded && skillPracticeInfo && !completionFeedback && (
        <div className={`${isMobile ? 'mb-3 text-[10px]' : 'mb-5 text-xs'} text-gray-500 animate-in fade-in duration-200`}>
          Practice recorded
        </div>
      )}

      {/* Reflection / Context - Collapsed by Default (ADHD-first) */}
      {(summary || goalContexts.length > 0 || skillContexts.length > 0 || microFeedback || whyThisMatters) && (
        <div className={`${isMobile ? 'pt-3' : 'pt-4'} border-t border-gray-100`}>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`w-full flex items-center justify-between ${isMobile ? 'text-[10px] py-1.5' : 'text-xs py-2'} text-gray-400 hover:text-gray-600 transition-colors`}
          >
            <span>{showDetails ? 'Hide' : 'Show'} details</span>
            {showDetails ? <ChevronUp size={isMobile ? 12 : 13} /> : <ChevronDown size={isMobile ? 12 : 13} />}
          </button>

          {showDetails && (
            <div className={`${isMobile ? 'mt-3 space-y-3' : 'mt-4 space-y-4'} animate-in fade-in duration-200`}>
              {/* Summary Stats - Supportive, not evaluative (no badges, no flames) */}
              {summary && showDetailsMode && (
                <div className={`flex items-center gap-2 sm:gap-3 ${isMobile ? 'text-xs' : 'text-sm'} text-gray-500`}>
                  <span>{summary.currentStreak} day{summary.currentStreak !== 1 ? 's' : ''}</span>
                  {summary.completionRate7d !== undefined && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span>{Math.round(summary.completionRate7d)}% this week</span>
                    </>
                  )}
                </div>
              )}

              {/* Tracking Mode - For household/team habits */}
              {!isPersonal && userParticipation && (
                <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500`}>
                  <span className="text-gray-400">Tracking mode: </span>
                  <span>
                    {userParticipation.participation_mode === 'individual' 
                      ? 'Tracked individually' 
                      : 'Tracked collectively'}
                  </span>
                </div>
              )}

              {/* Context - Nested, collapsed by default */}
              {(goalContexts.length > 0 || skillContexts.length > 0 || microFeedback || whyThisMatters) && (
                <div>
                  <button
                    onClick={() => setShowContextDetails(!showContextDetails)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2"
                  >
                    {showContextDetails ? 'Hide' : 'Show'} context
                  </button>
                  
                  {showContextDetails && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <HabitContextSection
                        goals={goalContexts}
                        skills={skillContexts}
                        microFeedback={microFeedback}
                        compact={isCompact}
                      />
                      <WhyThisMattersSection
                        context={whyThisMatters}
                        compact={isCompact}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Management Actions - Subtle, Top Right */}
      <div className="absolute top-4 right-4 flex items-center gap-1">
        {/* People Icon - Always visible for all habits */}
        <button
          onClick={() => setShowParticipantManagement(true)}
          className="text-gray-400 hover:text-indigo-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
          title={!isPersonal ? "Manage participants" : "Add people to this habit"}
        >
          <UsersIcon size={16} />
        </button>
        
        {/* Settings Menu - Only if user can manage */}
        {permissions.can_manage && (
          <div ref={settingsMenuRef}>
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
              title="Habit options"
            >
              <MoreVertical size={16} />
            </button>
            
            {/* Settings Dropdown Menu */}
            {showSettingsMenu && (
              <>
                {/* Backdrop to close on outside click */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSettingsMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[160px]">
                  <button
                    onClick={() => {
                      setShowEditModal(true);
                      setShowSettingsMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <Edit size={16} className="text-gray-400" />
                    <span>Edit habit</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowArchiveConfirm(true);
                      setShowSettingsMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <Archive size={16} className="text-gray-400" />
                    <span>Archive habit</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Archive Confirmation Dialog */}
      {showArchiveConfirm && (
        <ConfirmDialog
          isOpen={showArchiveConfirm}
          onClose={() => setShowArchiveConfirm(false)}
          onConfirm={async () => {
            try {
              const { archiveHabit } = await import('../../../lib/habits/habitsService');
              await archiveHabit(userId, habit.id);
              onUpdate();
              setShowArchiveConfirm(false);
            } catch (err) {
              console.error('[HabitSurface] Error archiving habit:', err);
              alert('Failed to archive habit');
            }
          }}
          title="Archive Habit"
          message={`Are you sure you want to archive "${habit.title}"? This will hide it from your active habits list. You can restore it later if needed.`}
          confirmText="Archive"
          cancelText="Cancel"
          variant="warning"
        />
      )}

      {/* Schedule Sheet */}
      {showScheduleSheet && (
        <HabitScheduleSheet
          isOpen={showScheduleSheet}
          onClose={() => setShowScheduleSheet(false)}
          habit={habit}
          userId={userId}
          isMobile={isMobile}
          onScheduleUpdated={() => {
            loadScheduleInfo();
            onUpdate();
            setWeekStripKey(prev => prev + 1); // Refresh week strip
          }}
        />
      )}

      {/* Edit Habit Modal */}
      {showEditModal && (
        <HabitEditModal
          habit={habit}
          userId={userId}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onUpdated={() => {
            onUpdate();
            setShowEditModal(false);
          }}
          isMobile={isMobile}
        />
      )}

      {/* Participant Management Sheet */}
      {showParticipantManagement && (
        <HabitParticipantManagementSheet
          isOpen={showParticipantManagement}
          onClose={() => setShowParticipantManagement(false)}
          habit={habit}
          userId={userId}
          onUpdate={onUpdate}
        />
      )}

      {/* Phase 1: Milestone Celebration (7, 30 days) */}
      {showMilestoneCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="relative animate-in fade-in zoom-in duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 rounded-full opacity-20 blur-3xl animate-pulse" />
            <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-2xl border-2 border-amber-200">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full mb-4 animate-pulse">
                  <Sparkles size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {showMilestoneCelebration} Days!
                </h3>
                <p className="text-sm text-gray-600">
                  {showMilestoneCelebration === 7 ? 'A week of consistency!' : 'A month of dedication!'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
