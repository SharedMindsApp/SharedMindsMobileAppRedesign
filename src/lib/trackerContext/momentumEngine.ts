/**
 * Momentum Engine
 * 
 * Centralized heuristics for determining momentum status and generating insights.
 * Used by all trackers (Habits, Goals, Skills, etc.) to ensure consistency.
 * 
 * This is a read-only engine - no side effects, no writes.
 */

import type {
  MomentumInput,
  MomentumResult,
  MomentumStatus,
  ContextInsight,
  InsightConfidence,
  ContextEntityType,
  SkillMomentumInput,
} from './contextTypes';

// ============================================================================
// Momentum Thresholds (Centralized)
// ============================================================================

/**
 * Thresholds for momentum classification
 * These are the single source of truth for all momentum calculations
 */
const MOMENTUM_THRESHOLDS = {
  // On track: high completion rate + good streak
  ON_TRACK_COMPLETION_RATE: 80, // 80% or higher
  ON_TRACK_MIN_STREAK: 3, // At least 3 days
  
  // Inconsistent: moderate completion rate
  INCONSISTENT_MIN_COMPLETION_RATE: 50, // 50% or higher but below 80%
  
  // Stalled: low completion rate or no recent activity
  STALLED_MAX_COMPLETION_RATE: 50, // Below 50%
  STALLED_MAX_RECENCY: 7, // No activity in last 7 days
} as const;

// ============================================================================
// Momentum Calculation
// ============================================================================

/**
 * Calculate momentum status from input data
 * Returns status and optional high-confidence insight
 */
export function calculateMomentum(
  input: MomentumInput,
  source: ContextEntityType
): MomentumResult {
  // Default to unknown if insufficient data
  if (input.completionRate7d === undefined || input.completionRate7d === null) {
    return {
      status: 'unknown',
      insight: null,
    };
  }

  let status: MomentumStatus = 'unknown';
  const insights: ContextInsight[] = [];

  // Pattern 1: On Track
  if (
    input.completionRate7d >= MOMENTUM_THRESHOLDS.ON_TRACK_COMPLETION_RATE &&
    input.currentStreak >= MOMENTUM_THRESHOLDS.ON_TRACK_MIN_STREAK
  ) {
    status = 'on_track';
    
    // Standardized language for on_track status
    insights.push({
      text: "Progress is steady and consistent.",
      confidence: 'high',
      source,
      momentumStatus: 'on_track',
    });
  }

  // Pattern 2: Inconsistent
  else if (
    input.completionRate7d >= MOMENTUM_THRESHOLDS.INCONSISTENT_MIN_COMPLETION_RATE &&
    input.completionRate7d < MOMENTUM_THRESHOLDS.ON_TRACK_COMPLETION_RATE
  ) {
    status = 'inconsistent';
    
    insights.push({
      text: "Consistency may need attention.",
      confidence: 'high',
      source,
      momentumStatus: 'inconsistent',
    });
  }

  // Pattern 3: Stalled
  else if (input.completionRate7d < MOMENTUM_THRESHOLDS.STALLED_MAX_COMPLETION_RATE) {
    status = 'stalled';
    
    // Standardized language for stalled status
    insights.push({
      text: "Progress may be slowing.",
      confidence: 'high',
      source,
      momentumStatus: 'stalled',
    });
  }

  // Pattern 4: Unknown (insufficient data)
  else {
    status = 'unknown';
    // No insight for unknown status
  }

  // Return first high-confidence insight, or null
  const highConfidenceInsight = insights.find(i => i.confidence === 'high');
  
  return {
    status,
    insight: highConfidenceInsight || null,
  };
}

// ============================================================================
// Aggregate Momentum (for goals with multiple habits)
// ============================================================================

/**
 * Calculate aggregate momentum from multiple entities
 * Used for goals that have multiple habit requirements
 */
export function calculateAggregateMomentum(
  individualMomentums: MomentumStatus[]
): MomentumResult {
  if (individualMomentums.length === 0) {
    return {
      status: 'unknown',
      insight: null,
    };
  }

  const onTrackCount = individualMomentums.filter(s => s === 'on_track').length;
  const inconsistentCount = individualMomentums.filter(s => s === 'inconsistent').length;
  const stalledCount = individualMomentums.filter(s => s === 'stalled').length;
  const total = individualMomentums.length;

  let status: MomentumStatus = 'unknown';
  const insights: ContextInsight[] = [];

  // Pattern: All on track
  if (onTrackCount === total && total > 0) {
    status = 'on_track';
    insights.push({
      text: "Progress is steady and consistent.",
      confidence: 'high',
      source: 'goal',
      momentumStatus: 'on_track',
    });
  }

  // Pattern: Most on track
  else if (onTrackCount >= total * 0.7 && total >= 2) {
    status = 'on_track';
    insights.push({
      text: "Progress is steady and consistent.",
      confidence: 'high',
      source: 'goal',
      momentumStatus: 'on_track',
    });
  }

  // Pattern: Most stalled
  else if (stalledCount >= total * 0.7 && total >= 2) {
    status = 'stalled';
    insights.push({
      text: "Progress may be slowing.",
      confidence: 'high',
      source: 'goal',
      momentumStatus: 'stalled',
    });
  }

  // Pattern: Mixed performance
  else if (inconsistentCount >= total * 0.5 && total >= 2) {
    status = 'inconsistent';
    insights.push({
      text: "Consistency may need attention.",
      confidence: 'high',
      source: 'goal',
      momentumStatus: 'inconsistent',
    });
  }

  // Pattern: Single entity on track
  else if (total === 1 && onTrackCount === 1) {
    status = 'on_track';
    insights.push({
      text: "Progress is steady and consistent.",
      confidence: 'high',
      source: 'goal',
      momentumStatus: 'on_track',
    });
  }

  // Pattern: Single entity struggling
  else if (total === 1 && (stalledCount === 1 || inconsistentCount === 1)) {
    status = stalledCount === 1 ? 'stalled' : 'inconsistent';
    insights.push({
      text: status === 'stalled' ? "Progress may be slowing." : "Consistency may need attention.",
      confidence: 'high',
      source: 'goal',
      momentumStatus: status,
    });
  }

  // Return first high-confidence insight, or null
  const highConfidenceInsight = insights.find(i => i.confidence === 'high');
  
  return {
    status,
    insight: highConfidenceInsight || null,
  };
}

