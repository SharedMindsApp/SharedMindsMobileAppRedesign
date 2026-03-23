import { supabase } from './supabase';

export type LifeAreaOverview = {
  id: string;
  user_id: string;
  area_type: string;
  summary: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type LifeAreaGoal = {
  id: string;
  overview_id: string;
  title: string;
  description: string | null;
  status: string;
  target_date: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
};

export type LifeAreaTask = {
  id: string;
  overview_id: string;
  title: string;
  completed: boolean;
  priority: string | null;
  due_date: string | null;
  order_index: number;
  created_at: string;
};

export async function getLifeAreaOverview(userId: string, areaType: string): Promise<LifeAreaOverview | null> {
  const { data: existing, error: fetchError } = await supabase
    .from('life_area_overviews')
    .select('*')
    .eq('user_id', userId)
    .eq('area_type', areaType)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching life area overview:', fetchError);
    return null;
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: insertError } = await supabase
    .from('life_area_overviews')
    .insert({ user_id: userId, area_type: areaType })
    .select()
    .single();

  if (insertError) {
    console.error('Error creating life area overview:', insertError);
    return null;
  }

  return created;
}

export async function updateLifeAreaOverview(
  userId: string,
  areaType: string,
  updates: Partial<Pick<LifeAreaOverview, 'summary' | 'notes'>>
): Promise<boolean> {
  const overview = await getLifeAreaOverview(userId, areaType);
  if (!overview) return false;

  const { error } = await supabase
    .from('life_area_overviews')
    .update(updates)
    .eq('id', overview.id);

  if (error) {
    console.error('Error updating life area overview:', error);
    return false;
  }

  return true;
}

export async function getLifeAreaGoals(userId: string, areaType: string): Promise<LifeAreaGoal[]> {
  const overview = await getLifeAreaOverview(userId, areaType);
  if (!overview) return [];

  const { data, error } = await supabase
    .from('life_area_goals')
    .select('*')
    .eq('overview_id', overview.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching life area goals:', error);
    return [];
  }

  return data || [];
}

export async function createLifeAreaGoal(userId: string, areaType: string, title: string): Promise<LifeAreaGoal | null> {
  const overview = await getLifeAreaOverview(userId, areaType);
  if (!overview) return null;

  const { data, error } = await supabase
    .from('life_area_goals')
    .insert({
      overview_id: overview.id,
      title,
      status: 'active'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating life area goal:', error);
    return null;
  }

  return data;
}

export async function updateLifeAreaGoal(
  goalId: string,
  updates: Partial<Pick<LifeAreaGoal, 'title' | 'progress' | 'status'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('life_area_goals')
    .update(updates)
    .eq('id', goalId);

  if (error) {
    console.error('Error updating life area goal:', error);
    return false;
  }

  return true;
}

export async function deleteLifeAreaGoal(goalId: string): Promise<boolean> {
  const { error } = await supabase
    .from('life_area_goals')
    .delete()
    .eq('id', goalId);

  if (error) {
    console.error('Error deleting life area goal:', error);
    return false;
  }

  return true;
}

export async function getLifeAreaTasks(userId: string, areaType: string): Promise<LifeAreaTask[]> {
  const overview = await getLifeAreaOverview(userId, areaType);
  if (!overview) return [];

  const { data, error } = await supabase
    .from('life_area_tasks')
    .select('*')
    .eq('overview_id', overview.id)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching life area tasks:', error);
    return [];
  }

  return data || [];
}

export async function createLifeAreaTask(userId: string, areaType: string, title: string): Promise<LifeAreaTask | null> {
  const overview = await getLifeAreaOverview(userId, areaType);
  if (!overview) return null;

  const tasks = await getLifeAreaTasks(userId, areaType);
  const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.order_index)) : 0;

  const { data, error } = await supabase
    .from('life_area_tasks')
    .insert({
      overview_id: overview.id,
      title,
      order_index: maxOrder + 1
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating life area task:', error);
    return null;
  }

  return data;
}

export async function updateLifeAreaTask(
  taskId: string,
  updates: Partial<Pick<LifeAreaTask, 'title' | 'completed'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('life_area_tasks')
    .update(updates)
    .eq('id', taskId);

  if (error) {
    console.error('Error updating life area task:', error);
    return false;
  }

  return true;
}

export async function deleteLifeAreaTask(taskId: string): Promise<boolean> {
  const { error } = await supabase
    .from('life_area_tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting life area task:', error);
    return false;
  }

  return true;
}
