import { supabase } from '../../supabase';
import type { AIContextScope, AIIntent } from './aiTypes';
import type { ContextBudget } from './aiContextBudget';
import { truncateText } from './aiContextBudget';
import type { ResolvedTag, EntityType } from './aiTagResolver';
import { getResolvedTags, groupResolvedTagsByType } from './aiTagResolver';
import { parseTagsFromText, extractUniqueNormalizedTags } from './aiTagParser';
import { resolveTags, type TagResolutionContext } from './aiTagResolver';

export interface TagContextSnapshot {
  entityType: EntityType;
  entityId: string;
  displayName: string;
  snapshot: Record<string, any>;
}

export interface EnrichedAIContext {
  originalScope: AIContextScope;
  tagSnapshots: TagContextSnapshot[];
  resolvedTags: ResolvedTag[];
  unresolvedTags: string[];
  ambiguousTags: Array<{ tag: string; matches: string[] }>;
  contextSummary: string;
}

const MAX_TAG_CONTEXT_SIZE = 1000;
const MAX_TAGS_IN_CONTEXT = 5;

export async function enrichContextWithTags(
  prompt: string,
  baseScope: AIContextScope,
  userId: string,
  intent?: AIIntent,
  budget?: ContextBudget
): Promise<EnrichedAIContext> {
  const parseResult = parseTagsFromText(prompt);
  const normalizedTags = extractUniqueNormalizedTags(prompt).slice(0, MAX_TAGS_IN_CONTEXT);

  if (normalizedTags.length === 0) {
    return {
      originalScope: baseScope,
      tagSnapshots: [],
      resolvedTags: [],
      unresolvedTags: [],
      ambiguousTags: [],
      contextSummary: 'No tags found in prompt',
    };
  }

  const resolutionContext: TagResolutionContext = {
    userId,
    projectId: baseScope.projectId,
    allowSystemEntities: true,
    allowSharedTracks: true,
  };

  const resolved = await resolveTags(normalizedTags, resolutionContext);

  const tagSnapshots = await buildTagSnapshots(resolved, budget);

  const resolvedTags = getResolvedTags(resolved);
  const unresolvedTags = resolved
    .filter(r => r.resolutionStatus === 'unresolved')
    .map(r => r.normalizedTag);
  const ambiguousTags = resolved
    .filter(r => r.resolutionStatus === 'ambiguous')
    .map(r => ({
      tag: r.normalizedTag,
      matches: r.ambiguousMatches?.map(m => `${m.entityType}: ${m.displayName}`) || [],
    }));

  const contextSummary = buildContextSummary(resolvedTags, unresolvedTags, ambiguousTags);

  return {
    originalScope: baseScope,
    tagSnapshots,
    resolvedTags,
    unresolvedTags,
    ambiguousTags,
    contextSummary,
  };
}

export async function buildTagSnapshots(
  resolvedTags: ResolvedTag[],
  budget?: ContextBudget
): Promise<TagContextSnapshot[]> {
  const snapshots: TagContextSnapshot[] = [];
  const resolved = getResolvedTags(resolvedTags);

  for (const tag of resolved) {
    if (!tag.entityType || !tag.entityId) continue;

    const snapshot = await buildEntitySnapshot(tag.entityType, tag.entityId, budget);

    if (snapshot) {
      snapshots.push({
        entityType: tag.entityType,
        entityId: tag.entityId,
        displayName: tag.displayName || 'Unknown',
        snapshot,
      });
    }
  }

  return snapshots;
}

async function buildEntitySnapshot(
  entityType: EntityType,
  entityId: string,
  budget?: ContextBudget
): Promise<Record<string, any> | null> {
  const maxLength = budget?.maxTextLengthPerEntity || MAX_TAG_CONTEXT_SIZE;

  switch (entityType) {
    case 'track':
      return buildTrackSnapshot(entityId, maxLength);
    case 'roadmap_item':
      return buildRoadmapItemSnapshot(entityId, maxLength);
    case 'person':
      return buildPersonSnapshot(entityId, maxLength);
    case 'system':
      return buildSystemSnapshot(entityId);
    case 'shared_track':
      return buildTrackSnapshot(entityId, maxLength);
    default:
      return null;
  }
}

