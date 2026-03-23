/**
 * Skill Timeline Service
 * 
 * Fetches timeline of events related to a skill.
 * Read-only, observational data only.
 */

import {
  skillEntityLinksService,
  skillContextsService,
  type SkillEntityLink,
  type SkillContext,
} from '../skillsService';
import { supabase } from '../supabase';

export interface TimelineItem {
  id: string;
  timestamp: string;
  entity_type: 'habit_checkin' | 'goal_milestone' | 'project_activity' | 'calendar_event' | 'context_change';
  label: string;
  context_id?: string;
  context_type?: string;
  metadata?: Record<string, any>;
}

/**
 * Get timeline for a skill
 */
export async function getSkillTimeline(
  userId: string,
  skillId: string,
  contextId?: string
): Promise<TimelineItem[]> {
  const items: TimelineItem[] = [];

  // Get links for this skill
  const links = await skillEntityLinksService.getLinksForSkill(userId, skillId, contextId);

  // Get contexts to track context changes
  const contexts = await skillContextsService.getContextsForSkill(userId, skillId);

  // Add context creation/update events
  for (const context of contexts) {
    if (!contextId || context.id === contextId) {
      items.push({
        id: `context-${context.id}`,
        timestamp: context.created_at,
        entity_type: 'context_change',
        label: `Context "${context.context_type}" ${context.role_label ? `(${context.role_label})` : ''} created`,
        context_id: context.id,
        context_type: context.context_type,
      });

      if (context.updated_at !== context.created_at) {
        items.push({
          id: `context-update-${context.id}`,
          timestamp: context.updated_at,
          entity_type: 'context_change',
          label: `Context "${context.context_type}" updated`,
          context_id: context.id,
          context_type: context.context_type,
        });
      }
    }
    }

  // Add habit check-ins (if habits are linked)
  const habitLinks = links.filter(l => l.entity_type === 'habit');
  for (const link of habitLinks) {
    try {
      // Fetch habit check-ins for this habit
      const { data: checkins, error } = await supabase
        .from('habit_checkins')
        .select('*')
        .eq('activity_id', link.entity_id)
        .order('local_date', { ascending: false })
        .limit(20); // Last 20 check-ins

      if (!error && checkins) {
        for (const checkin of checkins) {
          items.push({
            id: `checkin-${checkin.id}`,
            timestamp: checkin.local_date + 'T00:00:00Z', // Convert date to timestamp
            entity_type: 'habit_checkin',
            label: `Habit check-in: ${checkin.status || 'completed'}`,
            context_id: link.context_id || undefined,
            metadata: {
              value_numeric: checkin.value_numeric,
              value_boolean: checkin.value_boolean,
              notes: checkin.metadata?.notes,
            },
          });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch habit check-ins:', err);
    }
  }

  // Add goal milestones (if goals are linked)
  const goalLinks = links.filter(l => l.entity_type === 'goal');
  for (const link of goalLinks) {
    try {
      // Fetch goal progress updates
      const { data: goal, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', link.entity_id)
        .single();

      if (!error && goal) {
        // Add goal creation
        items.push({
          id: `goal-${goal.id}`,
          timestamp: goal.created_at,
          entity_type: 'goal_milestone',
          label: `Goal "${goal.title}" linked`,
          context_id: link.context_id || undefined,
        });

        // Add goal updates (if updated_at differs from created_at)
        if (goal.updated_at !== goal.created_at) {
          items.push({
            id: `goal-update-${goal.id}`,
            timestamp: goal.updated_at,
            entity_type: 'goal_milestone',
            label: `Goal "${goal.title}" updated`,
            context_id: link.context_id || undefined,
          });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch goal data:', err);
    }
  }

  // Add project activity (if projects are linked)
  const projectLinks = links.filter(l => l.entity_type === 'project');
  for (const link of projectLinks) {
    try {
      // Fetch project updates
      const { data: project, error } = await supabase
        .from('master_projects')
        .select('*')
        .eq('id', link.entity_id)
        .single();

      if (!error && project) {
        items.push({
          id: `project-${project.id}`,
          timestamp: project.updated_at,
          entity_type: 'project_activity',
          label: `Project "${project.name}" activity`,
          context_id: link.context_id || undefined,
        });
      }
    } catch (err) {
      console.warn('Failed to fetch project data:', err);
    }
  }

  // Add calendar events (if calendar events are linked)
  const calendarLinks = links.filter(l => l.entity_type === 'calendar_event');
  for (const link of calendarLinks) {
    try {
      const { data: event, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('id', link.entity_id)
        .single();

      if (!error && event) {
        items.push({
          id: `calendar-${event.id}`,
          timestamp: event.start_time || event.created_at,
          entity_type: 'calendar_event',
          label: `Calendar event: ${event.title || 'Untitled'}`,
          context_id: link.context_id || undefined,
        });
      }
    } catch (err) {
      console.warn('Failed to fetch calendar event:', err);
    }
  }

  // Sort by timestamp (newest first)
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return items;
}

