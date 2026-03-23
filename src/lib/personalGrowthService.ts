import { supabase } from './supabase';

// ============================================================================
// PERSONAL GROWTH SERVICE
// ============================================================================
// Unified service for:
// - Hobbies & Interests
// - Values & Principles
// - Ideas & Inspiration
// - Personal Habits
//
// Key principles:
// - No duplication (single source of truth)
// - Opt-in sharing (private by default)
// - No gamification (no streaks, scores)
// - Human, reflective language
// - Integration with Skills, Goals, Journal, Planning
// ============================================================================

// ============================================================================
// HOBBIES & INTERESTS
// ============================================================================

export type HobbyCategory = 'creative' | 'physical' | 'social' | 'intellectual' | 'relaxation';
export type EngagementLevel = 'occasional' | 'regular' | 'frequent' | 'deep_focus';

export interface HobbyInterest {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category?: HobbyCategory;
  why_i_enjoy?: string;
  how_it_makes_me_feel?: string;
  engagement_level?: EngagementLevel;
  linked_skills?: string[];
  linked_self_care?: string[];
  linked_social_activities?: string[];
  is_private: boolean;
  shared_space_id?: string | null;
  created_at: string;
  updated_at: string;
}

export const hobbiesService = {
  async getAll(userId: string): Promise<HobbyInterest[]> {
    const { data, error } = await supabase
      .from('hobbies_interests')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) throw error;
    return (data || []) as HobbyInterest[];
  },

  async getById(hobbyId: string): Promise<HobbyInterest | null> {
    const { data, error } = await supabase
      .from('hobbies_interests')
      .select('*')
      .eq('id', hobbyId)
      .maybeSingle();

    if (error) throw error;
    return data as HobbyInterest | null;
  },

  async getByCategory(userId: string, category: HobbyCategory): Promise<HobbyInterest[]> {
    const { data, error } = await supabase
      .from('hobbies_interests')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .order('name');

    if (error) throw error;
    return (data || []) as HobbyInterest[];
  },

  async create(hobby: Omit<HobbyInterest, 'id' | 'created_at' | 'updated_at'>): Promise<HobbyInterest> {
    const { data, error } = await supabase
      .from('hobbies_interests')
      .insert([hobby])
      .select()
      .single();

    if (error) throw error;
    return data as HobbyInterest;
  },

  async update(hobbyId: string, updates: Partial<Omit<HobbyInterest, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<HobbyInterest> {
    const { data, error } = await supabase
      .from('hobbies_interests')
      .update(updates)
      .eq('id', hobbyId)
      .select()
      .single();

    if (error) throw error;
    return data as HobbyInterest;
  },

  async delete(hobbyId: string): Promise<void> {
    const { error } = await supabase
      .from('hobbies_interests')
      .delete()
      .eq('id', hobbyId);

    if (error) throw error;
  },

  async shareToSpace(hobbyId: string, spaceId: string | null): Promise<HobbyInterest> {
    return this.update(hobbyId, {
      shared_space_id: spaceId,
      is_private: spaceId === null
    });
  }
};

// ============================================================================
// VALUES & PRINCIPLES
// ============================================================================

export type ImportanceLevel = 'foundational' | 'important' | 'emerging' | 'exploring';
export type ShareLevel = 'name_only' | 'full';

export interface ExampleMoment {
  date: string;
  description: string;
  linked_journal_id?: string;
}

export interface ValuePrinciple {
  id: string;
  user_id: string;
  name: string;
  personal_definition?: string;
  how_it_shows_up?: string;
  example_moments?: ExampleMoment[];
  importance_level?: ImportanceLevel;
  linked_goals?: string[];
  linked_skills?: string[];
  linked_decisions?: string[];
  linked_vision_themes?: string[];
  is_private: boolean;
  shared_space_id?: string | null;
  share_level: ShareLevel;
  created_at: string;
  updated_at: string;
}

