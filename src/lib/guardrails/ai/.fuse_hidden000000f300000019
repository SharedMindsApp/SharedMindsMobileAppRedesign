import { supabase } from '../../supabase';
import { normalizeEntityName } from './aiTagParser';

export type EntityType = 'track' | 'roadmap_item' | 'person' | 'system' | 'shared_track';

export type ResolutionStatus = 'resolved' | 'ambiguous' | 'unresolved';

export interface ResolvedTag {
  rawTag: string;
  normalizedTag: string;
  entityType?: EntityType;
  entityId?: string;
  displayName?: string;
  resolutionStatus: ResolutionStatus;
  ambiguousMatches?: Array<{
    entityType: EntityType;
    entityId: string;
    displayName: string;
  }>;
  metadata?: Record<string, any>;
}

export interface TagResolutionContext {
  userId: string;
  projectId?: string;
  allowSystemEntities?: boolean;
  allowSharedTracks?: boolean;
}

const SYSTEM_ENTITIES: Record<string, { displayName: string; entityType: EntityType }> = {
  calendar: { displayName: 'Calendar', entityType: 'system' },
  tasks: { displayName: 'Tasks', entityType: 'system' },
  habits: { displayName: 'Habits', entityType: 'system' },
  goals: { displayName: 'Goals', entityType: 'system' },
  taskflow: { displayName: 'Task Flow', entityType: 'system' },
  mindmesh: { displayName: 'Mind Mesh', entityType: 'system' },
  roadmap: { displayName: 'Roadmap', entityType: 'system' },
};

export async function resolveTags(
  normalizedTags: string[],
  context: TagResolutionContext
): Promise<ResolvedTag[]> {
  const resolved: ResolvedTag[] = [];

  for (const normalizedTag of normalizedTags) {
    const result = await resolveTag(normalizedTag, context);
    resolved.push(result);
  }

  return resolved;
}

export async function resolveTag(
  normalizedTag: string,
  context: TagResolutionContext
): Promise<ResolvedTag> {
  const candidates: Array<{
    entityType: EntityType;
    entityId: string;
    displayName: string;
    priority: number;
    metadata?: Record<string, any>;
  }> = [];

  if (context.allowSystemEntities !== false) {
    const systemMatch = SYSTEM_ENTITIES[normalizedTag];
    if (systemMatch) {
      return {
        rawTag: normalizedTag,
        normalizedTag,
        entityType: 'system',
        entityId: normalizedTag,
        displayName: systemMatch.displayName,
        resolutionStatus: 'resolved',
        metadata: { isSystem: true },
      };
    }
  }

  if (context.projectId) {
    const trackMatches = await findMatchingTracks(normalizedTag, context.projectId, context.userId);
    candidates.push(...trackMatches.map(m => ({ ...m, entityType: 'track' as EntityType, priority: 1 })));

    const itemMatches = await findMatchingRoadmapItems(normalizedTag, context.projectId, context.userId);
    candidates.push(...itemMatches.map(m => ({ ...m, entityType: 'roadmap_item' as EntityType, priority: 2 })));

    const peopleMatches = await findMatchingPeople(normalizedTag, context.projectId, context.userId);
    candidates.push(...peopleMatches.map(m => ({ ...m, entityType: 'person' as EntityType, priority: 3 })));

    if (context.allowSharedTracks !== false) {
      const sharedMatches = await findMatchingSharedTracks(normalizedTag, context.projectId, context.userId);
      candidates.push(...sharedMatches.map(m => ({ ...m, entityType: 'shared_track' as EntityType, priority: 4 })));
    }
  } else {
    const globalPeopleMatches = await findMatchingGlobalPeople(normalizedTag, context.userId);
    candidates.push(...globalPeopleMatches.map(m => ({ ...m, entityType: 'person' as EntityType, priority: 5 })));
  }

  if (candidates.length === 0) {
    return {
      rawTag: normalizedTag,
      normalizedTag,
      resolutionStatus: 'unresolved',
    };
  }

  if (candidates.length === 1) {
    const match = candidates[0];
    return {
      rawTag: normalizedTag,
      normalizedTag,
      entityType: match.entityType,
      entityId: match.entityId,
      displayName: match.displayName,
      resolutionStatus: 'resolved',
      metadata: match.metadata,
    };
  }

  candidates.sort((a, b) => a.priority - b.priority);

  if (candidates[0].priority < candidates[1].priority) {
    const match = candidates[0];
    return {
      rawTag: normalizedTag,
      normalizedTag,
      entityType: match.entityType,
      entityId: match.entityId,
      displayName: match.displayName,
      resolutionStatus: 'resolved',
      metadata: match.metadata,
    };
  }

  return {
    rawTag: normalizedTag,
    normalizedTag,
    resolutionStatus: 'ambiguous',
    ambiguousMatches: candidates.map(c => ({
      entityType: c.entityType,
      entityId: c.entityId,
      displayName: c.displayName,
    })),
  };
}

