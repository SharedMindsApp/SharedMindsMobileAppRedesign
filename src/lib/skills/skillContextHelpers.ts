/**
 * Skill Context Helpers
 * 
 * Read-only helper functions to surface contextual information about skills:
 * - Skill momentum based on evidence
 * - Habits that practice this skill
 * - Recent practice summary
 * 
 * These are selector-style functions - no side effects, no writes.
 */

import { supabase } from '../supabase';
import { getActivity } from '../activities/activityService';
import { skillEvidenceService } from '../skillsIntelligence';
import { calculateSkillMomentum } from '../trackerContext/momentumEngine';
import { skillsService } from '../skillsService';
import type { UserSkill } from '../skillsService';
import type { MomentumResult } from '../trackerContext/momentumEngine';

// ============================================================================
// Skill Momentum
// ============================================================================

/**
 * Get skill momentum based on evidence data
 * Read-only: Analyzes existing evidence to determine momentum status
 */
export async function getSkillMomentum(
  userId: string,
  skillId: string
): Promise<MomentumResult> {
  try {
    // Get skill data
    const skill = await skillsService.getById(skillId);
    
    if (!skill || skill.user_id !== userId) {
      return {
        status: 'unknown',
        insight: null,
      };
    }

    // Get recent evidence (last 30 days)
    const recentEvidence = await skillEvidenceService.getRecentEvidence(userId, 30);
    const skillEvidence = recentEvidence.filter(e => e.skill_id === skillId);

    // Calculate evidence counts
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const evidenceCount7d = skillEvidence.filter(
      e => new Date(e.occurred_at) >= sevenDaysAgo
    ).length;

    const evidenceCount30d = skillEvidence.filter(
      e => new Date(e.occurred_at) >= thirtyDaysAgo
    ).length;

    // Calculate momentum using shared engine
    const momentumResult = calculateSkillMomentum({
      usage_count: skill.usage_count || 0,
      last_used_at: skill.last_used_at || null,
      evidenceCount7d,
      evidenceCount30d,
    });

    return momentumResult;
  } catch (err) {
    console.error('[skillContextHelpers] Error calculating skill momentum:', err);
    return {
      status: 'unknown',
      insight: null,
    };
  }
}

// ============================================================================
// Habits Practicing Skill
// ============================================================================

export interface HabitPracticingSkill {
  habit: {
    id: string;
    title: string;
    description: string | null;
  };
  evidenceCount7d: number;
  evidenceCount30d: number;
}

/**
 * Get habits that practice this skill (via skill_practice mapping)
 * Read-only: Returns habits linked via metadata.skill_practice
 */
export async function getHabitsPracticingSkill(
  userId: string,
  skillId: string
): Promise<HabitPracticingSkill[]> {
  try {
    // Get all user habits
    const { data: activities, error } = await supabase
      .from('activities')
      .select('*')
      .eq('owner_id', userId)
      .eq('type', 'habit')
      .eq('status', 'active');

    if (error) {
      console.error('[skillContextHelpers] Error fetching habits:', error);
      return [];
    }

    if (!activities || activities.length === 0) {
      return [];
    }

    // Filter habits that have skill_practice mapping to this skill
    const practicingHabits = activities.filter(
      activity => activity.metadata?.skill_practice?.skill_id === skillId
    );

    if (practicingHabits.length === 0) {
      return [];
    }

    // Get recent evidence to count practice frequency
    const recentEvidence = await skillEvidenceService.getRecentEvidence(userId, 30);
    const skillEvidence = recentEvidence.filter(e => e.skill_id === skillId);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Build result with practice counts per habit
    const result: HabitPracticingSkill[] = [];

    for (const habit of practicingHabits) {
      // Count evidence from this habit
      const habitEvidence = skillEvidence.filter(
        e => e.reference_id === habit.id && e.evidence_type === 'habit'
      );

      const evidenceCount7d = habitEvidence.filter(
        e => new Date(e.occurred_at) >= sevenDaysAgo
      ).length;

      const evidenceCount30d = habitEvidence.filter(
        e => new Date(e.occurred_at) >= thirtyDaysAgo
      ).length;

      result.push({
        habit: {
          id: habit.id,
          title: habit.title,
          description: habit.description,
        },
        evidenceCount7d,
        evidenceCount30d,
      });
    }

    return result;
  } catch (err) {
    console.error('[skillContextHelpers] Error getting habits practicing skill:', err);
    return [];
  }
}

// ============================================================================
// Recent Practice Summary
// ============================================================================

export interface RecentPracticeSummary {
  evidenceCount7d: number;
  evidenceCount30d: number;
  lastPracticeDate: string | null;
  practiceFrequency: 'frequent' | 'moderate' | 'occasional' | 'rare';
}

/**
 * Get recent practice summary for a skill
 * Read-only: Analyzes evidence data to provide practice frequency context
 */
export async function getRecentPracticeSummary(
  userId: string,
  skillId: string
): Promise<RecentPracticeSummary> {
  try {
    // Get recent evidence (last 30 days)
    const recentEvidence = await skillEvidenceService.getRecentEvidence(userId, 30);
    const skillEvidence = recentEvidence.filter(e => e.skill_id === skillId);

    if (skillEvidence.length === 0) {
      return {
        evidenceCount7d: 0,
        evidenceCount30d: 0,
        lastPracticeDate: null,
        practiceFrequency: 'rare',
      };
    }

    // Calculate evidence counts
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const evidenceCount7d = skillEvidence.filter(
      e => new Date(e.occurred_at) >= sevenDaysAgo
    ).length;

    const evidenceCount30d = skillEvidence.filter(
      e => new Date(e.occurred_at) >= thirtyDaysAgo
    ).length;

    // Get most recent practice date
    const sortedEvidence = [...skillEvidence].sort(
      (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    );
    const lastPracticeDate = sortedEvidence[0]?.occurred_at || null;

    // Determine practice frequency
    let practiceFrequency: RecentPracticeSummary['practiceFrequency'] = 'rare';
    if (evidenceCount7d >= 3) {
      practiceFrequency = 'frequent';
    } else if (evidenceCount7d >= 1) {
      practiceFrequency = 'moderate';
    } else if (evidenceCount30d >= 1) {
      practiceFrequency = 'occasional';
    }

    return {
      evidenceCount7d,
      evidenceCount30d,
      lastPracticeDate,
      practiceFrequency,
    };
  } catch (err) {
    console.error('[skillContextHelpers] Error getting recent practice summary:', err);
    return {
      evidenceCount7d: 0,
      evidenceCount30d: 0,
      lastPracticeDate: null,
      practiceFrequency: 'rare',
    };
  }
}
