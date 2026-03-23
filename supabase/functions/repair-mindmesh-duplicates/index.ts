/**
 * ONE-TIME REPAIR SCRIPT: Mind Mesh Duplicate Container Cleanup
 *
 * PURPOSE:
 * Clean up existing duplicate Mind Mesh containers and orphaned containers
 * caused by earlier ghost materialisation bugs.
 *
 * USAGE:
 * 1. Deploy this function once
 * 2. Call with POST request and { dryRun: true } to preview changes
 * 3. Call with POST request and { dryRun: false } to execute cleanup
 * 4. Delete this function after cleanup is complete
 *
 * CRITICAL:
 * - This is NOT part of runtime logic
 * - Must be run manually by developer
 * - Supports dry-run mode for safety
 * - Uses soft-delete strategy (sets archived_at)
 *
 * STRATEGY:
 * - Detects duplicate groups via mindmesh_container_references
 * - Keeps oldest container (by created_at ASC)
 * - Soft-deletes all other containers in group
 * - Deletes orphaned references
 * - Detects orphaned containers (no references) and deletes them
 * - Logs all actions
 *
 * EXAMPLE REQUEST:
 * POST /functions/v1/repair-mindmesh-duplicates
 * {
 *   "dryRun": true,
 *   "workspaceId": "optional-specific-workspace"
 * }
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// ============================================================================
// TYPES
// ============================================================================

interface DuplicateGroup {
  entityType: string;
  entityId: string;
  references: Array<{
    id: string;
    container_id: string;
    workspace_id: string;
    is_primary: boolean;
    created_at: string;
  }>;
}

interface ContainerInfo {
  id: string;
  workspace_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_ghost: boolean;
  metadata: any;
}

interface CleanupAction {
  entityType: string;
  entityId: string;
  workspaceId: string;
  keptContainerId: string;
  keptContainerCreatedAt: string;
  removedContainerIds: string[];
  removedReferenceIds: string[];
}

interface RepairResult {
  success: boolean;
  dryRun: boolean;
  totalDuplicateGroups: number;
  totalContainersRemoved: number;
  totalReferencesRemoved: number;
  totalOrphanedContainers: number;
  actions: CleanupAction[];
  orphanedContainerIds: string[];
  errors: string[];
}

// ============================================================================
// DUPLICATE DETECTION
// ============================================================================

/**
 * Detects duplicate container groups from references table.
 *
 * Groups references by (entity_type, entity_id) and identifies
 * groups with more than one container.
 *
 * @param supabase - Supabase client
 * @param workspaceId - Optional workspace filter
 * @returns Duplicate groups
 */
