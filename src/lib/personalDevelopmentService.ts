import { supabase } from './supabase';

export interface PersonalDevGoal {
  id: string;
  user_id: string;
  space_id: string | null;
  title: string;
  description?: string;
  category?: 'personal_growth' | 'career' | 'health' | 'learning' | 'relationships' | 'other';
  progress: number;
  target_date?: string;
  status: 'active' | 'completed' | 'paused' | 'archived';
  linked_habits?: string[];
  linked_journal_entries?: string[];
  is_private: boolean;
  shared_space_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MotivationItem {
  id: string;
  user_id: string;
  space_id: string | null;
  item_type: 'text' | 'quote' | 'image' | 'affirmation';
  content: string;
  image_url?: string;
  position_x: number;
  position_y: number;
  is_pinned: boolean;
  display_order: number;
  is_private: boolean;
  shared_space_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Hobby {
  id: string;
  user_id: string;
  space_id: string | null;
  name: string;
  description?: string;
  time_spent_hours: number;
  notes?: string;
  mood_association?: 'energizing' | 'calming' | 'inspiring' | 'social' | 'solitary' | 'neutral';
  frequency?: 'daily' | 'weekly' | 'monthly' | 'occasional' | 'seasonal';
  last_practiced_at?: string;
  is_private: boolean;
  shared_space_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  user_id: string;
  space_id: string | null;
  title: string;
  description?: string;
  reflection?: string;
  milestone_date: string;
  is_approximate_date: boolean;
  category?: string;
  tags?: string[];
  is_private: boolean;
  shared_space_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrowthCheckin {
  id: string;
  user_id: string;
  space_id: string | null;
  checkin_date: string;
  confidence_level?: number;
  emotional_resilience?: number;
  focus_clarity?: number;
  self_trust?: number;
  notes?: string;
  reflection?: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface PersonalValue {
  id: string;
  user_id: string;
  space_id: string | null;
  value_name: string;
  user_definition?: string;
  how_it_shows_up?: string;
  priority_order: number;
  linked_goals?: string[];
  linked_decisions?: string[];
  is_private: boolean;
  shared_space_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: string;
  user_id: string;
  space_id: string | null;
  title: string;
  content?: string;
  tags?: string[];
  linked_goals?: string[];
  linked_projects?: string[];
  linked_journal_entries?: string[];
  status: 'captured' | 'exploring' | 'active' | 'completed' | 'archived';
  is_private: boolean;
  shared_space_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  user_id: string;
  space_id: string | null;
  skill_name: string;
  category?: string;
  current_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  desired_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  notes?: string;
  linked_resources?: string[];
  linked_projects?: string[];
  practice_log?: Array<{ date: string; notes: string }>;
  is_private: boolean;
  shared_space_id?: string | null;
  created_at: string;
  updated_at: string;
}

// Goals Service
export const goalsService = {
  async getAll(userId: string): Promise<PersonalDevGoal[]> {
    const { data, error } = await supabase
      .from('personal_dev_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(goal: Omit<PersonalDevGoal, 'id' | 'created_at' | 'updated_at'>): Promise<PersonalDevGoal> {
    const { data, error } = await supabase
      .from('personal_dev_goals')
      .insert(goal)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<PersonalDevGoal>): Promise<PersonalDevGoal> {
    const { data, error } = await supabase
      .from('personal_dev_goals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('personal_dev_goals')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Motivation Items Service
export const motivationService = {
  async getAll(userId: string): Promise<MotivationItem[]> {
    const { data, error } = await supabase
      .from('personal_dev_motivation_items')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(item: Omit<MotivationItem, 'id' | 'created_at' | 'updated_at'>): Promise<MotivationItem> {
    const { data, error } = await supabase
      .from('personal_dev_motivation_items')
      .insert(item)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<MotivationItem>): Promise<MotivationItem> {
    const { data, error } = await supabase
      .from('personal_dev_motivation_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('personal_dev_motivation_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Hobbies Service
export const hobbiesService = {
  async getAll(userId: string): Promise<Hobby[]> {
    const { data, error } = await supabase
      .from('personal_dev_hobbies')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(hobby: Omit<Hobby, 'id' | 'created_at' | 'updated_at'>): Promise<Hobby> {
    const { data, error } = await supabase
      .from('personal_dev_hobbies')
      .insert(hobby)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Hobby>): Promise<Hobby> {
    const { data, error } = await supabase
      .from('personal_dev_hobbies')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('personal_dev_hobbies')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Milestones Service
export const milestonesService = {
  async getAll(userId: string): Promise<Milestone[]> {
    const { data, error } = await supabase
      .from('personal_dev_milestones')
      .select('*')
      .eq('user_id', userId)
      .order('milestone_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(milestone: Omit<Milestone, 'id' | 'created_at' | 'updated_at'>): Promise<Milestone> {
    const { data, error } = await supabase
      .from('personal_dev_milestones')
      .insert(milestone)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Milestone>): Promise<Milestone> {
    const { data, error } = await supabase
      .from('personal_dev_milestones')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('personal_dev_milestones')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Growth Check-ins Service
export const growthCheckinsService = {
  async getAll(userId: string): Promise<GrowthCheckin[]> {
    const { data, error } = await supabase
      .from('personal_dev_growth_checkins')
      .select('*')
      .eq('user_id', userId)
      .order('checkin_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(checkin: Omit<GrowthCheckin, 'id' | 'created_at' | 'updated_at'>): Promise<GrowthCheckin> {
    const { data, error } = await supabase
      .from('personal_dev_growth_checkins')
      .insert(checkin)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<GrowthCheckin>): Promise<GrowthCheckin> {
    const { data, error } = await supabase
      .from('personal_dev_growth_checkins')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('personal_dev_growth_checkins')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Values Service
export const valuesService = {
  async getAll(userId: string): Promise<PersonalValue[]> {
    const { data, error } = await supabase
      .from('personal_dev_values')
      .select('*')
      .eq('user_id', userId)
      .order('priority_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(value: Omit<PersonalValue, 'id' | 'created_at' | 'updated_at'>): Promise<PersonalValue> {
    const { data, error } = await supabase
      .from('personal_dev_values')
      .insert(value)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<PersonalValue>): Promise<PersonalValue> {
    const { data, error } = await supabase
      .from('personal_dev_values')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('personal_dev_values')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Ideas Service
export const ideasService = {
  async getAll(userId: string): Promise<Idea[]> {
    const { data, error } = await supabase
      .from('personal_dev_ideas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(idea: Omit<Idea, 'id' | 'created_at' | 'updated_at'>): Promise<Idea> {
    const { data, error } = await supabase
      .from('personal_dev_ideas')
      .insert(idea)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Idea>): Promise<Idea> {
    const { data, error } = await supabase
      .from('personal_dev_ideas')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('personal_dev_ideas')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Skills Service
export const skillsService = {
  async getAll(userId: string): Promise<Skill[]> {
    const { data, error } = await supabase
      .from('personal_dev_skills')
      .select('*')
      .eq('user_id', userId)
      .order('skill_name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(skill: Omit<Skill, 'id' | 'created_at' | 'updated_at'>): Promise<Skill> {
    const { data, error } = await supabase
      .from('personal_dev_skills')
      .insert(skill)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Skill>): Promise<Skill> {
    const { data, error } = await supabase
      .from('personal_dev_skills')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('personal_dev_skills')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
