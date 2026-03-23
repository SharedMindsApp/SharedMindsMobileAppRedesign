import { supabase } from '../supabase';
import type {
  PersonalLink,
  PersonalConsumptionMode,
  PersonalVisibilityState,
  PersonalSpaceType,
  GuardrailsSourceType,
  ConsumptionQuery,
  ConsumptionAnalytics,
  UpdateConsumptionInput,
  PersonalDerivedState,
  DeadlineState,
} from './consumptionTypes';
import type { RoadmapItem } from '../guardrails/coreTypes';

const TABLE_NAME = 'guardrails_personal_links';

function transformKeysFromDb(row: any): PersonalLink {
  return {
    id: row.id,
    userId: row.user_id,
    masterProjectId: row.master_project_id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    targetSpaceType: row.target_space_type,
    targetEntityId: row.target_entity_id,
    isActive: row.is_active,
    consumptionMode: row.consumption_mode || 'reference',
    visibilityState: row.visibility_state || 'visible',
    derivedMetadata: row.derived_metadata || {},
    lastConsumedAt: row.last_consumed_at,
    consumptionCount: row.consumption_count || 0,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  };
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function transformKeysToSnake(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnake(key)] = value;
  }
  return result;
}

export async function getPersonalLinksForUser(
  userId: string,
  query?: Partial<ConsumptionQuery>
): Promise<PersonalLink[]> {
  let dbQuery = supabase.from(TABLE_NAME).select('*').eq('user_id', userId);

  if (query?.spaceType) {
    dbQuery = dbQuery.eq('target_space_type', query.spaceType);
  }

  if (query?.sourceType) {
    dbQuery = dbQuery.eq('source_type', query.sourceType);
  }

  if (query?.visibilityState && query.visibilityState.length > 0) {
    dbQuery = dbQuery.in('visibility_state', query.visibilityState);
  }

  if (query?.consumptionMode && query.consumptionMode.length > 0) {
    dbQuery = dbQuery.in('consumption_mode', query.consumptionMode);
  }

  if (!query?.includeInactive) {
    dbQuery = dbQuery.eq('is_active', true);
  }

  const { data, error } = await dbQuery.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching personal links:', error);
    return [];
  }

  return (data || []).map(transformKeysFromDb);
}

export async function getPersonalLinksBySpace(
  userId: string,
  spaceType: PersonalSpaceType
): Promise<PersonalLink[]> {
  return getPersonalLinksForUser(userId, { spaceType });
}

export async function getVisibleLinksForSpace(
  userId: string,
  spaceType: PersonalSpaceType
): Promise<PersonalLink[]> {
  return getPersonalLinksForUser(userId, {
    spaceType,
    visibilityState: ['visible', 'pinned'],
  });
}

export async function getPinnedLinksForSpace(
  userId: string,
  spaceType: PersonalSpaceType
): Promise<PersonalLink[]> {
  return getPersonalLinksForUser(userId, {
    spaceType,
    visibilityState: ['pinned'],
  });
}

export async function getHiddenLinksForSpace(
  userId: string,
  spaceType: PersonalSpaceType
): Promise<PersonalLink[]> {
  return getPersonalLinksForUser(userId, {
    spaceType,
    visibilityState: ['hidden', 'muted'],
  });
}

export async function getPersonalLinkById(linkId: string): Promise<PersonalLink | null> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', linkId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching personal link:', error);
    return null;
  }

  return data ? transformKeysFromDb(data) : null;
}

export async function getPersonalLinkBySource(
  userId: string,
  sourceType: GuardrailsSourceType,
  sourceId: string,
  spaceType: PersonalSpaceType
): Promise<PersonalLink | null> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .eq('target_space_type', spaceType)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Error fetching personal link by source:', error);
    return null;
  }

  return data ? transformKeysFromDb(data) : null;
}

export async function updateConsumptionMetadata(
  linkId: string,
  input: UpdateConsumptionInput
): Promise<PersonalLink | null> {
  const dbInput = transformKeysToSnake(input);

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(dbInput)
    .eq('id', linkId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error updating consumption metadata:', error);
    return null;
  }

  return data ? transformKeysFromDb(data) : null;
}

