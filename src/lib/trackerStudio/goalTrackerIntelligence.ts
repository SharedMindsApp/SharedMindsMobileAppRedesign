/**
 * Goal Tracker Intelligence Service
 * 
 * Provides intelligent insights and suggestions for goal tracking:
 * - Progress momentum analysis
 * - Milestone detection
 * - Next steps suggestions
 * - Obstacle pattern recognition
 * - Progress velocity calculations
 */

import { listEntriesByDateRange } from './trackerEntryService';
import type { Tracker, TrackerEntry } from './types';

export interface GoalProgressInsight {
  goalName: string;
  currentProgress: number;
  previousProgress: number;
  velocity: number; // Change in progress (positive = improving, negative = declining)
  momentum: 'accelerating' | 'steady' | 'slowing' | 'stalled' | 'regressing';
  daysSinceStart: number;
  daysRemaining: number | null;
  projectedCompletionDate: string | null;
  milestoneReached: boolean;
  milestoneDetails: string | null;
  isOnTrack: boolean;
  suggestion: string | null;
}

export interface GoalPattern {
  goalName: string;
  entries: TrackerEntry[];
  averageProgress: number;
  currentProgress: number;
  highestProgress: number;
  progressTrend: 'upward' | 'stable' | 'downward' | 'volatile';
  commonObstacles: string[];
  commonActions: string[];
  milestoneFrequency: number; // How often milestones are achieved
  averageVelocity: number;
}

/**
 * Calculate progress velocity (change in progress between entries)
 */
export function calculateProgressVelocity(
  currentProgress: number,
  previousProgress: number | null
): number {
  if (previousProgress === null || previousProgress === undefined) {
    return 0;
  }
  return currentProgress - previousProgress;
}

/**
 * Determine momentum based on progress velocity over time
 */
export function calculateMomentum(
  velocities: number[]
): 'accelerating' | 'steady' | 'slowing' | 'stalled' | 'regressing' {
  if (velocities.length === 0) return 'steady';
  
  const recent = velocities.slice(-3); // Last 3 entries
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgOverall = velocities.reduce((a, b) => a + b, 0) / velocities.length;
  
  if (avgRecent > 5 && avgRecent > avgOverall) return 'accelerating';
  if (avgRecent < -5) return 'regressing';
  if (avgRecent < -1) return 'slowing';
  if (Math.abs(avgRecent) < 1) return 'stalled';
  return 'steady';
}

/**
 * Detect milestone achievements
 */
export function detectMilestones(
  currentProgress: number,
  previousProgress: number | null
): { reached: boolean; details: string | null } {
  if (previousProgress === null || previousProgress === undefined) {
    return { reached: false, details: null };
  }
  
  const milestonePoints = [10, 25, 50, 75, 90, 100];
  
  for (const milestone of milestonePoints) {
    if (previousProgress < milestone && currentProgress >= milestone) {
      return {
        reached: true,
        details: `Reached ${milestone}% milestone! 🎉`,
      };
    }
  }
  
  return { reached: false, details: null };
}

/**
 * Generate intelligent suggestion based on goal state
 */
export function generateGoalSuggestion(insight: GoalProgressInsight): string | null {
  if (insight.progressVelocity < -5) {
    return "Progress has decreased. Consider what obstacles you're facing and what support you need.";
  }
  
  if (insight.progressVelocity > 5) {
    return "Great progress! Keep up the momentum. What's working well for you?";
  }
  
  if (insight.daysRemaining !== null && insight.daysRemaining > 0) {
    const requiredVelocity = (100 - insight.currentProgress) / insight.daysRemaining;
    if (insight.velocity < requiredVelocity && insight.velocity > 0) {
      return `To reach your goal on time, aim for ${requiredVelocity.toFixed(1)}% progress per day. You're currently at ${insight.velocity.toFixed(1)}%.`;
    }
  }
  
  if (insight.currentProgress >= 90 && insight.currentProgress < 100) {
    return "You're so close! What's the final push you need to cross the finish line?";
  }
  
  if (insight.momentum === 'stalled' || insight.momentum === 'regressing') {
    return "Progress has stalled. What obstacles are in your way? What support could help?";
  }
  
  return null;
}

/**
 * Analyze goal entries to generate insights
 */
