/**
 * Skills Tracker Service
 * 
 * Service for syncing Skills Tracker entries with the Skills Matrix (user_skills table).
 * Handles bidirectional sync between tracker entries and canonical skills data.
 */

import { supabase } from '../supabase';
import { skillsService, type UserSkill, type SkillCategory } from '../skillsService';

/**
 * Sync a skills tracker entry to the user_skills table
 * 
 * If a skill with the same name exists, updates proficiency and confidence.
 * If it doesn't exist, creates a new skill entry.
 * 
 * @param userId - The user's auth.uid
 * @param skillName - Name of the skill
 * @param proficiencyLevel - Proficiency level (1-5)
 * @param confidenceLevel - Confidence level (1-5, optional)
 * @param category - Skill category (optional)
 * @param evidence - Evidence text (optional)
 * @returns The synced UserSkill
 */
export async function syncEntryToSkillsMatrix(
  userId: string,
  skillName: string,
  proficiencyLevel: number,
  confidenceLevel?: number,
  category?: SkillCategory,
  evidence?: string
): Promise<UserSkill> {
  if (!skillName || !skillName.trim()) {
    throw new Error('Skill name is required');
  }

  // Normalize skill name
  const normalizedName = skillName.trim();

  // Check if skill already exists for this user
  const existingSkills = await skillsService.getAllWithSubSkills(userId);
  const existingSkill = existingSkills.find(
    s => s.name.toLowerCase() === normalizedName.toLowerCase()
  );

  if (existingSkill) {
    // Update existing skill
    const updates: Partial<Omit<UserSkill, 'id' | 'user_id' | 'created_at' | 'updated_at'>> = {
      proficiency: proficiencyLevel as 1 | 2 | 3 | 4 | 5,
    };

    if (confidenceLevel !== undefined && confidenceLevel !== null) {
      updates.confidence_level = confidenceLevel as 1 | 2 | 3 | 4 | 5;
    }

    if (category) {
      updates.category = category;
    }

    if (evidence) {
      // Append to existing evidence or create new
      const existingEvidence = existingSkill.evidence || '';
      const newEvidence = existingEvidence 
        ? `${existingEvidence}\n\n${new Date().toLocaleDateString()}: ${evidence}`
        : evidence;
      updates.evidence = newEvidence;
    }

    // Update usage count and last used timestamp
    updates.usage_count = (existingSkill.usage_count || 0) + 1;
    updates.last_used_at = new Date().toISOString();

    const updated = await skillsService.update(existingSkill.id, updates);
    return updated;
  } else {
    // Create new skill (usage_count defaults to 0 in database)
    const newSkill = await skillsService.create({
      user_id: userId,
      name: normalizedName,
      proficiency: proficiencyLevel as 1 | 2 | 3 | 4 | 5,
      confidence_level: confidenceLevel as 1 | 2 | 3 | 4 | 5 | undefined,
      category: category,
      evidence: evidence,
    });

    // Update last_used_at separately if needed
    if (newSkill.id) {
      // The database will handle last_used_at on its own, or we can update it separately
      // For now, the creation is sufficient
    }

    return newSkill;
  }
}

/**
 * Get all skills from the user's skills matrix
 * Useful for populating dropdowns in the Skills Tracker entry form
 * 
 * @param userId - The user's auth.uid
 * @returns Array of UserSkill objects
 */
export async function getSkillsFromMatrix(userId: string): Promise<UserSkill[]> {
  return await skillsService.getAllWithSubSkills(userId);
}

/**
 * Check if a skill exists in the skills matrix
 * 
 * @param userId - The user's auth.uid
 * @param skillName - Name of the skill to check
 * @returns The UserSkill if it exists, null otherwise
 */
export async function findSkillInMatrix(
  userId: string,
  skillName: string
): Promise<UserSkill | null> {
  const skills = await skillsService.getAllWithSubSkills(userId);
  const normalizedName = skillName.trim().toLowerCase();
  
  return skills.find(s => s.name.toLowerCase() === normalizedName) || null;
}

/**
 * Sync multiple tracker entries to skills matrix
 * Useful for batch syncing historical data
 * 
 * @param userId - The user's auth.uid
 * @param entries - Array of entry data to sync
 */
export async function batchSyncEntriesToSkillsMatrix(
  userId: string,
  entries: Array<{
    skillName: string;
    proficiencyLevel: number;
    confidenceLevel?: number;
    category?: SkillCategory;
    evidence?: string;
  }>
): Promise<UserSkill[]> {
  const results: UserSkill[] = [];
  
  for (const entry of entries) {
    try {
      const synced = await syncEntryToSkillsMatrix(
        userId,
        entry.skillName,
        entry.proficiencyLevel,
        entry.confidenceLevel,
        entry.category,
        entry.evidence
      );
      results.push(synced);
    } catch (error) {
      console.error(`Failed to sync entry for skill "${entry.skillName}":`, error);
      // Continue with next entry
    }
  }
  
  return results;
}
