/**
 * Reminder Service
 * 
 * Service for managing reminders for events and tasks.
 * Reminders are scheduled notifications that fire at specific times before events/tasks.
 */

import { supabase } from '../supabase';
import { emitNotificationIntent } from '../notificationResolver';

export interface Reminder {
  id: string;
  entity_type: 'event' | 'task';
  entity_id: string;
  offset_minutes: number;
  owner_user_id: string;
  notify_owner: boolean;
  notify_attendees: boolean;
  is_sent: boolean;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReminderInput {
  entity_type: 'event' | 'task';
  entity_id: string;
  offset_minutes: number;
  notify_owner?: boolean;
  notify_attendees?: boolean;
}

export interface UpdateReminderInput {
  offset_minutes?: number;
  notify_owner?: boolean;
  notify_attendees?: boolean;
}

/**
 * Get all reminders for an entity
 */
export async function getRemindersForEntity(
  entityType: 'event' | 'task',
  entityId: string
): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('offset_minutes', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch reminders: ${error.message}`);
  }

  return data || [];
}

/**
 * Helper: Get profile ID from auth user ID
 * created_by column references profiles(id), not auth.users(id)
 */
async function getProfileIdFromUserId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[reminderService] Error fetching profile:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * Create a reminder
 */
export async function createReminder(
  ownerUserId: string, // auth.users.id
  input: CreateReminderInput
): Promise<Reminder> {
  // Get profile ID for created_by column (old reminders table requires it)
  const profileId = await getProfileIdFromUserId(ownerUserId);
  
  if (!profileId) {
    throw new Error('Profile not found for user. Cannot create reminder.');
  }

  // owner_user_id references auth.users(id), so use auth.users.id directly
  // space_id is nullable for personal event/task reminders (can be NULL)
  // created_by references profiles(id) - required by old reminders table schema
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      offset_minutes: input.offset_minutes,
      owner_user_id: ownerUserId, // auth.users.id
      created_by: profileId, // profiles.id - required for compatibility with old reminders table
      notify_owner: input.notify_owner ?? true,
      notify_attendees: input.notify_attendees ?? false,
      space_id: null, // Personal event/task reminders don't need a space_id
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation (reminder already exists)
    if (error.code === '23505') {
      throw new Error(`Reminder with this offset already exists for this ${input.entity_type}`);
    }
    throw new Error(`Failed to create reminder: ${error.message}`);
  }

  return data;
}

/**
 * Update a reminder
 */
export async function updateReminder(
  reminderId: string,
  updates: UpdateReminderInput
): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reminderId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update reminder: ${error.message}`);
  }

  return data;
}

/**
 * Delete a reminder
 */
export async function deleteReminder(reminderId: string): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', reminderId);

  if (error) {
    throw new Error(`Failed to delete reminder: ${error.message}`);
  }
}

/**
 * Delete all reminders for an entity
 */
export async function deleteRemindersForEntity(
  entityType: 'event' | 'task',
  entityId: string
): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (error) {
    throw new Error(`Failed to delete reminders: ${error.message}`);
  }
}

/**
 * Common reminder presets in minutes
 */
export const REMINDER_PRESETS = [
  { label: 'At time', value: 0 },
  { label: '5 minutes before', value: 5 },
  { label: '15 minutes before', value: 15 },
  { label: '30 minutes before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '2 hours before', value: 120 },
  { label: '1 day before', value: 1440 },
  { label: '2 days before', value: 2880 },
] as const;

/**
 * Format offset minutes to human-readable string
 */
export function formatReminderOffset(minutes: number): string {
  if (minutes === 0) return 'At time';
  if (minutes < 60) return `${minutes} minutes before`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} before`;
  }
  const days = Math.floor(minutes / 1440);
  return `${days} day${days > 1 ? 's' : ''} before`;
}
