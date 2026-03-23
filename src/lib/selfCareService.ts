import { supabase } from './supabase';

// Types
export interface WellnessGoal {
  id: string;
  user_id: string;
  household_id: string;
  title: string;
  description?: string;
  category: 'physical' | 'mental' | 'emotional' | 'social';
  timeframe?: string;
  reflection?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExerciseEntry {
  id: string;
  user_id: string;
  household_id: string;
  activity_type: string;
  duration_minutes?: number;
  intensity?: 'low' | 'medium' | 'high';
  notes?: string;
  entry_date: string;
  created_at: string;
}

export interface NutritionLog {
  id: string;
  user_id: string;
  household_id: string;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
  content: string;
  tags?: string[];
  mood_note?: string;
  entry_date: string;
  entry_time?: string;
  created_at: string;
}

export interface SleepLog {
  id: string;
  user_id: string;
  household_id: string;
  log_date: string;
  duration_hours?: number;
  quality_rating?: number;
  notes?: string;
  created_at: string;
}

export interface MentalHealthCheckin {
  id: string;
  user_id: string;
  household_id: string;
  checkin_date: string;
  checkin_time: string;
  mood: string;
  energy_level?: number;
  stress_level?: number;
  reflection?: string;
  created_at: string;
}

export interface MindfulnessSession {
  id: string;
  user_id: string;
  household_id: string;
  session_type: string;
  duration_minutes?: number;
  reflection?: string;
  session_date: string;
  created_at: string;
}

export interface SelfCareRoutine {
  id: string;
  user_id: string;
  household_id: string;
  routine_name: string;
  activities: any[];
  frequency?: string;
  reminder_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutineCompletion {
  id: string;
  routine_id: string;
  user_id: string;
  completion_date: string;
  notes?: string;
  created_at: string;
}

export interface GratitudeEntry {
  id: string;
  user_id: string;
  household_id: string;
  entry_date: string;
  content: string;
  format: 'free_write' | 'bullets';
  created_at: string;
}

export interface BeautyRoutine {
  id: string;
  user_id: string;
  household_id: string;
  routine_name: string;
  routine_type?: 'morning' | 'evening' | 'weekly' | 'other';
  steps: any[];
  products?: any[];
  frequency?: string;
  last_completed?: string;
  created_at: string;
  updated_at: string;
}

export interface RestRecoveryLog {
  id: string;
  user_id: string;
  household_id: string;
  log_date: string;
  log_type: 'rest_block' | 'recovery_day' | 'burnout_note';
  duration_minutes?: number;
  notes?: string;
  created_at: string;
}

// Helper to get personal space ID
export async function getPersonalSpaceId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('household_members')
    .select('household_id, households!inner(type)')
    .eq('auth_user_id', user.id)
    .eq('status', 'active')
    .eq('households.type', 'personal')
    .maybeSingle();