async function findMatchingTracks(
  normalizedTag: string,
  projectId: string,
  userId: string
): Promise<Array<{ entityId: string; displayName: string; metadata?: Record<string, any> }>> {
  const { data, error } = await supabase
    .from('guardrails_tracks')
    .select('id, name, is_shared, parent_track_id')
    .eq('master_project_id', projectId);

  if (error || !data) {
    return [];
  }

  return data
    .filter(track => normalizeEntityName(track.name) === normalizedTag)
    .map(track => ({
      entityId: track.id,
      displayName: track.name,
      metadata: {
        isShared: track.is_shared,
        parentTrackId: track.parent_track_id,
      },
    }));
}

async function findMatchingRoadmapItems(
  normalizedTag: string,
  projectId: string,
  userId: string
): Promise<Array<{ entityId: string; displayName: string; metadata?: Record<string, any> }>> {
  const { data, error } = await supabase
    .from('roadmap_items')
    .select('id, title, item_type, track_id, status')
    .eq('master_project_id', projectId);

  if (error || !data) {
    return [];
  }

  return data
    .filter(item => normalizeEntityName(item.title) === normalizedTag)
    .map(item => ({
      entityId: item.id,
      displayName: item.title,
      metadata: {
        itemType: item.item_type,
        trackId: item.track_id,
        status: item.status,
      },
    }));
}

async function findMatchingPeople(
  normalizedTag: string,
  projectId: string,
  userId: string
): Promise<Array<{ entityId: string; displayName: string; metadata?: Record<string, any> }>> {
  const { data: projectPeople, error: ppError } = await supabase
    .from('project_people')
    .select('id, name, role')
    .eq('master_project_id', projectId);

  const { data: projectUsers, error: puError } = await supabase
    .from('project_users')
    .select('user_id, role')
    .eq('master_project_id', projectId);

  const matches: Array<{ entityId: string; displayName: string; metadata?: Record<string, any> }> = [];

  if (!ppError && projectPeople) {
    projectPeople
      .filter(person => normalizeEntityName(person.name) === normalizedTag)
      .forEach(person => {
        matches.push({
          entityId: person.id,
          displayName: person.name,
          metadata: {
            role: person.role,
            isProjectUser: false,
          },
        });
      });
  }

  if (!puError && projectUsers) {
    for (const user of projectUsers) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.user_id)
        .maybeSingle();

      if (profile && normalizeEntityName(profile.full_name) === normalizedTag) {
        matches.push({
          entityId: user.user_id,
          displayName: profile.full_name,
          metadata: {
            role: user.role,
            isProjectUser: true,
          },
        });
      }
    }
  }

  return matches;
}

async function findMatchingSharedTracks(
  normalizedTag: string,
  projectId: string,
  userId: string
): Promise<Array<{ entityId: string; displayName: string; metadata?: Record<string, any> }>> {
  const { data, error } = await supabase
    .from('guardrails_tracks')
    .select('id, name, master_project_id')
    .eq('is_shared', true);

  if (error || !data) {
    return [];
  }

  const accessibleSharedTracks = [];
  for (const track of data) {
    const hasAccess = await canUserAccessSharedTrack(userId, track.id, track.master_project_id);
    if (hasAccess && normalizeEntityName(track.name) === normalizedTag) {
      accessibleSharedTracks.push({
        entityId: track.id,
        displayName: track.name,
        metadata: {
          isShared: true,
          sourceProjectId: track.master_project_id,
        },
      });
    }
  }

  return accessibleSharedTracks;
}

