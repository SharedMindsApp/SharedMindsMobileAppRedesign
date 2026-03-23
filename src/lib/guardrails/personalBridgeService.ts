import { supabase } from '../supabase';
import type {
  PersonalLink,
  GuardrailsSourceType,
  PersonalSpaceType,
  CreatePersonalLinkInput,
  UpdatePersonalLinkInput,
  RoadmapItemType,
  ValidationError,
} from './coreTypes';
import {
  ROADMAP_ITEM_PERSONAL_SPACE_ELIGIBILITY,
  TRACK_PERSONAL_SPACE_ELIGIBILITY,
} from './coreTypes';
import { getRoadmapItem } from './roadmapService';
import { getTrack } from './trackService';

const TABLE_NAME = 'guardrails_personal_links';

export interface PersonalLinkValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

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

export function isRoadmapItemEligibleForSpace(
  itemType: RoadmapItemType,
  spaceType: PersonalSpaceType
): boolean {
  return ROADMAP_ITEM_PERSONAL_SPACE_ELIGIBILITY[itemType][spaceType];
}

export function isTrackEligibleForSpace(spaceType: PersonalSpaceType): boolean {
  return TRACK_PERSONAL_SPACE_ELIGIBILITY[spaceType];
}

async function validateLinkEligibility(
  sourceType: GuardrailsSourceType,
  sourceId: string,
  targetSpaceType: PersonalSpaceType
): Promise<PersonalLinkValidationResult> {
  const errors: ValidationError[] = [];

  if (sourceType === 'roadmap_item') {
    const item = await getRoadmapItem(sourceId);
    if (!item) {
      errors.push({
        field: 'sourceId',
        message: 'Roadmap item not found',
      });
      return { valid: false, errors };
    }

    if (!isRoadmapItemEligibleForSpace(item.type, targetSpaceType)) {
      errors.push({
        field: 'targetSpaceType',
        message: `Roadmap item type '${item.type}' cannot be linked to '${targetSpaceType}'. Not eligible.`,
      });
    }
  } else if (sourceType === 'track') {
    const track = await getTrack(sourceId);
    if (!track) {
      errors.push({
        field: 'sourceId',
        message: 'Track not found',
      });
      return { valid: false, errors };
    }

    if (!isTrackEligibleForSpace(targetSpaceType)) {
      errors.push({
        field: 'targetSpaceType',
        message: `Tracks cannot be linked to '${targetSpaceType}'. Not eligible.`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

async function validateProjectOwnership(
  userId: string,
  masterProjectId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('master_projects')
    .select('user_id')
    .eq('id', masterProjectId)
    .single();

  if (error || !data) return false;
  return data.user_id === userId;
}

export async function linkToPersonalSpace(
  input: CreatePersonalLinkInput
): Promise<PersonalLink> {
  const ownsProject = await validateProjectOwnership(
    input.userId,
    input.masterProjectId
  );
  if (!ownsProject) {
    throw new Error('User does not own this project');
  }

  const eligibilityValidation = await validateLinkEligibility(
    input.sourceType,
    input.sourceId,
    input.targetSpaceType
  );

  if (!eligibilityValidation.valid) {
    throw new Error(
      `Link validation failed:\n${eligibilityValidation.errors.map((e) => `- ${e.field}: ${e.message}`).join('\n')}`
    );
  }

  const existingLink = await isLinked(
    input.sourceType,
    input.sourceId,
    input.targetSpaceType,
    input.userId
  );

  if (existingLink) {
    throw new Error(
      `An active link already exists between this ${input.sourceType} and ${input.targetSpaceType}`
    );
  }

  const dbInput = transformKeysToSnake({
    ...input,
    isActive: true,
  });

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(dbInput)
    .select()
    .single();

  if (error) throw error;

  return transformKeysFromDb(data);
}

export async function unlinkFromPersonalSpace(linkId: string): Promise<PersonalLink> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      is_active: false,
    })
    .eq('id', linkId)
    .select()
    .single();

  if (error) throw error;

  return transformKeysFromDb(data);
}

export async function reactivateLink(linkId: string): Promise<PersonalLink> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      is_active: true,
      revoked_at: null,
    })
    .eq('id', linkId)
    .select()
    .single();

  if (error) throw error;

  return transformKeysFromDb(data);
}

export async function updatePersonalLink(
  linkId: string,
  input: UpdatePersonalLinkInput
): Promise<PersonalLink> {
  const dbInput = transformKeysToSnake(input);

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(dbInput)
    .eq('id', linkId)
    .select()
    .single();

  if (error) throw error;

  return transformKeysFromDb(data);
}

export async function deletePersonalLink(linkId: string): Promise<void> {
  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', linkId);

  if (error) throw error;
}

export async function getPersonalLinksForProject(
  masterProjectId: string,
  activeOnly: boolean = true
): Promise<PersonalLink[]> {
  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('master_project_id', masterProjectId);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(transformKeysFromDb);
}

