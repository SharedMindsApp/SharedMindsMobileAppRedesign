import { supabase } from '../../supabase';
import { normalizeEntityName } from './aiTagParser';
import type { EntityType } from './aiTagResolver';

export interface TagSuggestion {
  normalizedTag: string;
  displayName: string;
  entityType: EntityType;
  entityId: string;
  icon?: string;
  subtitle?: string;
  metadata?: Record<string, any>;
}

export interface TagSuggestionContext {
  userId: string;
  projectId?: string;
  includeSystemEntities?: boolean;
  includeSharedTracks?: boolean;
  limit?: number;
}

const DEFAULT_SUGGESTION_LIMIT = 10;

const SYSTEM_TAG_SUGGESTIONS: TagSuggestion[] = [
  {
    normalizedTag: 'calendar',
    displayName: 'Calendar',
    entityType: 'system',
    entityId: 'calendar',
    icon: 'Calendar',
    subtitle: 'Events and deadlines',
  },
  {
    normalizedTag: 'tasks',
    displayName: 'Tasks',
    entityType: 'system',
    entityId: 'tasks',
    icon: 'CheckSquare',
    subtitle: 'Task list',
  },
  {
    normalizedTag: 'taskflow',
    displayName: 'Task Flow',
    entityType: 'system',
    entityId: 'taskflow',
    icon: 'Kanban',
    subtitle: 'Task board',
  },
  {
    normalizedTag: 'roadmap',
    displayName: 'Roadmap',
    entityType: 'system',
    entityId: 'roadmap',
    icon: 'Map',
    subtitle: 'Project roadmap',
  },
  {
    normalizedTag: 'mindmesh',
    displayName: 'Mind Mesh',
    entityType: 'system',
    entityId: 'mindmesh',
    icon: 'Network',
    subtitle: 'Knowledge graph',
  },
  {
    normalizedTag: 'habits',
    displayName: 'Habits',
    entityType: 'system',
    entityId: 'habits',
    icon: 'BarChart',
    subtitle: 'Habit tracking',
  },
  {
    normalizedTag: 'goals',
    displayName: 'Goals',
    entityType: 'system',
    entityId: 'goals',
    icon: 'Target',
    subtitle: 'Personal goals',
  },
];

export async function getTagSuggestions(
  query: string,
  context: TagSuggestionContext
): Promise<TagSuggestion[]> {
  const normalizedQuery = normalizeEntityName(query);
  const limit = context.limit || DEFAULT_SUGGESTION_LIMIT;

  const suggestions: TagSuggestion[] = [];

  if (context.includeSystemEntities !== false) {
    const systemMatches = SYSTEM_TAG_SUGGESTIONS.filter(s =>
      s.normalizedTag.includes(normalizedQuery) || s.displayName.toLowerCase().includes(query.toLowerCase())
    );
    suggestions.push(...systemMatches);
  }

  if (context.projectId) {
    const trackSuggestions = await getTrackSuggestions(normalizedQuery, context.projectId, limit);
    suggestions.push(...trackSuggestions);

    const itemSuggestions = await getRoadmapItemSuggestions(normalizedQuery, context.projectId, limit);
    suggestions.push(...itemSuggestions);

    const peopleSuggestions = await getPeopleSuggestions(normalizedQuery, context.projectId, limit);
    suggestions.push(...peopleSuggestions);

    if (context.includeSharedTracks !== false) {
      const sharedSuggestions = await getSharedTrackSuggestions(normalizedQuery, context.userId, limit);
      suggestions.push(...sharedSuggestions);
    }
  } else {
    const globalPeopleSuggestions = await getGlobalPeopleSuggestions(normalizedQuery, context.userId, limit);
    suggestions.push(...globalPeopleSuggestions);
  }

  return suggestions
    .sort((a, b) => {
      const aScore = calculateRelevanceScore(a, normalizedQuery);
      const bScore = calculateRelevanceScore(b, normalizedQuery);
      return bScore - aScore;
    })
    .slice(0, limit);
}

