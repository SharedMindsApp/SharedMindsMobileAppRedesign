/**
 * Habit Tracker Sync Service
 * 
 * Synchronizes entries between Habit Tracker and detailed trackers
 * to reduce double entry and maintain consistency.
 */

import { supabase } from '../supabase';
import type { Tracker, TrackerEntry } from './types';
import { getTrackerForHabit } from './habitTrackerMappings';
import { listTrackers } from './trackerService';
import { createEntry } from './trackerEntryService';

export interface SyncEntryOptions {
  habitName: string;
  habitTrackerId: string;
  entryDate: string;
  status?: string;
  value?: number | boolean;
  notes?: string;
  syncToDetailedTracker?: boolean;
  detailedTrackerId?: string;
}

/**
 * Create a habit entry and optionally sync to detailed tracker
 */
export async function createHabitEntryWithSync(
  options: SyncEntryOptions
): Promise<{ habitEntry: TrackerEntry; detailedEntry?: TrackerEntry }> {
  // First, create the habit entry
  const habitEntry = await createEntry({
    tracker_id: options.habitTrackerId,
    entry_date: options.entryDate,
    field_values: {
      habit_name: options.habitName,
      status: options.status || 'done',
      value_numeric: typeof options.value === 'number' ? options.value : undefined,
      value_boolean: typeof options.value === 'boolean' ? options.value : undefined,
      notes: options.notes,
    },
  });
  
  // If sync is enabled and we have a detailed tracker, create corresponding entry
  let detailedEntry: TrackerEntry | undefined;
  
  if (options.syncToDetailedTracker && options.detailedTrackerId) {
    const trackerTemplateName = getTrackerForHabit(options.habitName);
    
    if (trackerTemplateName) {
      detailedEntry = await syncToDetailedTracker(
        options.detailedTrackerId,
        options.habitName,
        options.entryDate,
        {
          status: options.status,
          value: options.value,
          notes: options.notes,
        }
      );
    }
  }
  
  return { habitEntry, detailedEntry };
}

/**
 * Sync a habit entry to a detailed tracker
 * Maps habit data to the appropriate fields in the detailed tracker
 */
async function syncToDetailedTracker(
  detailedTrackerId: string,
  habitName: string,
  entryDate: string,
  habitData: {
    status?: string;
    value?: number | boolean;
    notes?: string;
  }
): Promise<TrackerEntry> {
  // Get the detailed tracker to understand its schema
  const { data: tracker, error: trackerError } = await supabase
    .from('trackers')
    .select('*')
    .eq('id', detailedTrackerId)
    .single();
  
  if (trackerError || !tracker) {
    throw new Error(`Failed to load detailed tracker: ${trackerError?.message}`);
  }
  
  // Map habit data to detailed tracker fields based on tracker type
  const fieldValues: Record<string, any> = {};
  const trackerName = tracker.name.toLowerCase();
  
  // Water Intake Tracker
  if (trackerName.includes('water')) {
    if (habitData.status === 'done' || habitData.value) {
      fieldValues.cups_glasses = typeof habitData.value === 'number' 
        ? habitData.value 
        : (habitData.status === 'done' ? 1 : 0);
    }
    if (habitData.notes) {
      fieldValues.notes = habitData.notes;
    }
  }
  
  // Exercise Tracker
  else if (trackerName.includes('exercise') || trackerName.includes('activity')) {
    fieldValues.activity_type = habitName; // Use habit name as activity type
    if (typeof habitData.value === 'number') {
      fieldValues.duration_minutes = habitData.value;
    }
    if (habitData.status === 'done') {
      fieldValues.completed = true;
    }
    if (habitData.notes) {
      fieldValues.notes = habitData.notes;
    }
  }
  
  // Gratitude Journal
  else if (trackerName.includes('gratitude')) {
    if (habitData.notes) {
      fieldValues.gratitude_entry = habitData.notes;
    } else {
      fieldValues.gratitude_entry = `Gratitude for ${habitName}`;
    }
    if (habitData.status === 'done') {
      fieldValues.entry_date = entryDate;
    }
  }
  
  // Mindfulness & Meditation
  else if (trackerName.includes('mindfulness') || trackerName.includes('meditation')) {
    fieldValues.practice_type = habitName;
    if (typeof habitData.value === 'number') {
      fieldValues.duration_minutes = habitData.value;
    }
    if (habitData.status === 'done') {
      fieldValues.completed = true;
    }
    if (habitData.notes) {
      fieldValues.notes = habitData.notes;
    }
  }
  
  // Sleep Tracker
  else if (trackerName.includes('sleep')) {
    if (habitData.status === 'done') {
      fieldValues.quality_rating = typeof habitData.value === 'number' ? habitData.value : 3;
    }
    if (habitData.notes) {
      fieldValues.notes = habitData.notes;
    }
  }
  
  // Generic fallback - try to map common fields
  else {
    if (habitData.notes) {
      fieldValues.notes = habitData.notes;
    }
    if (typeof habitData.value === 'number') {
      // Try to find a numeric field
      const schema = tracker.field_schema_snapshot as any[];
      const numericField = schema.find(f => f.type === 'number');
      if (numericField) {
        fieldValues[numericField.id] = habitData.value;
      }
    }
  }
  
  // Create entry in detailed tracker
  return await createEntry({
    tracker_id: detailedTrackerId,
    entry_date: entryDate,
    field_values: fieldValues,
  });
}

/**
 * Find or create a detailed tracker instance for a habit
 */
export async function findOrCreateDetailedTracker(
  habitName: string,
  userId: string
): Promise<Tracker | null> {
  const trackerTemplateName = getTrackerForHabit(habitName);
  if (!trackerTemplateName) {
    return null;
  }
  
  // Get all user's trackers
  const userTrackers = await listTrackers(false);
  
  // Look for existing tracker with matching name
  const existing = userTrackers.find(
    t => t.name.toLowerCase() === trackerTemplateName.toLowerCase()
  );
  
  if (existing) {
    return existing;
  }
  
  // TODO: Auto-create tracker from template if user wants
  // For now, return null - user needs to create it manually
  return null;
}
