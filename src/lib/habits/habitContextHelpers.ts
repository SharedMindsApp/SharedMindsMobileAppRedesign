/**
 * Habit Context Helpers (Read-Only)
 * 
 * ⚠️ CRITICAL: These are READ-ONLY helpers. No writes, no side effects.
 * 
 * @see src/lib/habits/habitContract.ts for the canonical habit contract
 * 
 * These functions surface contextual information about habits:
 * - Goals that require this habit
 * - Skills this habit builds
 * - Micro-feedback (momentum insights)
 * 
 * All functions are:
 * - Selector-style (no side effects)
 * - Read-only (no writes)
 * - Safe to call multiple times
 * - Non-blocking (errors are non-fatal)
 */

import { supabase } from '../supabase';
import { getActivity } from '../activities/activityService';
import { skillEntityLinksService, skillsService } from '../skillsService';
import { calculateMomentum } from '../trackerContext/momentumEngine';
import type { Goal } from '../goals/goalsService';
import type { SkillEntityLink } from '../skillsService';

// ============================================================================
// Goal Context
// ============================================================================

export interface GoalContext {
  goal: Goal;
  activity: { title: string; description: string | null };
}

/**
 * Get goals that require this habit
 * Read-only: Returns goals where this habit is a requirement
 */
export async function getGoalsForHabit(
  userId: string,
  habitActivityId: string
): Promise<GoalContext[]> {
  try {
    // Find goal requirements that reference this habit
    const { data: requirements, error: reqError } = await supabase
      .from('goal_requirements')
      .select('goal_id')
      .eq('required_activity_id', habitActivityId);

    if (reqError) {
      console.error('[habitContextHelpers] Error fetching goal requirements:', reqError);
      return [];
    }

    if (!requirements || requirements.length === 0) {
      return [];
    }

    const goalIds = requirements.map(r => r.goal_id);

    // Fetch goals and their activities
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('owner_id', userId)
      .in('id', goalIds)
      .eq('status', 'active') // Only show active goals
      .order('created_at', { ascending: false });

    if (goalsError) {
      console.error('[habitContextHelpers] Error fetching goals:', goalsError);
      return [];
    }

    if (!goals || goals.length === 0) {
      return [];
    }

    // Fetch activity titles for each goal
    const goalContexts: GoalContext[] = [];
    for (const goal of goals) {
      try {
        const activity = await getActivity(goal.goal_activity_id);
        if (activity) {
          goalContexts.push({
            goal: goal as Goal,
            activity: {
              title: activity.title,
              description: activity.description,
            },
          });
        }
      } catch (err) {
        console.error(`[habitContextHelpers] Error fetching activity for goal ${goal.id}:`, err);
        // Skip this goal but continue
      }
    }

    return goalContexts;
  } catch (err) {
    console.error('[habitContextHelpers] Error in getGoalsForHabit:', err);
    return [];
  }
}

// ============================================================================
// Skill Context
// ============================================================================

export interface SkillContext {
  skill: { id: string; name: string; description: string | null };
  link: SkillEntityLink;
}

/**
 * Get skills linked to this habit
 * Read-only: Returns skills that are linked to this habit
 */
export async function getSkillsForHabit(
  userId: string,
  habitActivityId: string
): Promise<SkillContext[]> {
  try {
    // Get skill entity links for this habit
    const links = await skillEntityLinksService.getLinksForEntity(userId, 'habit', habitActivityId);

    if (!links || links.length === 0) {
      return [];
    }

    // Fetch skill details for each link
    const skillContexts: SkillContext[] = [];
    for (const link of links) {
      try {
        const skill = await skillsService.getById(link.skill_id);
        if (skill) {
          skillContexts.push({
            skill: {
              id: skill.id,
              name: skill.name,
              description: skill.description || null,
            },
            link,
          });
        }
      } catch (err) {
        console.error(`[habitContextHelpers] Error fetching skill ${link.skill_id}:`, err);
        // Skip this skill but continue
      }
    }

    return skillContexts;
  } catch (err) {
    console.error('[habitContextHelpers] Error in getSkillsForHabit:', err);
    return [];
  }
}

// ============================================================================
// Micro-Feedback (Optional)
// ============================================================================

export interface HabitMicroFeedback {
  insight: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Generate one short insight about a habit based on summary data
 * Read-only: Analyzes existing check-in data to surface patterns
 * 
 * Returns null if no insight can be generated with high confidence
 * 
 * Uses shared momentum engine for consistency
 */
export async function getHabitMicroFeedback(
  userId: string,
  habitActivityId: string,
  summary: any
): Promise<HabitMicroFeedback | null> {
  // Only generate insights if we have sufficient data
  if (!summary || summary.completionRate7d === undefined || summary.completionRate7d === null) {
    return null;
  }

  // Use shared momentum engine
  const momentumResult = calculateMomentum(
    {
      currentStreak: summary.currentStreak || 0,
      completionRate7d: summary.completionRate7d || 0,
      completionRate30d: summary.completionRate30d,
      trend: summary.trend || null,
    },
    'habit'
  );

  // Return insight if available
  if (momentumResult.insight) {
    return {
      insight: momentumResult.insight.text,
      confidence: momentumResult.insight.confidence,
    };
  }

  return null;
}
