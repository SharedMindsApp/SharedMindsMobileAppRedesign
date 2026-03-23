/**
 * Tracker Reminder Service
 * 
 * CRUD operations for tracker reminders.
 * Reminders are optional, dismissible, and configurable.
 * No enforcement, no guilt language, no streaks.
 */

import { supabase } from '../supabase';
import { resolveTrackerPermissions } from './trackerPermissionResolver';
import type { Tracker } from './types';

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
    console.error('[trackerReminderService] Error fetching profile:', error);
    return null;
  }

  return data?.id || null;
}

export type TrackerReminderKind = 'entry_prompt' | 'reflection';
export type DeliveryChannel = 'in_app' | 'push';

export interface TrackerReminderSchedule {
  time_of_day?: string; // "HH:MM" format
  days?: string[]; // ["monday", "tuesday", ...] or ["daily", "weekdays"]
  quiet_hours?: {
    start: string; // "HH:MM"
    end: string; // "HH:MM"
  };
}

export interface TrackerReminder {
  id: string;
  entity_type: 'tracker';
  entity_id: string; // tracker.id
  reminder_kind: TrackerReminderKind;
  owner_user_id: string; // auth.uid
  schedule: TrackerReminderSchedule | null;
  delivery_channels: DeliveryChannel[];
  is_active: boolean;
  is_sent: boolean;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTrackerReminderInput {
  tracker_id: string;
  reminder_kind: TrackerReminderKind;
  schedule?: TrackerReminderSchedule;
  delivery_channels?: DeliveryChannel[];
  is_active?: boolean;
}

export interface UpdateTrackerReminderInput {
  reminder_kind?: TrackerReminderKind;
  schedule?: TrackerReminderSchedule | null;
  delivery_channels?: DeliveryChannel[];
  is_active?: boolean;
}

/**
 * Get all reminders for a tracker
 */
export async function getTrackerReminders(trackerId: string): Promise<TrackerReminder[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Check permissions
  const permissions = await resolveTrackerPermissions(trackerId, user.id);
  if (!permissions.canView) {
    throw new Error('Not authorized to view reminders for this tracker');
  }

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('entity_type', 'tracker')
    .eq('entity_id', trackerId)
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch reminders: ${error.message}`);
  }

  return (data || []).map(reminder => ({
    id: reminder.id,
    entity_type: 'tracker' as const,
    entity_id: reminder.entity_id,
    reminder_kind: reminder.reminder_kind as TrackerReminderKind,
    owner_user_id: reminder.owner_user_id,
    schedule: reminder.schedule as TrackerReminderSchedule | null,
    delivery_channels: reminder.delivery_channels as DeliveryChannel[],
    is_active: reminder.is_active,
    is_sent: reminder.is_sent,
    sent_at: reminder.sent_at,
    created_at: reminder.created_at,
    updated_at: reminder.updated_at,
  }));
}

/**
 * Create a tracker reminder
 * Only tracker owner or editors with canEdit can create reminders
 */
export async function createTrackerReminder(
  input: CreateTrackerReminderInput
): Promise<TrackerReminder> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Check permissions - must have canEdit
  const permissions = await resolveTrackerPermissions(input.tracker_id, user.id);
  if (!permissions.canEdit) {
    throw new Error('Not authorized to create reminders for this tracker. Only owners and editors can create reminders.');
  }

  // Viewers cannot create reminders
  if (permissions.role === 'viewer') {
    throw new Error('Viewers cannot create reminders for trackers');
  }

  // Get profile ID for created_by column (for compatibility)
  const profileId = await getProfileIdFromUserId(user.id);
  if (!profileId) {
    throw new Error('Profile not found');
  }

  // Validate: Only one entry_prompt reminder per tracker per user
  if (input.reminder_kind === 'entry_prompt') {
    const existing = await supabase
      .from('reminders')
      .select('id')
      .eq('entity_type', 'tracker')
      .eq('entity_id', input.tracker_id)
      .eq('owner_user_id', user.id)
      .eq('reminder_kind', 'entry_prompt')
      .eq('is_active', true)
      .maybeSingle();

    if (existing.data) {
      throw new Error('An active entry prompt reminder already exists for this tracker');
    }
  }

  // Get tracker name for reminder title
  const { getTracker } = await import('./trackerService');
  const tracker = await getTracker(input.tracker_id);

  // Calculate reminder_date from schedule (required by old reminders table structure)
  // For tracker reminders, we use schedule JSONB, but reminder_date is still required
  let reminderDate = new Date().toISOString().split('T')[0]; // Default to today
  if (input.schedule?.time_of_day) {
    // Parse time from schedule and calculate target date
    const targetTime = new Date();
    const [hours, minutes] = input.schedule.time_of_day.split(':').map(Number);
    targetTime.setHours(hours, minutes || 0, 0, 0);
    
    // If the time has already passed today, set to tomorrow
    if (targetTime < new Date()) {
      targetTime.setDate(targetTime.getDate() + 1);
    }
    
    reminderDate = targetTime.toISOString().split('T')[0];
  }

  // Create reminder
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      entity_type: 'tracker',
      entity_id: input.tracker_id,
      reminder_kind: input.reminder_kind,
      owner_user_id: user.id,
      created_by: profileId, // For compatibility with old reminders table
      title: tracker?.name || 'Tracker', // Use tracker name as reminder title
      reminder_date: reminderDate, // Required by reminders table (from old structure)
      schedule: input.schedule || null,
      delivery_channels: input.delivery_channels || ['in_app'],
      is_active: input.is_active ?? true,
      is_sent: false,
      sent_at: null,
      // Note: offset_minutes is not used for tracker reminders, but required by table
      offset_minutes: 0,
      notify_owner: true, // Not used for tracker reminders but required
      notify_attendees: false, // Not used for tracker reminders but required
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create reminder: ${error.message}`);
  }

  return {
    id: data.id,
    entity_type: 'tracker' as const,
    entity_id: data.entity_id,
    reminder_kind: data.reminder_kind as TrackerReminderKind,
    owner_user_id: data.owner_user_id,
    schedule: data.schedule as TrackerReminderSchedule | null,
    delivery_channels: data.delivery_channels as DeliveryChannel[],
    is_active: data.is_active,
    is_sent: data.is_sent,
    sent_at: data.sent_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Update a tracker reminder
 * Only reminder owner can update
 */
export async function updateTrackerReminder(
  reminderId: string,
  input: UpdateTrackerReminderInput
): Promise<TrackerReminder> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get reminder to check ownership
  const { data: reminder, error: fetchError } = await supabase
    .from('reminders')
    .select('*')
    .eq('id', reminderId)
    .eq('entity_type', 'tracker')
    .eq('owner_user_id', user.id)
    .maybeSingle();

  if (fetchError || !reminder) {
    throw new Error('Reminder not found or not authorized');
  }

  // Update reminder
  const updates: Partial<any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.reminder_kind !== undefined) {
    updates.reminder_kind = input.reminder_kind;
  }

  if (input.schedule !== undefined) {
    updates.schedule = input.schedule;
  }

  if (input.delivery_channels !== undefined) {
    updates.delivery_channels = input.delivery_channels;
  }

  if (input.is_active !== undefined) {
    updates.is_active = input.is_active;
  }

  const { data, error } = await supabase
    .from('reminders')
    .update(updates)
    .eq('id', reminderId)
    .eq('owner_user_id', user.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update reminder: ${error.message}`);
  }

  return {
    id: data.id,
    entity_type: 'tracker' as const,
    entity_id: data.entity_id,
    reminder_kind: data.reminder_kind as TrackerReminderKind,
    owner_user_id: data.owner_user_id,
    schedule: data.schedule as TrackerReminderSchedule | null,
    delivery_channels: data.delivery_channels as DeliveryChannel[],
    is_active: data.is_active,
    is_sent: data.is_sent,
    sent_at: data.sent_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Disable a tracker reminder (soft delete)
 */
export async function disableTrackerReminder(reminderId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('reminders')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', reminderId)
    .eq('owner_user_id', user.id)
    .eq('entity_type', 'tracker');

  if (error) {
    throw new Error(`Failed to disable reminder: ${error.message}`);
  }
}

/**
 * Delete a tracker reminder (hard delete)
 */
export async function deleteTrackerReminder(reminderId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', reminderId)
    .eq('owner_user_id', user.id)
    .eq('entity_type', 'tracker');

  if (error) {
    throw new Error(`Failed to delete reminder: ${error.message}`);
  }
}

/**
 * List all active reminders for a user across all their trackers
 */
export async function listUserTrackerReminders(): Promise<TrackerReminder[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('entity_type', 'tracker')
    .eq('owner_user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list reminders: ${error.message}`);
  }

  return (data || []).map(reminder => ({
    id: reminder.id,
    entity_type: 'tracker' as const,
    entity_id: reminder.entity_id,
    reminder_kind: reminder.reminder_kind as TrackerReminderKind,
    owner_user_id: reminder.owner_user_id,
    schedule: reminder.schedule as TrackerReminderSchedule | null,
    delivery_channels: reminder.delivery_channels as DeliveryChannel[],
    is_active: reminder.is_active,
    is_sent: reminder.is_sent,
    sent_at: reminder.sent_at,
    created_at: reminder.created_at,
    updated_at: reminder.updated_at,
  }));
}