async function detectDuplicates(
  supabase: any,
  workspaceId?: string
): Promise<DuplicateGroup[]> {
  console.log('[Repair] Detecting duplicate groups...');

  // Fetch all references (optionally filtered by workspace)
  let query = supabase
    .from('mindmesh_container_references')
    .select('*')
    .order('created_at', { ascending: true });

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data: references, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch references: ${error.message}`);
  }

  if (!references || references.length === 0) {
    console.log('[Repair] No references found');
    return [];
  }

  console.log(`[Repair] Found ${references.length} total references`);

  // Group by entity
  const groups = new Map<string, DuplicateGroup>();

  for (const ref of references) {
    const key = `${ref.entity_type}:${ref.entity_id}`;

    if (!groups.has(key)) {
      groups.set(key, {
        entityType: ref.entity_type,
        entityId: ref.entity_id,
        references: [],
      });
    }

    groups.get(key)!.references.push(ref);
  }

  // Filter to only duplicate groups (more than 1 container)
  const duplicates: DuplicateGroup[] = [];

  for (const group of groups.values()) {
    if (group.references.length > 1) {
      duplicates.push(group);
    }
  }

  console.log(`[Repair] Found ${duplicates.length} duplicate groups`);

  return duplicates;
}

/**
 * Detects orphaned containers (containers without references).
 *
 * Orphaned containers can occur when:
 * - Race conditions during ghost materialization
 * - Container created but reference insert failed
 * - Manual container creation without references (bugs)
 *
 * @param supabase - Supabase client
 * @param workspaceId - Optional workspace filter
 * @returns Orphaned container IDs
 */
async function detectOrphanedContainers(
  supabase: any,
  workspaceId?: string
): Promise<string[]> {
  console.log('[Repair] Detecting orphaned containers...');

  // Find containers without references (LEFT JOIN where ref.id IS NULL)
  let query = supabase
    .from('mindmesh_containers')
    .select('id, workspace_id, title, is_ghost, created_at');

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data: containers, error: containersError } = await query;

  if (containersError) {
    throw new Error(`Failed to fetch containers: ${containersError.message}`);
  }

  if (!containers || containers.length === 0) {
    console.log('[Repair] No containers found');
    return [];
  }

  console.log(`[Repair] Found ${containers.length} total containers`);

  // Fetch all references
  let refQuery = supabase
    .from('mindmesh_container_references')
    .select('container_id');

  if (workspaceId) {
    refQuery = refQuery.eq('workspace_id', workspaceId);
  }

  const { data: references, error: referencesError } = await refQuery;

  if (referencesError) {
    throw new Error(`Failed to fetch references: ${referencesError.message}`);
  }

  const referencedContainerIds = new Set(
    (references || []).map((r: any) => r.container_id)
  );

  // Find containers without references
  const orphanedContainers = containers.filter(
    (c: any) => !referencedContainerIds.has(c.id) && !c.is_ghost
  );

  console.log(`[Repair] Found ${orphanedContainers.length} orphaned containers (non-ghost, no references)`);

  for (const container of orphanedContainers) {
    console.log(`[Repair]   - Orphaned: ${container.id} | ${container.title} | created: ${container.created_at}`);
  }

  return orphanedContainers.map((c: any) => c.id);
}

/**
 * Cleans up orphaned containers.
 *
 * @param supabase - Supabase client
 * @param orphanedIds - Container IDs to remove
 * @param dryRun - If true, only log actions
 */
async function cleanupOrphanedContainers(
  supabase: any,
  orphanedIds: string[],
  dryRun: boolean
): Promise<void> {
  if (orphanedIds.length === 0) {
    return;
  }

  console.log(`[Repair] Cleaning up ${orphanedIds.length} orphaned containers`);

  if (!dryRun) {
    const { error } = await supabase
      .from('mindmesh_containers')
      .update({ archived_at: new Date().toISOString() })
      .in('id', orphanedIds);

    if (error) {
      throw new Error(`Failed to archive orphaned containers: ${error.message}`);
    }

    console.log(`[Repair] Successfully archived ${orphanedIds.length} orphaned containers`);
  }
}

// ============================================================================
// CANONICAL SELECTION
// ============================================================================

/**
 * Chooses canonical container for duplicate group.
 *
 * Strategy: Keep oldest container by created_at (deterministic).
 *
 * @param supabase - Supabase client
 * @param group - Duplicate group
 * @returns Container info for all containers, sorted by created_at ASC
 */
async function fetchContainerInfo(
  supabase: any,
  group: DuplicateGroup
): Promise<ContainerInfo[]> {
  const containerIds = group.references.map((r) => r.container_id);

  const { data: containers, error } = await supabase
    .from('mindmesh_containers')
    .select('*')
    .in('id', containerIds)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch containers: ${error.message}`);
  }

  if (!containers || containers.length === 0) {
    throw new Error(`No containers found for IDs: ${containerIds.join(', ')}`);
  }

  return containers.map((c: any) => ({
    id: c.id,
    workspace_id: c.workspace_id,
    title: c.title || '',
    created_at: c.created_at,
    updated_at: c.updated_at,
    is_ghost: c.is_ghost ?? false,
    metadata: c.metadata || {},
  }));
}

// ============================================================================
// CLEANUP LOGIC
// ============================================================================

/**
 * Cleans up duplicate containers for a single group.
 *
 * Strategy:
 * 1. Sort containers by created_at ASC
 * 2. Keep first (oldest) container
 * 3. Soft-delete all other containers (set archived_at = now())
 * 4. Delete orphaned references
 *
 * @param supabase - Supabase client
 * @param group - Duplicate group
 * @param dryRun - If true, only log actions
 * @returns Cleanup action result
 */
async function cleanupDuplicateGroup(
  supabase: any,
  group: DuplicateGroup,
  dryRun: boolean
): Promise<CleanupAction> {
  console.log(`[Repair] Processing group: ${group.entityType}:${group.entityId}`);

  // Fetch container info, sorted by created_at ASC
  const containers = await fetchContainerInfo(supabase, group);

  if (containers.length === 0) {
    throw new Error(`No containers found for group ${group.entityType}:${group.entityId}`);
  }

  // First container is canonical (oldest)
  const canonical = containers[0];
  const duplicates = containers.slice(1);

  console.log(`[Repair]   Canonical: ${canonical.id} (created: ${canonical.created_at})`);
  console.log(`[Repair]   Duplicates: ${duplicates.length}`);

  const removedContainerIds: string[] = [];
  const removedReferenceIds: string[] = [];

  // Soft-delete duplicate containers
  for (const dup of duplicates) {
    console.log(`[Repair]   - Removing container: ${dup.id} (created: ${dup.created_at})`);

    if (!dryRun) {
      const { error: updateError } = await supabase
        .from('mindmesh_containers')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', dup.id);

      if (updateError) {
        throw new Error(`Failed to soft-delete container ${dup.id}: ${updateError.message}`);
      }
    }

    removedContainerIds.push(dup.id);
  }

  // Delete references for duplicate containers
  const duplicateContainerIds = duplicates.map((d) => d.id);
  const referencesToDelete = group.references.filter((r) =>
    duplicateContainerIds.includes(r.container_id)
  );

  for (const ref of referencesToDelete) {
    console.log(`[Repair]   - Removing reference: ${ref.id}`);

    if (!dryRun) {
      const { error: deleteError } = await supabase
        .from('mindmesh_container_references')
        .delete()
        .eq('id', ref.id);

      if (deleteError) {
        throw new Error(`Failed to delete reference ${ref.id}: ${deleteError.message}`);
      }
    }

    removedReferenceIds.push(ref.id);
  }

  return {
    entityType: group.entityType,
    entityId: group.entityId,
    workspaceId: canonical.workspace_id,
    keptContainerId: canonical.id,
    keptContainerCreatedAt: canonical.created_at,
    removedContainerIds,
    removedReferenceIds,
  };
}

