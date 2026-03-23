/**
 * Skill Narrative Service
 * 
 * Generates explainable narratives about skills based on data.
 * Currently returns static placeholder narratives that conform to rules.
 * 
 * FUTURE: This will call AI with strict rules, but for now it's a stub.
 */

import {
  skillsService,
  skillContextsService,
  skillEntityLinksService,
  type SkillContext,
} from '../skillsService';
import {
  NarrativeOutput,
  NarrativeSentence,
  NarrativeSection,
  NarrativeSentenceType,
  NarrativeContext,
  validateNarrative,
  type ValidationResult,
} from './skillNarrativeRules';
import { getSkillTimeline } from './skillTimelineService';
import { skillPlanningService } from './skillPlanningService';
import { sharedUnderstandingService } from './sharedUnderstandingService';

/**
 * Fetch all data needed for narrative generation
 */
async function fetchNarrativeContext(
  userId: string,
  skillId: string,
  contextId?: string
): Promise<NarrativeContext> {
  // Fetch skill
  const skill = await skillsService.getById(skillId);
  if (!skill) {
    throw new Error('Skill not found');
  }

  // Fetch contexts
  const allContexts = await skillContextsService.getContextsForSkill(userId, skillId);
  const context = contextId
    ? allContexts.find(c => c.id === contextId)
    : allContexts.find(c => c.status === 'active') || allContexts[0];

  // Fetch links
  const links = await skillEntityLinksService.getLinksForSkill(userId, skillId, contextId);

  // Count links by type
  const linkCounts = {
    habits: links.filter(l => l.entity_type === 'habit').length,
    goals: links.filter(l => l.entity_type === 'goal').length,
    projects: links.filter(l => l.entity_type === 'project').length,
    calendar_events: links.filter(l => l.entity_type === 'calendar_event').length,
    total: links.length,
  };

  // TODO: Fetch actual summaries from habit/goal/project services
  // For now, use placeholder data
  const summaries = {
    habit_summary: linkCounts.habits > 0 ? {
      active_count: linkCounts.habits,
      total_checkins: 0, // TODO: Fetch from habitsService
      last_checkin: undefined, // TODO: Fetch from habitsService
    } : undefined,
    goal_summary: linkCounts.goals > 0 ? {
      active_count: linkCounts.goals,
      completed_count: 0, // TODO: Fetch from goalsService
      total_progress: 0, // TODO: Fetch from goalsService
    } : undefined,
    project_summary: linkCounts.projects > 0 ? {
      active_count: linkCounts.projects,
      completed_count: 0, // TODO: Fetch from projectsService
    } : undefined,
    calendar_summary: linkCounts.calendar_events > 0 ? {
      event_count: linkCounts.calendar_events,
      last_event: undefined, // TODO: Fetch from calendarService
      density: 'low' as const, // TODO: Calculate from calendar data
    } : undefined,
  };

  return {
    skill: {
      id: skill.id,
      name: skill.name,
      category: skill.category,
      proficiency: skill.proficiency,
      confidence_level: skill.confidence_level,
      usage_count: skill.usage_count,
      last_used_at: skill.last_used_at,
    },
    context: context ? {
      id: context.id,
      context_type: context.context_type,
      role_label: context.role_label,
      intent: context.intent,
      status: context.status,
      pressure_level: context.pressure_level,
      confidence_level: context.confidence_level,
    } : undefined,
    links: linkCounts,
    summaries,
    evidence_count: 0, // TODO: Fetch from skillEvidenceService
    last_evidence_at: undefined, // TODO: Fetch from skillEvidenceService
  };
}

/**
 * Generate deterministic narrative based on data patterns
 * 
 * FUTURE: This will call AI with strict rules from skillNarrativeRules.ts
 * For now, uses deterministic rules to generate explainable observations.
 */