async function findMatchingGlobalPeople(
  normalizedTag: string,
  userId: string
): Promise<Array<{ entityId: string; displayName: string; metadata?: Record<string, any> }>> {
  const { data, error } = await supabase
    .from('global_people')
    .select('id, name')
    .eq('created_by', userId);

  if (error || !data) {
    return [];
  }

  return data
    .filter(person => normalizeEntityName(person.name) === normalizedTag)
    .map(person => ({
      entityId: person.id,
      displayName: person.name,
      metadata: {
        isGlobal: true,
      },
    }));
}

async function canUserAccessSharedTrack(
  userId: string,
  trackId: string,
  sourceProjectId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('project_users')
    .select('user_id')
    .eq('master_project_id', sourceProjectId)
    .eq('user_id', userId)
    .maybeSingle();

  return !error && !!data;
}

export function getResolvedTags(results: ResolvedTag[]): ResolvedTag[] {
  return results.filter(r => r.resolutionStatus === 'resolved');
}

export function getUnresolvedTags(results: ResolvedTag[]): ResolvedTag[] {
  return results.filter(r => r.resolutionStatus === 'unresolved');
}

export function getAmbiguousTags(results: ResolvedTag[]): ResolvedTag[] {
  return results.filter(r => r.resolutionStatus === 'ambiguous');
}

export function groupResolvedTagsByType(results: ResolvedTag[]): Record<EntityType, ResolvedTag[]> {
  const grouped: Partial<Record<EntityType, ResolvedTag[]>> = {};

  getResolvedTags(results).forEach(tag => {
    if (tag.entityType) {
      if (!grouped[tag.entityType]) {
        grouped[tag.entityType] = [];
      }
      grouped[tag.entityType]!.push(tag);
    }
  });

  return grouped as Record<EntityType, ResolvedTag[]>;
}

export const TAG_RESOLUTION_PRIORITY = {
  TRACKS: 1,
  ROADMAP_ITEMS: 2,
  PEOPLE: 3,
  SHARED_TRACKS: 4,
  GLOBAL_PEOPLE: 5,
  NOTE: 'Lower number = higher priority. If multiple entities match at same priority, tag is marked ambiguous.',
};

export const TAG_RESOLUTION_RULES = {
  EXACT_MATCH_ONLY: 'Only exact normalized name matches are resolved',
  PERMISSION_SAFE: 'Only entities user has access to are considered',
  PRIORITY_ORDER: 'Tracks > Items > People > Shared Tracks > Global People',
  AMBIGUITY_DETECTION: 'Multiple matches at same priority → ambiguous',
  NO_FUZZY_MATCHING: 'No heuristics, no guessing, deterministic only',
  SYSTEM_ENTITIES_FIRST: 'System entities (@calendar, @tasks) resolved before project entities',
  PROJECT_SCOPED: 'Resolution is scoped to specified project when provided',
};

export const TAG_RESOLUTION_EXAMPLES = {
  SIMPLE_TRACK: {
    input: '@marketingplan',
    match: 'Track named "Marketing Plan"',
    output: { entityType: 'track', displayName: 'Marketing Plan', resolutionStatus: 'resolved' },
  },
  ROADMAP_ITEM: {
    input: '@rachelsweddingday',
    match: "Roadmap item named \"Rachel's Wedding Day\"",
    output: { entityType: 'roadmap_item', displayName: "Rachel's Wedding Day", resolutionStatus: 'resolved' },
  },
  PERSON: {
    input: '@johndoe',
    match: 'Person named "John Doe"',
    output: { entityType: 'person', displayName: 'John Doe', resolutionStatus: 'resolved' },
  },
  SYSTEM: {
    input: '@calendar',
    match: 'System entity "Calendar"',
    output: { entityType: 'system', displayName: 'Calendar', resolutionStatus: 'resolved' },
  },
  AMBIGUOUS: {
    input: '@launch',
    matches: ['Track: "Launch"', 'Roadmap Item: "Launch"'],
    output: { resolutionStatus: 'ambiguous', ambiguousMatches: 2 },
  },
  UNRESOLVED: {
    input: '@doesnotexist',
    match: 'No matching entity',
    output: { resolutionStatus: 'unresolved' },
  },
};
