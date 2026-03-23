import { supabase } from './supabase';
import { CapacityContext } from './skillsIntelligence';

// ============================================================================
// UNIFIED SKILLS SYSTEM (Enhanced with Intelligence)
// ============================================================================
// This service manages the unified skills architecture:
// - user_skills: Single source of truth (Guardrails Skills Matrix)
// - personal_skills_context: Personal metadata and growth tracking
// - skill_evidence: Structured evidence tracking
// - skill_insights: Smart, explainable insights
//
// Skills are universal. Context is personal.
// Intelligence is optional, non-intrusive, and explainable.
// ============================================================================

// Types
export type SkillCategory = 'cognitive' | 'emotional' | 'social' | 'physical' | 'technical' | 'creative';
export type ProficiencyLevel = 1 | 2 | 3 | 4 | 5;
export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5;
export type SkillStatus = 'active' | 'background' | 'paused';
export type SkillMomentum = 'dormant' | 'emerging' | 'stabilising' | 'integrated';
export type EffortLevel = 'minimal' | 'moderate' | 'significant' | 'intense';

export interface UserSkill {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category?: SkillCategory;
  proficiency: ProficiencyLevel;
  confidence_level?: ConfidenceLevel;
  consistency_score?: number; // 0-1, derived
  evidence?: string;
  parent_skill_id?: string; // For sub-skills
  prerequisites?: string[]; // Soft dependencies
  capacity_context?: CapacityContext;
  last_used_at?: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface PersonalSkillContext {
  id: string;
  user_id: string;
  skill_id: string;
  status: SkillStatus;
  life_area?: string; // Work, Health, Relationships, Creativity, etc.
  momentum?: SkillMomentum;
  personal_intention?: string;
  time_horizon?: string;
  reflection_notes?: string;
  confidence_feeling?: string;
  practice_logs?: any[]; // JSONB array
  blocked_notes?: string;
  growth_conditions?: string;
  effort_level?: EffortLevel;
  last_practice_at?: string;
  linked_goals?: string[];
  linked_journal_entries?: string[];
  linked_habits?: string[];
  linked_projects?: string[];
  linked_resources?: string[];
  is_private: boolean;
  shared_space_id?: string | null;
  created_at: string;
  updated_at: string;
}

// Combined view for Personal Development
export interface SkillWithContext {
  skill: UserSkill;
  context?: PersonalSkillContext;
  evidence_count?: number;
  last_evidence_at?: string;
}

// Proficiency level labels
export const PROFICIENCY_LABELS = {
  1: 'Awareness',
  2: 'Developing',
  3: 'Competent',
  4: 'Advanced',
  5: 'Mastery'
} as const;

// Confidence level labels
export const CONFIDENCE_LABELS = {
  1: 'Very Uncertain',
  2: 'Somewhat Uncertain',
  3: 'Neutral',
  4: 'Fairly Confident',
  5: 'Very Confident'
} as const;

// Category labels
export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  cognitive: 'Cognitive',
  emotional: 'Emotional',
  social: 'Social',
  physical: 'Physical',
  technical: 'Technical',
  creative: 'Creative'
};

// Momentum labels
export const MOMENTUM_LABELS: Record<SkillMomentum, string> = {
  dormant: 'Dormant',
  emerging: 'Emerging',
  stabilising: 'Stabilising',
  integrated: 'Integrated'
};

// Life area options
export const LIFE_AREAS = [
  'Work',
  'Health',
  'Relationships',
  'Creativity',
  'Learning',
  'Personal Growth',
  'Community',
  'Family',
  'Leisure'
] as const;

// ============================================================================
// CANONICAL SKILLS SERVICE (Guardrails View)
// ============================================================================

