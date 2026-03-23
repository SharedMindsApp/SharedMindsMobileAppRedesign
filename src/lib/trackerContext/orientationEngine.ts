/**
 * Orientation Engine
 * 
 * Read-only engine that derives orientation signals from user behavior patterns.
 * Helps users understand where their attention naturally wants to go.
 * 
 * This is a mirror, not a planner - it reflects behavior, doesn't direct it.
 */

import type {
  ContextEntityType,
  InsightConfidence,
} from './contextTypes';

// ============================================================================
// Types
// ============================================================================

export type OrientationReason = 'recent_activity' | 'momentum' | 'stalled' | 'emerging';

export interface OrientationSignal {
  entityType: ContextEntityType;
  entityId: string;
  entityTitle: string;
  reason: OrientationReason;
  summary: string; // One short sentence
  confidence: InsightConfidence;
}

// ============================================================================
// Signal Generation Rules
// ============================================================================

/**
 * Generate orientation signal for a habit based on recent activity
 */
export function generateHabitOrientationSignal(
  habitId: string,
  habitTitle: string,
  data: {
    lastCheckinDate?: string | null; // YYYY-MM-DD
    daysSinceLastCheckin?: number;
    currentStreak?: number;
    completionRate7d?: number;
  }
): OrientationSignal | null {
  // Only generate high-confidence signals
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Signal 1: Recent activity (checked in today or yesterday)
  if (data.lastCheckinDate) {
    const daysSince = data.daysSinceLastCheckin ?? 0;
    if (daysSince <= 1) {
      return {
        entityType: 'habit',
        entityId: habitId,
        entityTitle: habitTitle,
        reason: 'recent_activity',
        summary: `You've been engaging with this habit recently.`,
        confidence: 'high',
      };
    }
  }

  // Signal 2: Momentum (good streak + high completion rate)
  if (
    data.currentStreak !== undefined &&
    data.completionRate7d !== undefined &&
    data.currentStreak >= 3 &&
    data.completionRate7d >= 80
  ) {
    return {
      entityType: 'habit',
      entityId: habitId,
      entityTitle: habitTitle,
      reason: 'momentum',
      summary: `This habit has strong momentum right now.`,
      confidence: 'high',
    };
  }

  // Signal 3: Stalled (no activity in last 7 days, but was active before)
  if (
    data.daysSinceLastCheckin !== undefined &&
    data.daysSinceLastCheckin > 7 &&
    data.lastCheckinDate // Was active at some point
  ) {
    return {
      entityType: 'habit',
      entityId: habitId,
      entityTitle: habitTitle,
      reason: 'stalled',
      summary: `This habit has been quiet recently.`,
      confidence: 'high',
    };
  }

  return null; // No high-confidence signal
}

/**
 * Generate orientation signal for a skill based on evidence recency
 */
export function generateSkillOrientationSignal(
  skillId: string,
  skillName: string,
  data: {
    lastUsedAt?: string | null; // ISO timestamp
    daysSinceLastUse?: number;
    evidenceCount7d?: number;
    evidenceCount30d?: number;
  }
): OrientationSignal | null {
  // Signal 1: Recent activity (evidence in last 2 days)
  if (data.daysSinceLastUse !== undefined && data.daysSinceLastUse <= 2) {
    return {
      entityType: 'skill',
      entityId: skillId,
      entityTitle: skillName,
      reason: 'recent_activity',
      summary: `You've been engaging with this skill recently.`,
      confidence: 'high',
    };
  }

  // Signal 2: Emerging (new evidence in last 7 days, but low total)
  if (
    data.evidenceCount7d !== undefined &&
    data.evidenceCount30d !== undefined &&
    data.evidenceCount7d >= 2 &&
    data.evidenceCount30d < 10
  ) {
    return {
      entityType: 'skill',
      entityId: skillId,
      entityTitle: skillName,
      reason: 'emerging',
      summary: `This skill is showing early momentum.`,
      confidence: 'high',
    };
  }

  // Signal 3: Stalled (no evidence in last 14 days, but has history)
  if (
    data.daysSinceLastUse !== undefined &&
    data.daysSinceLastUse > 14 &&
    data.evidenceCount30d !== undefined &&
    data.evidenceCount30d > 0
  ) {
    return {
      entityType: 'skill',
      entityId: skillId,
      entityTitle: skillName,
      reason: 'stalled',
      summary: `This skill hasn't seen activity recently.`,
      confidence: 'high',
    };
  }

  return null; // No high-confidence signal
}

/**
 * Generate orientation signal for a goal based on momentum
 */
export function generateGoalOrientationSignal(
  goalId: string,
  goalTitle: string,
  data: {
    momentumStatus?: 'on_track' | 'inconsistent' | 'stalled' | 'unknown';
    habitContributorsCount?: number;
    onTrackHabitsCount?: number;
  }
): OrientationSignal | null {
  // Signal 1: Momentum (most habits on track)
  if (
    data.momentumStatus === 'on_track' &&
    data.habitContributorsCount !== undefined &&
    data.onTrackHabitsCount !== undefined &&
    data.habitContributorsCount > 0 &&
    data.onTrackHabitsCount >= data.habitContributorsCount * 0.7
  ) {
    return {
      entityType: 'goal',
      entityId: goalId,
      entityTitle: goalTitle,
      reason: 'momentum',
      summary: `This goal has seen steady progress lately.`,
      confidence: 'high',
    };
  }

  // Signal 2: Stalled (most habits stalled)
  if (
    data.momentumStatus === 'stalled' &&
    data.habitContributorsCount !== undefined &&
    data.habitContributorsCount > 0
  ) {
    return {
      entityType: 'goal',
      entityId: goalId,
      entityTitle: goalTitle,
      reason: 'stalled',
      summary: `This goal's progress has slowed recently.`,
      confidence: 'high',
    };
  }

  return null; // No high-confidence signal
}

/**
 * Generate orientation signal for a task based on completion patterns
 */
export function generateTaskOrientationSignal(
  taskId: string,
  taskTitle: string,
  data: {
    isHabitDerived?: boolean;
    completed?: boolean;
    completedAt?: string | null;
    daysSinceCompletion?: number;
  }
): OrientationSignal | null {
  // Signal 1: Recent completion (completed today or yesterday)
  if (data.completed && data.daysSinceCompletion !== undefined && data.daysSinceCompletion <= 1) {
    return {
      entityType: 'task',
      entityId: taskId,
      entityTitle: taskTitle,
      reason: 'recent_activity',
      summary: `You completed this task recently.`,
      confidence: 'high',
    };
  }

  // Signal 2: Habit-derived task (shows habit connection)
  if (data.isHabitDerived && !data.completed) {
    return {
      entityType: 'task',
      entityId: taskId,
      entityTitle: taskTitle,
      reason: 'emerging',
      summary: `This task is part of an active habit.`,
      confidence: 'high',
    };
  }

  return null; // No high-confidence signal
}
