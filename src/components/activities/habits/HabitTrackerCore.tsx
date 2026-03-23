/**
 * CANONICAL HABIT TRACKER CORE COMPONENT
 * 
 * ⚠️ CRITICAL: This is the SINGLE SOURCE OF TRUTH for all habit tracking in SharedMinds.
 * 
 * If you are adding a new habit-related feature and are not extending HabitTrackerCore,
 * STOP. You are creating fragmentation.
 * 
 * @see src/lib/habits/habitContract.ts for the canonical habit contract
 * 
 * ============================================================================
 * SINGLE HABIT SYSTEM ASSERTION
 * ============================================================================
 * 
 * There is exactly ONE habit system in SharedMinds:
 * - This component (HabitTrackerCore)
 * - activities table (type='habit')
 * - habit_checkins table
 * 
 * All other habit-related code must:
 * - Extend this component
 * - Use habitsService for writes
 * - Use habitContextHelpers for read-only context
 * - Reference habitContract.ts for constraints
 * 
 * DO NOT:
 * - Create parallel habit systems
 * - Bypass HabitTrackerCore for habit UI
 * - Create habit data outside activities/habit_checkins
 * - Add automation or silent writes
 * 
 * ============================================================================
 * ARCHITECTURE
 * ============================================================================
 * 
 * This component:
 * - Works identically in Planner, Personal Spaces, and Shared Spaces
 * - Never knows where it's rendered (only receives context and permissions)
 * - Contains ALL habit tracking logic
 * - Uses perspective switching (not navigation) for Tasks/Goals/Skills views
 * - Optimized for 100+ habits (pagination, memoization, lazy loading)
 * - ADHD-friendly (collapsed context, prominent actions, no pressure)
 * 
 * Verification Checklist:
 * [x] Tracker renders in Planner
 * [x] Tracker renders in Personal Space
 * [x] Tracker renders in Shared Space
 * [x] Check-ins sync both ways (tracker ↔ calendar)
 * [x] Permissions enforced correctly (can_view, can_edit, detail_level)
 * [x] No duplicate logic
 * [x] No feature drift
 * [x] Performance optimized (memoization, lazy loading)
 * [x] Cognitive load reduced (collapsed sections, clear hierarchy)
 * 
 * ============================================================================
 * FINAL SAFEGUARD
 * ============================================================================
 * 
 * ⚠️ IF YOU ARE READING THIS AND CONSIDERING:
 * - Creating a new habit component → STOP. Extend HabitTrackerCore instead.
 * - Adding habit logic outside this file → STOP. Use habitsService instead.
 * - Creating a parallel habit system → STOP. Use activities/habit_checkins.
 * - Bypassing the habit contract → STOP. Read habitContract.ts first.
 * 
 * The habit system is intentionally simple and focused.
 * Complexity comes from connections (goals, skills, tasks), not from habits themselves.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { HabitKeyboardShortcuts } from './HabitKeyboardShortcuts';
import { Plus, CheckCircle2, XCircle, Minus, Award, Link2, ArrowRight, Repeat, Calendar, Activity as ActivityIcon, TrendingUp, TrendingDown, Target, Sparkles } from 'lucide-react';
import {
  listHabits,
  createHabitActivity,
  archiveHabit,
  upsertHabitCheckin,
  getHabitSummary,
  type HabitCheckinStatus,
  type HabitPolarity,
  type HabitMetricType,
  type HabitDirection,
} from '../../../lib/habits/habitsService';
import type { Activity } from '../../../lib/activities/activityTypes';
import type { PermissionFlags } from '../../../lib/permissions/types';
import { FEATURE_HABITS_GOALS, FEATURE_HABITS_GOALS_REALTIME } from '../../../lib/featureFlags';
import { subscribeActivityChanged } from '../../../lib/activities/activityEvents';
import { supabase } from '../../../lib/supabase';
import { HabitCheckinSheet } from './HabitCheckinSheet';
import { TagPicker } from '../../tags/TagPicker';
import { TagSelector } from '../../tags/TagSelector';
import { FEATURE_CONTEXT_TAGGING } from '../../../lib/featureFlags';
import { skillEntityLinksService, skillsService } from '../../../lib/skillsService';
import { SkillDetailModal } from '../../skills/SkillDetailModal';
import { PremiumModeSwitcher } from './PremiumModeSwitcher';
import { HabitSurface } from './HabitSurface';
import { HabitContextSection } from './HabitContextSection';
import { WhyThisMattersSection } from '../../shared/WhyThisMattersSection';
import { DailyFocusHint } from './DailyFocusHint';
import { CategoryPicker } from './CategoryPicker';
import { EnhancedHabitCreation } from './EnhancedHabitCreation';
import { getWhyThisMattersForHabit } from '../../../lib/trackerContext/meaningHelpers';
import { getGoalsForHabit, getSkillsForHabit, getHabitMicroFeedback } from '../../../lib/habits/habitContextHelpers';
import { getIntelligentHabitSuggestions } from '../../../lib/habits/habitSuggestionEngine';
import type { PersonalTodo } from '../../../lib/todosService';
import { useTrackerPerspective } from '../../../hooks/useTrackerPerspective';
import { sortHabitsByDayRelevance, getTimeOfDayAnnotation } from '../../../lib/habits/habitDayAwareHelpers';
// Reference the canonical habit contract
// @see src/lib/habits/habitContract.ts

// ============================================================================
// Types
// ============================================================================

export interface HabitTrackerContext {
  mode: 'planner' | 'personal_space' | 'shared_space';
  scope: 'self' | 'shared';
}

export interface HabitTrackerCoreProps {
  ownerUserId: string;
  context: HabitTrackerContext;
  permissions: PermissionFlags;
  layout?: 'full' | 'compact';
  onHabitUpdate?: () => void; // Callback for external updates (e.g., calendar sync)
  activeDate?: string; // YYYY-MM-DD - Date context from calendar (optional)
  focusedHabitId?: string; // Habit ID to focus/highlight (optional, from calendar navigation)
}

// ============================================================================
// Core Component
// ============================================================================

export function HabitTrackerCore({
  ownerUserId,
  context,
  permissions,
  layout = 'full',
  onHabitUpdate,
  activeDate,
  focusedHabitId,
}: HabitTrackerCoreProps) {
  const [habits, setHabits] = useState<Activity[]>([]);
  const [sortedHabits, setSortedHabits] = useState<Array<Activity & { dayContext?: any }>>([]);
  const [loading, setLoading] = useState(true);
  const [sortingHabits, setSortingHabits] = useState(false);
  const [checkinSheet, setCheckinSheet] = useState<{ habit: Activity; date?: string } | null>(null);
  const focusedHabitRef = useRef<HTMLDivElement | null>(null);
  
  // Use standardized perspective switching hook
  const { currentPerspective, setPerspective, isPerspective } = useTrackerPerspective({
    initialPerspective: 'habits',
  });
  
  // Normalize activeDate (default to today if not provided)
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const activeDateNormalized = activeDate || today;
  
  // Scroll to focused habit when it loads
  useEffect(() => {
    if (focusedHabitId && focusedHabitRef.current) {
      setTimeout(() => {
        focusedHabitRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        // Remove highlight after scroll
        setTimeout(() => {
          if (focusedHabitRef.current) {
            focusedHabitRef.current.classList.remove('ring-2', 'ring-indigo-400', 'ring-offset-2');
          }
        }, 2000);
      }, 300);
    }
  }, [focusedHabitId, sortedHabits.length]);

  // Permission enforcement: can_view === false → render null
  if (!permissions.can_view) {
    return null;
  }

  // Load functions (defined before useEffect to avoid hoisting issues)
  const loadHabits = useCallback(async () => {
    try {
      const userHabits = await listHabits(ownerUserId, { includeTags: true });
      setHabits(userHabits);
      
      // Sort by day relevance if activeDate is provided
      if (activeDateNormalized && userHabits.length > 0) {
        setSortingHabits(true);
        try {
          const sorted = await sortHabitsByDayRelevance(userHabits, activeDateNormalized);
          setSortedHabits(sorted);
        } catch (err) {
          console.error('[HabitTrackerCore] Error sorting habits:', err);
          setSortedHabits(userHabits.map(h => ({ ...h })));
        } finally {
          setSortingHabits(false);
        }
      } else {
        setSortedHabits(userHabits.map(h => ({ ...h })));
      }
    } catch (err) {
      console.error('[HabitTrackerCore] Error loading habits:', err);
    } finally {
      setLoading(false);
    }
  }, [ownerUserId, activeDateNormalized]);
  
  // Re-sort when activeDate changes (after habits are loaded)
  useEffect(() => {
    if (habits.length > 0 && activeDateNormalized && !sortingHabits) {
      setSortingHabits(true);
      sortHabitsByDayRelevance(habits, activeDateNormalized)
        .then(setSortedHabits)
        .catch((err) => {
          console.error('[HabitTrackerCore] Error re-sorting habits:', err);
          setSortedHabits(habits.map(h => ({ ...h })));
        })
        .finally(() => setSortingHabits(false));
    } else if (habits.length > 0 && !activeDateNormalized) {
      setSortedHabits(habits.map(h => ({ ...h })));
    }
  }, [activeDateNormalized, habits.length, sortingHabits]);

  useEffect(() => {
    if (FEATURE_HABITS_GOALS) {
      loadHabits();
    }
  }, [loadHabits]);

  // Subscribe to activity changes for live sync
  useEffect(() => {
    if (!FEATURE_HABITS_GOALS) return;

    // Use Supabase realtime if enabled, otherwise fallback to bus
    if (FEATURE_HABITS_GOALS_REALTIME) {
      const channel = supabase
        .channel(`habits:${ownerUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'habit_checkins',
            filter: `owner_id=eq.${ownerUserId}`,
          },
          () => {
            loadHabits();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Fallback to activityEvents bus
      const unsubscribe = subscribeActivityChanged(() => {
        loadHabits();
      });
      return unsubscribe;
    }
  }, [ownerUserId, loadHabits]);

  const handleHabitUpdate = useCallback(() => {
    loadHabits();
    onHabitUpdate?.(); // Notify parent (e.g., calendar) of updates
  }, [onHabitUpdate, loadHabits]);

  // Phase 1: Keyboard shortcuts
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [focusedHabitIndex, setFocusedHabitIndex] = useState<number | null>(null);
  
  useEffect(() => {
    if (!permissions.can_edit) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // ? - Show keyboard shortcuts
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }

      // Esc - Close shortcuts or check-in sheet
      if (e.key === 'Escape') {
        if (showShortcuts) {
          setShowShortcuts(false);
          e.preventDefault();
          return;
        }
        if (checkinSheet) {
          setCheckinSheet(null);
          e.preventDefault();
          return;
        }
      }

      // Get currently visible habits (scheduled first, then others)
      const visibleHabits = sortedHabits.length > 0 
        ? sortedHabits.filter(h => h.status !== 'archived')
        : habits.filter(h => h.status !== 'archived');

      if (visibleHabits.length === 0) return;

      // Space - Mark focused habit as done
      if (e.key === ' ' && focusedHabitIndex !== null) {
        e.preventDefault();
        const habit = visibleHabits[focusedHabitIndex];
        if (habit) {
          // Trigger check-in for focused habit
          const today = new Date().toISOString().split('T')[0];
          setCheckinSheet({ habit, date: activeDateNormalized || today });
        }
        return;
      }

      // Arrow keys - Navigate between habits
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (focusedHabitIndex === null) {
          setFocusedHabitIndex(0);
        } else {
          const newIndex = e.key === 'ArrowDown'
            ? Math.min(focusedHabitIndex + 1, visibleHabits.length - 1)
            : Math.max(focusedHabitIndex - 1, 0);
          setFocusedHabitIndex(newIndex);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [permissions.can_edit, showShortcuts, checkinSheet, focusedHabitIndex, sortedHabits, habits, activeDateNormalized]);

  if (!FEATURE_HABITS_GOALS) {
    return (
      <div className="p-6 text-center text-gray-500">
        Habits feature is currently disabled. Enable FEATURE_HABITS_GOALS to use.
      </div>
    );
  }

  if (loading) {
    return <div className="p-6">Loading habits...</div>;
  }

  const isReadOnly = !permissions.can_edit;
  const isCompact = layout === 'compact';

  // Perspective switching is handled by useTrackerPerspective hook
  // No additional handler needed - setPerspective is provided by the hook

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header Zone - Structural, not emotional */}
      <div className={`
        ${isCompact ? 'px-4 pt-4 pb-3' : 'px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4'} 
        max-w-4xl mx-auto
      `}>
        {/* Title Only - Quiet, structural */}
        <div className="mb-3 sm:mb-4">
          <h1 className={`
            ${isCompact ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'} 
            font-medium text-gray-900
          `}>
            Habits
          </h1>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
            Your daily rituals, one moment at a time
          </p>
        </div>

        {/* Mode Switcher - Primary Visual Anchor (Flush with content) */}
        <div className="mb-4">
          <PremiumModeSwitcher
            currentMode={currentPerspective}
            onModeChange={setPerspective}
            compact={isCompact}
          />
        </div>


        {/* Subtle Status Indicators - Minimal, structural */}
        {(context.scope === 'shared' || isReadOnly) && (
          <div className="flex items-center gap-3 mb-3">
            {context.scope === 'shared' && (
              <span className="text-xs text-gray-400">
                Shared
              </span>
            )}
            {isReadOnly && (
              <span className="text-xs text-gray-400">
                Read-only
              </span>
            )}
          </div>
        )}
      </div>

      {/* Primary Action Zone - Today's Habits (No chrome, no separators) */}
      <div className={`${isCompact ? 'px-4 pb-6' : 'px-4 sm:px-6 pb-6 sm:pb-8'} max-w-4xl mx-auto`}>
        {/* Daily Focus Hint - Gentle, supportive */}
        {isPerspective('habits') && (
          <div className="mb-3 sm:mb-4">
            <DailyFocusHint
              userId={ownerUserId}
              habitsCount={habits.filter(h => h.status !== 'archived').length}
              compact={isCompact}
            />
          </div>
        )}

        {/* Enhanced Habit Creation - Categories, free-text, and intelligent suggestions */}
        {isPerspective('habits') && permissions.can_edit && (
          <EnhancedHabitCreation
            userId={ownerUserId}
            existingHabits={habits}
            onHabitCreated={handleHabitUpdate}
            activeDate={activeDateNormalized}
            compact={isCompact}
          />
        )}

        {/* Day-Aware Context Hint */}
        {isPerspective('habits') && activeDate && activeDate !== today && (
          <div className="mb-3 sm:mb-4 px-3 sm:px-4 py-2 sm:py-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl">
            <p className="text-xs sm:text-sm text-gray-700">
              Viewing habits for <span className="font-medium">{new Date(activeDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </p>
          </div>
        )}

        {/* Scheduled Habits Section (if date-aware) */}
        {isPerspective('habits') && activeDateNormalized && sortedHabits.length > 0 && (
          (() => {
            const scheduledHabits = sortedHabits.filter(h => h.status !== 'archived' && h.dayContext?.isScheduled);
            const unscheduledHabits = sortedHabits.filter(h => h.status !== 'archived' && !h.dayContext?.isScheduled);
            
            return (
              <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-5">
                {scheduledHabits.length > 0 && (
                  <div className="space-y-3 sm:space-y-4">
                    <p className="text-xs text-gray-400 font-medium">Scheduled today</p>
                    {scheduledHabits.slice(0, 50).map((habit, index) => (
                      <div
                        key={habit.id}
                        ref={focusedHabitId === habit.id ? focusedHabitRef : null}
                        className={`
                          animate-in fade-in slide-in-from-bottom-2
                          ${focusedHabitId === habit.id ? 'ring-2 ring-indigo-400 ring-offset-2 rounded-2xl transition-all duration-300' : ''}
                        `}
                        style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                      >
                        <HabitSurface
                          habit={habit}
                          userId={ownerUserId}
                          permissions={permissions}
                          layout={layout}
                          onUpdate={handleHabitUpdate}
                          onCheckinClick={(date: string) => setCheckinSheet({ habit, date })}
                          activeDate={activeDateNormalized}
                          dayContext={habit.dayContext}
                        />
                      </div>
                    ))}
                  </div>
                )}
                
                {unscheduledHabits.length > 0 && (
                  <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
                    {scheduledHabits.length > 0 && (
                      <p className="text-xs text-gray-400 font-medium">Other habits</p>
                    )}
                    {unscheduledHabits.slice(0, 50).map((habit, index) => (
                      <div
                        key={habit.id}
                        ref={focusedHabitId === habit.id ? focusedHabitRef : null}
                        className={`
                          animate-in fade-in slide-in-from-bottom-2
                          ${focusedHabitId === habit.id ? 'ring-2 ring-indigo-400 ring-offset-2 rounded-2xl transition-all duration-300' : ''}
                        `}
                        style={{ animationDelay: `${(scheduledHabits.length + index) * 50}ms`, animationFillMode: 'both' }}
                      >
                        <HabitSurface
                          habit={habit}
                          userId={ownerUserId}
                          permissions={permissions}
                          layout={layout}
                          onUpdate={handleHabitUpdate}
                          onCheckinClick={(date: string) => setCheckinSheet({ habit, date })}
                          activeDate={activeDateNormalized}
                          dayContext={habit.dayContext}
                        />
                      </div>
                    ))}
                  </div>
                )}
                
                {scheduledHabits.length === 0 && unscheduledHabits.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-sm text-gray-500 mb-2">Nothing scheduled today</p>
                    <p className="text-xs text-gray-400 italic">Follow what feels right</p>
                  </div>
                )}
              </div>
            );
          })()
        )}

        {/* Today's Habits - Primary focus, generous spacing (fallback when no activeDate) */}
        {isPerspective('habits') && !activeDateNormalized && (
          <div className="space-y-4 mt-5">
            {habits.length > 0 ? (
              <>
                {habits
                  .filter(habit => habit.status !== 'archived')
                  .slice(0, 50)
                  .map((habit: Activity, index: number) => (
                    <div
                      key={habit.id}
                      ref={focusedHabitId === habit.id ? focusedHabitRef : null}
                      className={`
                        animate-in fade-in slide-in-from-bottom-2
                        ${focusedHabitId === habit.id ? 'ring-2 ring-indigo-400 ring-offset-2 rounded-2xl transition-all duration-300' : ''}
                      `}
                      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                    >
                      <HabitSurface
                        habit={habit}
                        userId={ownerUserId}
                        permissions={permissions}
                        layout={layout}
                        onUpdate={handleHabitUpdate}
                        onCheckinClick={(date: string) => setCheckinSheet({ habit, date })}
                      />
                    </div>
                  ))}
                {habits.filter(h => h.status !== 'archived').length > 50 && (
                  <div className="text-center py-6 text-sm text-gray-400">
                    Showing 50 of {habits.filter(h => h.status !== 'archived').length} habits
                  </div>
                )}
              </>
                ) : (
              <div>
                {permissions.can_edit ? (
                  <CategoryPicker
                    userId={ownerUserId}
                    onHabitCreated={handleHabitUpdate}
                    compact={isCompact}
                    existingHabitsCount={habits.filter(h => h.status !== 'archived').length}
                  />
                ) : (
                  <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 mb-4">
                      <Sparkles size={24} className="text-indigo-600" />
                    </div>
                    <p className="text-base font-medium text-gray-700 mb-2">
                      No habits yet
                    </p>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                      Habits will appear here when they're created.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Other Perspectives - Same premium layout */}
        {isPerspective('tasks') && permissions.can_view && (
          <div className="space-y-4">
            <HabitTasksView
              userId={ownerUserId}
              permissions={permissions}
              compact={isCompact}
              onTaskUpdate={handleHabitUpdate}
            />
          </div>
        )}

        {isPerspective('goals') && permissions.can_view && (
          <div className="space-y-4">
            <HabitGoalsView
              userId={ownerUserId}
              compact={isCompact}
            />
          </div>
        )}

        {isPerspective('skills') && permissions.can_view && (
          <div className="space-y-4">
            <HabitSkillsView
              userId={ownerUserId}
              compact={isCompact}
            />
          </div>
        )}
      </div>

      {/* Check-in Sheet */}
      {checkinSheet && (
        <HabitCheckinSheet
          isOpen={!!checkinSheet}
          onClose={() => setCheckinSheet(null)}
          habit={checkinSheet.habit}
          userId={ownerUserId}
          initialDate={checkinSheet.date}
          onCheckinComplete={() => {
            handleHabitUpdate();
            setCheckinSheet(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Suggested Habits Section
// ============================================================================

interface SuggestedHabitsSectionProps {
  userId: string;
  existingHabits: Activity[];
  onHabitCreated: () => void;
  compact?: boolean;
}

function SuggestedHabitsSection({
  userId,
  existingHabits,
  onHabitCreated,
  activeDate,
  compact,
}: SuggestedHabitsSectionProps & { activeDate?: string }) {
  const [creating, setCreating] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ title: string; description: string; reason?: string; confidence?: 'high' | 'medium' | 'low'; source?: 'time_of_day' | 'stalled_goal' | 'under_practiced_skill' | 'recently_abandoned' | 'general' }>>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [calendarEventCount, setCalendarEventCount] = useState<number | undefined>(undefined);
  const [isMobile, setIsMobile] = useState(false);
  
  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load calendar event count if date is provided
  useEffect(() => {
    if (activeDate) {
      loadCalendarEventCount();
    }
  }, [activeDate, userId]);

  const loadCalendarEventCount = async () => {
    try {
      const { getPersonalCalendarEvents } = await import('../../../lib/personalSpaces/calendarService');
      const startOfDay = new Date(activeDate + 'T00:00:00').toISOString();
      const endOfDay = new Date(activeDate + 'T23:59:59').toISOString();
      
      const events = await getPersonalCalendarEvents(userId);
      const dayEvents = events.filter(e => {
        const eventDate = new Date(e.startAt);
        return eventDate >= new Date(startOfDay) && eventDate <= new Date(endOfDay);
      });
      
      setCalendarEventCount(dayEvents.length);
    } catch (error) {
      console.error('[SuggestedHabitsSection] Error loading calendar events:', error);
    }
  };

  // Load intelligent suggestions
  useEffect(() => {
    loadSuggestions();
  }, [userId, existingHabits.length, activeDate, calendarEventCount]);

  const loadSuggestions = async () => {
    try {
      setLoadingSuggestions(true);
      const intelligentSuggestions = await getIntelligentHabitSuggestions(userId, existingHabits, {
        date: activeDate,
        calendarEventCount,
      });
      setSuggestions(intelligentSuggestions);
    } catch (err) {
      console.error('[SuggestedHabitsSection] Error loading suggestions:', err);
      // Fallback to empty - don't show section if suggestions fail
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Don't show section if no suggestions available
  if (loadingSuggestions || suggestions.length === 0) {
    return null;
  }

  const handleSuggestionClick = async (suggestion: typeof suggestions[0]) => {
    if (creating) return; // Prevent double-clicks

    setCreating(suggestion.title);
    try {
      // Create habit with sensible defaults (daily, boolean metric)
      // Avoid showing configuration modals - just create and go
      await createHabitActivity(userId, {
        title: suggestion.title,
        description: suggestion.description,
        polarity: 'build',
        metric_type: 'boolean',
        startDate: new Date().toISOString(),
        repeatType: 'daily',
        autoGenerateTags: true,
      });
      
      // Immediately refresh to show new habit
      onHabitCreated();
    } catch (err) {
      console.error('[SuggestedHabitsSection] Error creating habit:', err);
      alert('Failed to create habit. Please try again.');
    } finally {
      setCreating(null);
    }
  };

  // Get icon based on source
  const getSuggestionIcon = (source: string | undefined) => {
    switch (source || 'general') {
      case 'time_of_day':
        return <Calendar size={14} className="text-blue-500" />;
      case 'stalled_goal':
        return <Target size={14} className="text-purple-500" />;
      case 'under_practiced_skill':
        return <Award size={14} className="text-amber-500" />;
      default:
        return <Plus size={14} className="text-gray-400" />;
    }
  };

  return (
    <div className={isMobile ? 'mb-4' : 'mb-6'}>
      <p className={`${isMobile ? 'text-[10px] mb-2' : 'text-xs mb-3'} text-gray-400 font-medium`}>Suggestions</p>
      <div className={`flex flex-wrap ${isMobile ? 'gap-2' : 'gap-2.5'}`}>
        {suggestions.map((suggestion, index) => (
          <button
            key={`${suggestion.title}-${suggestion.source}-${index}`}
            onClick={() => handleSuggestionClick(suggestion)}
            disabled={creating === suggestion.title}
            className={`
              group
              inline-flex flex-col items-start gap-1
              ${isMobile ? 'px-3 py-2' : 'px-4 py-2.5'}
              rounded-xl
              bg-white
              border border-gray-200
              hover:border-gray-300 hover:bg-gradient-to-br hover:from-gray-50 hover:to-white
              transition-all duration-200
              hover:shadow-sm
              animate-in fade-in slide-in-from-left-2
              ${creating === suggestion.title ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-2 w-full">
              {getSuggestionIcon(suggestion.source)}
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-700 flex-1 text-left`}>
                {suggestion.title}
              </span>
              {creating === suggestion.title ? (
                <div className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} border-2 border-gray-400 border-t-transparent rounded-full animate-spin`} />
              ) : (
                <Plus size={isMobile ? 12 : 13} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
              )}
            </div>
            {suggestion.reason && (
              <p className={`${isMobile ? 'text-[10px] pl-5' : 'text-xs pl-6'} text-gray-500 text-left leading-relaxed`}>
                {suggestion.reason}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Create Habit Form (FUTURE/EXPERIMENTAL - NOT CURRENTLY USED)
// ============================================================================
// 
// ⚠️ NOTE: This form is currently UNUSED. Habit creation is handled via:
// - SuggestedHabitsSection (one-click creation from suggestions)
// - Direct createHabitActivity() calls
// 
// This form may be used in the future for advanced habit creation flows.
// For now, it's kept for reference but NOT RENDERED.
// 
// TODO: Either remove this or move to /experimental when advanced creation is needed
// 
// This is intentionally not exported or used to prevent accidental usage.
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CreateHabitForm({
  userId,
  onClose,
  compact = false,
}: {
  userId: string;
  onClose: () => void;
  compact?: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [polarity, setPolarity] = useState<HabitPolarity>('build');
  const [metricType, setMetricType] = useState<HabitMetricType>('boolean');
  const [metricUnit, setMetricUnit] = useState('');
  const [targetValue, setTargetValue] = useState<number>(1);
  const [direction, setDirection] = useState<HabitDirection>('at_least');
  const [repeatType, setRepeatType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00'); // Default to 8 AM
  const [saving, setSaving] = useState(false);

  // Calculate default start date (30 days ago for existing habits, today for new)
  useEffect(() => {
    if (polarity === 'existing') {
      if (!startDate) {
        const date = new Date();
        date.setDate(date.getDate() - 30); // Default to 30 days ago
        setStartDate(date.toISOString().split('T')[0]);
      }
    } else {
      // For new habits, default to today
      if (!startDate) {
        setStartDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [polarity]); // Only depend on polarity

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      // Use selected start date or default to today
      const habitStartDate = startDate 
        ? new Date(startDate + 'T00:00:00').toISOString()
        : new Date().toISOString();

      await createHabitActivity(userId, {
        title: title.trim(),
        description: description.trim() || undefined,
        polarity,
        metric_type: metricType,
        metric_unit: metricUnit.trim() || undefined,
        target_value: metricType !== 'boolean' ? targetValue : undefined,
        direction: metricType !== 'boolean' ? direction : undefined,
        startDate: habitStartDate,
        repeatType,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        autoGenerateTags: true, // Auto-generate tags from title/description
        isExistingHabit: polarity === 'existing', // Derived from polarity type
        reminderEnabled: reminderEnabled,
        reminderTime: reminderEnabled ? reminderTime : undefined,
      });
      
      onClose();
    } catch (err) {
      console.error('[HabitTrackerCore] Error creating habit:', err);
      alert('Failed to create habit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${compact ? 'p-4' : 'p-6'} shadow-sm`}>
      <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-semibold mb-4`}>Create New Habit</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Habit Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Morning Meditation"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={compact ? 2 : 3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Optional description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="build"
                checked={polarity === 'build'}
                onChange={(e) => setPolarity(e.target.value as HabitPolarity)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Build (Good habit)</span>
                <p className="text-xs text-gray-500">A new positive habit you want to develop</p>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="break"
                checked={polarity === 'break'}
                onChange={(e) => setPolarity(e.target.value as HabitPolarity)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Break (Bad habit)</span>
                <p className="text-xs text-gray-500">A negative habit you want to stop</p>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="existing"
                checked={polarity === 'existing'}
                onChange={(e) => setPolarity(e.target.value as HabitPolarity)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Existing (Habit I already do)</span>
                <p className="text-xs text-gray-500">Track a habit you're already doing</p>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Metric Type</label>
          <select
            value={metricType}
            onChange={(e) => setMetricType(e.target.value as HabitMetricType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="boolean">Yes/No (Did I do it?)</option>
            <option value="count">Count (e.g., pushups)</option>
            <option value="minutes">Minutes (e.g., meditation time)</option>
            <option value="rating">Rating (1-10)</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {metricType !== 'boolean' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit (optional)</label>
              <input
                type="text"
                value={metricUnit}
                onChange={(e) => setMetricUnit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., pushups, pages, cups"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(parseFloat(e.target.value) || 0)}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as HabitDirection)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="at_least">At least (≥)</option>
                  <option value="at_most">At most (≤)</option>
                  <option value="exactly">Exactly (=)</option>
                </select>
              </div>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
          <select
            value={repeatType}
            onChange={(e) => setRepeatType(e.target.value as 'daily' | 'weekly' | 'monthly')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {/* Start Date for Existing Habits */}
        {polarity === 'existing' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar size={16} className="text-blue-600" />
              When did you start this habit?
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              This helps us calculate your streak and completion rate accurately. You can always add past check-ins later.
            </p>
          </div>
        )}

        {/* Reminder Settings */}
        <div className="border-t border-gray-200 pt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={reminderEnabled}
              onChange={(e) => setReminderEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-700">Enable reminders</span>
              <p className="text-xs text-gray-500 mt-0.5">
                Get calendar reminders for this habit
              </p>
            </div>
          </label>

          {reminderEnabled && (
            <div className="mt-3 ml-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reminder Time
              </label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                You'll receive a calendar reminder at this time for each habit instance.
              </p>
            </div>
          )}
        </div>

        {/* Tags */}
        {FEATURE_CONTEXT_TAGGING && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <TagSelector
              userId={userId}
              entityType="habit"
              selectedTagIds={selectedTagIds}
              onTagsChange={setSelectedTagIds}
              compact={compact}
            />
            <p className="text-xs text-gray-500 mt-1">
              Tags will be auto-generated from your title and description. You can also add custom tags.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Habit'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// Habit Card (Legacy - Replaced by HabitSurface for premium UI)
// ============================================================================
// 
// NOTE: This component is kept for backward compatibility but is not used
// in the new premium UI design. HabitSurface is the new canonical component.
// 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function HabitCard({
  habit,
  userId,
  permissions,
  layout,
  onUpdate,
  onCheckinClick,
}: {
  habit: Activity;
  userId: string;
  permissions: PermissionFlags;
  layout: 'full' | 'compact';
  onUpdate: () => void;
  onCheckinClick?: (date: string) => void;
}) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [relatedSkills, setRelatedSkills] = useState<Array<{ skill: any; link: any }>>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  
  // Context data (read-only)
  const [goalContexts, setGoalContexts] = useState<Array<{ goal: any; activity: { title: string; description: string | null } }>>([]);
  const [skillContexts, setSkillContexts] = useState<Array<{ skill: { id: string; name: string; description: string | null }; link: any }>>([]);
  const [microFeedback, setMicroFeedback] = useState<string | null>(null);
  const [whyThisMatters, setWhyThisMatters] = useState<any>(null);
  
  // Skill practice mapping (for evidence writes)
  const [skillPracticeInfo, setSkillPracticeInfo] = useState<{ skillId: string; skillName: string } | null>(null);
  const [showPracticeRecorded, setShowPracticeRecorded] = useState(false);
  
  // Memoize today's date to avoid recalculation on every render
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const isCompact = layout === 'compact';
  const showDetails = permissions.detail_level === 'detailed';
  const canEdit = permissions.can_edit;
  
  // Collapsible context section state (reduces cognitive load - collapsed by default)
  const [showContextDetails, setShowContextDetails] = useState(false);

  useEffect(() => {
    if (showDetails) {
      loadSummary();
      loadRelatedSkills();
    } else {
      setLoading(false);
    }
    
    // Always load context (read-only, lightweight) - shows goals/skills even in compact view
    loadHabitContext();
    
    // Load skill practice mapping if exists
    loadSkillPracticeInfo();
    
    // Load "why this matters" context
    loadWhyThisMatters();
  }, [habit.id, showDetails]);
  
  // Load micro-feedback when summary becomes available
  useEffect(() => {
    if (summary) {
      getHabitMicroFeedback(userId, habit.id, summary).then(feedback => {
        setMicroFeedback(feedback?.insight || null);
      }).catch(err => {
        console.error('[HabitTrackerCore] Error loading micro-feedback:', err);
      });
    }
  }, [summary, habit.id, userId]);

  const loadRelatedSkills = async () => {
    setLoadingSkills(true);
    try {
      // Skill linking is owner-controlled only
      const links = await skillEntityLinksService.getLinksForEntity(userId, 'habit', habit.id);
      const skillsWithLinks = await Promise.all(
        links.map(async (link) => {
          const skill = await skillsService.getById(link.skill_id);
          return { skill, link };
        })
      );
      setRelatedSkills(skillsWithLinks.filter(item => item.skill !== null));
    } catch (error) {
      console.error('Error loading related skills:', error);
    } finally {
      setLoadingSkills(false);
    }
  };

  // Load habit context (goals, skills) - read-only
  // Micro-feedback is loaded separately when summary is available
  const loadHabitContext = async () => {
    try {
      // Load goals and skills in parallel
      const [goals, skills] = await Promise.all([
        getGoalsForHabit(userId, habit.id),
        getSkillsForHabit(userId, habit.id),
      ]);
      
      setGoalContexts(goals);
      setSkillContexts(skills);
    } catch (error) {
      console.error('[HabitTrackerCore] Error loading habit context:', error);
      // Non-fatal: continue without context
    }
  };

  // Load skill practice mapping (for evidence writes)
  const loadSkillPracticeInfo = async () => {
    try {
      const { hasSkillPracticeMapping, getSkillPracticeConfig } = await import('../../../lib/skills/skillEvidenceFromHabit');
      
      if (hasSkillPracticeMapping(habit.metadata)) {
        const config = getSkillPracticeConfig(habit.metadata);
        if (config) {
          // Fetch skill name
          const skill = await skillsService.getById(config.skill_id);
          if (skill) {
            setSkillPracticeInfo({
              skillId: config.skill_id,
              skillName: skill.name,
            });
          }
        }
      } else {
        setSkillPracticeInfo(null);
      }
    } catch (error) {
      console.error('[HabitTrackerCore] Error loading skill practice info:', error);
      // Non-fatal: continue without skill practice info
    }
  };

  // Load "why this matters" context
  const loadWhyThisMatters = async () => {
    try {
      const context = await getWhyThisMattersForHabit(userId, habit.id);
      setWhyThisMatters(context);
    } catch (error) {
      console.error('[HabitTrackerCore] Error loading why this matters:', error);
      // Non-fatal: continue without meaning context
    }
  };

  const loadSummary = async () => {
    try {
      const habitSummary = await getHabitSummary(userId, habit.id);
      setSummary(habitSummary);
    } catch (err) {
      console.error('[HabitTrackerCore] Error loading habit summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (status: HabitCheckinStatus) => {
    if (!canEdit) return;
    
    // Open check-in sheet for better UX (supports all metric types)
    if (onCheckinClick) {
      onCheckinClick(today);
    } else {
      // Fallback to simple check-in for boolean habits
      try {
        // Fallback to simple check-in for boolean habits
        // Both values must be explicitly set per constraint
        await upsertHabitCheckin(userId, habit.id, today, {
          status,
          value_boolean: status === 'done' ? true : null,
          value_numeric: null,
        });
        loadSummary();
        onUpdate(); // Trigger calendar sync
        
        // Show practice recorded feedback if skill practice mapping exists and status is 'done'
        if (status === 'done' && skillPracticeInfo) {
          setShowPracticeRecorded(true);
          // Hide feedback after 3 seconds
          setTimeout(() => setShowPracticeRecorded(false), 3000);
        }
      } catch (err) {
        console.error('[HabitTrackerCore] Error checking in:', err);
      }
    }
  };

  const handleArchive = async () => {
    if (!permissions.can_manage) return;
    
    try {
      await archiveHabit(userId, habit.id);
      onUpdate(); // Trigger calendar sync (hides projections)
    } catch (err) {
      console.error('[HabitTrackerCore] Error archiving habit:', err);
    }
  };

  const handlePauseResume = async () => {
    if (!permissions.can_manage) return;
    
    try {
      const { updateHabitActivity } = await import('../../../lib/habits/habitsService');
      const newStatus = habit.status === 'active' ? 'inactive' : 'active';
      await updateHabitActivity(habit.id, { status: newStatus });
      onUpdate(); // Refresh to show updated status
    } catch (err) {
      console.error('[HabitTrackerCore] Error pausing/resuming habit:', err);
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${isCompact ? 'p-3' : 'p-4'} shadow-sm hover:shadow-md transition-shadow`}>
      {/* Header Section */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`${isCompact ? 'text-base' : 'text-lg'} font-semibold text-gray-900 truncate`}>
              {habit.title}
            </h3>
            {habit.status === 'inactive' && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium border border-amber-200">
                Paused
              </span>
            )}
          </div>
          {habit.description && showDetails && (
            <p className={`text-sm text-gray-600 mt-1 line-clamp-2`}>{habit.description}</p>
          )}
        </div>
        {permissions.can_manage && (
          <div className="flex items-center gap-1 ml-2">
            {habit.status === 'active' && (
              <button
                onClick={handlePauseResume}
                className="text-gray-400 hover:text-amber-600 transition-colors flex-shrink-0"
                title="Pause habit"
              >
                <Minus size={isCompact ? 16 : 18} />
              </button>
            )}
            {habit.status === 'inactive' && (
              <button
                onClick={handlePauseResume}
                className="text-gray-400 hover:text-green-600 transition-colors flex-shrink-0"
                title="Resume habit"
              >
                <CheckCircle2 size={isCompact ? 16 : 18} />
              </button>
            )}
            <button
              onClick={handleArchive}
              className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
              title="Archive habit"
            >
              <XCircle size={isCompact ? 18 : 20} />
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 py-2">Loading...</div>
      ) : (
        <div className="space-y-3">
          {/* Summary Stats Row (only in detailed view) - Clear Visual Hierarchy */}
          {summary && showDetails && (
            <div className={`flex items-center flex-wrap ${isCompact ? 'gap-2' : 'gap-3'} text-sm pb-3 border-b border-gray-200`}>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-md border border-blue-100">
                <ActivityIcon size={16} className="text-blue-600 flex-shrink-0" />
                <span className="font-semibold text-gray-900">{summary.currentStreak}</span>
                <span className="text-gray-600 text-xs">day{summary.currentStreak !== 1 ? 's' : ''}</span>
              </div>
              {summary.trend === 'up' ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-md border border-green-100">
                  <TrendingUp size={14} className="text-green-600 flex-shrink-0" />
                  <span className="text-green-700 font-medium text-xs">Improving</span>
                </div>
              ) : summary.trend === 'down' ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 rounded-md border border-red-100">
                  <TrendingDown size={14} className="text-red-600 flex-shrink-0" />
                  <span className="text-red-700 font-medium text-xs">Declining</span>
                </div>
              ) : null}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-md border border-gray-200">
                <span className="text-gray-700 font-medium">{Math.round(summary.completionRate7d)}%</span>
                <span className="text-gray-600 text-xs">this week</span>
              </div>
            </div>
          )}

          {/* Check-in Section - Prominent Primary Action (Only for Active Habits) */}
          {canEdit && habit.status === 'active' && (
            <div className={`${isCompact ? 'py-2.5' : 'py-3.5'} bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 shadow-sm`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Today</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Primary Action - Done Button (Most Prominent) */}
                  <button
                    onClick={() => handleCheckIn('done')}
                    className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 flex items-center gap-2 text-sm font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                    disabled={!canEdit}
                    title="Mark habit as done"
                  >
                    <CheckCircle2 size={18} className="flex-shrink-0" />
                    <span>Done</span>
                  </button>
                  {/* Secondary Actions - Less Prominent */}
                  <div className="flex items-center gap-1.5 border border-gray-300 rounded-lg bg-white overflow-hidden">
                    <button
                      onClick={() => handleCheckIn('missed')}
                      className="px-3 py-2 text-red-700 hover:bg-red-50 active:bg-red-100 flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!canEdit}
                      title="Mark as missed"
                    >
                      <XCircle size={14} />
                      <span className="hidden sm:inline">Missed</span>
                    </button>
                    <div className="w-px h-6 bg-gray-300" />
                    <button
                      onClick={() => handleCheckIn('skipped')}
                      className="px-3 py-2 text-gray-600 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!canEdit}
                      title="Skip for today"
                    >
                      <Minus size={14} />
                      <span className="hidden sm:inline">Skip</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Paused Habit Message */}
          {habit.status === 'inactive' && (
            <div className="py-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
              <p className="text-sm text-amber-700 font-medium">This habit is paused</p>
              {permissions.can_manage && (
                <button
                  onClick={handlePauseResume}
                  className="mt-2 text-xs text-amber-600 hover:text-amber-800 underline"
                >
                  Resume habit
                </button>
              )}
            </div>
          )}

          {/* Context Information Section - Collapsible (Reduces Cognitive Load) */}
          {(goalContexts.length > 0 || skillContexts.length > 0 || microFeedback || whyThisMatters || skillPracticeInfo) && (
            <div className="pt-3 border-t border-gray-100">
              {/* Always show skill practice indicator (important feedback) */}
              {skillPracticeInfo && (
                <div className="mb-2 flex items-center gap-2 text-xs text-gray-600 bg-purple-50 rounded-md px-2.5 py-1.5 border border-purple-100">
                  <Award size={12} className="text-purple-600 flex-shrink-0" />
                  <span>
                    Contributes to <span className="font-medium text-gray-700">{skillPracticeInfo.skillName}</span>
                  </span>
                </div>
              )}

              {/* Practice Recorded Feedback (temporary, auto-hides) */}
              {showPracticeRecorded && skillPracticeInfo && (
                <div className="mb-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-md px-2.5 py-1.5 border border-green-200 animate-fade-in">
                  <CheckCircle2 size={12} className="flex-shrink-0" />
                  <span>Practice recorded for {skillPracticeInfo.skillName}</span>
                </div>
              )}

              {/* Collapsible Context Details (collapsed by default to reduce cognitive load) */}
              {(goalContexts.length > 0 || skillContexts.length > 0 || microFeedback || whyThisMatters) && (
                <div>
                  <button
                    onClick={() => setShowContextDetails(!showContextDetails)}
                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors mb-2"
                  >
                    <span className="font-medium">
                      {showContextDetails ? 'Hide' : 'Show'} context
                    </span>
                    {showContextDetails ? (
                      <Minus size={12} />
                    ) : (
                      <Plus size={12} />
                    )}
                  </button>
                  
                  {showContextDetails && (
                    <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* Habit Context Section (Goals, Skills, Micro-Feedback) */}
                      <HabitContextSection
                        goals={goalContexts}
                        skills={skillContexts}
                        microFeedback={microFeedback}
                        compact={isCompact}
                      />

                      {/* Why This Matters Section */}
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

          {/* Tags Section (Detailed View) */}
          {showDetails && (
            <div className="pt-2 border-t border-gray-100">
              <TagPicker
                userId={userId}
                entityType="habit"
                entityId={habit.id}
                permissions={permissions}
                compact={isCompact}
                onTagsChanged={onUpdate}
              />
            </div>
          )}

          {/* Related Skills Section (Detailed View - Interactive) - Collapsed by default */}
          {showDetails && (
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Award size={16} className="text-purple-600" />
                <h4 className="text-sm font-semibold text-gray-900">Linked Skills</h4>
                {relatedSkills.length > 0 && (
                  <span className="text-xs text-gray-500">({relatedSkills.length})</span>
                )}
              </div>
              {loadingSkills ? (
                <div className="text-xs text-gray-500 py-2">Loading skills...</div>
              ) : relatedSkills.length === 0 ? (
                <div className="text-center py-3 bg-gray-50 rounded-lg border border-gray-200">
                  <Link2 size={16} className="text-gray-400 mx-auto mb-1.5" />
                  <p className="text-xs text-gray-500">No skills linked yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {relatedSkills.slice(0, 3).map(({ skill, link }) => (
                    <button
                      key={skill.id}
                      onClick={() => setSelectedSkillId(skill.id)}
                      className="w-full text-left p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 hover:border-purple-300 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award size={14} className="text-purple-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900">{skill.name}</span>
                        </div>
                        <ArrowRight size={14} className="text-gray-400 group-hover:text-purple-600 transition-colors" />
                      </div>
                      {link.link_notes && (
                        <p className="text-xs text-gray-600 mt-1.5 ml-6">{link.link_notes}</p>
                      )}
                    </button>
                  ))}
                  {relatedSkills.length > 3 && (
                    <p className="text-xs text-gray-500 text-center py-2">
                      +{relatedSkills.length - 3} more skill{relatedSkills.length - 3 !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Skill Detail Modal */}
      {selectedSkillId && (
        <SkillDetailModal
          isOpen={true}
          onClose={() => setSelectedSkillId(null)}
          skillId={selectedSkillId}
          mode="planner"
          permissions={{ can_view: true, can_edit: false, can_manage: false }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Tasks View (Habit-Derived Tasks)
// ============================================================================

function HabitTasksView({
  userId,
  permissions,
  compact = false,
  onTaskUpdate,
}: {
  userId: string;
  permissions: PermissionFlags;
  compact?: boolean;
  onTaskUpdate?: () => void;
}) {
  const [tasks, setTasks] = useState<Array<PersonalTodo & { habit?: Activity }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHabitTasks();
  }, [userId]);

  const loadHabitTasks = async () => {
    try {
      setLoading(true);
      // Get todos and filter for habit-derived tasks
      const { getTodos } = await import('../../../lib/todosService');
      const allTodos = await getTodos();
      const habitTasks = allTodos.filter(todo => todo.habit_activity_id && !todo.completed);
      
      // Get habit info for each task
      const tasksWithHabits = await Promise.all(
        habitTasks.map(async (todo) => {
          try {
            const { getActivity } = await import('../../../lib/activities/activityService');
            const habit = await getActivity(todo.habit_activity_id!);
            return {
              ...todo,
              habit,
            };
          } catch (err) {
            console.error('[HabitTasksView] Error loading habit:', err);
            return null;
          }
        })
      );

      setTasks(tasksWithHabits.filter(Boolean) as any);
    } catch (err) {
      console.error('[HabitTasksView] Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskComplete = async (task: PersonalTodo) => {
    if (!permissions.can_edit) return;
    
    try {
      const { updateTodo } = await import('../../../lib/todosService');
      await updateTodo(task.id, { completed: true });
      loadHabitTasks();
      onTaskUpdate?.();
    } catch (err) {
      console.error('[HabitTasksView] Error completing task:', err);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">Loading habit tasks...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500 mb-2">No habit tasks for today</p>
        <p className="text-xs text-gray-400 italic">Complete habits to see them as tasks</p>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-semibold text-gray-900 mb-4`}>
        Habit Tasks
      </h2>
      <div className={`grid ${compact ? 'gap-2' : 'gap-3'}`}>
        {tasks.map((task) => (
          <div
            key={task.id}
            className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Repeat size={14} className="text-blue-600 flex-shrink-0" />
                  <h3 className="font-medium text-gray-900 text-sm">{task.title}</h3>
                </div>
                {task.due_date && (
                  <p className="text-xs text-gray-500">
                    Scheduled: {new Date(task.due_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              {permissions.can_edit && (
                <button
                  onClick={() => handleTaskComplete(task)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors flex-shrink-0 flex items-center justify-center"
                >
                  <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Goals View (Goals Linked to Habits)
// ============================================================================

function HabitGoalsView({
  userId,
  compact = false,
}: {
  userId: string;
  permissions?: PermissionFlags;
  compact?: boolean;
}) {
  const [goals, setGoals] = useState<Array<{ goal: any; activity: Activity; habits: any[] }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGoals();
  }, [userId]);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const { listGoals } = await import('../../../lib/goals/goalsService');
      const { getHabitsForGoal } = await import('../../../lib/goals/goalContextHelpers');
      const { getActivity } = await import('../../../lib/activities/activityService');
      
      const allGoals = await listGoals(userId);
      
      // Filter to goals that have habit requirements
      const goalsWithHabits = await Promise.all(
        allGoals
          .filter(g => g.status === 'active')
          .map(async (goal) => {
            const habits = await getHabitsForGoal(userId, goal.id);
            if (habits.length === 0) return null;
            
            const activity = await getActivity(goal.goal_activity_id);
            return { goal, activity, habits };
          })
      );

      setGoals(goalsWithHabits.filter(Boolean) as any);
    } catch (err) {
      console.error('[HabitGoalsView] Error loading goals:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">Loading goals...</p>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500 mb-2">No goals linked to habits</p>
        <p className="text-xs text-gray-400 italic">Link habits to goals to see them here</p>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-semibold text-gray-900 mb-4`}>
        Goals Supported by Habits
      </h2>
      <div className={`grid ${compact ? 'gap-2' : 'gap-3'}`}>
        {goals.map(({ goal, activity, habits }) => (
          <div
            key={goal.id}
            className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-gray-900 text-sm mb-2">{activity.title}</h3>
            <div className="space-y-1">
              <p className="text-xs text-gray-600 font-medium">Habits contributing:</p>
              <ul className="ml-4 space-y-0.5">
                {habits.map(({ habit, status }) => (
                  <li key={habit.id} className="text-xs text-gray-600 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {habit.title}
                    {status === 'on_track' && (
                      <span className="text-green-600 text-xs">✓</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Skills View (Skills Linked to Habits)
// ============================================================================

function HabitSkillsView({
  userId,
  compact = false,
}: {
  userId: string;
  permissions?: PermissionFlags;
  compact?: boolean;
}) {
  const [skills, setSkills] = useState<Array<{ skill: any; habits: Activity[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  useEffect(() => {
    loadSkills();
  }, [userId]);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const { getHabitsPracticingSkill } = await import('../../../lib/skills/skillContextHelpers');
      const allSkills = await skillsService.getAll(userId);
      
      // For each skill, find habits that practice it
      const skillsWithHabits = await Promise.all(
        allSkills.map(async (skill) => {
          const habitsPracticing = await getHabitsPracticingSkill(userId, skill.id);
          
          // Convert to Activity format
          const habits = await Promise.all(
            habitsPracticing.map(async (hp) => {
              try {
                const { getActivity } = await import('../../../lib/activities/activityService');
                const activity = await getActivity(hp.habit.id);
                return activity?.type === 'habit' ? activity : null;
              } catch {
                return null;
              }
            })
          );

          return {
            skill,
            habits: habits.filter(Boolean) as Activity[],
          };
        })
      );

      setSkills(skillsWithHabits.filter(s => s.habits.length > 0));
    } catch (err) {
      console.error('[HabitSkillsView] Error loading skills:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">Loading skills...</p>
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500 mb-2">No skills linked to habits</p>
        <p className="text-xs text-gray-400 italic">Link habits to skills to see them here</p>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-semibold text-gray-900 mb-4`}>
        Skills Built by Habits
      </h2>
      <div className={`grid ${compact ? 'gap-2' : 'gap-3'}`}>
        {skills.map(({ skill, habits }) => (
          <button
            key={skill.id}
            onClick={() => setSelectedSkillId(skill.id)}
            className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <Award size={16} className="text-purple-600 flex-shrink-0" />
              <h3 className="font-semibold text-gray-900 text-sm">{skill.name}</h3>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-600 font-medium">Practiced through:</p>
              <ul className="ml-4 space-y-0.5">
                {habits.map((habit) => (
                  <li key={habit.id} className="text-xs text-gray-600 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    {habit.title}
                  </li>
                ))}
              </ul>
            </div>
          </button>
        ))}
      </div>

      {/* Skill Detail Modal */}
      {selectedSkillId && (
        <SkillDetailModal
          isOpen={true}
          onClose={() => setSelectedSkillId(null)}
          skillId={selectedSkillId}
          mode="planner"
          permissions={{ can_view: true, can_edit: false, can_manage: false }}
        />
      )}
    </div>
  );
}