export const skillsService = {
  /**
   * Get all skills for a user
   */
  async getAll(userId: string): Promise<UserSkill[]> {
    const { data, error } = await supabase
      .from('user_skills')
      .select('*')
      .eq('user_id', userId)
      .is('parent_skill_id', null) // Only top-level skills
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []) as UserSkill[];
  },

  /**
   * Get all skills including sub-skills
   */
  async getAllWithSubSkills(userId: string): Promise<UserSkill[]> {
    const { data, error } = await supabase
      .from('user_skills')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []) as UserSkill[];
  },

  /**
   * Get sub-skills for a parent skill
   */
  async getSubSkills(parentSkillId: string): Promise<UserSkill[]> {
    const { data, error } = await supabase
      .from('user_skills')
      .select('*')
      .eq('parent_skill_id', parentSkillId)
      .order('name');

    if (error) throw error;
    return (data || []) as UserSkill[];
  },

  /**
   * Get a single skill by ID
   */
  async getById(skillId: string): Promise<UserSkill | null> {
    const { data, error } = await supabase
      .from('user_skills')
      .select('*')
      .eq('id', skillId)
      .maybeSingle();

    if (error) throw error;
    return data as UserSkill | null;
  },

  /**
   * Create a new skill (canonical)
   */
  async create(skill: Omit<UserSkill, 'id' | 'created_at' | 'updated_at' | 'usage_count'>): Promise<UserSkill> {
    const { data, error } = await supabase
      .from('user_skills')
      .insert([{ ...skill, usage_count: 0 }])
      .select()
      .single();

    if (error) throw error;
    return data as UserSkill;
  },

  /**
   * Update a skill (updates everywhere)
   */
  async update(skillId: string, updates: Partial<Omit<UserSkill, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<UserSkill> {
    const { data, error } = await supabase
      .from('user_skills')
      .update(updates)
      .eq('id', skillId)
      .select()
      .single();

    if (error) throw error;
    return data as UserSkill;
  },

  /**
   * Delete a skill (removes everywhere)
   */
  async delete(skillId: string): Promise<void> {
    const { error } = await supabase
      .from('user_skills')
      .delete()
      .eq('id', skillId);

    if (error) throw error;
  },

  /**
   * Get skills by category
   */
  async getByCategory(userId: string, category: SkillCategory): Promise<UserSkill[]> {
    const { data, error } = await supabase
      .from('user_skills')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .is('parent_skill_id', null)
      .order('updated_at', { ascending: false});

    if (error) throw error;
    return (data || []) as UserSkill[];
  }
};

// ============================================================================
// PERSONAL CONTEXT SERVICE (Personal Development View)
// ============================================================================

export const personalSkillsContextService = {
  /**
   * Get personal context for a skill
   */
  async getContext(userId: string, skillId: string): Promise<PersonalSkillContext | null> {
    const { data, error } = await supabase
      .from('personal_skills_context')
      .select('*')
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .maybeSingle();

    if (error) throw error;
    return data as PersonalSkillContext | null;
  },

  /**
   * Get all contexts for a user
   */
  async getAllContexts(userId: string): Promise<PersonalSkillContext[]> {
    const { data, error } = await supabase
      .from('personal_skills_context')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []) as PersonalSkillContext[];
  },

  /**
   * Get skills by status
   */
  async getByStatus(userId: string, status: SkillStatus): Promise<PersonalSkillContext[]> {
    const { data, error } = await supabase
      .from('personal_skills_context')
      .select('*')
      .eq('user_id', userId)
      .eq('status', status)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []) as PersonalSkillContext[];
  },

  /**
   * Get active skills (currently developing)
   */
  async getActiveContexts(userId: string): Promise<PersonalSkillContext[]> {
    return this.getByStatus(userId, 'active');
  },

  /**
   * Create or update personal context for a skill
   */
  async upsertContext(context: Omit<PersonalSkillContext, 'id' | 'created_at' | 'updated_at'>): Promise<PersonalSkillContext> {
    const { data, error } = await supabase
      .from('personal_skills_context')
      .upsert([context], { onConflict: 'user_id,skill_id' })
      .select()
      .single();

    if (error) throw error;
    return data as PersonalSkillContext;
  },

  /**
   * Update personal context
   */
  async updateContext(contextId: string, updates: Partial<Omit<PersonalSkillContext, 'id' | 'user_id' | 'skill_id' | 'created_at' | 'updated_at'>>): Promise<PersonalSkillContext> {
    const { data, error } = await supabase
      .from('personal_skills_context')
      .update(updates)
      .eq('id', contextId)
      .select()
      .single();

    if (error) throw error;
    return data as PersonalSkillContext;
  },

  /**
   * Set skill status
   */
  async setStatus(userId: string, skillId: string, status: SkillStatus): Promise<PersonalSkillContext> {
    // Check if context exists
    const existing = await this.getContext(userId, skillId);

    if (existing) {
      return this.updateContext(existing.id, { status });
    } else {
      // Create new context
      return this.upsertContext({
        user_id: userId,
        skill_id: skillId,
        status,
        is_private: true
      });
    }
  },

  /**
   * Add practice log entry
   */
  async addPracticeLog(userId: string, skillId: string, log: { context: string; felt: string; notes?: string }): Promise<void> {
    const context = await this.getContext(userId, skillId);

    if (!context) {
      // Create context first
      await this.upsertContext({
        user_id: userId,
        skill_id: skillId,
        status: 'active',
        is_private: true,
        practice_logs: [{
          date: new Date().toISOString(),
          ...log
        }]
      });
    } else {
      const logs = context.practice_logs || [];
      logs.unshift({
        date: new Date().toISOString(),
        ...log
      });

      await this.updateContext(context.id, {
        practice_logs: logs.slice(0, 50), // Keep last 50 entries
        last_practice_at: new Date().toISOString()
      });
    }
  },

  /**
   * Delete personal context (does not delete the skill)
   */
  async deleteContext(contextId: string): Promise<void> {
    const { error } = await supabase
      .from('personal_skills_context')
      .delete()
      .eq('id', contextId);

    if (error) throw error;
  }
};