// ============================================================================
// Insight Language Helpers
// ============================================================================

/**
 * Get standardized insight text for a momentum status
 * Ensures consistent language across all trackers
 */
export function getStandardizedInsightText(
  status: MomentumStatus,
  source: ContextEntityType,
  context?: {
    trend?: 'up' | 'down' | 'stable';
    isAggregate?: boolean;
  }
): string | null {
  // Only return high-confidence insights
  switch (status) {
    case 'on_track':
      if (context?.trend === 'up') {
        return "Progress is steady and improving.";
      }
      if (context?.isAggregate) {
        return "Progress is steady with most activities on track.";
      }
      return "Progress is steady and consistent.";
    
    case 'inconsistent':
      if (context?.isAggregate) {
        return "Consistency may need attention to stay on track.";
      }
      return "Consistency may need attention.";
    
    case 'stalled':
      if (context?.isAggregate) {
        return "Progress may stall if consistency doesn't improve.";
      }
      return "Progress may be slowing.";
    
    case 'unknown':
    default:
      return null; // No insight for unknown status
  }
}

// ============================================================================
// Skill Momentum Calculation
// ============================================================================

/**
 * Calculate skill momentum from evidence data
 * Uses usage_count, last_used_at, and recent evidence density
 * 
 * This is read-only - no side effects, no writes
 */
export function calculateSkillMomentum(
  input: SkillMomentumInput
): MomentumResult {
  // Default to unknown if insufficient data
  if (input.usage_count === 0) {
    return {
      status: 'unknown',
      insight: null,
    };
  }

  // Calculate recency (days since last use)
  let recency: number | undefined;
  if (input.last_used_at) {
    const lastUsed = new Date(input.last_used_at);
    const now = new Date();
    recency = Math.floor((now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Calculate practice frequency metrics
  // Convert evidence counts to "completion rate" equivalents for consistency
  const targetWeeklyPractice = 3; // Target: 3 practices per week
  const targetDailyPractice = 0.43; // ~3/7 practices per day
  
  // 7-day practice rate (as percentage of target)
  const practiceRate7d = Math.min(100, (input.evidenceCount7d / (targetWeeklyPractice)) * 100);
  
  // 30-day practice rate (as percentage of target)
  const practiceRate30d = Math.min(100, (input.evidenceCount30d / (targetWeeklyPractice * 4.3)) * 100);

  let status: MomentumStatus = 'unknown';
  const insights: ContextInsight[] = [];

  // Pattern 1: On Track
  // High practice frequency + recent activity
  if (
    practiceRate7d >= MOMENTUM_THRESHOLDS.ON_TRACK_COMPLETION_RATE &&
    (recency === undefined || recency <= 3) &&
    input.evidenceCount7d >= 2
  ) {
    status = 'on_track';
    
    insights.push({
      text: "Progress is steady and consistent.",
      confidence: 'high',
      source: 'skill',
      momentumStatus: 'on_track',
    });
  }

  // Pattern 2: Inconsistent
  // Moderate practice frequency
  else if (
    practiceRate7d >= MOMENTUM_THRESHOLDS.INCONSISTENT_MIN_COMPLETION_RATE &&
    practiceRate7d < MOMENTUM_THRESHOLDS.ON_TRACK_COMPLETION_RATE
  ) {
    status = 'inconsistent';
    
    insights.push({
      text: "Consistency may need attention.",
      confidence: 'high',
      source: 'skill',
      momentumStatus: 'inconsistent',
    });
  }

  // Pattern 3: Stalled
  // Low practice frequency or no recent activity
  else if (
    practiceRate7d < MOMENTUM_THRESHOLDS.STALLED_MAX_COMPLETION_RATE ||
    (recency !== undefined && recency > MOMENTUM_THRESHOLDS.STALLED_MAX_RECENCY)
  ) {
    status = 'stalled';
    
    insights.push({
      text: "Progress may be slowing.",
      confidence: 'high',
      source: 'skill',
      momentumStatus: 'stalled',
    });
  }

  // Pattern 4: Unknown (insufficient data)
  else {
    status = 'unknown';
    // No insight for unknown status
  }

  // Return first high-confidence insight, or null
  const highConfidenceInsight = insights.find(i => i.confidence === 'high');
  
  return {
    status,
    insight: highConfidenceInsight || null,
  };
}