export const valuesService = {
  async getAll(userId: string): Promise<ValuePrinciple[]> {
    const { data, error } = await supabase
      .from('values_principles')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) throw error;
    return (data || []) as ValuePrinciple[];
  },

  async getById(valueId: string): Promise<ValuePrinciple | null> {
    const { data, error } = await supabase
      .from('values_principles')
      .select('*')
      .eq('id', valueId)
      .maybeSingle();

    if (error) throw error;
    return data as ValuePrinciple | null;
  },

  async getByImportance(userId: string, level: ImportanceLevel): Promise<ValuePrinciple[]> {
    const { data, error } = await supabase
      .from('values_principles')
      .select('*')
      .eq('user_id', userId)
      .eq('importance_level', level)
      .order('name');

    if (error) throw error;
    return (data || []) as ValuePrinciple[];
  },

  async create(value: Omit<ValuePrinciple, 'id' | 'created_at' | 'updated_at'>): Promise<ValuePrinciple> {
    const { data, error } = await supabase
      .from('values_principles')
      .insert([value])
      .select()
      .single();

    if (error) throw error;
    return data as ValuePrinciple;
  },

  async update(valueId: string, updates: Partial<Omit<ValuePrinciple, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<ValuePrinciple> {
    const { data, error } = await supabase
      .from('values_principles')
      .update(updates)
      .eq('id', valueId)
      .select()
      .single();

    if (error) throw error;
    return data as ValuePrinciple;
  },

  async delete(valueId: string): Promise<void> {
    const { error } = await supabase
      .from('values_principles')
      .delete()
      .eq('id', valueId);

    if (error) throw error;
  },

  async addExampleMoment(valueId: string, moment: ExampleMoment): Promise<ValuePrinciple> {
    const value = await this.getById(valueId);
    if (!value) throw new Error('Value not found');

    const moments = value.example_moments || [];
    moments.unshift(moment);

    return this.update(valueId, {
      example_moments: moments.slice(0, 20) // Keep last 20
    });
  },

  async shareToSpace(valueId: string, spaceId: string | null, shareLevel: ShareLevel = 'full'): Promise<ValuePrinciple> {
    return this.update(valueId, {
      shared_space_id: spaceId,
      is_private: spaceId === null,
      share_level: shareLevel
    });
  }
};

// ============================================================================
// IDEAS & INSPIRATION
// ============================================================================

export type IdeaContentType = 'text' | 'link' | 'image';
export type IdeaStatus = 'just_a_thought' | 'exploring' | 'ready_to_act';
export type IdeaEnergyLevel = 'curious' | 'excited' | 'inspired' | 'urgent';

export interface IdeaInspiration {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  content_type: IdeaContentType;
  content_data?: any;
  tags?: string[];
  status: IdeaStatus;
  captured_because?: string;
  energy_level?: IdeaEnergyLevel;
  linked_goals?: string[];
  linked_projects?: string[];
  linked_skills?: string[];
  linked_journal_entries?: string[];
  promoted_to?: string;
  promoted_at?: string;
  promoted_reference_id?: string;
  is_private: boolean;
  shared_space_id?: string | null;
  created_at: string;
  updated_at: string;
}

