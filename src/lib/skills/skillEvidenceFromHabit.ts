/**
 * Skill Evidence from Habit
 * 
 * Controlled, opt-in write path for recording skill practice evidence
 * when habits are completed.
 * 
 * This is a read-only helper that writes evidence records - it does NOT
 * automatically modify proficiency or confidence levels.
 */

import { supabase } from '../supabase';
import { getActivity } from '../activities/activityService';
import { skillEvidenceService } from '../skillsIntelligence';
import type { SkillEvidence, EvidenceType } from '../skillsIntelligence';

// ============================================================================
// Types
// ============================================================================

export interface HabitSkillPracticeConfig {
  skill_id: string;
  evidence_template?: string; // Optional template for evidence text
}

/**
 * Check if habit has skill practice mapping
 */
export function hasSkillPracticeMapping(activityMetadata: Record<string, any>): boolean {
  return !!(
    activityMetadata?.skill_practice &&
    activityMetadata.skill_practice.skill_id
  );
}

/**
 * Get skill practice config from habit metadata
 */
export function getSkillPracticeConfig(
  activityMetadata: Record<string, any>
): HabitSkillPracticeConfig | null {
  if (!hasSkillPracticeMapping(activityMetadata)) {
    return null;
  }

  return {
    skill_id: activityMetadata.skill_practice.skill_id,
    evidence_template: activityMetadata.skill_practice.evidence_template,
  };
}

// ============================================================================
// Skill Evidence Write Helper
// ============================================================================

/**
 * Record skill practice evidence from a habit check-in
 * 
 * This function:
 * - Creates a skill_evidence record
 * - Updates user_skills.usage_count (increments)
 * - Updates user_skills.last_used_at
 * - Appends to user_skills.evidence (text field)
 * 
 * It does NOT:
 * - Modify proficiency
 * - Modify confidence_level
 * - Automatically increase any scores
 * 
 * This is idempotent per habit + date - calling multiple times
 * for the same habit/date will only create one evidence record.
 */
export async function recordSkillEvidenceFromHabit(
  userId: string,
  habitActivityId: string,
  localDate: string, // YYYY-MM-DD
  checkinNotes?: string | null
): Promise<{ success: boolean; evidenceId?: string; error?: string }> {
  try {
    // Get habit activity to read metadata
    const activity = await getActivity(habitActivityId);
    
    if (!activity) {
      return { success: false, error: 'Habit activity not found' };
    }

    // Check if habit has skill practice mapping
    const skillConfig = getSkillPracticeConfig(activity.metadata);
    
    if (!skillConfig) {
      return { success: false, error: 'Habit does not have skill practice mapping' };
    }

    // Verify skill exists and belongs to user
    const { data: skill, error: skillError } = await supabase
      .from('user_skills')
      .select('id, name')
      .eq('id', skillConfig.skill_id)
      .eq('user_id', userId)
      .single();

    if (skillError || !skill) {
      return { success: false, error: 'Skill not found or access denied' };
    }

    // Check if evidence already exists for this habit + date (idempotency)
    // Use date range to match any time on the given date
    const dateStart = new Date(`${localDate}T00:00:00Z`);
    const dateEnd = new Date(`${localDate}T23:59:59Z`);
    
    const { data: existingEvidence } = await supabase
      .from('skill_evidence')
      .select('id')
      .eq('user_id', userId)
      .eq('skill_id', skillConfig.skill_id)
      .eq('evidence_type', 'habit')
      .eq('reference_id', habitActivityId)
      .gte('occurred_at', dateStart.toISOString())
      .lte('occurred_at', dateEnd.toISOString())
      .maybeSingle();

    if (existingEvidence) {
      // Already recorded - return success (idempotent)
      return { success: true, evidenceId: existingEvidence.id };
    }

    // Generate evidence text
    let evidenceText = skillConfig.evidence_template || `Completed habit: ${activity.title}`;
    
    // Replace template variables if present
    evidenceText = evidenceText
      .replace('{habit_title}', activity.title)
      .replace('{date}', localDate);
    
    // Append checkin notes if provided
    if (checkinNotes) {
      evidenceText += `\n\nNotes: ${checkinNotes}`;
    }

    // Create evidence record
    // Use current timestamp for occurred_at (more accurate than start of day)
    const occurredAt = new Date().toISOString();
    
    const evidence: Omit<SkillEvidence, 'id' | 'created_at'> = {
      user_id: userId,
      skill_id: skillConfig.skill_id,
      evidence_type: 'habit' as EvidenceType,
      reference_id: habitActivityId,
      reference_data: {
        habit_title: activity.title,
        habit_id: habitActivityId,
        date: localDate,
      },
      context_notes: evidenceText,
      occurred_at: occurredAt,
    };

    const createdEvidence = await skillEvidenceService.recordEvidence(evidence);

    // Update user_skills: increment usage_count and update last_used_at
    // Note: We need to fetch current count first, then increment
    const { data: currentSkill } = await supabase
      .from('user_skills')
      .select('usage_count')
      .eq('id', skillConfig.skill_id)
      .eq('user_id', userId)
      .single();

    if (currentSkill) {
      const newUsageCount = (currentSkill.usage_count || 0) + 1;
      
      // Update usage_count and last_used_at
      // Also append to evidence text field (if it exists)
      const { data: currentSkillFull } = await supabase
        .from('user_skills')
        .select('evidence')
        .eq('id', skillConfig.skill_id)
        .eq('user_id', userId)
        .single();

      const existingEvidenceText = currentSkillFull?.evidence || '';
      const updatedEvidenceText = existingEvidenceText
        ? `${existingEvidenceText}\n\n${localDate}: ${evidenceText}`
        : `${localDate}: ${evidenceText}`;

      await supabase
        .from('user_skills')
        .update({
          usage_count: newUsageCount,
          last_used_at: occurredAt,
          evidence: updatedEvidenceText,
        })
        .eq('id', skillConfig.skill_id)
        .eq('user_id', userId);
    }

    return { success: true, evidenceId: createdEvidence.id };
  } catch (err) {
    console.error('[skillEvidenceFromHabit] Error recording skill evidence:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}