// ============================================================================
// UNIFIED VIEW SERVICE (Personal Development)
// ============================================================================

export const unifiedSkillsService = {
  /**
   * Get all skills with their personal context and evidence counts
   */
  async getSkillsWithContext(userId: string): Promise<SkillWithContext[]> {
    // Use the optimized view
    const { data, error } = await supabase
      .from('active_skills_view')
      .select('*')
      .eq('user_id', userId)
      .is('parent_skill_id', null);

    if (error) {
      // Fallback to manual join if view fails
      const skills = await skillsService.getAll(userId);
      const contexts = await personalSkillsContextService.getAllContexts(userId);
      const contextMap = new Map<string, PersonalSkillContext>();
      contexts.forEach(ctx => contextMap.set(ctx.skill_id, ctx));

      return skills.map(skill => ({
        skill,
        context: contextMap.get(skill.id)
      }));
    }

    // Transform view data
    return (data || []).map(row => ({
      skill: {
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        description: row.description,
        category: row.category,
        proficiency: row.proficiency,
        confidence_level: row.confidence_level,
        consistency_score: row.consistency_score,
        evidence: row.evidence,
        parent_skill_id: row.parent_skill_id,
        prerequisites: row.prerequisites,
        capacity_context: row.capacity_context,
        last_used_at: row.last_used_at,
        usage_count: row.usage_count,
        created_at: row.created_at,
        updated_at: row.updated_at
      } as UserSkill,
      context: row.status ? {
        id: row.id,
        user_id: row.user_id,
        skill_id: row.id,
        status: row.status,
        life_area: row.life_area,
        momentum: row.momentum,
        personal_intention: row.personal_intention,
        effort_level: row.effort_level,
        last_practice_at: row.last_practice_at
      } as PersonalSkillContext : undefined,
      evidence_count: row.evidence_count,
      last_evidence_at: row.last_evidence_at
    }));
  },

  /**
   * Get active skills (currently developing) with context
   */
  async getActiveSkills(userId: string): Promise<SkillWithContext[]> {
    const activeContexts = await personalSkillsContextService.getActiveContexts(userId);
    const skillIds = activeContexts.map(ctx => ctx.skill_id);

    if (skillIds.length === 0) {
      return [];
    }

    const { data: skills, error } = await supabase
      .from('user_skills')
      .select('*')
      .in('id', skillIds);

    if (error) throw error;

    const contextMap = new Map<string, PersonalSkillContext>();
    activeContexts.forEach(ctx => contextMap.set(ctx.skill_id, ctx));

    return (skills || []).map(skill => ({
      skill: skill as UserSkill,
      context: contextMap.get(skill.id)
    }));
  },

  /**
   * Get skills by category with context
   */
  async getSkillsByCategory(userId: string, category: SkillCategory): Promise<SkillWithContext[]> {
    const skills = await skillsService.getByCategory(userId, category);
    const contexts = await personalSkillsContextService.getAllContexts(userId);

    const contextMap = new Map<string, PersonalSkillContext>();
    contexts.forEach(ctx => contextMap.set(ctx.skill_id, ctx));

    return skills.map(skill => ({
      skill,
      context: contextMap.get(skill.id)
    }));
  },

  /**
   * Get skills by status with full data
   */
  async getSkillsByStatus(userId: string, status: SkillStatus): Promise<SkillWithContext[]> {
    const contexts = await personalSkillsContextService.getByStatus(userId, status);
    const skillIds = contexts.map(ctx => ctx.skill_id);

    if (skillIds.length === 0) {
      return [];
    }

    const { data: skills, error } = await supabase
      .from('user_skills')
      .select('*')
      .in('id', skillIds);

    if (error) throw error;

    const contextMap = new Map<string, PersonalSkillContext>();
    contexts.forEach(ctx => contextMap.set(ctx.skill_id, ctx));

    return (skills || []).map(skill => ({
      skill: skill as UserSkill,
      context: contextMap.get(skill.id)
    }));
  }
};

// ============================================================================
// SKILL CONTEXTS SERVICE (Multiple Contexts Per Skill)
// ============================================================================

export type SkillContextType = 'work' | 'education' | 'hobby' | 'life' | 'health' | 'therapy' | 'parenting' | 'coaching' | 'other';
export type SkillContextStatus = 'active' | 'background' | 'paused';
export type SkillContextVisibility = 'private' | 'shared' | 'assessed';
export type SkillPressureLevel = 'none' | 'low' | 'moderate' | 'high';