// ============================================================================
// MAIN REPAIR FUNCTION
// ============================================================================

/**
 * Runs the repair process.
 *
 * @param supabase - Supabase client
 * @param dryRun - If true, only log actions without executing
 * @param workspaceId - Optional workspace filter
 * @returns Repair result
 */
async function runRepair(
  supabase: any,
  dryRun: boolean,
  workspaceId?: string
): Promise<RepairResult> {
  console.log('[Repair] ========================================');
  console.log('[Repair] Mind Mesh Duplicate Repair Script');
  console.log('[Repair] ========================================');
  console.log(`[Repair] Mode: ${dryRun ? 'DRY RUN (no changes)' : 'EXECUTE (will modify data)'}`);
  console.log(`[Repair] Workspace filter: ${workspaceId || 'ALL'}`);
  console.log('[Repair] ----------------------------------------');

  const actions: CleanupAction[] = [];
  const errors: string[] = [];

  try {
    // Step 1: Detect duplicate groups
    const duplicates = await detectDuplicates(supabase, workspaceId);

    // Step 2: Detect orphaned containers
    const orphanedIds = await detectOrphanedContainers(supabase, workspaceId);

    if (duplicates.length === 0 && orphanedIds.length === 0) {
      console.log('[Repair] No duplicates or orphaned containers found. Database is clean!');
      return {
        success: true,
        dryRun,
        totalDuplicateGroups: 0,
        totalContainersRemoved: 0,
        totalReferencesRemoved: 0,
        totalOrphanedContainers: 0,
        actions: [],
        orphanedContainerIds: [],
        errors: [],
      };
    }

    // Step 3: Process each duplicate group
    for (const group of duplicates) {
      try {
        const action = await cleanupDuplicateGroup(supabase, group, dryRun);
        actions.push(action);
      } catch (err) {
        const errorMsg = `Failed to process group ${group.entityType}:${group.entityId}: ${err instanceof Error ? err.message : String(err)}`;
        console.error(`[Repair] ERROR: ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Step 4: Cleanup orphaned containers
    try {
      await cleanupOrphanedContainers(supabase, orphanedIds, dryRun);
    } catch (err) {
      const errorMsg = `Failed to cleanup orphaned containers: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[Repair] ERROR: ${errorMsg}`);
      errors.push(errorMsg);
    }

    // Step 5: Calculate totals
    const totalContainersRemoved = actions.reduce(
      (sum, a) => sum + a.removedContainerIds.length,
      0
    );
    const totalReferencesRemoved = actions.reduce(
      (sum, a) => sum + a.removedReferenceIds.length,
      0
    );

    console.log('[Repair] ----------------------------------------');
    console.log('[Repair] Summary:');
    console.log(`[Repair]   Duplicate groups found: ${duplicates.length}`);
    console.log(`[Repair]   Groups processed: ${actions.length}`);
    console.log(`[Repair]   Containers removed (duplicates): ${totalContainersRemoved}`);
    console.log(`[Repair]   References removed: ${totalReferencesRemoved}`);
    console.log(`[Repair]   Orphaned containers removed: ${orphanedIds.length}`);
    console.log(`[Repair]   Total containers removed: ${totalContainersRemoved + orphanedIds.length}`);
    console.log(`[Repair]   Errors: ${errors.length}`);
    console.log('[Repair] ========================================');

    return {
      success: errors.length === 0,
      dryRun,
      totalDuplicateGroups: duplicates.length,
      totalContainersRemoved,
      totalReferencesRemoved,
      totalOrphanedContainers: orphanedIds.length,
      actions,
      orphanedContainerIds: orphanedIds,
      errors,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Repair] FATAL ERROR: ${errorMsg}`);
    errors.push(errorMsg);

    return {
      success: false,
      dryRun,
      totalDuplicateGroups: 0,
      totalContainersRemoved: 0,
      totalReferencesRemoved: 0,
      totalOrphanedContainers: 0,
      actions,
      orphanedContainerIds: [],
      errors,
    };
  }
}

// ============================================================================
// EDGE FUNCTION HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    // Create service role client for database operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create user client to verify authentication
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const dryRun = body.dryRun ?? true; // Default to dry-run for safety
    const workspaceId = body.workspaceId || undefined;

    // Run repair
    const result = await runRepair(supabase, dryRun, workspaceId);

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Repair] Unhandled error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
