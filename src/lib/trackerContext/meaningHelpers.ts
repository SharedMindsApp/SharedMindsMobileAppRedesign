/**
 * Meaning Helpers
 * 
 * Read-only functions that derive "why this matters" context from existing
 * relationships between habits, goals, skills, and tasks.
 * 
 * These functions aggregate existing context to explain purpose and contribution
 * without inventing or fabricating meaning.
 * 
 * All functions are confidence-gated and only return high-confidence insights.
 */

import { getGoalsForHabit, getSkillsForHabit } from '../habits/habitContextHelpers';
import { getHabitsForGoal } from '../goals/goalContextHelpers';
import { getHabitsPracticingSkill } from '../skills/skillContextHelpers';
import { getActivity } from '../activities/activityService';
import { skillEntityLinksService } from '../skillsService';
import { supabase } from '../supabase';
import type { InsightConfidence } from './contextTypes';

// ============================================================================
// Types
// ============================================================================

export interface WhyThisMattersContext {
  summary: string; // One short sentence
  contributors?: string[]; // Names of habits, goals, or skills involved
  confidence: InsightConfidence;
}

// ============================================================================
// Habit Meaning
// ============================================================================

/**
 * Get "why this matters" context for a habit
 * Derived from: goals it contributes to, skills it builds
 */
export async function getWhyThisMattersForHabit(
  userId: string,
  habitActivityId: string
): Promise<WhyThisMattersContext | null> {
  try {
    // Get goals and skills in parallel
    const [goals, skills] = await Promise.all([
      getGoalsForHabit(userId, habitActivityId),
      getSkillsForHabit(userId, habitActivityId),
    ]);

    const contributors: string[] = [];
    const reasons: string[] = [];

    // Goal contributions
    if (goals.length > 0) {
      const goalNames = goals.map(g => g.activity.title);
      contributors.push(...goalNames);
      
      if (goals.length === 1) {
        reasons.push(`This habit supports your goal to ${goalNames[0].toLowerCase()}`);
      } else if (goals.length === 2) {
        reasons.push(`This habit supports your goals: ${goalNames[0]} and ${goalNames[1]}`);
      } else {
        reasons.push(`This habit supports ${goals.length} of your goals`);
      }
    }

    // Skill building
    if (skills.length > 0) {
      const skillNames = skills.map(s => s.skill.name);
      contributors.push(...skillNames);
      
      if (skills.length === 1) {
        reasons.push(`This habit strengthens your ${skillNames[0]} skill`);
      } else {
        reasons.push(`This habit strengthens ${skills.length} skills you're developing`);
      }
    }

    // Only return if we have high-confidence meaning
    if (reasons.length === 0) {
      return null; // No meaningful connections found
    }

    // Combine reasons into one sentence
    let summary: string;
    if (reasons.length === 1) {
      summary = reasons[0] + '.';
    } else {
      // Combine multiple reasons
      summary = reasons.slice(0, -1).join(', ') + ', and ' + reasons[reasons.length - 1] + '.';
    }

    return {
      summary,
      contributors: contributors.length > 0 ? contributors : undefined,
      confidence: 'high',
    };
  } catch (err) {
    console.error('[meaningHelpers] Error getting habit meaning:', err);
    return null;
  }
}

// ============================================================================
// Goal Meaning
// ============================================================================

/**
 * Get "why this matters" context for a goal
 * Derived from: habits contributing to it, skills it relates to
 */