export async function updateVisibilityState(
  linkId: string,
  visibilityState: PersonalVisibilityState
): Promise<void> {
  await updateConsumptionMetadata(linkId, { visibilityState });
}

export async function updateConsumptionMode(
  linkId: string,
  consumptionMode: PersonalConsumptionMode
): Promise<void> {
  await updateConsumptionMetadata(linkId, { consumptionMode });
}

export async function updateDerivedMetadata(
  linkId: string,
  metadata: Record<string, any>
): Promise<void> {
  const link = await getPersonalLinkById(linkId);
  if (!link) return;

  const merged = {
    ...link.derivedMetadata,
    ...metadata,
  };

  await updateConsumptionMetadata(linkId, { derivedMetadata: merged });
}

export async function trackConsumption(linkId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_consumption_count', {
    link_id: linkId,
  });

  if (error) {
    await supabase
      .from(TABLE_NAME)
      .update({
        last_consumed_at: new Date().toISOString(),
        consumption_count: supabase.raw('consumption_count + 1'),
      })
      .eq('id', linkId);
  }
}

export async function getConsumptionAnalytics(userId: string): Promise<ConsumptionAnalytics> {
  const links = await getPersonalLinksForUser(userId, { includeInactive: false });

  const analytics: ConsumptionAnalytics = {
    totalLinks: links.length,
    activeLinks: links.filter((l) => l.isActive).length,
    linksBySpace: {
      calendar: 0,
      tasks: 0,
      habits: 0,
      notes: 0,
      goals: 0,
    },
    linksByMode: {
      reference: 0,
      derived: 0,
      shadowed: 0,
    },
    linksByVisibility: {
      visible: 0,
      hidden: 0,
      muted: 0,
      pinned: 0,
    },
    staleLinks: 0,
    orphanedLinks: 0,
    averageConsumptionCount: 0,
  };

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let totalConsumptionCount = 0;

  for (const link of links) {
    analytics.linksBySpace[link.targetSpaceType]++;
    analytics.linksByMode[link.consumptionMode]++;
    analytics.linksByVisibility[link.visibilityState]++;

    if (link.lastConsumedAt) {
      const lastConsumed = new Date(link.lastConsumedAt);
      if (lastConsumed < thirtyDaysAgo) {
        analytics.staleLinks++;
      }
    } else {
      analytics.orphanedLinks++;
    }

    totalConsumptionCount += link.consumptionCount;
  }

  if (links.length > 0) {
    analytics.averageConsumptionCount = totalConsumptionCount / links.length;
  }

  return analytics;
}

export function computeDeadlineState(
  item: RoadmapItem,
  dueSoonThresholdDays: number = 7
): DeadlineState {
  const deadlineDate = item.endDate || item.startDate;
  if (!deadlineDate) return 'none';

  const deadline = new Date(deadlineDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return 'overdue';
  if (daysUntil <= dueSoonThresholdDays) return 'due_soon';
  return 'on_track';
}

export function computeBasicDerivedState(item: RoadmapItem): PersonalDerivedState {
  const deadlineState = computeDeadlineState(item);
  const isCompleted = item.status === 'completed';
  const isOverdue = deadlineState === 'overdue';

  return {
    sourceStatus: item.status,
    deadlineState,
    lastSyncedAt: new Date().toISOString(),
    isCompleted,
    isOverdue,
  };
}

export async function getStaleLinks(
  userId: string,
  staleDays: number = 30
): Promise<PersonalLink[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - staleDays);

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .lt('last_consumed_at', cutoffDate.toISOString());

  if (error) {
    console.error('Error fetching stale links:', error);
    return [];
  }

  return (data || []).map(transformKeysFromDb);
}

export async function getOrphanedLinks(userId: string): Promise<PersonalLink[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('last_consumed_at', null);

  if (error) {
    console.error('Error fetching orphaned links:', error);
    return [];
  }

  return (data || []).map(transformKeysFromDb);
}
