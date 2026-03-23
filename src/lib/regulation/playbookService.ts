import { supabase } from '../supabase';
import type {
  RegulationPlaybook,
  QuickPin,
  CreatePlaybookInput,
  UpdatePlaybookInput,
  CreateQuickPinInput,
} from './playbookTypes';

/**
 * Get all playbooks for a user
 */
export async function getUserPlaybooks(userId: string): Promise<RegulationPlaybook[]> {
  const { data, error } = await supabase
    .from('regulation_playbooks')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[PlaybookService] Error fetching playbooks:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a specific playbook for a signal type
 */
export async function getPlaybookBySignalKey(
  userId: string,
  signalKey: string
): Promise<RegulationPlaybook | null> {
  const { data, error } = await supabase
    .from('regulation_playbooks')
    .select('*')
    .eq('user_id', userId)
    .eq('signal_key', signalKey)
    .maybeSingle();

  if (error) {
    console.error('[PlaybookService] Error fetching playbook:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new playbook
 */
export async function createPlaybook(
  userId: string,
  input: CreatePlaybookInput
): Promise<RegulationPlaybook> {
  const { data, error } = await supabase
    .from('regulation_playbooks')
    .insert({
      user_id: userId,
      signal_key: input.signal_key,
      notes: input.notes || null,
      helps: input.helps || [],
      doesnt_help: input.doesnt_help || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[PlaybookService] Error creating playbook:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing playbook
 */
export async function updatePlaybook(
  userId: string,
  signalKey: string,
  input: UpdatePlaybookInput
): Promise<RegulationPlaybook> {
  const updates: any = {
    updated_at: new Date().toISOString(),
  };

  if (input.notes !== undefined) updates.notes = input.notes || null;
  if (input.helps !== undefined) updates.helps = input.helps;
  if (input.doesnt_help !== undefined) updates.doesnt_help = input.doesnt_help || null;

  const { data, error } = await supabase
    .from('regulation_playbooks')
    .update(updates)
    .eq('user_id', userId)
    .eq('signal_key', signalKey)
    .select()
    .single();

  if (error) {
    console.error('[PlaybookService] Error updating playbook:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a playbook
 */
export async function deletePlaybook(userId: string, signalKey: string): Promise<void> {
  const { error } = await supabase
    .from('regulation_playbooks')
    .delete()
    .eq('user_id', userId)
    .eq('signal_key', signalKey);

  if (error) {
    console.error('[PlaybookService] Error deleting playbook:', error);
    throw error;
  }
}

/**
 * Create or update a playbook (upsert)
 */
export async function upsertPlaybook(
  userId: string,
  input: CreatePlaybookInput
): Promise<RegulationPlaybook> {
  const existing = await getPlaybookBySignalKey(userId, input.signal_key);

  if (existing) {
    return updatePlaybook(userId, input.signal_key, input);
  } else {
    return createPlaybook(userId, input);
  }
}

/**
 * Create a quick pin
 */
export async function createQuickPin(
  userId: string,
  input: CreateQuickPinInput
): Promise<QuickPin> {
  const { data, error } = await supabase
    .from('regulation_quick_pins')
    .insert({
      user_id: userId,
      signal_key: input.signal_key,
      signal_instance_id: input.signal_instance_id || null,
      reason_tags: input.reason_tags || [],
      note: input.note || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[PlaybookService] Error creating quick pin:', error);
    throw error;
  }

  return data;
}

/**
 * Get quick pins for a signal type
 */
export async function getQuickPinsBySignalKey(
  userId: string,
  signalKey: string
): Promise<QuickPin[]> {
  const { data, error } = await supabase
    .from('regulation_quick_pins')
    .select('*')
    .eq('user_id', userId)
    .eq('signal_key', signalKey)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[PlaybookService] Error fetching quick pins:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get all quick pins for a user
 */
export async function getUserQuickPins(userId: string): Promise<QuickPin[]> {
  const { data, error } = await supabase
    .from('regulation_quick_pins')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[PlaybookService] Error fetching user quick pins:', error);
    throw error;
  }

  return data || [];
}

/**
 * Delete a quick pin
 */
export async function deleteQuickPin(userId: string, pinId: string): Promise<void> {
  const { error } = await supabase
    .from('regulation_quick_pins')
    .delete()
    .eq('user_id', userId)
    .eq('id', pinId);

  if (error) {
    console.error('[PlaybookService] Error deleting quick pin:', error);
    throw error;
  }
}

/**
 * Check if user has a playbook for a signal
 */
export async function hasPlaybookForSignal(
  userId: string,
  signalKey: string
): Promise<boolean> {
  const playbook = await getPlaybookBySignalKey(userId, signalKey);
  return playbook !== null;
}

/**
 * Count quick pins for a signal type
 */
export async function countQuickPinsForSignal(
  userId: string,
  signalKey: string
): Promise<number> {
  const { count, error } = await supabase
    .from('regulation_quick_pins')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('signal_key', signalKey);

  if (error) {
    console.error('[PlaybookService] Error counting quick pins:', error);
    return 0;
  }

  return count || 0;
}