async function getTrackSuggestions(
  query: string,
  projectId: string,
  limit: number
): Promise<TagSuggestion[]> {
  const { data, error } = await supabase
    .from('guardrails_tracks')
    .select('id, name, color, is_shared, parent_track_id')
    .eq('master_project_id', projectId)
    .limit(limit * 2);

  if (error || !data) {
    return [];
  }

  return data
    .filter(track => {
      const normalized = normalizeEntityName(track.name);
      return normalized.includes(query) || track.name.toLowerCase().includes(query);
    })
    .map(track => ({
      normalizedTag: normalizeEntityName(track.name),
      displayName: track.name,
      entityType: 'track' as EntityType,
      entityId: track.id,
      icon: 'Folder',
      subtitle: track.is_shared ? 'Shared Track' : 'Track',
      metadata: {
        color: track.color,
        isShared: track.is_shared,
        parentTrackId: track.parent_track_id,
      },
    }));
}

async function getRoadmapItemSuggestions(
  query: string,
  projectId: string,
  limit: number
): Promise<TagSuggestion[]> {
  const { data, error } = await supabase
    .from('roadmap_items')
    .select('id, title, item_type, status')
    .eq('master_project_id', projectId)
    .limit(limit * 2);

  if (error || !data) {
    return [];
  }

  return data
    .filter(item => {
      const normalized = normalizeEntityName(item.title);
      return normalized.includes(query) || item.title.toLowerCase().includes(query);
    })
    .map(item => ({
      normalizedTag: normalizeEntityName(item.title),
      displayName: item.title,
      entityType: 'roadmap_item' as EntityType,
      entityId: item.id,
      icon: getItemTypeIcon(item.item_type),
      subtitle: getItemTypeLabel(item.item_type),
      metadata: {
        itemType: item.item_type,
        status: item.status,
      },
    }));
}

async function getPeopleSuggestions(
  query: string,
  projectId: string,
  limit: number
): Promise<TagSuggestion[]> {
  const suggestions: TagSuggestion[] = [];

  const { data: projectPeople } = await supabase
    .from('project_people')
    .select('id, name, role')
    .eq('master_project_id', projectId)
    .limit(limit);

  if (projectPeople) {
    projectPeople
      .filter(person => {
        const normalized = normalizeEntityName(person.name);
        return normalized.includes(query) || person.name.toLowerCase().includes(query);
      })
      .forEach(person => {
        suggestions.push({
          normalizedTag: normalizeEntityName(person.name),
          displayName: person.name,
          entityType: 'person',
          entityId: person.id,
          icon: 'User',
          subtitle: person.role || 'Team Member',
          metadata: { role: person.role },
        });
      });
  }

  const { data: projectUsers } = await supabase
    .from('project_users')
    .select('user_id, role')
    .eq('master_project_id', projectId)
    .limit(limit);

  if (projectUsers) {
    for (const user of projectUsers) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.user_id)
        .maybeSingle();

      if (profile) {
        const normalized = normalizeEntityName(profile.full_name);
        if (normalized.includes(query) || profile.full_name.toLowerCase().includes(query)) {
          suggestions.push({
            normalizedTag: normalized,
            displayName: profile.full_name,
            entityType: 'person',
            entityId: user.user_id,
            icon: 'UserCircle',
            subtitle: user.role || 'Project User',
            metadata: { role: user.role, isProjectUser: true },
          });
        }
      }
    }
  }

  return suggestions;
}

