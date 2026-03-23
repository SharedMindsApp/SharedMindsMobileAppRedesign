/**
 * Screen Time Service
 * 
 * Service for managing screen time tracking, app usage monitoring,
 * and soft lockout sessions. Designed to work with native mobile apps
 * for full functionality (app blocking requires native capabilities).
 */

import { supabase } from '../supabase';
import type { Tracker, TrackerEntry } from './types';

export interface AppUsageData {
  appName: string;
  appCategory: string;
  usageMinutes: number;
  timestamp: string;
}

export interface LockoutSession {
  id: string;
  duration: number; // minutes
  trigger: 'time_limit' | 'app_blocked' | 'schedule' | 'manual' | 'focus_mode';
  blockedApps: string[];
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'cancelled';
}

export interface ScreenTimeStats {
  totalMinutes: number;
  totalHours: number;
  pickups: number;
  notifications: number;
  topApps: Array<{ name: string; minutes: number; percentage: number }>;
  byCategory: Record<string, number>;
  dailyGoal: number | null;
  goalProgress: number; // 0-100
}

export interface ScreenTimeGoal {
  dailyLimit: number; // minutes
  appLimits: Record<string, number>; // app name -> minutes
  blockedApps: string[];
  lockoutDuration: number; // default lockout duration in minutes
  focusModeSchedules: Array<{
    start: string; // HH:mm
    end: string; // HH:mm
    days: number[]; // 0-6 (Sunday-Saturday)
  }>;
}

/**
 * Get screen time statistics for a date range
 */
export async function getScreenTimeStats(
  trackerId: string,
  startDate: string,
  endDate: string
): Promise<ScreenTimeStats> {
  const { data: entries, error } = await supabase
    .from('tracker_entries')
    .select('*')
    .eq('tracker_id', trackerId)
    .gte('entry_date', startDate)
    .lte('entry_date', endDate)
    .order('entry_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch screen time stats: ${error.message}`);
  }

  let totalMinutes = 0;
  let totalPickups = 0;
  let totalNotifications = 0;
  const appUsage = new Map<string, number>();
  const categoryUsage = new Map<string, number>();

  for (const entry of entries || []) {
    const fieldValues = entry.field_values || {};
    totalMinutes += (fieldValues.usage_minutes as number) || 0;
    totalPickups += (fieldValues.pickups as number) || 0;
    totalNotifications += (fieldValues.notifications_received as number) || 0;

    const appName = fieldValues.app_name as string;
    const appCategory = fieldValues.app_category as string;
    const minutes = (fieldValues.usage_minutes as number) || 0;

    if (appName) {
      appUsage.set(appName, (appUsage.get(appName) || 0) + minutes);
    }

    if (appCategory) {
      categoryUsage.set(appCategory, (categoryUsage.get(appCategory) || 0) + minutes);
    }
  }

  // Calculate top apps
  const topApps = Array.from(appUsage.entries())
    .map(([name, minutes]) => ({
      name,
      minutes,
      percentage: totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0,
    }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 10);

  // Get daily goal (from most recent entry or default)
  const dailyGoal = entries?.[0]?.field_values?.daily_goal as number | undefined || null;

  const goalProgress = dailyGoal && dailyGoal > 0
    ? Math.min((totalMinutes / dailyGoal) * 100, 100)
    : 0;

  return {
    totalMinutes,
    totalHours: totalMinutes / 60,
    pickups: totalPickups,
    notifications: totalNotifications,
    topApps,
    byCategory: Object.fromEntries(categoryUsage),
    dailyGoal,
    goalProgress,
  };
}

/**
 * Get active lockout sessions
 */
export async function getActiveLockoutSessions(trackerId: string): Promise<LockoutSession[]> {
  // In a real implementation, this would query a separate lockout_sessions table
  // For now, we'll query recent entries with lockout session type
  const { data: entries, error } = await supabase
    .from('tracker_entries')
    .select('*')
    .eq('tracker_id', trackerId)
    .eq('field_values->>session_type', 'lockout')
    .gte('entry_date', new Date().toISOString().split('T')[0])
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch lockout sessions: ${error.message}`);
  }

  const sessions: LockoutSession[] = [];

  for (const entry of entries || []) {
    const fieldValues = entry.field_values || {};
    const endTime = fieldValues.end_time as string | undefined;
    const now = new Date().toISOString();

    // Only include active sessions (no end time or end time in future)
    if (!endTime || endTime > now) {
      sessions.push({
        id: entry.id,
        duration: (fieldValues.lockout_duration as number) || 0,
        trigger: (fieldValues.lockout_trigger as LockoutSession['trigger']) || 'manual',
        blockedApps: (fieldValues.blocked_apps as string)?.split(',').filter(Boolean) || [],
        startTime: entry.created_at,
        endTime,
        status: endTime && endTime <= now ? 'completed' : 'active',
      });
    }
  }

  return sessions;
}

/**
 * Create a lockout session entry
 */
export async function createLockoutSession(
  trackerId: string,
  session: Omit<LockoutSession, 'id' | 'status'> & { status?: LockoutSession['status'] }
): Promise<TrackerEntry> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const now = new Date();
  const endTime = new Date(now.getTime() + session.duration * 60 * 1000);

  const fieldValues = {
    app_name: 'Lockout Session',
    app_category: 'system',
    usage_minutes: 0,
    session_type: 'lockout',
    lockout_duration: session.duration,
    lockout_trigger: session.trigger,
    blocked_apps: session.blockedApps.join(','),
  };

  const { data: entry, error } = await supabase
    .from('tracker_entries')
    .insert({
      tracker_id: trackerId,
      entry_date: now.toISOString().split('T')[0],
      entry_time: now.toISOString(),
      field_values: fieldValues,
      notes: `Lockout session: ${session.duration} minutes. Triggered by: ${session.trigger}`,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create lockout session: ${error.message}`);
  }

  return entry;
}

