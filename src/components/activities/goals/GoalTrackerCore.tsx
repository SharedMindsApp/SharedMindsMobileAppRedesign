/**
 * Canonical Goal Tracker Core Component
 * 
 * Contains ALL goal tracking logic. Works identically in Planner, Personal Spaces, and Shared Spaces.
 * 
 * VERIFICATION CHECKLIST:
 * [ ] Tracker renders in Planner
 * [ ] Tracker renders in Personal Space
 * [ ] Tracker renders in Shared Space
 * [ ] Goal progress updates from habit check-ins
 * [ ] Permissions enforced correctly (can_view, can_edit, detail_level)
 * [ ] No duplicate logic
 * [ ] No feature drift
 * 
 * This component NEVER knows where it's rendered - it only receives context and permissions.
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Target, CheckCircle2, TrendingUp, Calendar, Lock, Eye, XCircle, Edit2 } from 'lucide-react';
import {
  listGoals,
  createGoalActivity,
  addGoalRequirement,
  computeGoalProgress,
  markGoalCompleted,
  extendGoal,
  expandGoal,
  archiveGoal,
  type GoalProgress,
  type Goal,
} from '../../../lib/goals/goalsService';
import type { PermissionFlags } from '../../../lib/permissions/types';
import { FEATURE_HABITS_GOALS, FEATURE_HABITS_GOALS_REALTIME, FEATURE_CONTEXT_TAGGING } from '../../../lib/featureFlags';
import { subscribeActivityChanged } from '../../../lib/activities/activityEvents';
import { supabase } from '../../../lib/supabase';
import { GoalDetailModal } from './GoalDetailModal';
import { TagPicker } from '../../tags/TagPicker';
import { TagSelector } from '../../tags/TagSelector';
import { GoalContextSection } from './GoalContextSection';
import { WhyThisMattersSection } from '../../shared/WhyThisMattersSection';
import { CurrentFocusSection } from '../../shared/CurrentFocusSection';
import { getWhyThisMattersForGoal } from '../../../lib/trackerContext/meaningHelpers';
import { getCurrentOrientationSignals } from '../../../lib/trackerContext/orientationHelpers';
import { getHabitsForGoal, getGoalMomentumInsight } from '../../../lib/goals/goalContextHelpers';

// ============================================================================
// Types
// ============================================================================

export interface GoalTrackerContext {
  mode: 'planner' | 'personal_space' | 'shared_space';
  scope: 'self' | 'shared';
}

export interface GoalTrackerCoreProps {
  ownerUserId: string;
  context: GoalTrackerContext;
  permissions: PermissionFlags;
  layout?: 'full' | 'compact';
  onGoalUpdate?: () => void; // Callback for external updates (e.g., calendar sync)
}

// ============================================================================
// Core Component
// ============================================================================

export function GoalTrackerCore({
  ownerUserId,
  context,
  permissions,
  layout = 'full',
  onGoalUpdate,
}: GoalTrackerCoreProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Permission enforcement: can_view === false → render null
  if (!permissions.can_view) {
    return null;
  }

  useEffect(() => {
    if (FEATURE_HABITS_GOALS) {
      loadGoals();
      loadOrientationSignals();
    }
  }, [ownerUserId]);

  // Subscribe to activity changes for live sync
  useEffect(() => {
    if (!FEATURE_HABITS_GOALS) return;

    // Use Supabase realtime if enabled, otherwise fallback to bus
    if (FEATURE_HABITS_GOALS_REALTIME) {
      const channel = supabase
        .channel(`goals:${ownerUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'goals',
            filter: `owner_id=eq.${ownerUserId}`,
          },
          () => {
            loadGoals();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'goal_requirements',
          },
          () => {
            loadGoals();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'habit_checkins',
            filter: `owner_id=eq.${ownerUserId}`,
          },
          () => {
            // Goals depend on habit check-ins, so refresh when check-ins change
            loadGoals();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Fallback to activityEvents bus
      const unsubscribe = subscribeActivityChanged((activityId) => {
        loadGoals();
      });
      return unsubscribe;
    }
  }, [ownerUserId]);

  const loadOrientationSignals = async () => {
    try {
      const signals = await getCurrentOrientationSignals(ownerUserId);
      // Filter to goal-related signals only
      const goalSignals = signals.filter(s => s.entityType === 'goal');
      setOrientationSignals(goalSignals);
    } catch (err) {
      console.error('[GoalTrackerCore] Error loading orientation signals:', err);
      // Non-fatal: continue without signals
    }
  };

  const loadGoals = async () => {
    try {
      const userGoals = await listGoals(ownerUserId, { includeTags: true });
      setGoals(userGoals);
    } catch (err) {
      console.error('[GoalTrackerCore] Error loading goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoalUpdate = useCallback(() => {
    loadGoals();
    onGoalUpdate?.(); // Notify parent (e.g., calendar) of updates
  }, [onGoalUpdate]);

  if (!FEATURE_HABITS_GOALS) {
    return (
      <div className="p-6 text-center text-gray-500">
        Goals feature is currently disabled. Enable FEATURE_HABITS_GOALS to use.
      </div>
    );
  }

  if (loading) {
    return <div className="p-6">Loading goals...</div>;
  }

  const isReadOnly = !permissions.can_edit;
  const isCompact = layout === 'compact';
  const showDetails = permissions.detail_level === 'detailed';

  return (
    <div className={`${isCompact ? 'p-4 space-y-4' : 'p-6 space-y-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className={`${isCompact ? 'text-xl' : 'text-2xl'} font-bold text-gray-900`}>
            Goal Tracker
          </h1>
          {context.scope === 'shared' && (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
              <Eye size={12} />
              Shared
            </span>
          )}
          {isReadOnly && (
            <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1">
              <Lock size={12} />
              Read-only
            </span>
          )}
        </div>
        {permissions.can_edit && (
          <button
            onClick={() => setShowCreateForm(true)}
            className={`${isCompact ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'} bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2`}
          >
            <Plus size={isCompact ? 16 : 20} />
            New Goal
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && permissions.can_edit && (
        <CreateGoalForm
          userId={ownerUserId}
          onClose={() => {
            setShowCreateForm(false);
            handleGoalUpdate();
          }}
          compact={isCompact}
        />
      )}

      {/* Current Focus Section (Orientation Signals) */}
      {orientationSignals.length > 0 && (
        <div className="mb-4">
          <CurrentFocusSection signals={orientationSignals} compact={isCompact} />
        </div>
      )}

      {/* Goals List */}
      <div className={`grid ${isCompact ? 'gap-3' : 'gap-4'}`}>
        {goals.map(goal => (
          <GoalCard
            key={goal.id}
            goal={goal}
            userId={ownerUserId}
            context={context}
            permissions={permissions}
            layout={layout}
            onUpdate={handleGoalUpdate}
          />
        ))}
      </div>

      {/* Empty State */}
      {goals.length === 0 && (
        <div className={`text-center ${isCompact ? 'py-8' : 'py-12'} text-gray-500`}>
          <Target size={isCompact ? 36 : 48} className="mx-auto mb-4 text-gray-300" />
          <p>{isReadOnly ? 'No goals to display.' : 'No goals yet. Create your first goal to get started!'}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Create Goal Form
// ============================================================================

function CreateGoalForm({
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [tempEntityId, setTempEntityId] = useState<string | null>(null);

  // Generate a temporary ID for the form (before goal is created)
  useEffect(() => {
    setTempEntityId(`temp-${Date.now()}`);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const result = await createGoalActivity(userId, {
        title: title.trim(),
        description: description.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        autoGenerateTags: true, // Auto-generate tags from title/description
      });
      
      // If we have selected tags but they weren't linked (because goal wasn't created yet),
      // link them now using the actual goal ID
      if (selectedTagIds.length > 0 && result.goalId) {
        try {
          const { addTagsToEntity } = await import('../../../lib/tags/tagService');
          await addTagsToEntity(userId, selectedTagIds, 'goal', result.goalId);
        } catch (tagErr) {
          console.error('[GoalTrackerCore] Error linking tags after goal creation:', tagErr);
          // Non-fatal
        }
      }
      
      onClose();
    } catch (err) {
      console.error('[GoalTrackerCore] Error creating goal:', err);
      alert('Failed to create goal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${compact ? 'p-4' : 'p-6'} shadow-sm`}>
      <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-semibold mb-4`}>Create New Goal</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Build Daily Exercise Habit"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={compact ? 2 : 3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="What do you want to achieve?"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Deadline)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Tags */}
        {FEATURE_CONTEXT_TAGGING && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <TagSelector
              userId={userId}
              entityType="goal"
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
            {saving ? 'Creating...' : 'Create Goal'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// Goal Card
// ============================================================================

function GoalCard({
  goal,
  userId,
  context,
  permissions,
  layout,
  onUpdate,
}: {
  goal: Goal;
  userId: string;
  context: GoalTrackerContext;
  permissions: PermissionFlags;
  layout: 'full' | 'compact';
  onUpdate: () => void;
}) {
  const [progress, setProgress] = useState<GoalProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Context data (read-only)
  const [habitContributors, setHabitContributors] = useState<Array<{
    habit: { id: string; title: string; description: string | null };
    requirement: any;
    summary: { currentStreak: number; completionRate7d: number; trend: 'up' | 'down' | 'stable' | null } | null;
    status: 'on_track' | 'inconsistent' | 'stalled' | 'unknown';
  }>>([]);
  const [momentumInsight, setMomentumInsight] = useState<string | null>(null);
  const [whyThisMatters, setWhyThisMatters] = useState<any>(null);
  
  const isCompact = layout === 'compact';
  const showDetails = permissions.detail_level === 'detailed';
  const canEdit = permissions.can_edit;
  const canManage = permissions.can_manage;

  useEffect(() => {
    if (showDetails) {
      loadProgress();
    } else {
      // In overview mode, still load progress for percentage display
      loadProgress();
    }
    
    // Always load context (read-only, lightweight) - shows habits even in compact view
    loadGoalContext();
    
    // Load "why this matters" context
    loadWhyThisMatters();
  }, [goal.id, showDetails]);

  const loadProgress = async () => {
    try {
      const goalProgress = await computeGoalProgress(userId, goal.id);
      setProgress(goalProgress);
    } catch (err) {
      console.error('[GoalTrackerCore] Error loading goal progress:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load goal context (habits, momentum) - read-only
  const loadGoalContext = async () => {
    try {
      // Load habits and momentum insight in parallel
      const [habits, insight] = await Promise.all([
        getHabitsForGoal(userId, goal.id),
        getGoalMomentumInsight(userId, goal.id),
      ]);
      
      setHabitContributors(habits);
      setMomentumInsight(insight?.insight || null);
    } catch (error) {
      console.error('[GoalTrackerCore] Error loading goal context:', error);
      // Non-fatal: continue without context
    }
  };

  // Load "why this matters" context
  const loadWhyThisMatters = async () => {
    try {
      const context = await getWhyThisMattersForGoal(userId, goal.id);
      setWhyThisMatters(context);
    } catch (error) {
      console.error('[GoalTrackerCore] Error loading why this matters:', error);
      // Non-fatal: continue without meaning context
    }
  };

  // Overview mode: show only title, percent, and end date
  // Note: Progress is already loaded in useEffect above
  if (!showDetails) {
    return (
      <>
        <div
          className={`bg-white rounded-lg border border-gray-200 ${isCompact ? 'p-3' : 'p-4'} shadow-sm cursor-pointer hover:shadow-md transition-shadow`}
          onClick={() => setShowDetailModal(true)}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className={`${isCompact ? 'text-base' : 'text-lg'} font-semibold text-gray-900`}>
                {loading ? 'Loading...' : progress ? progress.activity.title : 'Goal'}
              </h3>
            </div>
            {loading ? (
              <div className="text-sm text-gray-400">Loading...</div>
            ) : progress ? (
              <>
                <span className="text-sm font-bold text-blue-600 mr-3">
                  {Math.round(progress.overallProgress)}%
                </span>
                {progress.remainingDays !== null && (
                  <span className="text-xs text-gray-500">
                    {progress.remainingDays}d left
                  </span>
                )}
              </>
            ) : null}
          </div>
          
          {/* Goal Context Section (Habits, Momentum Insight) - Always visible if context exists */}
          <GoalContextSection
            habits={habitContributors}
            momentumInsight={momentumInsight}
            compact={isCompact}
          />

          {/* Why This Matters Section */}
          <WhyThisMattersSection
            context={whyThisMatters}
            compact={isCompact}
          />
        </div>
        {showDetailModal && (
          <GoalDetailModal
            isOpen={showDetailModal}
            onClose={() => setShowDetailModal(false)}
            goal={goal}
            userId={userId}
            permissions={permissions}
            onGoalUpdated={() => {
              loadProgress();
              onUpdate();
              setShowDetailModal(false);
            }}
          />
        )}
      </>
    );
  }

  // Detailed mode: show full card with click to open modal
  if (loading || !progress) {
    return <div className={`bg-white rounded-lg border border-gray-200 ${isCompact ? 'p-3' : 'p-4'}`}>Loading...</div>;
  }

  return (
    <>
      <div
        className={`bg-white rounded-lg border border-gray-200 ${isCompact ? 'p-3' : 'p-4'} shadow-sm cursor-pointer hover:shadow-md transition-shadow`}
        onClick={() => setShowDetailModal(true)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className={`${isCompact ? 'text-base' : 'text-lg'} font-semibold text-gray-900`}>
              {progress.activity.title}
            </h3>
            {progress.activity.description && (
              <p className="text-sm text-gray-600 mt-1">{progress.activity.description}</p>
            )}
            {/* Tags */}
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <TagPicker
                userId={userId}
                entityType="goal"
                entityId={goal.id}
                permissions={permissions}
                compact={isCompact}
                onTagsChanged={onUpdate}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {progress.goal.status === 'completed' && (
              <CheckCircle2 size={isCompact ? 20 : 24} className="text-green-600" />
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-bold text-blue-600">
                {Math.round(progress.overallProgress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress.overallProgress}%` }}
              />
            </div>
          </div>

          <div className={`flex items-center ${isCompact ? 'gap-3' : 'gap-4'} text-sm text-gray-600`}>
            <div className="flex items-center gap-1">
              <Target size={16} />
              <span>{progress.completedCount}/{progress.totalCount} requirements</span>
            </div>
            {progress.remainingDays !== null && (
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                <span>{progress.remainingDays} days remaining</span>
              </div>
            )}
          </div>

          {/* Goal Context Section (Habits, Momentum Insight) - Always visible if context exists */}
          <GoalContextSection
            habits={habitContributors}
            momentumInsight={momentumInsight}
            compact={isCompact}
          />

          {/* Why This Matters Section */}
          <WhyThisMattersSection
            context={whyThisMatters}
            compact={isCompact}
          />
        </div>
      </div>

      {/* Goal Detail Modal */}
      {showDetailModal && (
        <GoalDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          goal={goal}
          userId={userId}
          permissions={permissions}
          onGoalUpdated={() => {
            loadProgress();
            onUpdate();
            setShowDetailModal(false);
          }}
        />
      )}
    </>
  );
}

