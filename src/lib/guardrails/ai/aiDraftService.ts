import { supabase } from '../../supabase';
import type {
  AIDraft,
  CreateDraftInput,
  UpdateDraftInput,
  AcceptDraftInput,
  GetUserDraftsOptions,
  AIDraftStatus,
  AIDraftType,
} from './aiTypes';

function transformDraftFromDb(row: any): AIDraft {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    draftType: row.draft_type,
    status: row.status,
    title: row.title,
    content: row.content,
    provenanceMetadata: row.provenance_metadata,
    contextScope: row.context_scope,
    appliedToEntityId: row.applied_to_entity_id,
    appliedToEntityType: row.applied_to_entity_type,
    appliedAt: row.applied_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    discardedAt: row.discarded_at,
  };
}

export async function createDraft(
  input: CreateDraftInput
): Promise<{ success: boolean; error?: string; draft?: AIDraft }> {
  const {
    userId,
    projectId,
    draftType,
    title,
    content,
    provenanceMetadata,
    contextScope,
  } = input;

  const { data, error } = await supabase
    .from('ai_drafts')
    .insert({
      user_id: userId,
      project_id: projectId || null,
      draft_type: draftType,
      title,
      content,
      provenance_metadata: provenanceMetadata,
      context_scope: contextScope,
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      error: error?.message || 'Failed to create AI draft',
    };
  }

  return {
    success: true,
    draft: transformDraftFromDb(data),
  };
}

export async function updateDraft(
  input: UpdateDraftInput
): Promise<{ success: boolean; error?: string; draft?: AIDraft }> {
  const { draftId, title, content, status } = input;

  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  if (status !== undefined) updates.status = status;

  const { data, error } = await supabase
    .from('ai_drafts')
    .update(updates)
    .eq('id', draftId)
    .select()
    .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      error: error?.message || 'Failed to update AI draft',
    };
  }

  return {
    success: true,
    draft: transformDraftFromDb(data),
  };
}

export async function acceptDraft(
  input: AcceptDraftInput
): Promise<{ success: boolean; error?: string; draft?: AIDraft }> {
  const { draftId, appliedToEntityId, appliedToEntityType } = input;

  const { data, error } = await supabase
    .from('ai_drafts')
    .update({
      status: 'accepted',
      applied_to_entity_id: appliedToEntityId,
      applied_to_entity_type: appliedToEntityType,
      applied_at: new Date().toISOString(),
    })
    .eq('id', draftId)
    .select()
    .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      error: error?.message || 'Failed to accept AI draft',
    };
  }

  return {
    success: true,
    draft: transformDraftFromDb(data),
  };
}

export async function discardDraft(
  draftId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('ai_drafts')
    .update({
      status: 'discarded',
      discarded_at: new Date().toISOString(),
    })
    .eq('id', draftId);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}

export async function deleteDraft(
  draftId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('ai_drafts')
    .delete()
    .eq('id', draftId);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}

