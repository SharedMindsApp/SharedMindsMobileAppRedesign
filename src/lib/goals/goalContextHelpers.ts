/**
 * Goal Context Helpers
 * 
 * Read-only helper functions to surface contextual information about goals:
 * - Habits that contribute to this goal
 * - Goal momentum insights based on habit performance
 * 
 * These are selector-style functions - no side effects, no writes.
 */

import { supabase } from '../supabase';
import { getActivity } from '../activities/activityService';
import { getGoalRequirements } from './goalsService';
import { getHabitSummary } from '../habits/habitsService';
import { calculateMomentum, calculateAggregateMomentum } from '../trackerContext/momentumEngine';
import type { GoalRequirement } from './goalsService';

// ============================================================================
// Habit Contributor Context
// ============================================================================

export interface HabitContributor {
  habit: {
    id: string;
    title: string;
    description: string | null;
  };
  requirement: GoalRequirement;
  summary: {
    currentStreak: number;
    completionRate7d: number;
    trend: 'up' | 'down' | 'stable' | null;
  } | null;
  status: 'on_track' | 'inconsistent' | 'stalled' | 'unknown';
}

/**
 * Get habits that contribute to this goal
 * Read-only: Returns habits linked via goal_requirements
 */
export async function getHabitsForGoal(
  userId: string,
  goalId: string
): Promise<HabitContributor[]> {
  try {
    // Get goal requirements
    const requirements = await getGoalRequirements(goalId);
    
    if (!requirements || requirements.length === 0) {
      return [];
    }

    // Filter to habit requirements only
    const habitRequirements = requirements.filter(
      req => req.requirement_type === 'habit_streak' || req.requirement_type === 'habit_count'
    );

    if (habitRequirements.length === 0) {
      return [];
    }

    // Fetch habit activities and their summaries
    const contributors: HabitContributor[] = [];
    
    for (const requirement of habitRequirements) {
      try {
        // Get the habit activity
        const activity = await getActivity(requirement.required_activity_id);
        
        if (!activity || activity.type !== 'habit') {
          continue; // Skip non-habit activities
        }

        // Get habit summary for status determination
        let summary = null;
        try {
          summary = await getHabitSummary(userId, activity.id);
        } catch (err) {
          // Non-fatal: continue without summary
          console.warn(`[goalContextHelpers] Could not load summary for habit ${activity.id}:`, err);
        }

        // Determine status using shared momentum engine
        let status: HabitContributor['status'] = 'unknown';
        if (summary) {
          const momentumResult = calculateMomentum(
            {
              currentStreak: summary.currentStreak || 0,
              completionRate7d: summary.completionRate7d || 0,
              completionRate30d: summary.completionRate30d,
              trend: summary.trend || null,
            },
            'habit'
          );
          status = momentumResult.status;
        }

        contributors.push({
          habit: {
            id: activity.id,
            title: activity.title,
            description: activity.description,
          },
          requirement,
          summary: summary ? {
            currentStreak: summary.currentStreak || 0,
            completionRate7d: summary.completionRate7d || 0,
            trend: summary.trend || null,
          } : null,
          status,
        });
      } catch (err) {
        console.error(`[goalContextHelpers] Error loading habit ${requirement.required_activity_id}:`, err);
        // Skip this habit but continue
      }
    }

    return contributors;
  } catch (err) {
    console.error('[goalContextHelpers] Error in getHabitsForGoal:', err);
    return [];
  }
}

// ============================================================================
// Goal Momentum Insight
// ============================================================================

export interface GoalMomentumInsight {
  insight: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Generate one short insight about goal momentum based on habit performance
 * Read-only: Analyzes existing habit check-in data to surface patterns
 * 
 * Returns null if no insight can be generated with high confidence
 * 
 * Uses shared momentum engine for consistency
 */
export async function getGoalMomentumInsight(
  userId: string,
  goalId: string
): Promise<GoalMomentumInsight | null> {
  try {
    // Get habit contributors
    const habits = await getHabitsForGoal(userId, goalId);
    
    if (habits.length === 0) {
      return null; // No habits to analyze
    }

    // Extract momentum statuses from habits
    const momentumStatuses = habits.map(h => h.status);
    
    // Calculate aggregate momentum using shared engine
    const aggregateResult = calculateAggregateMomentum(momentumStatuses);

    // Return insight if available
    if (aggregateResult.insight) {
      return {
        insight: aggregateResult.insight.text,
        confidence: aggregateResult.insight.confidence,
      };
    }

    return null;
  } catch (err) {
    console.error('[goalContextHelpers] Error in getGoalMomentumInsight:', err);
    return null;
  }
}
