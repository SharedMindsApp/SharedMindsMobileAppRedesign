/**
 * Workspace Reference Service
 * 
 * Service for resolving and fetching referenced items from various systems
 * (Planner, Guardrails, Goals, etc.)
 */

import { supabase } from '../supabase';
import type { WorkspaceReferenceType } from './types';
import { getPersonalEventsForDateRange } from '../personalSpaces/calendarService';
import { getGuardrailsTask } from '../guardrails/guardrailsTaskService';
import { getRoadmapItem } from '../guardrails/roadmapService';
import { listGoals } from '../goals/goalsService';
import { getPage } from './pageService';
import { getWidgetById } from '../fridgeCanvas';

// Reference preview data types
export interface PlannerEventPreview {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
}

export interface GuardrailsTaskPreview {
  id: string;
  title: string;
  description?: string;
  status: string;
  dueAt?: string;
}

export interface GuardrailsRoadmapPreview {
  id: string;
  title: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
}

export interface GoalPreview {
  id: string;
  title: string;
  description?: string;
  status: string;
}

export interface WorkspacePreview {
  id: string;
  title?: string;
  space_id: string;
}

export interface WidgetPreview {
  id: string;
  title: string;
  widget_type: string;
}

export type ReferencePreview =
  | PlannerEventPreview
  | GuardrailsTaskPreview
  | GuardrailsRoadmapPreview
  | GoalPreview
  | WorkspacePreview
  | WidgetPreview
  | null;

/**
 * Resolve a reference and return preview data
 */
export async function resolveReference(
  referenceType: WorkspaceReferenceType,
  referenceId?: string,
  referenceUrl?: string
): Promise<ReferencePreview> {
  if (referenceUrl) {
    // External URL - return basic preview
    return {
      id: referenceUrl,
      title: referenceUrl,
      description: 'External link',
    } as any;
  }

  if (!referenceId) {
    return null;
  }

  try {
    switch (referenceType) {
      case 'planner_event': {
        // Get personal calendar event
        const { data: event } = await supabase
          .from('personal_calendar_events')
          .select('id, title, description, start_at, end_at')
          .eq('id', referenceId)
          .maybeSingle();

        if (!event) return null;

        const startDate = new Date(event.start_at);
        return {
          id: event.id,
          title: event.title,
          description: event.description || undefined,
          date: startDate.toISOString().split('T')[0],
          time: startDate.toTimeString().slice(0, 5),
        } as PlannerEventPreview;
      }

      case 'guardrails_task': {
        const task = await getGuardrailsTask(referenceId);
        if (!task) return null;

        return {
          id: task.id,
          title: task.title,
          description: task.description || undefined,
          status: task.status,
          dueAt: task.dueAt || undefined,
        } as GuardrailsTaskPreview;
      }

      case 'guardrails_roadmap': {
        const roadmapItem = await getRoadmapItem(referenceId);
        if (!roadmapItem) return null;

        return {
          id: roadmapItem.id,
          title: roadmapItem.title,
          description: roadmapItem.description || undefined,
          status: roadmapItem.status,
          startDate: roadmapItem.startDate || undefined,
          endDate: roadmapItem.endDate || undefined,
        } as GuardrailsRoadmapPreview;
      }

      case 'goal': {
        // Get goal from goals table
        const { data: goal } = await supabase
          .from('goals')
          .select('id, title, description, status')
          .eq('id', referenceId)
          .maybeSingle();

        if (!goal) return null;

        return {
          id: goal.id,
          title: goal.title,
          description: goal.description || undefined,
          status: goal.status,
        } as GoalPreview;
      }

      case 'workspace': // Legacy, use 'page' instead
      case 'page': {
        const page = await getPage(referenceId);
        if (!page) return null;

        return {
          id: page.id,
          title: page.title,
          space_id: page.space_id,
        } as WorkspacePreview;
      }

      case 'widget': {
        const widget = await getWidgetById(referenceId);
        if (!widget) return null;

        return {
          id: widget.id,
          title: widget.title,
          widget_type: widget.widget_type,
        } as WidgetPreview;
      }

      case 'url': {
        return {
          id: referenceId,
          title: referenceId,
          description: 'External link',
        } as any;
      }

      default:
        return null;
    }
  } catch (error) {
    console.error(`[referenceService] Error resolving ${referenceType} reference:`, error);
    return null;
  }
}

/**
 * Get navigation route for a reference
 */
export function getReferenceRoute(
  referenceType: WorkspaceReferenceType,
  referenceId?: string,
  referenceUrl?: string
): string | null {
  if (referenceUrl) {
    return referenceUrl;
  }

  if (!referenceId) {
    return null;
  }

  switch (referenceType) {
    case 'planner_event': {
      // Navigate to planner calendar with event date
      return `/planner/calendar?event=${referenceId}`;
    }

    case 'guardrails_task': {
      return `/guardrails/task/${referenceId}`;
    }

    case 'guardrails_roadmap': {
      return `/guardrails/roadmap/${referenceId}`;
    }

    case 'goal': {
      return `/goals/${referenceId}`;
    }

    case 'workspace': // Legacy, use 'page' instead
    case 'page': {
      // Need space_id to construct the route, but we don't have it here
      // Return a relative path that the caller can use
      return `/pages/${referenceId}`;
    }

    case 'widget': {
      return `/spaces/widget/${referenceId}`;
    }

    case 'url': {
      return referenceId;
    }

    default:
      return null;
  }
}

