/**
 * Orientation Helpers
 * 
 * Read-only functions that aggregate orientation signals across all trackers.
 * Helps users understand where their attention naturally wants to go.
 * 
 * These are selector-style functions - no side effects, no writes.
 */

import { supabase } from '../supabase';
import { listHabits, getHabitSummary } from '../habits/habitsService';
import { listGoals } from '../goals/goalsService';
import { getHabitsForGoal } from '../goals/goalContextHelpers';
import { skillsService } from '../skillsService';
import { skillEvidenceService } from '../skillsIntelligence';
import { getRecentPracticeSummary } from '../skills/skillContextHelpers';
import { getTodos } from '../todosService';
import { getActivity } from '../activities/activityService';
import {
  generateHabitOrientationSignal,
  generateSkillOrientationSignal,
  generateGoalOrientationSignal,
  generateTaskOrientationSignal,
  type OrientationSignal,
} from './orientationEngine';

// ============================================================================
// Current Orientation Signals
// ============================================================================

/**
 * Get current orientation signals across all trackers
 * Returns 1-2 high-confidence signals based on recent behavior
 * 
 * This is read-only and never compares entities against each other.
 */
export async function getCurrentOrientationSignals(
  userId: string
): Promise<OrientationSignal[]> {
  try {
    const signals: OrientationSignal[] = [];

    // Get habits and check for recent activity/momentum
    try {
      const habits = await listHabits(userId);
      const today = new Date().toISOString().split('T')[0];

      for (const habit of habits.slice(0, 10)) { // Limit to recent 10 for performance
        try {
          const summary = await getHabitSummary(userId, habit.id);
          
          // Get last check-in date
          const { data: recentCheckins } = await supabase
            .from('habit_checkins')
            .select('local_date')
            .eq('activity_id', habit.id)
            .eq('owner_id', userId)
            .order('local_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          const lastCheckinDate = recentCheckins?.local_date || null;
          let daysSinceLastCheckin: number | undefined;
          if (lastCheckinDate) {
            const lastDate = new Date(lastCheckinDate);
            const todayDate = new Date(today);
            daysSinceLastCheckin = Math.floor(
              (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
            );
          }

          const signal = generateHabitOrientationSignal(habit.id, habit.title, {
            lastCheckinDate,
            daysSinceLastCheckin,
            currentStreak: summary.currentStreak,
            completionRate7d: summary.completionRate7d,
          });

          if (signal) {
            signals.push(signal);
          }
        } catch (err) {
          // Non-fatal: continue with other habits
          console.warn(`[orientationHelpers] Error processing habit ${habit.id}:`, err);
        }
      }
    } catch (err) {
      console.error('[orientationHelpers] Error loading habits:', err);
    }

    // Get skills and check for evidence recency
    try {
      const skills = await skillsService.getAll(userId);
      const recentEvidence = await skillEvidenceService.getRecentEvidence(userId, 30);

      for (const skill of skills.slice(0, 10)) { // Limit to recent 10
        try {
          const skillEvidence = recentEvidence.filter(e => e.skill_id === skill.id);
          
          const now = new Date();
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

          const evidenceCount7d = skillEvidence.filter(
            e => new Date(e.occurred_at) >= sevenDaysAgo
          ).length;

          const evidenceCount30d = skillEvidence.filter(
            e => new Date(e.occurred_at) >= thirtyDaysAgo
          ).length;

          let daysSinceLastUse: number | undefined;
          if (skill.last_used_at) {
            const lastUsed = new Date(skill.last_used_at);
            daysSinceLastUse = Math.floor(
              (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24)
            );
          }

          const signal = generateSkillOrientationSignal(skill.id, skill.name, {
            lastUsedAt: skill.last_used_at || null,
            daysSinceLastUse,
            evidenceCount7d,
            evidenceCount30d,
          });

          if (signal) {
            signals.push(signal);
          }
        } catch (err) {
          // Non-fatal: continue with other skills
          console.warn(`[orientationHelpers] Error processing skill ${skill.id}:`, err);
        }
      }
    } catch (err) {
      console.error('[orientationHelpers] Error loading skills:', err);
    }

    // Get goals and check for momentum
    try {
      const goals = await listGoals(userId);

      for (const goal of goals.slice(0, 5)) { // Limit to recent 5
        try {
          // Fetch goal activity to get title
          const goalActivity = await getActivity(goal.goal_activity_id);
          if (!goalActivity) {
            console.warn(`[orientationHelpers] Goal activity not found for goal ${goal.id}`);
            continue;
          }

          const habits = await getHabitsForGoal(userId, goal.id);
          const onTrackHabits = habits.filter(h => h.status === 'on_track').length;
          
          const momentumStatus = onTrackHabits >= habits.length * 0.7 ? 'on_track' :
                                 onTrackHabits === 0 && habits.length > 0 ? 'stalled' :
                                 'unknown';

          const signal = generateGoalOrientationSignal(goal.id, goalActivity.title, {
            momentumStatus,
            habitContributorsCount: habits.length,
            onTrackHabitsCount: onTrackHabits,
          });

          if (signal) {
            signals.push(signal);
          }
        } catch (err) {
          // Non-fatal: continue with other goals
          console.warn(`[orientationHelpers] Error processing goal ${goal.id}:`, err);
        }
      }
    } catch (err) {
      console.error('[orientationHelpers] Error loading goals:', err);
    }

    // Return max 2 signals (most recent/relevant first)
    // Sort by recency (recent_activity > momentum > emerging > stalled)
    const priorityOrder: Record<string, number> = {
      'recent_activity': 1,
      'momentum': 2,
      'emerging': 3,
      'stalled': 4,
    };

    signals.sort((a, b) => {
      const priorityA = priorityOrder[a.reason] || 5;
      const priorityB = priorityOrder[b.reason] || 5;
      return priorityA - priorityB;
    });

    return signals.slice(0, 2); // Max 2 signals
  } catch (err) {
    console.error('[orientationHelpers] Error getting orientation signals:', err);
    return [];
  }
}

/**
 * Get orientation signal for a specific entity
 * Useful for showing context within a tracker view
 */
export async function getOrientationForContext(
  userId: string,
  entityType: 'habit' | 'goal' | 'skill' | 'task',
  entityId: string
): Promise<OrientationSignal | null> {
  try {
    if (entityType === 'habit') {
      const summary = await getHabitSummary(userId, entityId);
      const activity = await getActivity(entityId);
      
      if (!activity) return null;

      const { data: recentCheckins } = await supabase
        .from('habit_checkins')
        .select('local_date')
        .eq('activity_id', entityId)
        .eq('owner_id', userId)
        .order('local_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastCheckinDate = recentCheckins?.local_date || null;
      let daysSinceLastCheckin: number | undefined;
      if (lastCheckinDate) {
        const today = new Date().toISOString().split('T')[0];
        const lastDate = new Date(lastCheckinDate);
        const todayDate = new Date(today);
        daysSinceLastCheckin = Math.floor(
          (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      return generateHabitOrientationSignal(entityId, activity.title, {
        lastCheckinDate,
        daysSinceLastCheckin,
        currentStreak: summary.currentStreak,
        completionRate7d: summary.completionRate7d,
      });
    }

    if (entityType === 'skill') {
      const skill = await skillsService.getById(entityId);
      if (!skill) return null;

      const summary = await getRecentPracticeSummary(userId, entityId);
      
      return generateSkillOrientationSignal(entityId, skill.name, {
        lastUsedAt: skill.last_used_at || null,
        daysSinceLastUse: summary.lastPracticeDate
          ? Math.floor((new Date().getTime() - new Date(summary.lastPracticeDate).getTime()) / (1000 * 60 * 60 * 24))
          : undefined,
        evidenceCount7d: summary.evidenceCount7d,
        evidenceCount30d: summary.evidenceCount30d,
      });
    }

    if (entityType === 'goal') {
      const goals = await listGoals(userId);
      const foundGoal = goals.find(g => g.id === entityId);
      if (!foundGoal) return null;

      // Fetch goal activity to get title
      const goalActivity = await getActivity(foundGoal.goal_activity_id);
      if (!goalActivity) return null;

      const habits = await getHabitsForGoal(userId, entityId);
      const onTrackHabits = habits.filter(h => h.status === 'on_track').length;
      
      const momentumStatus = onTrackHabits >= habits.length * 0.7 ? 'on_track' :
                             onTrackHabits === 0 && habits.length > 0 ? 'stalled' :
                             'unknown';

      return generateGoalOrientationSignal(entityId, goalActivity.title, {
        momentumStatus,
        habitContributorsCount: habits.length,
        onTrackHabitsCount: onTrackHabits,
      });
    }

    if (entityType === 'task') {
      const todos = await getTodos(userId);
      const task = todos.find(t => t.id === entityId);
      if (!task) return null;

      let daysSinceCompletion: number | undefined;
      if (task.completed && task.completed_at) {
        daysSinceCompletion = Math.floor(
          (new Date().getTime() - new Date(task.completed_at).getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      return generateTaskOrientationSignal(entityId, task.title, {
        isHabitDerived: task.is_habit_derived || false,
        completed: task.completed,
        completedAt: task.completed_at || null,
        daysSinceCompletion,
      });
    }

    return null;
  } catch (err) {
    console.error('[orientationHelpers] Error getting orientation for context:', err);
    return null;
  }
}