/**
 * Update lockout session (mark as completed/cancelled)
 */
export async function updateLockoutSession(
  entryId: string,
  unlockMethod: string,
  status: 'completed' | 'cancelled' = 'completed'
): Promise<void> {
  const { data: entry, error: fetchError } = await supabase
    .from('tracker_entries')
    .select('field_values')
    .eq('id', entryId)
    .single();

  if (fetchError || !entry) {
    throw new Error('Lockout session not found');
  }

  const updatedFieldValues = {
    ...entry.field_values,
    unlock_method: unlockMethod,
    end_time: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from('tracker_entries')
    .update({
      field_values: updatedFieldValues,
      notes: `${entry.notes || ''}\nUnlocked via: ${unlockMethod}`,
    })
    .eq('id', entryId);

  if (updateError) {
    throw new Error(`Failed to update lockout session: ${updateError.message}`);
  }
}

/**
 * Get screen time goals/settings for a tracker
 * This would typically be stored in tracker metadata or a separate settings table
 */
export async function getScreenTimeGoals(trackerId: string): Promise<ScreenTimeGoal | null> {
  // In a real implementation, this would fetch from a tracker_settings table
  // For now, return default goals
  return {
    dailyLimit: 120, // 2 hours default
    appLimits: {},
    blockedApps: [],
    lockoutDuration: 15, // 15 minutes default
    focusModeSchedules: [],
  };
}

/**
 * Save screen time goals/settings
 */
export async function saveScreenTimeGoals(
  trackerId: string,
  goals: ScreenTimeGoal
): Promise<void> {
  // In a real implementation, this would save to a tracker_settings table
  // For now, we could store as metadata on the tracker
  const { error } = await supabase
    .from('trackers')
    .update({
      metadata: {
        screen_time_goals: goals,
      },
    })
    .eq('id', trackerId);

  if (error) {
    throw new Error(`Failed to save screen time goals: ${error.message}`);
  }
}