/**
 * Search for items to reference (for picker)
 */
export async function searchReferenceableItems(
  referenceType: WorkspaceReferenceType,
  userId: string,
  query?: string
): Promise<Array<{ id: string; title: string; subtitle?: string; metadata?: any }>> {
  try {
    switch (referenceType) {
      case 'planner_event': {
        // Get upcoming events
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 90); // Next 90 days

        const events = await getPersonalEventsForDateRange(
          userId,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        let filtered = events;
        if (query) {
          const lowerQuery = query.toLowerCase();
          filtered = events.filter(
            e => e.title.toLowerCase().includes(lowerQuery) ||
            (e.description && e.description.toLowerCase().includes(lowerQuery))
          );
        }

        return filtered.map(event => {
          const startDate = new Date(event.start_at);
          return {
            id: event.id,
            title: event.title,
            subtitle: startDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: startDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
            }),
            metadata: { date: startDate.toISOString().split('T')[0] },
          };
        });
      }

      case 'guardrails_task': {
        // Get all tasks for user's projects
        // This is a simplified version - in production, you'd want to filter by user's projects
        const { data: tasks } = await supabase
          .from('guardrails_tasks')
          .select('id, title, description, status, due_at')
          .is('archived_at', null)
          .order('created_at', { ascending: false })
          .limit(100);

        if (!tasks) return [];

        let filtered = tasks;
        if (query) {
          const lowerQuery = query.toLowerCase();
          filtered = tasks.filter(
            t => t.title.toLowerCase().includes(lowerQuery) ||
            (t.description && t.description.toLowerCase().includes(lowerQuery))
          );
        }

        return filtered.map(task => ({
          id: task.id,
          title: task.title,
          subtitle: task.status,
          metadata: { status: task.status, dueAt: task.due_at },
        }));
      }

      case 'guardrails_roadmap': {
        // Get roadmap items
        const { data: items } = await supabase
          .from('roadmap_items')
          .select('id, title, description, status, start_date, end_date')
          .is('archived_at', null)
          .order('created_at', { ascending: false })
          .limit(100);

        if (!items) return [];

        let filtered = items;
        if (query) {
          const lowerQuery = query.toLowerCase();
          filtered = items.filter(
            i => i.title.toLowerCase().includes(lowerQuery) ||
            (i.description && i.description.toLowerCase().includes(lowerQuery))
          );
        }

        return filtered.map(item => ({
          id: item.id,
          title: item.title,
          subtitle: item.status,
          metadata: { status: item.status, startDate: item.start_date, endDate: item.end_date },
        }));
      }

      case 'goal': {
        const goals = await listGoals(userId, { status: 'active' });
        
        let filtered = goals;
        if (query) {
          const lowerQuery = query.toLowerCase();
          filtered = goals.filter(
            g => g.title.toLowerCase().includes(lowerQuery) ||
            (g.description && g.description.toLowerCase().includes(lowerQuery))
          );
        }

        return filtered.map(goal => ({
          id: goal.id,
          title: goal.title,
          subtitle: goal.status,
          metadata: { status: goal.status },
        }));
      }

      case 'workspace': {
        // Get workspaces in user's spaces
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile) return [];

        const { data: spaces } = await supabase
          .from('space_members')
          .select('space_id')
          .eq('user_id', profile.id)
          .eq('status', 'active');

        if (!spaces || spaces.length === 0) return [];

        const spaceIds = spaces.map(s => s.space_id);

        const { data: workspaces } = await supabase
          .from('workspaces')
          .select('id, title, space_id')
          .in('space_id', spaceIds)
          .is('archived_at', null)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!workspaces) return [];

        let filtered = workspaces;
        if (query) {
          const lowerQuery = query.toLowerCase();
          filtered = workspaces.filter(
            w => (w.title && w.title.toLowerCase().includes(lowerQuery))
          );
        }

        return filtered.map(workspace => ({
          id: workspace.id,
          title: workspace.title || 'Untitled Workspace',
          subtitle: 'Workspace',
          metadata: { space_id: workspace.space_id },
        }));
      }

      case 'widget': {
        // Get widgets in user's spaces
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile) return [];

        const { data: spaces } = await supabase
          .from('space_members')
          .select('space_id')
          .eq('user_id', profile.id)
          .eq('status', 'active');

        if (!spaces || spaces.length === 0) return [];

        const spaceIds = spaces.map(s => s.space_id);

        const { data: widgets } = await supabase
          .from('fridge_widgets')
          .select('id, title, widget_type')
          .in('space_id', spaceIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!widgets) return [];

        let filtered = widgets;
        if (query) {
          const lowerQuery = query.toLowerCase();
          filtered = widgets.filter(
            w => w.title.toLowerCase().includes(lowerQuery)
          );
        }

        return filtered.map(widget => ({
          id: widget.id,
          title: widget.title,
          subtitle: widget.widget_type.replace(/_/g, ' '),
          metadata: { widget_type: widget.widget_type },
        }));
      }

      default:
        return [];
    }
  } catch (error) {
    console.error(`[referenceService] Error searching ${referenceType}:`, error);
    return [];
  }
}