async function getSharedTrackSuggestions(
  query: string,
  userId: string,
  limit: number
): Promise<TagSuggestion[]> {
  const { data, error } = await supabase
    .from('guardrails_tracks')
    .select('id, name, color, master_project_id')
    .eq('is_shared', true)
    .limit(limit * 2);

  if (error || !data) {
    return [];
  }

  const accessible: TagSuggestion[] = [];

  for (const track of data) {
    const { data: access } = await supabase
      .from('project_users')
      .select('user_id')
      .eq('master_project_id', track.master_project_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (access) {
      const normalized = normalizeEntityName(track.name);
      if (normalized.includes(query) || track.name.toLowerCase().includes(query)) {
        accessible.push({
          normalizedTag: normalized,
          displayName: track.name,
          entityType: 'shared_track',
          entityId: track.id,
          icon: 'Share2',
          subtitle: 'Shared Track',
          metadata: {
            color: track.color,
            sourceProjectId: track.master_project_id,
          },
        });
      }
    }
  }

  return accessible;
}

async function getGlobalPeopleSuggestions(
  query: string,
  userId: string,
  limit: number
): Promise<TagSuggestion[]> {
  const { data, error } = await supabase
    .from('global_people')
    .select('id, name')
    .eq('created_by', userId)
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data
    .filter(person => {
      const normalized = normalizeEntityName(person.name);
      return normalized.includes(query) || person.name.toLowerCase().includes(query);
    })
    .map(person => ({
      normalizedTag: normalizeEntityName(person.name),
      displayName: person.name,
      entityType: 'person' as EntityType,
      entityId: person.id,
      icon: 'User',
      subtitle: 'Global Person',
      metadata: { isGlobal: true },
    }));
}

function calculateRelevanceScore(suggestion: TagSuggestion, query: string): number {
  let score = 0;

  if (suggestion.normalizedTag === query) {
    score += 100;
  } else if (suggestion.normalizedTag.startsWith(query)) {
    score += 50;
  } else if (suggestion.normalizedTag.includes(query)) {
    score += 25;
  }

  if (suggestion.displayName.toLowerCase() === query) {
    score += 90;
  } else if (suggestion.displayName.toLowerCase().startsWith(query)) {
    score += 40;
  } else if (suggestion.displayName.toLowerCase().includes(query)) {
    score += 20;
  }

  if (suggestion.entityType === 'system') {
    score += 10;
  }

  return score;
}

function getItemTypeIcon(itemType: string): string {
  const icons: Record<string, string> = {
    milestone: 'Flag',
    task: 'CheckSquare',
    phase: 'Layers',
    event: 'Calendar',
    deliverable: 'Package',
    decision: 'GitBranch',
  };
  return icons[itemType] || 'Circle';
}

function getItemTypeLabel(itemType: string): string {
  const labels: Record<string, string> = {
    milestone: 'Milestone',
    task: 'Task',
    phase: 'Phase',
    event: 'Event',
    deliverable: 'Deliverable',
    decision: 'Decision',
  };
  return labels[itemType] || 'Item';
}

export async function getRecentlyUsedTags(
  userId: string,
  projectId?: string,
  limit: number = 5
): Promise<TagSuggestion[]> {
  const { data, error } = await supabase
    .from('ai_interactions')
    .select('prompt')
    .eq('user_id', userId)
    .eq('project_id', projectId || '')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !data) {
    return [];
  }

  const tagCounts = new Map<string, number>();

  data.forEach(interaction => {
    const matches = interaction.prompt.matchAll(/@([a-zA-Z0-9]+)/g);
    for (const match of matches) {
      const tag = match[1].toLowerCase();
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  });

  const sortedTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);

  if (sortedTags.length === 0) {
    return [];
  }

  const suggestions = await getTagSuggestions('', {
    userId,
    projectId,
    includeSystemEntities: true,
    includeSharedTracks: true,
    limit: 50,
  });

  return suggestions.filter(s => sortedTags.includes(s.normalizedTag));
}

export const TAG_SUGGESTION_RULES = {
  ACTIVATED_ON_AT: 'Suggestions appear when user types @',
  FILTERS_AS_TYPED: 'Suggestions filter as characters are added',
  RELEVANCE_SORTED: 'Results sorted by relevance score',
  PERMISSION_SAFE: 'Only suggests entities user can access',
  DISPLAY_FRIENDLY: 'Shows display name + icon + subtitle',
  NORMALIZED_INSERT: 'Selection inserts normalized tag (no spaces)',
  NO_ID_EXPOSURE: 'IDs never shown to user',
  OPTIONAL: 'Manual typing always works, autocomplete is enhancement',
};

export const TAG_SUGGESTION_UX = {
  TRIGGER: 'User types @ character',
  FILTER: 'Type "mar" → shows "Marketing Plan", "Market Research", etc.',
  SELECT: 'Click "Marketing Plan" → inserts @marketingplan',
  VISUAL: 'Each suggestion shows icon, name, and entity type',
  RECENT: 'Recently used tags can be surfaced first',
  LIMIT: `Shows up to ${DEFAULT_SUGGESTION_LIMIT} suggestions`,
};

export const TAG_SUGGESTION_EXAMPLES = {
  EMPTY_QUERY: {
    input: '@',
    output: ['System entities', 'Recent tags', 'Top entities'],
    note: 'Show helpful defaults when query is empty',
  },
  PARTIAL_MATCH: {
    input: '@mark',
    output: ['@marketingplan', '@marketresearch'],
    note: 'Filter by partial match',
  },
  EXACT_MATCH: {
    input: '@calendar',
    output: ['@calendar (System)'],
    note: 'Exact matches ranked highest',
  },
};