export interface SkillContext {
  id: string;
  skill_id: string;
  user_id: string;
  context_type: SkillContextType;
  role_label?: string;
  intent?: string;
  confidence_level?: number; // 1-5
  pressure_level: SkillPressureLevel;
  visibility: SkillContextVisibility;
  status: SkillContextStatus;
  created_at: string;
  updated_at: string;
}

export interface SkillEntityLink {
  id: string;
  skill_id: string;
  context_id?: string | null;
  user_id: string;
  entity_type: 'habit' | 'goal' | 'project' | 'trip' | 'calendar_event' | 'journal_entry' | 'learning_resource';
  entity_id: string;
  link_notes?: string;
  created_at: string;
}

export const skillContextsService = {
  /**
   * Get all contexts for a skill
   */
  async getContextsForSkill(userId: string, skillId: string): Promise<SkillContext[]> {
    const { data, error } = await supabase
      .from('skill_contexts')
      .select('*')
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SkillContext[];
  },

  /**
   * Get context by ID
   */
  async getContext(contextId: string): Promise<SkillContext | null> {
    const { data, error } = await supabase
      .from('skill_contexts')
      .select('*')
      .eq('id', contextId)
      .maybeSingle();

    if (error) throw error;
    return data as SkillContext | null;
  },

  /**
   * Get contexts by type
   */
  async getContextsByType(userId: string, contextType: SkillContextType): Promise<SkillContext[]> {
    const { data, error } = await supabase
      .from('skill_contexts')
      .select('*')
      .eq('user_id', userId)
      .eq('context_type', contextType)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SkillContext[];
  },

  /**
   * Create a new context for a skill
   */
  async createContext(context: Omit<SkillContext, 'id' | 'created_at' | 'updated_at'>): Promise<SkillContext> {
    const { data, error } = await supabase
      .from('skill_contexts')
      .insert([context])
      .select()
      .single();

    if (error) throw error;
    return data as SkillContext;
  },

  /**
   * Update a context
   */
  async updateContext(contextId: string, updates: Partial<Omit<SkillContext, 'id' | 'skill_id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<SkillContext> {
    const { data, error } = await supabase
      .from('skill_contexts')
      .update(updates)
      .eq('id', contextId)
      .select()
      .single();

    if (error) throw error;
    return data as SkillContext;
  },

  /**
   * Delete a context (does not delete the skill)
   */
  async deleteContext(contextId: string): Promise<void> {
    const { error } = await supabase
      .from('skill_contexts')
      .delete()
      .eq('id', contextId);

    if (error) throw error;
  }
};

// ============================================================================
// SKILL ENTITY LINKS SERVICE
// ============================================================================

export const skillEntityLinksService = {
  /**
   * Get all links for a skill (optionally filtered by context)
   */
  async getLinksForSkill(userId: string, skillId: string, contextId?: string): Promise<SkillEntityLink[]> {
    let query = supabase
      .from('skill_entity_links')
      .select('*')
      .eq('user_id', userId)
      .eq('skill_id', skillId);

    if (contextId) {
      query = query.eq('context_id', contextId);
    } else {
      query = query.is('context_id', null); // Global links only
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SkillEntityLink[];
  },

  /**
   * Get links for an entity (reverse lookup)
   */
  async getLinksForEntity(userId: string, entityType: SkillEntityLink['entity_type'], entityId: string): Promise<SkillEntityLink[]> {
    const { data, error } = await supabase
      .from('skill_entity_links')
      .select('*')
      .eq('user_id', userId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SkillEntityLink[];
  },

  /**
   * Create a link between skill and entity
   */
  async createLink(link: Omit<SkillEntityLink, 'id' | 'created_at'>): Promise<SkillEntityLink> {
    const { data, error } = await supabase
      .from('skill_entity_links')
      .insert([link])
      .select()
      .single();

    if (error) throw error;
    return data as SkillEntityLink;
  },

  /**
   * Delete a link
   */
  async deleteLink(linkId: string): Promise<void> {
    const { error } = await supabase
      .from('skill_entity_links')
      .delete()
      .eq('id', linkId);

    if (error) throw error;
  },

  /**
   * Delete links for a skill (optionally filtered by context)
   */
  async deleteLinksForSkill(userId: string, skillId: string, contextId?: string): Promise<void> {
    let query = supabase
      .from('skill_entity_links')
      .delete()
      .eq('user_id', userId)
      .eq('skill_id', skillId);

    if (contextId) {
      query = query.eq('context_id', contextId);
    }

    const { error } = await query;
    if (error) throw error;
  }
};