export async function getWhyThisMattersForGoal(
  userId: string,
  goalId: string
): Promise<WhyThisMattersContext | null> {
  try {
    // Get habits contributing to this goal
    const habits = await getHabitsForGoal(userId, goalId);

    // Get skills linked to this goal (via skill_entity_links)
    const skillLinks = await skillEntityLinksService.getLinksForEntity(userId, 'goal', goalId);
    const skillIds = skillLinks.map(link => link.skill_id);

    const contributors: string[] = [];
    const reasons: string[] = [];

    // Habit contributions
    if (habits.length > 0) {
      const habitNames = habits.map(h => h.habit.title);
      contributors.push(...habitNames);
      
      if (habits.length === 1) {
        reasons.push(`This goal is supported by your ${habitNames[0]} habit`);
      } else if (habits.length === 2) {
        reasons.push(`This goal is supported by ${habitNames[0]} and ${habitNames[1]}`);
      } else {
        reasons.push(`This goal is supported by ${habits.length} habits`);
      }
    }

    // Skill relationships
    if (skillIds.length > 0) {
      // Fetch skill names
      const { data: skills } = await supabase
        .from('user_skills')
        .select('name')
        .eq('user_id', userId)
        .in('id', skillIds);

      if (skills && skills.length > 0) {
        const skillNames = skills.map(s => s.name);
        contributors.push(...skillNames);
        
        if (skills.length === 1) {
          reasons.push(`This goal relates to your ${skillNames[0]} skill`);
        } else {
          reasons.push(`This goal relates to ${skills.length} skills you're developing`);
        }
      }
    }

    // Only return if we have high-confidence meaning
    if (reasons.length === 0) {
      return null;
    }

    // Combine reasons into one sentence
    let summary: string;
    if (reasons.length === 1) {
      summary = reasons[0] + '.';
    } else {
      summary = reasons.slice(0, -1).join(', ') + ', and ' + reasons[reasons.length - 1] + '.';
    }

    return {
      summary,
      contributors: contributors.length > 0 ? contributors : undefined,
      confidence: 'high',
    };
  } catch (err) {
    console.error('[meaningHelpers] Error getting goal meaning:', err);
    return null;
  }
}

// ============================================================================
// Skill Meaning
// ============================================================================

/**
 * Get "why this matters" context for a skill
 * Derived from: habits practicing it, goals it relates to
 */
export async function getWhyThisMattersForSkill(
  userId: string,
  skillId: string
): Promise<WhyThisMattersContext | null> {
  try {
    // Get habits practicing this skill
    const habits = await getHabitsPracticingSkill(userId, skillId);

    // Get goals linked to this skill (via skill_entity_links where skill_id matches)
    const goalLinks = await skillEntityLinksService.getLinksForSkill(userId, skillId);
    const goalEntityIds = goalLinks
      .filter(link => link.entity_type === 'goal')
      .map(link => link.entity_id);

    const contributors: string[] = [];
    const reasons: string[] = [];

    // Habit practice
    if (habits.length > 0) {
      const habitNames = habits.map(h => h.habit.title);
      contributors.push(...habitNames);
      
      if (habits.length === 1) {
        reasons.push(`This skill is strengthened by your ${habitNames[0]} habit`);
      } else if (habits.length === 2) {
        reasons.push(`This skill is strengthened by ${habitNames[0]} and ${habitNames[1]}`);
      } else {
        reasons.push(`This skill is strengthened by ${habits.length} habits`);
      }
    }

    // Goal relationships
    if (goalEntityIds.length > 0) {
      // goalEntityIds are activity IDs (goal_activity_id in goals table)
      // Fetch goals that reference these activities
      const { data: goals } = await supabase
        .from('goals')
        .select('goal_activity_id')
        .eq('owner_id', userId)
        .in('goal_activity_id', goalEntityIds)
        .eq('status', 'active');

      if (goals && goals.length > 0) {
        // Fetch activity titles (goalEntityIds are already activity IDs)
        const goalActivities = await Promise.all(
          goalEntityIds.map(activityId => getActivity(activityId))
        );
        const validGoals = goalActivities.filter(a => a !== null);
        
        if (validGoals.length > 0) {
          const goalNames = validGoals.map(a => a!.title);
          contributors.push(...goalNames);
          
          if (validGoals.length === 1) {
            reasons.push(`This skill supports your goal to ${goalNames[0].toLowerCase()}`);
          } else {
            reasons.push(`This skill supports ${validGoals.length} of your goals`);
          }
        }
      }
    }

    // Only return if we have high-confidence meaning
    if (reasons.length === 0) {
      return null;
    }

    // Combine reasons into one sentence
    let summary: string;
    if (reasons.length === 1) {
      summary = reasons[0] + '.';
    } else {
      summary = reasons.slice(0, -1).join(', ') + ', and ' + reasons[reasons.length - 1] + '.';
    }

    return {
      summary,
      contributors: contributors.length > 0 ? contributors : undefined,
      confidence: 'high',
    };
  } catch (err) {
    console.error('[meaningHelpers] Error getting skill meaning:', err);
    return null;
  }
}