async function buildTrackSnapshot(
  trackId: string,
  maxLength: number
): Promise<Record<string, any> | null> {
  const { data, error } = await supabase
    .from('guardrails_tracks')
    .select('id, name, description, color, is_shared, parent_track_id')
    .eq('id', trackId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const { count: itemCount } = await supabase
    .from('roadmap_items')
    .select('id', { count: 'exact', head: true })
    .eq('track_id', trackId);

  return {
    id: data.id,
    name: truncateText(data.name, maxLength),
    description: truncateText(data.description, maxLength),
    color: data.color,
    isShared: data.is_shared,
    parentTrackId: data.parent_track_id,
    itemCount: itemCount || 0,
  };
}

async function buildRoadmapItemSnapshot(
  itemId: string,
  maxLength: number
): Promise<Record<string, any> | null> {
  const { data, error } = await supabase
    .from('roadmap_items')
    .select('id, title, description, item_type, status, deadline, track_id, estimated_duration')
    .eq('id', itemId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    title: truncateText(data.title, maxLength),
    description: truncateText(data.description, maxLength),
    itemType: data.item_type,
    status: data.status,
    deadline: data.deadline,
    trackId: data.track_id,
    estimatedDuration: data.estimated_duration,
  };
}

async function buildPersonSnapshot(
  personId: string,
  maxLength: number
): Promise<Record<string, any> | null> {
  const { data: projectPerson } = await supabase
    .from('project_people')
    .select('id, name, role')
    .eq('id', personId)
    .maybeSingle();

  if (projectPerson) {
    const { count: assignmentCount } = await supabase
      .from('roadmap_item_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('person_id', personId);

    return {
      id: projectPerson.id,
      name: truncateText(projectPerson.name, maxLength),
      role: truncateText(projectPerson.role, maxLength),
      isProjectUser: false,
      assignmentCount: assignmentCount || 0,
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', personId)
    .maybeSingle();

  if (profile) {
    return {
      id: profile.id,
      name: truncateText(profile.full_name, maxLength),
      isProjectUser: true,
    };
  }

  const { data: globalPerson } = await supabase
    .from('global_people')
    .select('id, name')
    .eq('id', personId)
    .maybeSingle();

  if (globalPerson) {
    return {
      id: globalPerson.id,
      name: truncateText(globalPerson.name, maxLength),
      isGlobal: true,
    };
  }

  return null;
}

function buildSystemSnapshot(entityId: string): Record<string, any> {
  const systemEntities: Record<string, Record<string, any>> = {
    calendar: { type: 'system', name: 'Calendar', description: 'User calendar and events' },
    tasks: { type: 'system', name: 'Tasks', description: 'User task list' },
    habits: { type: 'system', name: 'Habits', description: 'User habit tracking' },
    goals: { type: 'system', name: 'Goals', description: 'User goals' },
    taskflow: { type: 'system', name: 'Task Flow', description: 'Project task flow board' },
    mindmesh: { type: 'system', name: 'Mind Mesh', description: 'Project knowledge graph' },
    roadmap: { type: 'system', name: 'Roadmap', description: 'Project roadmap' },
  };

  return systemEntities[entityId] || { type: 'system', name: entityId };
}

function buildContextSummary(
  resolvedTags: ResolvedTag[],
  unresolvedTags: string[],
  ambiguousTags: Array<{ tag: string; matches: string[] }>
): string {
  const parts: string[] = [];

  if (resolvedTags.length > 0) {
    const grouped = groupResolvedTagsByType(resolvedTags);
    const summary = Object.entries(grouped)
      .map(([type, tags]) => `${tags.length} ${type}(s)`)
      .join(', ');
    parts.push(`Resolved: ${summary}`);
  }

  if (unresolvedTags.length > 0) {
    parts.push(`Unresolved: ${unresolvedTags.join(', ')}`);
  }

  if (ambiguousTags.length > 0) {
    parts.push(`Ambiguous: ${ambiguousTags.map(a => a.tag).join(', ')}`);
  }

  return parts.join(' | ');
}

export function augmentScopeWithTags(
  baseScope: AIContextScope,
  enrichedContext: EnrichedAIContext
): AIContextScope {
  const augmentedScope = { ...baseScope };

  const tagsByType = groupResolvedTagsByType(enrichedContext.resolvedTags);

  if (tagsByType.track || tagsByType.shared_track) {
    const trackIds = [
      ...(tagsByType.track?.map(t => t.entityId!) || []),
      ...(tagsByType.shared_track?.map(t => t.entityId!) || []),
    ];

    augmentedScope.trackIds = augmentedScope.trackIds
      ? [...new Set([...augmentedScope.trackIds, ...trackIds])]
      : trackIds;
  }

  if (tagsByType.roadmap_item) {
    const itemIds = tagsByType.roadmap_item.map(t => t.entityId!);
    augmentedScope.roadmapItemIds = augmentedScope.roadmapItemIds
      ? [...new Set([...augmentedScope.roadmapItemIds, ...itemIds])]
      : itemIds;
  }

  if (tagsByType.system) {
    const systemTags = tagsByType.system.map(t => t.entityId!);
    if (systemTags.includes('calendar')) {
      augmentedScope.includeDeadlines = true;
    }
    if (systemTags.includes('tasks') || systemTags.includes('taskflow')) {
      augmentedScope.includeTaskFlow = true;
    }
    if (systemTags.includes('mindmesh')) {
      augmentedScope.includeMindMesh = true;
    }
  }

  if (tagsByType.person) {
    augmentedScope.includePeople = true;
  }

  return augmentedScope;
}

export function formatTagContextForAI(enrichedContext: EnrichedAIContext): string {
  const lines: string[] = [];

  lines.push('Referenced Entities:');

  if (enrichedContext.resolvedTags.length > 0) {
    lines.push('\nResolved:');
    enrichedContext.resolvedTags.forEach(tag => {
      lines.push(`- @${tag.normalizedTag} → ${tag.entityType}: "${tag.displayName}"`);
    });
  }

  if (enrichedContext.unresolvedTags.length > 0) {
    lines.push('\nUnresolved (not found):');
    enrichedContext.unresolvedTags.forEach(tag => {
      lines.push(`- @${tag}`);
    });
  }

  if (enrichedContext.ambiguousTags.length > 0) {
    lines.push('\nAmbiguous (multiple matches):');
    enrichedContext.ambiguousTags.forEach(tag => {
      lines.push(`- @${tag.tag} → ${tag.matches.join(' OR ')}`);
    });
  }

  return lines.join('\n');
}

export const TAG_CONTEXT_RULES = {
  MINIMAL_SNAPSHOTS: 'Only essential entity data is included',
  PERMISSION_SAFE: 'Snapshots respect user permissions',
  TOKEN_BOUNDED: 'Each snapshot respects maxTextLengthPerEntity',
  NO_FULL_DUMPS: 'Snapshots are summaries, not complete entities',
  AUGMENT_NOT_REPLACE: 'Tags augment existing scope, do not replace it',
  MAX_TAGS: `Maximum ${MAX_TAGS_IN_CONTEXT} tags processed per prompt`,
  SUMMARY_PROVIDED: 'AI receives summary of what was resolved/unresolved',
};

export const TAG_CONTEXT_EXAMPLES = {
  TRACK_TAG: {
    input: '@marketingplan',
    snapshot: { name: 'Marketing Plan', description: '...', itemCount: 15, color: 'blue' },
    note: 'Minimal track snapshot with item count',
  },
  ITEM_TAG: {
    input: '@rachelsweddingday',
    snapshot: { title: "Rachel's Wedding Day", itemType: 'event', deadline: '2025-06-15', status: 'planned' },
    note: 'Roadmap item snapshot with key metadata',
  },
  PERSON_TAG: {
    input: '@johndoe',
    snapshot: { name: 'John Doe', role: 'Developer', assignmentCount: 8 },
    note: 'Person snapshot with assignment count',
  },
  SYSTEM_TAG: {
    input: '@calendar',
    snapshot: { type: 'system', name: 'Calendar', description: 'User calendar and events' },
    note: 'System entity snapshot',
  },
};