  return data?.household_id || null;
}

// Wellness Goals
export async function getWellnessGoals(householdId: string): Promise<WellnessGoal[]> {
  const { data, error } = await supabase
    .from('wellness_goals')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createWellnessGoal(goal: Partial<WellnessGoal>): Promise<WellnessGoal> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('wellness_goals')
    .insert({ ...goal, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateWellnessGoal(id: string, updates: Partial<WellnessGoal>): Promise<void> {
  const { error } = await supabase
    .from('wellness_goals')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteWellnessGoal(id: string): Promise<void> {
  const { error } = await supabase
    .from('wellness_goals')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Exercise Entries
export async function getExerciseEntries(householdId: string, limit = 30): Promise<ExerciseEntry[]> {
  const { data, error } = await supabase
    .from('exercise_entries')
    .select('*')
    .eq('household_id', householdId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function createExerciseEntry(entry: Partial<ExerciseEntry>): Promise<ExerciseEntry> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('exercise_entries')
    .insert({ ...entry, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteExerciseEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('exercise_entries')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Nutrition Logs
export async function getNutritionLogs(householdId: string, limit = 30): Promise<NutritionLog[]> {
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('*')
    .eq('household_id', householdId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function createNutritionLog(log: Partial<NutritionLog>): Promise<NutritionLog> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('nutrition_logs')
    .insert({ ...log, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteNutritionLog(id: string): Promise<void> {
  const { error } = await supabase
    .from('nutrition_logs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Sleep Logs
export async function getSleepLogs(householdId: string, limit = 30): Promise<SleepLog[]> {
  const { data, error } = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('household_id', householdId)
    .order('log_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function createOrUpdateSleepLog(log: Partial<SleepLog>): Promise<SleepLog> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('sleep_logs')
    .upsert({ ...log, user_id: user.id }, { onConflict: 'user_id,log_date' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSleepLog(id: string): Promise<void> {
  const { error } = await supabase
    .from('sleep_logs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Mental Health Check-ins
export async function getMentalHealthCheckins(householdId: string, limit = 30): Promise<MentalHealthCheckin[]> {
  const { data, error } = await supabase
    .from('mental_health_checkins')
    .select('*')
    .eq('household_id', householdId)
    .order('checkin_date', { ascending: false })
    .order('checkin_time', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function createMentalHealthCheckin(checkin: Partial<MentalHealthCheckin>): Promise<MentalHealthCheckin> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('mental_health_checkins')
    .insert({ ...checkin, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMentalHealthCheckin(id: string): Promise<void> {
  const { error } = await supabase
    .from('mental_health_checkins')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Mindfulness Sessions
export async function getMindfulnessSessions(householdId: string, limit = 30): Promise<MindfulnessSession[]> {
  const { data, error } = await supabase
    .from('mindfulness_sessions')
    .select('*')
    .eq('household_id', householdId)
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function createMindfulnessSession(session: Partial<MindfulnessSession>): Promise<MindfulnessSession> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('mindfulness_sessions')
    .insert({ ...session, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMindfulnessSession(id: string): Promise<void> {
  const { error } = await supabase
    .from('mindfulness_sessions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Self-Care Routines
export async function getSelfCareRoutines(householdId: string): Promise<SelfCareRoutine[]> {
  const { data, error } = await supabase
    .from('selfcare_routines')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createSelfCareRoutine(routine: Partial<SelfCareRoutine>): Promise<SelfCareRoutine> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('selfcare_routines')
    .insert({ ...routine, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSelfCareRoutine(id: string, updates: Partial<SelfCareRoutine>): Promise<void> {
  const { error } = await supabase
    .from('selfcare_routines')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteSelfCareRoutine(id: string): Promise<void> {
  const { error } = await supabase
    .from('selfcare_routines')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function completeRoutine(routineId: string, notes?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('selfcare_routine_completions')
    .insert({
      routine_id: routineId,
      user_id: user.id,
      notes,
    });

  if (error) throw error;
}

// Gratitude Entries
export async function getGratitudeEntries(householdId: string, limit = 30): Promise<GratitudeEntry[]> {
  const { data, error } = await supabase
    .from('gratitude_entries')
    .select('*')
    .eq('household_id', householdId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function createGratitudeEntry(entry: Partial<GratitudeEntry>): Promise<GratitudeEntry> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('gratitude_entries')
    .insert({ ...entry, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGratitudeEntry(id: string, updates: Partial<GratitudeEntry>): Promise<void> {
  const { error } = await supabase
    .from('gratitude_entries')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteGratitudeEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('gratitude_entries')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Beauty Routines
export async function getBeautyRoutines(householdId: string): Promise<BeautyRoutine[]> {
  const { data, error } = await supabase
    .from('beauty_routines')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createBeautyRoutine(routine: Partial<BeautyRoutine>): Promise<BeautyRoutine> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('beauty_routines')
    .insert({ ...routine, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBeautyRoutine(id: string, updates: Partial<BeautyRoutine>): Promise<void> {
  const { error } = await supabase
    .from('beauty_routines')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteBeautyRoutine(id: string): Promise<void> {
  const { error } = await supabase
    .from('beauty_routines')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Rest & Recovery Logs
export async function getRestRecoveryLogs(householdId: string, limit = 30): Promise<RestRecoveryLog[]> {
  const { data, error } = await supabase
    .from('rest_recovery_logs')
    .select('*')
    .eq('household_id', householdId)
    .order('log_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function createRestRecoveryLog(log: Partial<RestRecoveryLog>): Promise<RestRecoveryLog> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('rest_recovery_logs')
    .insert({ ...log, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRestRecoveryLog(id: string): Promise<void> {
  const { error } = await supabase
    .from('rest_recovery_logs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