// ============================================================================
// Task Meaning
// ============================================================================

/**
 * Get "why this matters" context for a task
 * Derived from: habit it's derived from, goals it contributes to, skills it develops
 */
export async function getWhyThisMattersForTask(
  userId: string,
  taskId: string
): Promise<WhyThisMattersContext | null> {
  try {
    // Get task data
    const { data: task } = await supabase
      .from('personal_todos')
      .select('habit_activity_id, title')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single();

    if (!task) {
      return null;
    }

    const contributors: string[] = [];
    const reasons: string[] = [];

    // Habit derivation
    if (task.habit_activity_id) {
      try {
        const habitActivity = await getActivity(task.habit_activity_id);
        if (habitActivity) {
          contributors.push(habitActivity.title);
          reasons.push(`This task is part of your ${habitActivity.title} habit`);
        }
      } catch (err) {
        // Non-fatal: continue without habit context
      }
    }

    // Goal contributions (via goal_requirements)
    const { data: goalRequirements } = await supabase
      .from('goal_requirements')
      .select('goal_id')
      .eq('required_activity_id', taskId)
      .eq('requirement_type', 'task_complete');

    if (goalRequirements && goalRequirements.length > 0) {
      const goalIds = goalRequirements.map(r => r.goal_id);
      const { data: goals } = await supabase
        .from('goals')
        .select('goal_activity_id')
        .eq('owner_id', userId)
        .in('id', goalIds)
        .eq('status', 'active');

      if (goals && goals.length > 0) {
        const goalActivities = await Promise.all(
          goals.map(g => getActivity(g.goal_activity_id))
        );
        const validGoals = goalActivities.filter(a => a !== null);
        
        if (validGoals.length > 0) {
          const goalNames = validGoals.map(a => a!.title);
          contributors.push(...goalNames);
          
          if (validGoals.length === 1) {
            reasons.push(`This task contributes to your goal to ${goalNames[0].toLowerCase()}`);
          } else {
            reasons.push(`This task contributes to ${validGoals.length} of your goals`);
          }
        }
      }
    }

    // Skill development (via skill_entity_links)
    const skillLinks = await skillEntityLinksService.getLinksForEntity(userId, 'task', taskId);
    if (skillLinks.length > 0) {
      const skillIds = skillLinks.map(link => link.skill_id);
      const { data: skills } = await supabase
        .from('user_skills')
        .select('name')
        .eq('user_id', userId)
        .in('id', skillIds);

      if (skills && skills.length > 0) {
        const skillNames = skills.map(s => s.name);
        contributors.push(...skillNames);
        
        if (skills.length === 1) {
          reasons.push(`This task develops your ${skillNames[0]} skill`);
        } else {
          reasons.push(`This task develops ${skills.length} skills you're working on`);
        }
      }
    }

    // Only return if we have high-confidence meaning
    if (reasons.length === 0) {
      return null;
    }

    // Combine reasons into one sentence
    let summary: string;
    if (reasons.length === 1) {
      summary = reasons[0] + '.';
    } else {
      summary = reasons.slice(0, -1).join(', ') + ', and ' + reasons[reasons.length - 1] + '.';
    }

    return {
      summary,
      contributors: contributors.length > 0 ? contributors : undefined,
      confidence: 'high',
    };
  } catch (err) {
    console.error('[meaningHelpers] Error getting task meaning:', err);
    return null;
  }
}