export async function getDraftById(
  draftId: string
): Promise<AIDraft | null> {
  const { data, error } = await supabase
    .from('ai_drafts')
    .select('*')
    .eq('id', draftId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return transformDraftFromDb(data);
}

export async function getUserDrafts(
  options: GetUserDraftsOptions
): Promise<AIDraft[]> {
  const { userId, projectId, status, draftType, limit = 50 } = options;

  let query = supabase
    .from('ai_drafts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (draftType) {
    query = query.eq('draft_type', draftType);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data.map(transformDraftFromDb);
}

export async function getProjectDrafts(
  projectId: string,
  limit: number = 50
): Promise<AIDraft[]> {
  const { data, error } = await supabase
    .from('ai_drafts')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map(transformDraftFromDb);
}

export async function getUserRecentDrafts(
  userId: string,
  projectId?: string,
  limit: number = 20
): Promise<Array<{
  id: string;
  draftType: AIDraftType;
  status: AIDraftStatus;
  title: string;
  createdAt: string;
  updatedAt: string;
}>> {
  const { data, error } = await supabase.rpc('get_user_recent_ai_drafts', {
    input_user_id: userId,
    input_project_id: projectId || null,
    limit_count: limit,
  });

  if (error || !data) {
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    draftType: row.draft_type,
    status: row.status,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getDraftsByStatus(
  userId: string,
  status: AIDraftStatus,
  limit: number = 50
): Promise<AIDraft[]> {
  return getUserDrafts({
    userId,
    status,
    limit,
  });
}

export async function getDraftsByType(
  userId: string,
  draftType: AIDraftType,
  projectId?: string,
  limit: number = 50
): Promise<AIDraft[]> {
  return getUserDrafts({
    userId,
    projectId,
    draftType,
    limit,
  });
}

export async function getAcceptedDrafts(
  userId: string,
  projectId?: string,
  limit: number = 50
): Promise<AIDraft[]> {
  return getUserDrafts({
    userId,
    projectId,
    status: 'accepted',
    limit,
  });
}

export async function getPendingDrafts(
  userId: string,
  projectId?: string,
  limit: number = 50
): Promise<AIDraft[]> {
  return getUserDrafts({
    userId,
    projectId,
    status: 'generated',
    limit,
  });
}

export async function getDraftProvenanceDetails(
  draftId: string
): Promise<{
  draft: AIDraft | null;
  sourceEntities: Array<{ entityType: string; entityId: string; data: any }>;
}> {
  const draft = await getDraftById(draftId);

  if (!draft) {
    return { draft: null, sourceEntities: [] };
  }

  const sourceEntityIds = draft.provenanceMetadata.sourceEntityIds || [];
  const sourceEntityTypes = draft.provenanceMetadata.sourceEntityTypes || [];

  const sourceEntities: Array<{ entityType: string; entityId: string; data: any }> = [];

  for (let i = 0; i < sourceEntityIds.length; i++) {
    const entityId = sourceEntityIds[i];
    const entityType = sourceEntityTypes[i];

    let data = null;

    if (entityType === 'roadmap_item') {
      const { data: itemData } = await supabase
        .from('roadmap_items')
        .select('id, title, status, deadline')
        .eq('id', entityId)
        .maybeSingle();
      data = itemData;
    } else if (entityType === 'track') {
      const { data: trackData } = await supabase
        .from('guardrails_tracks')
        .select('id, name, description')
        .eq('id', entityId)
        .maybeSingle();
      data = trackData;
    }

    if (data) {
      sourceEntities.push({ entityType, entityId, data });
    }
  }

  return { draft, sourceEntities };
}

export async function markDraftAsPartiallyApplied(
  draftId: string,
  appliedEntities: Array<{ entityId: string; entityType: string }>
): Promise<{ success: boolean; error?: string }> {
  const draft = await getDraftById(draftId);

  if (!draft) {
    return { success: false, error: 'Draft not found' };
  }

  const updatedContent = {
    ...draft.content,
    partiallyAppliedTo: appliedEntities,
  };

  const { error } = await supabase
    .from('ai_drafts')
    .update({
      status: 'partially_applied',
      content: updatedContent,
    })
    .eq('id', draftId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export const DRAFT_LIFECYCLE_STATES = {
  GENERATED: 'Draft created by AI, awaiting user review',
  EDITED: 'User has modified the draft',
  ACCEPTED: 'User accepted and applied the draft',
  DISCARDED: 'User rejected the draft',
  PARTIALLY_APPLIED: 'User applied some but not all suggestions',
};

export const DRAFT_BEST_PRACTICES = {
  ALWAYS_SHOW_PROVENANCE: 'Always show users which entities were used to generate the draft',
  ENABLE_EDITING: 'Let users edit drafts before accepting',
  EXPLICIT_ACCEPTANCE: 'Require explicit user action to accept/apply',
  PRESERVE_HISTORY: 'Keep accepted drafts for audit trail',
  CLEAR_REJECTION: 'Make it easy to discard unwanted drafts',
};
