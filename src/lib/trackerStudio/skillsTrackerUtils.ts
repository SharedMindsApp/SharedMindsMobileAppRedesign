/**
 * Skills Tracker Utilities
 * 
 * Utilities for detecting and working with Skills Tracker templates and instances.
 */

import type { Tracker, TrackerTemplate } from './types';

/**
 * Check if a tracker is a Skills Tracker based on its name or template
 */
export function isSkillsTracker(tracker: Tracker): boolean {
  const name = tracker.name.toLowerCase();
  if (name.includes('skill')) {
    return true;
  }
  
  // Check if it's created from Skills Tracker template
  // This would require checking the template name, but we don't have that in the Tracker type
  // Instead, we can check for characteristic fields
  const hasSkillNameField = tracker.field_schema_snapshot.some(
    field => field.id === 'skill_name' || 
    (field.label.toLowerCase().includes('skill') && field.type === 'text')
  );
  
  const hasProficiencyField = tracker.field_schema_snapshot.some(
    field => field.id === 'proficiency_level' || 
    (field.label.toLowerCase().includes('proficiency') && field.type === 'rating')
  );
  
  return hasSkillNameField && hasProficiencyField;
}

/**
 * Check if a template is the Skills Tracker template
 */
export function isSkillsTrackerTemplate(templateName: string): boolean {
  return templateName.toLowerCase().includes('skill');
}