export async function analyzeGoalProgress(
  tracker: Tracker,
  goalName: string,
  entryDate: string
): Promise<GoalProgressInsight | null> {
  try {
    // Get recent entries for this goal
    const startDate = new Date(entryDate);
    startDate.setDate(startDate.getDate() - 90); // Last 90 days
    
    const entries = await listEntriesByDateRange({
      tracker_id: tracker.id,
      start_date: startDate.toISOString().split('T')[0],
      end_date: entryDate,
    });
    
    // Filter entries for this specific goal
    const goalEntries = entries
      .filter(entry => {
        const entryGoalName = entry.field_values?.goal_name as string;
        return entryGoalName && entryGoalName.toLowerCase() === goalName.toLowerCase();
      })
      .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime());
    
    if (goalEntries.length === 0) {
      return null;
    }
    
    const latestEntry = goalEntries[goalEntries.length - 1];
    const previousEntry = goalEntries.length > 1 ? goalEntries[goalEntries.length - 2] : null;
    
    const currentProgress = (latestEntry.field_values?.progress as number) || 0;
    const previousProgress = previousEntry ? ((previousEntry.field_values?.progress as number) || 0) : null;
    
    const velocity = calculateProgressVelocity(currentProgress, previousProgress);
    
    // Calculate velocities over time
    const velocities: number[] = [];
    for (let i = 1; i < goalEntries.length; i++) {
      const current = (goalEntries[i].field_values?.progress as number) || 0;
      const previous = (goalEntries[i - 1].field_values?.progress as number) || 0;
      velocities.push(current - previous);
    }
    
    const momentum = calculateMomentum(velocities);
    const milestone = detectMilestones(currentProgress, previousProgress);
    
    // Calculate days
    const startDateStr = latestEntry.field_values?.start_date as string || goalEntries[0].entry_date;
    const startDateObj = new Date(startDateStr);
    const currentDateObj = new Date(entryDate);
    const daysSinceStart = Math.floor((currentDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate days remaining
    const targetDateStr = latestEntry.field_values?.target_date as string;
    let daysRemaining: number | null = null;
    let projectedCompletionDate: string | null = null;
    
    if (targetDateStr) {
      const targetDate = new Date(targetDateStr);
      daysRemaining = Math.max(0, Math.floor((targetDate.getTime() - currentDateObj.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Project completion date based on current velocity
      if (velocity > 0 && currentProgress < 100) {
        const remainingProgress = 100 - currentProgress;
        const daysToComplete = remainingProgress / velocity;
        const projectedDate = new Date(currentDateObj);
        projectedDate.setDate(projectedDate.getDate() + daysToComplete);
        projectedCompletionDate = projectedDate.toISOString().split('T')[0];
      }
    }
    
    // Determine if on track
    const isOnTrack = daysRemaining === null || 
      (daysRemaining > 0 && velocity > 0 && (100 - currentProgress) / daysRemaining <= velocity * 1.5);
    
    const suggestion = generateGoalSuggestion({
      goalName,
      currentProgress,
      previousProgress: previousProgress || 0,
      velocity,
      momentum,
      daysSinceStart,
      daysRemaining,
      projectedCompletionDate,
      milestoneReached: milestone.reached,
      milestoneDetails: milestone.details,
      isOnTrack,
      suggestion: null,
    });
    
    return {
      goalName,
      currentProgress,
      previousProgress: previousProgress || 0,
      velocity,
      momentum,
      daysSinceStart,
      daysRemaining,
      projectedCompletionDate,
      milestoneReached: milestone.reached,
      milestoneDetails: milestone.details,
      isOnTrack,
      suggestion,
    };
  } catch (error) {
    console.error('Error analyzing goal progress:', error);
    return null;
  }
}

/**
 * Get goal pattern analysis
 */
export async function getGoalPattern(
  tracker: Tracker,
  goalName: string
): Promise<GoalPattern | null> {
  try {
    const entries = await listEntriesByDateRange({
      tracker_id: tracker.id,
      start_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
    });
    
    const goalEntries = entries
      .filter(entry => {
        const entryGoalName = entry.field_values?.goal_name as string;
        return entryGoalName && entryGoalName.toLowerCase() === goalName.toLowerCase();
      })
      .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime());
    
    if (goalEntries.length === 0) {
      return null;
    }
    
    const progresses = goalEntries.map(e => (e.field_values?.progress as number) || 0);
    const averageProgress = progresses.reduce((a, b) => a + b, 0) / progresses.length;
    const currentProgress = progresses[progresses.length - 1];
    const highestProgress = Math.max(...progresses);
    
    // Calculate trend
    const velocities: number[] = [];
    for (let i = 1; i < progresses.length; i++) {
      velocities.push(progresses[i] - progresses[i - 1]);
    }
    const avgVelocity = velocities.length > 0 ? velocities.reduce((a, b) => a + b, 0) / velocities.length : 0;
    
    let progressTrend: 'upward' | 'stable' | 'downward' | 'volatile';
    if (velocities.length === 0) {
      progressTrend = 'stable';
    } else if (avgVelocity > 1) {
      progressTrend = 'upward';
    } else if (avgVelocity < -1) {
      progressTrend = 'downward';
    } else if (velocities.some(v => Math.abs(v) > 10)) {
      progressTrend = 'volatile';
    } else {
      progressTrend = 'stable';
    }
    
    // Extract common obstacles and actions
    const obstacles: string[] = [];
    const actions: string[] = [];
    let milestoneCount = 0;
    
    goalEntries.forEach(entry => {
      const obstacle = entry.field_values?.obstacle_challenge as string;
      const action = entry.field_values?.action_taken as string;
      const milestone = entry.field_values?.milestone as string;
      
      if (obstacle && obstacle.trim()) obstacles.push(obstacle.trim());
      if (action && action.trim()) actions.push(action.trim());
      if (milestone && milestone.trim()) milestoneCount++;
    });
    
    return {
      goalName,
      entries: goalEntries,
      averageProgress,
      currentProgress,
      highestProgress,
      progressTrend,
      commonObstacles: [...new Set(obstacles)].slice(0, 5),
      commonActions: [...new Set(actions)].slice(0, 5),
      milestoneFrequency: goalEntries.length > 0 ? milestoneCount / goalEntries.length : 0,
      averageVelocity: avgVelocity,
    };
  } catch (error) {
    console.error('Error getting goal pattern:', error);
    return null;
  }
}
