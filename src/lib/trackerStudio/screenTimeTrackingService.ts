/**
 * Screen Time Tracking Service
 * 
 * Handles automatic tracking of app usage, screen time, and visit counts.
 * Works with native mobile bridge to monitor app usage in real-time.
 */

import { supabase } from '../supabase';
import type { Tracker, TrackerEntry } from './types';

export interface AppUsageEvent {
  appId: string;
  appName: string;
  packageName?: string;
  timestamp: string;
  eventType: 'app_opened' | 'app_closed' | 'app_in_foreground' | 'app_in_background';
  sessionDuration?: number; // seconds
}

export interface TrackedApp {
  appId: string;
  appName: string;
  packageName?: string;
  category?: string;
  isTracking: boolean;
  startTrackingDate?: string;
}

/**
 * Start tracking an app
 */
export async function startTrackingApp(
  trackerId: string,
  app: { id: string; name: string; packageName?: string; category?: string }
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Save tracked app to tracker metadata or separate table
  // For now, we'll use tracker metadata
  const tracker = await supabase
    .from('trackers')
    .select('metadata')
    .eq('id', trackerId)
    .single();

  if (tracker.error) {
    throw new Error('Failed to load tracker');
  }

  const metadata = (tracker.data?.metadata as Record<string, any>) || {};
  const trackedApps = (metadata.trackedApps as TrackedApp[]) || [];

  // Check if app is already tracked
  if (trackedApps.some(a => a.appId === app.id)) {
    return; // Already tracking
  }

  // Add app to tracked list
  trackedApps.push({
    appId: app.id,
    appName: app.name,
    packageName: app.packageName,
    category: app.category,
    isTracking: true,
    startTrackingDate: new Date().toISOString().split('T')[0],
  });

  // Update tracker metadata
  const { error } = await supabase
    .from('trackers')
    .update({
      metadata: {
        ...metadata,
        trackedApps,
      },
    })
    .eq('id', trackerId);

  if (error) {
    throw new Error(`Failed to start tracking app: ${error.message}`);
  }

  // TODO: Call native bridge to start monitoring this app
  // await ScreenTimeNative.startTrackingApp(app.packageName || app.id);
}

/**
 * Stop tracking an app
 */
export async function stopTrackingApp(trackerId: string, appId: string): Promise<void> {
  const tracker = await supabase
    .from('trackers')
    .select('metadata')
    .eq('id', trackerId)
    .single();

  if (tracker.error) {
    throw new Error('Failed to load tracker');
  }

  const metadata = (tracker.data?.metadata as Record<string, any>) || {};
  const trackedApps = (metadata.trackedApps as TrackedApp[]) || [];

  // Remove app from tracked list
  const updated = trackedApps.filter(a => a.appId !== appId);

  const { error } = await supabase
    .from('trackers')
    .update({
      metadata: {
        ...metadata,
        trackedApps: updated,
      },
    })
    .eq('id', trackerId);

  if (error) {
    throw new Error(`Failed to stop tracking app: ${error.message}`);
  }

  // TODO: Call native bridge to stop monitoring
  // await ScreenTimeNative.stopTrackingApp(appId);
}

/**
 * Get tracked apps for a tracker
 */
export async function getTrackedApps(trackerId: string): Promise<TrackedApp[]> {
  const tracker = await supabase
    .from('trackers')
    .select('metadata')
    .eq('id', trackerId)
    .single();

  if (tracker.error || !tracker.data) {
    return [];
  }

  const metadata = (tracker.data.metadata as Record<string, any>) || {};
  return (metadata.trackedApps as TrackedApp[]) || [];
}

/**
 * Record app usage event (called by native bridge when app is used)
 */
export async function recordAppUsageEvent(
  trackerId: string,
  event: AppUsageEvent
): Promise<TrackerEntry> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  // Get or create today's entry for this app
  const existingEntry = await supabase
    .from('tracker_entries')
    .select('*')
    .eq('tracker_id', trackerId)
    .eq('entry_date', today)
    .eq('field_values->>app_name', event.appName)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let entry: TrackerEntry;

  if (existingEntry.data) {
    // Update existing entry
    const currentValues = existingEntry.data.field_values || {};
    const currentMinutes = (currentValues.usage_minutes as number) || 0;
    const currentPickups = (currentValues.pickups as number) || 0;
    const sessionDuration = event.sessionDuration || 0;

    const updatedValues = {
      ...currentValues,
      usage_minutes: currentMinutes + Math.round(sessionDuration / 60),
      pickups: event.eventType === 'app_opened' ? currentPickups + 1 : currentPickups,
      app_name: event.appName,
      session_type: 'tracking',
    };

    const { data, error } = await supabase
      .from('tracker_entries')
      .update({
        field_values: updatedValues,
        entry_time: now,
      })
      .eq('id', existingEntry.data.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update usage: ${error.message}`);
    }

    entry = data;
  } else {
    // Create new entry
    const fieldValues = {
      app_name: event.appName,
      app_category: 'other',
      usage_minutes: Math.round((event.sessionDuration || 0) / 60),
      session_type: 'tracking',
      pickups: event.eventType === 'app_opened' ? 1 : 0,
      total_screen_time: Math.round((event.sessionDuration || 0) / 60),
    };

    const { data, error } = await supabase
      .from('tracker_entries')
      .insert({
        tracker_id: trackerId,
        entry_date: today,
        entry_time: now,
        field_values: fieldValues,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record usage: ${error.message}`);
    }

    entry = data;
  }

  return entry;
}

/**
 * Get daily usage summary for tracked apps
 */
export async function getDailyUsageSummary(
  trackerId: string,
  date: string
): Promise<Record<string, { minutes: number; pickups: number; sessions: number }>> {
  const { data: entries, error } = await supabase
    .from('tracker_entries')
    .select('*')
    .eq('tracker_id', trackerId)
    .eq('entry_date', date)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch usage: ${error.message}`);
  }

  const summary: Record<string, { minutes: number; pickups: number; sessions: number }> = {};

  for (const entry of entries || []) {
    const fieldValues = entry.field_values || {};
    const appName = fieldValues.app_name as string;
    
    if (!appName) continue;

    if (!summary[appName]) {
      summary[appName] = {
        minutes: 0,
        pickups: 0,
        sessions: 0,
      };
    }

    summary[appName].minutes += (fieldValues.usage_minutes as number) || 0;
    summary[appName].pickups += (fieldValues.pickups as number) || 0;
    summary[appName].sessions += 1;
  }

  return summary;
}

/**
 * Initialize native app usage monitoring
 * This should be called when the tracker is opened
 */
export async function initializeAppUsageMonitoring(trackerId: string): Promise<void> {
  // Get tracked apps
  const trackedApps = await getTrackedApps(trackerId);

  // TODO: Call native bridge to start monitoring all tracked apps
  // for (const app of trackedApps) {
  //   if (app.isTracking && app.packageName) {
  //     await ScreenTimeNative.startMonitoringApp(app.packageName, {
  //       onAppOpened: (event) => recordAppUsageEvent(trackerId, {
  //         ...event,
  //         eventType: 'app_opened',
  //       }),
  //       onAppClosed: (event) => recordAppUsageEvent(trackerId, {
  //         ...event,
  //         eventType: 'app_closed',
  //       }),
  //       onForeground: (event) => recordAppUsageEvent(trackerId, {
  //         ...event,
  //         eventType: 'app_in_foreground',
  //       }),
  //       onBackground: (event) => recordAppUsageEvent(trackerId, {
  //         ...event,
  //         eventType: 'app_in_background',
  //       }),
  //     });
  //   }
  // }
}