export async function getPersonalLinksForUser(
  userId: string,
  activeOnly: boolean = true
): Promise<PersonalLink[]> {
  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(transformKeysFromDb);
}

export async function getPersonalLinksForSource(
  sourceType: GuardrailsSourceType,
  sourceId: string,
  activeOnly: boolean = true
): Promise<PersonalLink[]> {
  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('source_type', sourceType)
    .eq('source_id', sourceId);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(transformKeysFromDb);
}

export async function getPersonalLinksForSpace(
  targetSpaceType: PersonalSpaceType,
  userId: string,
  activeOnly: boolean = true
): Promise<PersonalLink[]> {
  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('target_space_type', targetSpaceType)
    .eq('user_id', userId);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(transformKeysFromDb);
}

export async function isLinked(
  sourceType: GuardrailsSourceType,
  sourceId: string,
  targetSpaceType: PersonalSpaceType,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id')
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .eq('target_space_type', targetSpaceType)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;

  return !!data;
}

export async function getPersonalLink(linkId: string): Promise<PersonalLink | null> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', linkId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return transformKeysFromDb(data);
}

export interface PersonalLinkStats {
  totalLinks: number;
  activeLinks: number;
  revokedLinks: number;
  linksBySpace: Record<PersonalSpaceType, number>;
  linksBySourceType: Record<GuardrailsSourceType, number>;
}

export async function getPersonalLinkStatsForProject(
  masterProjectId: string
): Promise<PersonalLinkStats> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('master_project_id', masterProjectId);

  if (error) throw error;

  const stats: PersonalLinkStats = {
    totalLinks: data.length,
    activeLinks: 0,
    revokedLinks: 0,
    linksBySpace: {
      calendar: 0,
      tasks: 0,
      habits: 0,
      notes: 0,
      goals: 0,
    },
    linksBySourceType: {
      track: 0,
      roadmap_item: 0,
    },
  };

  data.forEach((link) => {
    if (link.is_active) {
      stats.activeLinks++;
    } else {
      stats.revokedLinks++;
    }

    stats.linksBySpace[link.target_space_type as PersonalSpaceType]++;
    stats.linksBySourceType[link.source_type as GuardrailsSourceType]++;
  });

  return stats;
}

export async function getPersonalLinkStatsForUser(
  userId: string
): Promise<PersonalLinkStats> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;

  const stats: PersonalLinkStats = {
    totalLinks: data.length,
    activeLinks: 0,
    revokedLinks: 0,
    linksBySpace: {
      calendar: 0,
      tasks: 0,
      habits: 0,
      notes: 0,
      goals: 0,
    },
    linksBySourceType: {
      track: 0,
      roadmap_item: 0,
    },
  };

  data.forEach((link) => {
    if (link.is_active) {
      stats.activeLinks++;
    } else {
      stats.revokedLinks++;
    }

    stats.linksBySpace[link.target_space_type as PersonalSpaceType]++;
    stats.linksBySourceType[link.source_type as GuardrailsSourceType]++;
  });

  return stats;
}

export function getEligibleSpacesForRoadmapItem(
  itemType: RoadmapItemType
): PersonalSpaceType[] {
  const eligibility = ROADMAP_ITEM_PERSONAL_SPACE_ELIGIBILITY[itemType];
  return Object.entries(eligibility)
    .filter(([_, eligible]) => eligible)
    .map(([space]) => space as PersonalSpaceType);
}

export function getEligibleSpacesForTrack(): PersonalSpaceType[] {
  const eligibility = TRACK_PERSONAL_SPACE_ELIGIBILITY;
  return Object.entries(eligibility)
    .filter(([_, eligible]) => eligible)
    .map(([space]) => space as PersonalSpaceType);
}

export interface PersonalLinkMetadata {
  linkedToPersonalSpace: boolean;
  linkedSpaces: PersonalSpaceType[];
  activeLinkCount: number;
}

export async function getPersonalLinkMetadataForSource(
  sourceType: GuardrailsSourceType,
  sourceId: string
): Promise<PersonalLinkMetadata> {
  const links = await getPersonalLinksForSource(sourceType, sourceId, true);

  const linkedSpaces = Array.from(
    new Set(links.map((link) => link.targetSpaceType))
  );

  return {
    linkedToPersonalSpace: links.length > 0,
    linkedSpaces,
    activeLinkCount: links.length,
  };
}

export async function enrichWithPersonalLinkMetadata<T extends { id: string }>(
  items: T[],
  sourceType: GuardrailsSourceType
): Promise<Array<T & { personalLinkMetadata: PersonalLinkMetadata }>> {
  const enriched = await Promise.all(
    items.map(async (item) => {
      const metadata = await getPersonalLinkMetadataForSource(sourceType, item.id);
      return {
        ...item,
        personalLinkMetadata: metadata,
      };
    })
  );

  return enriched;
}