export const ideasService = {
  async getAll(userId: string): Promise<IdeaInspiration[]> {
    const { data, error } = await supabase
      .from('ideas_inspiration')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as IdeaInspiration[];
  },

  async getById(ideaId: string): Promise<IdeaInspiration | null> {
    const { data, error } = await supabase
      .from('ideas_inspiration')
      .select('*')
      .eq('id', ideaId)
      .maybeSingle();

    if (error) throw error;
    return data as IdeaInspiration | null;
  },

  async getByStatus(userId: string, status: IdeaStatus): Promise<IdeaInspiration[]> {
    const { data, error } = await supabase
      .from('ideas_inspiration')
      .select('*')
      .eq('user_id', userId)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as IdeaInspiration[];
  },

  async getByTag(userId: string, tag: string): Promise<IdeaInspiration[]> {
    const { data, error } = await supabase
      .from('ideas_inspiration')
      .select('*')
      .eq('user_id', userId)
      .contains('tags', [tag])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as IdeaInspiration[];
  },

  async create(idea: Omit<IdeaInspiration, 'id' | 'created_at' | 'updated_at'>): Promise<IdeaInspiration> {
    const { data, error } = await supabase
      .from('ideas_inspiration')
      .insert([idea])
      .select()
      .single();

    if (error) throw error;
    return data as IdeaInspiration;
  },

  async update(ideaId: string, updates: Partial<Omit<IdeaInspiration, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<IdeaInspiration> {
    const { data, error } = await supabase
      .from('ideas_inspiration')
      .update(updates)
      .eq('id', ideaId)
      .select()
      .single();

    if (error) throw error;
    return data as IdeaInspiration;
  },

  async delete(ideaId: string): Promise<void> {
    const { error } = await supabase
      .from('ideas_inspiration')
      .delete()
      .eq('id', ideaId);

    if (error) throw error;
  },

  async quickCapture(userId: string, title: string, description?: string, tags?: string[]): Promise<IdeaInspiration> {
    return this.create({
      user_id: userId,
      title,
      description,
      content_type: 'text',
      status: 'just_a_thought',
      tags,
      is_private: true
    });
  },

  async promoteToProject(ideaId: string, projectId: string): Promise<IdeaInspiration> {
    return this.update(ideaId, {
      promoted_to: 'project',
      promoted_at: new Date().toISOString(),
      promoted_reference_id: projectId
    });
  },

  async promoteToLearning(ideaId: string, learningPlanId: string): Promise<IdeaInspiration> {
    return this.update(ideaId, {
      promoted_to: 'learning_plan',
      promoted_at: new Date().toISOString(),
      promoted_reference_id: learningPlanId
    });
  },

  async shareToSpace(ideaId: string, spaceId: string | null): Promise<IdeaInspiration> {
    return this.update(ideaId, {
      shared_space_id: spaceId,
      is_private: spaceId === null
    });
  }
};

// ============================================================================
// PERSONAL HABITS (No Streaks, Reflection-Focused)
// ============================================================================

export type HabitCategory = 'health' | 'mental' | 'home' | 'learning' | 'relationships' | 'creative';
export type FrequencyType = 'daily' | 'weekly' | 'flexible' | 'rhythm';
export type EnergyLevel = 'depleted' | 'low' | 'moderate' | 'high';

export interface PersonalHabit {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category?: HabitCategory;
  frequency_type?: FrequencyType;
  frequency_description?: string;
  reflection_notes?: string;
  what_helps?: string;
  what_gets_in_way?: string;
  linked_goals?: string[];
  linked_skills?: string[];
  linked_self_care?: string[];
  linked_values?: string[];
  is_private: boolean;
  shared_space_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HabitCompletion {
  id: string;
  user_id: string;
  habit_id: string;
  completed_at: string;
  completion_date: string;
  felt_like?: string;
  context_notes?: string;
  energy_level?: EnergyLevel;
  created_at: string;
}

export interface HabitConsistency {
  habit_id: string;
  habit_name: string;
  completed_days_last_7: number;
  completed_days_last_30: number;
  last_completed?: string;
}

export const personalHabitsService = {
  // Habits CRUD
  async getAll(userId: string, activeOnly = false): Promise<PersonalHabit[]> {
    let query = supabase
      .from('personal_habits')
      .select('*')
      .eq('user_id', userId);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('name');

    if (error) throw error;
    return (data || []) as PersonalHabit[];
  },

  async getById(habitId: string): Promise<PersonalHabit | null> {
    const { data, error } = await supabase
      .from('personal_habits')
      .select('*')
      .eq('id', habitId)
      .maybeSingle();

    if (error) throw error;
    return data as PersonalHabit | null;
  },

  async getByCategory(userId: string, category: HabitCategory): Promise<PersonalHabit[]> {
    const { data, error } = await supabase
      .from('personal_habits')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return (data || []) as PersonalHabit[];
  },

  async create(habit: Omit<PersonalHabit, 'id' | 'created_at' | 'updated_at'>): Promise<PersonalHabit> {
    const { data, error } = await supabase
      .from('personal_habits')
      .insert([habit])
      .select()
      .single();

    if (error) throw error;
    return data as PersonalHabit;
  },

  async update(habitId: string, updates: Partial<Omit<PersonalHabit, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<PersonalHabit> {
    const { data, error } = await supabase
      .from('personal_habits')
      .update(updates)
      .eq('id', habitId)
      .select()
      .single();

    if (error) throw error;
    return data as PersonalHabit;
  },

  async delete(habitId: string): Promise<void> {
    const { error } = await supabase
      .from('personal_habits')
      .delete()
      .eq('id', habitId);

    if (error) throw error;
  },

  // Completions
  async recordCompletion(
    userId: string,
    habitId: string,
    completion: {
      felt_like?: string;
      context_notes?: string;
      energy_level?: EnergyLevel;
      completion_date?: string;
    }
  ): Promise<HabitCompletion> {
    const { data, error } = await supabase
      .from('habit_completions')
      .insert([{
        user_id: userId,
        habit_id: habitId,
        completion_date: completion.completion_date || new Date().toISOString().split('T')[0],
        ...completion
      }])
      .select()
      .single();

    if (error) throw error;
    return data as HabitCompletion;
  },

  async getCompletions(habitId: string, days = 30): Promise<HabitCompletion[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from('habit_completions')
      .select('*')
      .eq('habit_id', habitId)
      .gte('completion_date', since.toISOString().split('T')[0])
      .order('completion_date', { ascending: false });

    if (error) throw error;
    return (data || []) as HabitCompletion[];
  },

  async deleteCompletion(completionId: string): Promise<void> {
    const { error } = await supabase
      .from('habit_completions')
      .delete()
      .eq('id', completionId);

    if (error) throw error;
  },

  // Consistency (trend, not streak)
  async getConsistency(userId: string): Promise<HabitConsistency[]> {
    const { data, error } = await supabase
      .from('habit_consistency_view')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return (data || []) as HabitConsistency[];
  },

  async getHabitConsistency(habitId: string): Promise<HabitConsistency | null> {
    const { data, error } = await supabase
      .from('habit_consistency_view')
      .select('*')
      .eq('habit_id', habitId)
      .maybeSingle();

    if (error) throw error;
    return data as HabitConsistency | null;
  },

  // Sharing
  async shareToSpace(habitId: string, spaceId: string | null): Promise<PersonalHabit> {
    return this.update(habitId, {
      shared_space_id: spaceId,
      is_private: spaceId === null
    });
  }
};

// ============================================================================
// CATEGORY LABELS
// ============================================================================

export const HOBBY_CATEGORIES: Record<HobbyCategory, string> = {
  creative: 'Creative',
  physical: 'Physical',
  social: 'Social',
  intellectual: 'Intellectual',
  relaxation: 'Relaxation'
};

export const ENGAGEMENT_LEVELS: Record<EngagementLevel, string> = {
  occasional: 'Occasional',
  regular: 'Regular',
  frequent: 'Frequent',
  deep_focus: 'Deep Focus'
};

export const IMPORTANCE_LEVELS: Record<ImportanceLevel, string> = {
  foundational: 'Foundational',
  important: 'Important',
  emerging: 'Emerging',
  exploring: 'Exploring'
};

export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  just_a_thought: 'Just a Thought',
  exploring: 'Exploring',
  ready_to_act: 'Ready to Act'
};

export const ENERGY_LEVELS: Record<IdeaEnergyLevel, string> = {
  curious: 'Curious',
  excited: 'Excited',
  inspired: 'Inspired',
  urgent: 'Urgent'
};

export const HABIT_CATEGORIES: Record<HabitCategory, string> = {
  health: 'Health',
  mental: 'Mental',
  home: 'Home',
  learning: 'Learning',
  relationships: 'Relationships',
  creative: 'Creative'
};

export const FREQUENCY_TYPES: Record<FrequencyType, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  flexible: 'Flexible',
  rhythm: 'Natural Rhythm'
};

export const COMPLETION_ENERGY_LEVELS: Record<EnergyLevel, string> = {
  depleted: 'Depleted',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High'
};
