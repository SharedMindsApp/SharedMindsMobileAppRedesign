import { supabase } from './supabase';

export interface LifeStatement {
  id: string;
  user_id: string;
  statement?: string;
  what_good_life_looks_like?: string;
  want_more_of?: string;
  want_less_of?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LongTermGoal {
  id: string;
  user_id: string;
  title: string;
  time_horizon?: '1-3_years' | '5_plus_years';
  category?: 'career' | 'personal' | 'health' | 'relationships' | 'financial' | 'learning' | 'other';
  intent_notes?: string;
  status: 'forming' | 'active' | 'evolving' | 'paused';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FiveYearOutlook {
  id: string;
  user_id: string;
  lifestyle_vision?: string;
  lifestyle_confidence: number;
  work_income_vision?: string;
  work_income_confidence: number;
  home_environment_vision?: string;
  home_environment_confidence: number;
  relationships_vision?: string;
  relationships_confidence: number;
  health_energy_vision?: string;
  health_energy_confidence: number;
  overall_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VisionArea {
  id: string;
  user_id: string;
  area_name: string;
  area_type: 'personal_growth' | 'career_work' | 'health_wellbeing' | 'relationships_social' | 'finances_security' | 'home_lifestyle' | 'learning_creativity' | 'custom';
  vision_statement?: string;
  current_state?: string;
  desired_state?: string;
  notes?: string;
  is_visible: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface VisionBoardItem {
  id: string;
  user_id: string;
  image_url?: string;
  caption?: string;
  quote?: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonthlyCheckin {
  id: string;
  user_id: string;
  checkin_date: string;
  what_felt_aligned?: string;
  what_didnt_feel_aligned?: string;
  small_adjustment?: string;
  overall_feeling?: string;
  created_at: string;
  updated_at: string;
}

export interface CareerPurpose {
  id: string;
  user_id: string;
  desired_work_themes?: string;
  impact_preferences?: string;
  skills_to_grow?: string;
  career_narrative?: string;
  what_matters_most?: string;
  created_at: string;
  updated_at: string;
}

export interface RelationshipVision {
  id: string;
  user_id: string;
  what_matters?: string;
  boundaries_non_negotiables?: string;
  how_to_show_up?: string;
  long_term_intentions?: string;
  relationship_values?: string;
  created_at: string;
  updated_at: string;
}

export interface Value {
  id: string;
  user_id: string;
  value_name: string;
  description?: string;
  what_it_means_to_me?: string;
  current_alignment_feeling?: string;
  priority_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Life Statement Functions
export async function getActiveLifeStatement() {
  const { data, error } = await supabase
    .from('vision_life_statements')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as LifeStatement | null;
}

export async function createLifeStatement(statement: Omit<LifeStatement, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('vision_life_statements')
    .insert({ ...statement, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as LifeStatement;
}

export async function updateLifeStatement(id: string, updates: Partial<LifeStatement>) {
  const { data, error } = await supabase
    .from('vision_life_statements')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LifeStatement;
}

// Long-Term Goals Functions
export async function getLongTermGoals() {
  const { data, error } = await supabase
    .from('vision_long_term_goals')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as LongTermGoal[];
}

export async function createLongTermGoal(goal: Omit<LongTermGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('vision_long_term_goals')
    .insert({ ...goal, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as LongTermGoal;
}

export async function updateLongTermGoal(id: string, updates: Partial<LongTermGoal>) {
  const { data, error } = await supabase
    .from('vision_long_term_goals')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LongTermGoal;
}

export async function deleteLongTermGoal(id: string) {
  const { error } = await supabase
    .from('vision_long_term_goals')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// 5-Year Outlook Functions
export async function getFiveYearOutlook() {
  const { data, error } = await supabase
    .from('vision_five_year_outlook')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as FiveYearOutlook | null;
}

export async function createOrUpdateFiveYearOutlook(outlook: Partial<FiveYearOutlook>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const existing = await getFiveYearOutlook();

  if (existing) {
    const { data, error } = await supabase
      .from('vision_five_year_outlook')
      .update({ ...outlook, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data as FiveYearOutlook;
  } else {
    const { data, error } = await supabase
      .from('vision_five_year_outlook')
      .insert({ ...outlook, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data as FiveYearOutlook;
  }
}

// Vision Areas Functions
export async function getVisionAreas() {
  const { data, error } = await supabase
    .from('vision_areas')
    .select('*')
    .eq('is_visible', true)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data as VisionArea[];
}

export async function createVisionArea(area: Omit<VisionArea, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('vision_areas')
    .insert({ ...area, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as VisionArea;
}

export async function updateVisionArea(id: string, updates: Partial<VisionArea>) {
  const { data, error } = await supabase
    .from('vision_areas')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as VisionArea;
}

export async function deleteVisionArea(id: string) {
  const { error } = await supabase
    .from('vision_areas')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Vision Board Functions
export async function getVisionBoardItems() {
  const { data, error } = await supabase
    .from('vision_board_items')
    .select('*')
    .eq('is_visible', true)
    .order('position_y', { ascending: true });

  if (error) throw error;
  return data as VisionBoardItem[];
}

export async function createVisionBoardItem(item: Omit<VisionBoardItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('vision_board_items')
    .insert({ ...item, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as VisionBoardItem;
}

export async function updateVisionBoardItem(id: string, updates: Partial<VisionBoardItem>) {
  const { data, error } = await supabase
    .from('vision_board_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as VisionBoardItem;
}

export async function deleteVisionBoardItem(id: string) {
  const { error } = await supabase
    .from('vision_board_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Monthly Check-In Functions
export async function getMonthlyCheckins() {
  const { data, error } = await supabase
    .from('vision_monthly_checkins')
    .select('*')
    .order('checkin_date', { ascending: false });

  if (error) throw error;
  return data as MonthlyCheckin[];
}

export async function createMonthlyCheckin(checkin: Omit<MonthlyCheckin, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('vision_monthly_checkins')
    .insert({ ...checkin, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as MonthlyCheckin;
}

export async function updateMonthlyCheckin(id: string, updates: Partial<MonthlyCheckin>) {
  const { data, error } = await supabase
    .from('vision_monthly_checkins')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as MonthlyCheckin;
}

export async function deleteMonthlyCheckin(id: string) {
  const { error } = await supabase
    .from('vision_monthly_checkins')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Career Purpose Functions
export async function getCareerPurpose() {
  const { data, error } = await supabase
    .from('vision_career_purpose')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as CareerPurpose | null;
}

export async function createOrUpdateCareerPurpose(purpose: Partial<CareerPurpose>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const existing = await getCareerPurpose();

  if (existing) {
    const { data, error } = await supabase
      .from('vision_career_purpose')
      .update({ ...purpose, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data as CareerPurpose;
  } else {
    const { data, error } = await supabase
      .from('vision_career_purpose')
      .insert({ ...purpose, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data as CareerPurpose;
  }
}

// Relationship Vision Functions
export async function getRelationshipVision() {
  const { data, error } = await supabase
    .from('vision_relationships')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as RelationshipVision | null;
}

export async function createOrUpdateRelationshipVision(vision: Partial<RelationshipVision>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const existing = await getRelationshipVision();

  if (existing) {
    const { data, error } = await supabase
      .from('vision_relationships')
      .update({ ...vision, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data as RelationshipVision;
  } else {
    const { data, error} = await supabase
      .from('vision_relationships')
      .insert({ ...vision, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data as RelationshipVision;
  }
}

// Values Functions
export async function getValues() {
  const { data, error } = await supabase
    .from('vision_values')
    .select('*')
    .eq('is_active', true)
    .order('priority_order', { ascending: true });

  if (error) throw error;
  return data as Value[];
}

export async function createValue(value: Omit<Value, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('vision_values')
    .insert({ ...value, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Value;
}

export async function updateValue(id: string, updates: Partial<Value>) {
  const { data, error } = await supabase
    .from('vision_values')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Value;
}

export async function deleteValue(id: string) {
  const { error } = await supabase
    .from('vision_values')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
