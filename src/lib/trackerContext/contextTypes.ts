/**
 * Tracker Context Types
 * 
 * Shared types for contextual information and insights across all trackers.
 * These types are tracker-agnostic and can be used by Habits, Goals, Skills, etc.
 */

// ============================================================================
// Entity Types
// ============================================================================

export type ContextEntityType = 'habit' | 'goal' | 'skill' | 'task';

// ============================================================================
// Momentum Status
// ============================================================================

/**
 * Momentum status indicates the current trajectory of an entity
 * Based on streaks, completion rates, and recency
 */
export type MomentumStatus = 'on_track' | 'inconsistent' | 'stalled' | 'unknown';

// ============================================================================
// Insight Confidence
// ============================================================================

/**
 * Confidence level for insights
 * Only high-confidence insights should be displayed to users
 */
export type InsightConfidence = 'high' | 'medium' | 'low';

// ============================================================================
// Context Insight
// ============================================================================

/**
 * A contextual insight about an entity
 * Read-only, informational only
 */
export interface ContextInsight {
  text: string; // One sentence max
  confidence: InsightConfidence;
  source: ContextEntityType; // Which tracker this insight relates to
  momentumStatus?: MomentumStatus; // Optional momentum context
}

// ============================================================================
// Momentum Input
// ============================================================================

/**
 * Input data for momentum calculation
 * Generic enough to work across all tracker types
 */
export interface MomentumInput {
  currentStreak: number;
  completionRate7d: number; // 0-100
  completionRate30d?: number; // 0-100, optional
  trend?: 'up' | 'down' | 'stable' | null;
  recency?: number; // Days since last completion, optional
}

/**
 * Skill-specific momentum input
 * Derived from evidence data (usage_count, last_used_at, evidence density)
 */
export interface SkillMomentumInput {
  usage_count: number;
  last_used_at?: string | null; // ISO timestamp
  evidenceCount7d: number; // Number of evidence records in last 7 days
  evidenceCount30d: number; // Number of evidence records in last 30 days
}

// ============================================================================
// Momentum Result
// ============================================================================

/**
 * Result of momentum calculation
 * Includes status and optional insight
 */
export interface MomentumResult {
  status: MomentumStatus;
  insight: ContextInsight | null; // Only high-confidence insights
}
