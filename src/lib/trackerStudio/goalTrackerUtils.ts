/**
 * Goal Tracker Utilities
 * 
 * Utilities for detecting and working with Goal Tracker templates and instances.
 */

import type { Tracker, TrackerTemplate } from './types';

/**
 * Check if a tracker is a Goal Tracker based on its name or template
 */
export function isGoalTracker(tracker: Tracker): boolean {
  const name = tracker.name.toLowerCase();
  if (name.includes('goal')) {
    return true;
  }
  
  // Check for characteristic fields
  const hasGoalNameField = tracker.field_schema_snapshot.some(
    field => field.id === 'goal_name' || 
    (field.label.toLowerCase().includes('goal') && field.type === 'text')
  );
  
  const hasProgressField = tracker.field_schema_snapshot.some(
    field => field.id === 'progress' || 
    (field.label.toLowerCase().includes('progress') && field.type === 'number')
  );
  
  return hasGoalNameField && hasProgressField;
}

/**
 * Check if a template is the Goal Tracker template
 */
export function isGoalTrackerTemplate(templateName: string): boolean {
  return templateName.toLowerCase().includes('goal');
}