async function generateDeterministicNarrative(
  context: NarrativeContext,
  userId: string,
  skillId: string,
  contextId?: string
): Promise<NarrativeOutput> {
  const sentences: NarrativeSentence[] = [];
  
  // Get timeline for trajectory analysis
  let timelineItems: any[] = [];
  try {
    timelineItems = await getSkillTimeline(userId, skillId, contextId);
  } catch (err) {
    console.warn('Failed to load timeline for narrative:', err);
  }

  // Context Summary
  if (context.context) {
    sentences.push({
      type: NarrativeSentenceType.STATUS,
      section: NarrativeSection.CONTEXT_SUMMARY,
      text: `This skill is ${context.context.status} in the ${context.context.context_type} context.`,
      data_source: 'context.status',
      confidence: 'high',
    });

    if (context.context.intent) {
      sentences.push({
        type: NarrativeSentenceType.OBSERVATION,
        section: NarrativeSection.CONTEXT_SUMMARY,
        text: `In this context, the skill relates to: ${context.context.intent}.`,
        data_source: 'context.intent',
        confidence: 'high',
      });
    }
  }

  // Activity Pattern
  if (context.skill.usage_count > 0) {
    sentences.push({
      type: NarrativeSentenceType.OBSERVATION,
      section: NarrativeSection.ACTIVITY_PATTERN,
      text: `This skill has been used ${context.skill.usage_count} time${context.skill.usage_count !== 1 ? 's' : ''}.`,
      data_source: 'skill.usage_count',
      confidence: 'high',
    });
  }

  if (context.skill.last_used_at) {
    const daysAgo = Math.floor(
      (Date.now() - new Date(context.skill.last_used_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    sentences.push({
      type: NarrativeSentenceType.TIMELINE,
      section: NarrativeSection.ACTIVITY_PATTERN,
      text: `Last activity was ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago.`,
      data_source: 'skill.last_used_at',
      confidence: 'high',
    });
  }

  // Trajectory Summary
  if (timelineItems.length > 0) {
    const recentItems = timelineItems.slice(0, 10);
    const olderItems = timelineItems.slice(10, 20);
    const recentCount = recentItems.length;
    const olderCount = olderItems.length;
    
    if (recentCount > olderCount) {
      sentences.push({
        type: NarrativeSentenceType.PATTERN,
        section: NarrativeSection.TRAJECTORY_SUMMARY,
        text: 'Activity has increased over the observed period.',
        data_source: 'timeline.recent_vs_older',
        confidence: 'medium',
      });
    } else if (recentCount < olderCount) {
      sentences.push({
        type: NarrativeSentenceType.PATTERN,
        section: NarrativeSection.TRAJECTORY_SUMMARY,
        text: 'Activity has decreased over the observed period.',
        data_source: 'timeline.recent_vs_older',
        confidence: 'medium',
      });
    } else if (recentCount > 0) {
      sentences.push({
        type: NarrativeSentenceType.PATTERN,
        section: NarrativeSection.TRAJECTORY_SUMMARY,
        text: 'Activity has remained consistent over the observed period.',
        data_source: 'timeline.recent_vs_older',
        confidence: 'medium',
      });
    }
  }

  // Consistency Pattern
  if (context.summaries.habit_summary && context.summaries.habit_summary.total_checkins > 0) {
    const checkinCount = context.summaries.habit_summary.total_checkins;
    if (checkinCount > 20) {
      sentences.push({
        type: NarrativeSentenceType.PATTERN,
        section: NarrativeSection.CONSISTENCY_PATTERN,
        text: 'Habit check-ins show regular cadence.',
        data_source: 'summaries.habit_summary.total_checkins',
        confidence: 'high',
      });
    } else if (checkinCount > 5) {
      sentences.push({
        type: NarrativeSentenceType.PATTERN,
        section: NarrativeSection.CONSISTENCY_PATTERN,
        text: 'Habit check-ins show occasional cadence.',
        data_source: 'summaries.habit_summary.total_checkins',
        confidence: 'medium',
      });
    }
  }

  if (context.summaries.calendar_summary) {
    const density = context.summaries.calendar_summary.density;
    sentences.push({
      type: NarrativeSentenceType.OBSERVATION,
      section: NarrativeSection.CONSISTENCY_PATTERN,
      text: `Calendar activity appears ${density}.`,
      data_source: 'summaries.calendar_summary.density',
      confidence: 'high',
    });
  }

  // Context Divergence
  if (context.context) {
    // This will be enhanced when we have multiple contexts to compare
    sentences.push({
      type: NarrativeSentenceType.OBSERVATION,
      section: NarrativeSection.CONTEXT_DIVERGENCE,
      text: 'This skill appears in the selected context.',
      data_source: 'context.context_type',
      confidence: 'high',
    });
  }

  // Connection Density
  if (context.links.total > 0) {
    const plural = context.links.total !== 1 ? 's' : '';
    sentences.push({
      type: NarrativeSentenceType.LINK,
      section: NarrativeSection.CONNECTION_DENSITY,
      text: `Connected to ${context.links.total} entit${plural === 's' ? 'ies' : 'y'} across the system.`,
      data_source: 'links.total',
      confidence: 'high',
    });

    if (context.links.habits > 0 && context.links.goals > 0 && context.links.projects > 0) {
      sentences.push({
        type: NarrativeSentenceType.OBSERVATION,
        section: NarrativeSection.CONNECTION_DENSITY,
        text: 'Links span habits, goals, and projects.',
        data_source: 'links.habits,links.goals,links.projects',
        confidence: 'high',
      });
    }
  }

  // Linked Entities
  if (context.links.habits > 0) {
    sentences.push({
      type: NarrativeSentenceType.LINK,
      section: NarrativeSection.LINKED_ENTITIES,
      text: `Connected to ${context.links.habits} habit${context.links.habits !== 1 ? 's' : ''}.`,
      data_source: 'links.habits',
      confidence: 'high',
    });
  }

  if (context.links.goals > 0) {
    sentences.push({
      type: NarrativeSentenceType.LINK,
      section: NarrativeSection.LINKED_ENTITIES,
      text: `Linked to ${context.links.goals} goal${context.links.goals !== 1 ? 's' : ''}.`,
      data_source: 'links.goals',
      confidence: 'high',
    });
  }

  if (context.links.projects > 0) {
    sentences.push({
      type: NarrativeSentenceType.LINK,
      section: NarrativeSection.LINKED_ENTITIES,
      text: `Associated with ${context.links.projects} project${context.links.projects !== 1 ? 's' : ''}.`,
      data_source: 'links.projects',
      confidence: 'high',
    });
  }

  // Planning Presence
  if (context.planning) {
    if (context.planning.has_plan && contextId) {
      sentences.push({
        type: NarrativeSentenceType.OBSERVATION,
        section: NarrativeSection.PLANNING_PRESENCE,
        text: 'A planning note exists for this skill in the selected context.',
        data_source: 'planning.has_plan',
        confidence: 'high',
      });
    } else if (context.planning.plan_count > 0) {
      sentences.push({
        type: NarrativeSentenceType.OBSERVATION,
        section: NarrativeSection.PLANNING_PRESENCE,
        text: `This skill has planning notes in ${context.planning.plan_count} context${context.planning.plan_count !== 1 ? 's' : ''}.`,
        data_source: 'planning.plan_count',
        confidence: 'high',
      });
    }
  }

  // Default if no specific data
  if (sentences.length === 0) {
    sentences.push({
      type: NarrativeSentenceType.OBSERVATION,
      section: NarrativeSection.CONTEXT_SUMMARY,
      text: 'This skill supports development in the selected context. Recent activity suggests limited engagement.',
      data_source: 'general',
      confidence: 'low',
    });
  }

  // Generate explanation
  const dataSources = [...new Set(sentences.map(s => s.data_source))];
  const explanation = `This narrative is based on ${dataSources.length} data source${dataSources.length !== 1 ? 's' : ''}: ${dataSources.join(', ')}. ` +
    `It describes observable patterns in your skill usage and connections.`;

  return {
    sections: [...new Set(sentences.map(s => s.section))],
    sentences,
    explanation,
    data_sources: dataSources,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Generate narrative for a skill
 */
export async function generateSkillNarrative(
  userId: string,
  skillId: string,
  contextId?: string
): Promise<NarrativeOutput> {
  // Fetch context
  const context = await fetchNarrativeContext(userId, skillId, contextId);

  // Generate deterministic narrative
  const narrative = await generateDeterministicNarrative(context, userId, skillId, contextId);

  // Validate narrative
  const validation = validateNarrative(narrative);
  if (!validation.valid) {
    console.warn('Narrative validation failed:', validation.errors);
    // Return anyway, but log warnings
  }

  return narrative;
}

/**
 * Validate a narrative before returning it
 */
export function validateNarrativeOutput(narrative: NarrativeOutput): ValidationResult {
  return validateNarrative(narrative);
}

