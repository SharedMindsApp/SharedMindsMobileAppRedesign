import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// ============================================================================
// UTILITY: Array chunking for batched queries
// ============================================================================

/**
 * Splits an array into chunks of specified size.
 *
 * @param array - Array to chunk
 * @param size - Maximum chunk size
 * @returns Array of chunks
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// ============================================================================
// CONTAINER CAPABILITIES: Port support detection
// ============================================================================

/**
 * Container types that support ports (connections to other containers).
 *
 * Only task and event types have ports. Tracks, subtracks, notes, and ideas
 * use hierarchical containment instead of port-based connections.
 */
const CONTAINER_TYPES_WITH_PORTS = new Set(['task', 'event', 'roadmap_item']);

/**
 * Checks if a container can have ports based on its entity type.
 *
 * @param entityType - Entity type from container metadata
 * @returns True if this container type supports ports
 */
function canContainerHavePorts(entityType: string): boolean {
  return CONTAINER_TYPES_WITH_PORTS.has(entityType);
}

// ============================================================================
// RECONCILIATION: Ensure one-to-one mapping between entities and containers
// ============================================================================

interface ReconciliationMap {
  entityToContainer: Map<string, string>;
  duplicates: Array<{
    entityType: string;
    entityId: string;
    containerIds: string[];
  }>;
}

/**
 * Builds reconciliation map from container references.
 * CRITICAL: This is the authoritative source for entity-to-container mappings.
 *
 * Detects duplicates (multiple containers for same entity) and fails loudly.
 *
 * @param references - All container references in workspace
 * @returns Reconciliation map with duplicate detection
 */
function buildReconciliationMap(references: any[]): ReconciliationMap {
  const entityToContainer = new Map<string, string>();
  const entityToContainers = new Map<string, string[]>();
  const duplicates: ReconciliationMap['duplicates'] = [];

  // Group containers by entity
  for (const ref of references) {
    const key = `${ref.entity_type}:${ref.entity_id}`;

    if (!entityToContainers.has(key)) {
      entityToContainers.set(key, []);
    }

    entityToContainers.get(key)!.push(ref.container_id);
  }

  // Build map and detect duplicates
  for (const [key, containerIds] of entityToContainers.entries()) {
    if (containerIds.length > 1) {
      // DUPLICATE DETECTED - Data integrity violation
      const [entityType, entityId] = key.split(':');
      duplicates.push({
        entityType,
        entityId,
        containerIds,
      });
      console.error(
        `[Reconciliation] CRITICAL: Duplicate containers for ${entityType}:${entityId}`,
        containerIds
      );
    } else {
      // One-to-one mapping (correct state)
      entityToContainer.set(key, containerIds[0]);
    }
  }

  return {
    entityToContainer,
    duplicates,
  };
}

/**
 * Checks if container exists for entity using reconciliation map.
 *
 * @param map - Reconciliation map
 * @param entityType - Entity type
 * @param entityId - Entity ID
 * @returns True if container exists for this entity
 */
function containerExistsForEntity(
  map: ReconciliationMap,
  entityType: string,
  entityId: string
): boolean {
  const key = `${entityType}:${entityId}`;
  return map.entityToContainer.has(key);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'GET') {
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

    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('workspaceId');

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: 'Missing workspaceId parameter' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: workspace, error: workspaceError } = await supabase
      .from('mindmesh_workspaces')
      .select('*')
      .eq('id', workspaceId)
      .maybeSingle();

    if (workspaceError) {
      throw workspaceError;
    }

    if (!workspace) {
      return new Response(
        JSON.stringify({ error: 'Workspace not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from('master_projects')
      .select('user_id')
      .eq('id', workspace.master_project_id)
      .maybeSingle();

    if (projectError || !project || project.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: containersRaw, error: containersError } = await supabase
      .from('mindmesh_containers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (containersError) {
      throw containersError;
    }

    const containers = (containersRaw || []).map((c: any) => ({
      id: c.id,
      workspace_id: c.workspace_id,
      entity_id: c.metadata?.entity_id || '',
      entity_type: c.metadata?.entity_type || 'side_project',
      state: c.is_ghost ? 'ghost' : 'active',
      x: parseFloat(c.x_position),
      y: parseFloat(c.y_position),
      width: parseFloat(c.width),
      height: parseFloat(c.height),
      spawn_strategy: 'manual',
      layout_broken: false,
      user_positioned: true,
      last_interaction_at: c.updated_at,
      created_at: c.created_at,
      updated_at: c.updated_at,
      title: c.title || '',
      body: c.body || '',
    }));

    const { data: nodes, error: nodesError } = await supabase
      .from('mindmesh_nodes')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (nodesError) {
      throw nodesError;
    }

    // ========================================================================
    // STEP: Fetch ALL ports for ALL containers (manual connections can exist on any container)
    // ========================================================================

    console.log('[MindMesh Ports] Fetching ports for', containers.length, 'container(s)');

    let ports: any[] = [];

    // Fetch ports for ALL containers, not just those with "port capability"
    // Reason: Manual connections can be created on any container type
    if (containers.length === 0) {
      console.log('[MindMesh Ports] No containers, skipping port query');
    } else {
      const containerIds = containers.map((c: any) => c.id);

      // Chunk container IDs to avoid oversized IN (...) queries
      // PostgREST has protocol limits - max 50 IDs per query is safe
      const PORTS_QUERY_CHUNK_SIZE = 50;
      const chunks = chunkArray(containerIds, PORTS_QUERY_CHUNK_SIZE);

      console.log(
        '[MindMesh Ports] Querying',
        containerIds.length,
        'container IDs in',
        chunks.length,
        'batch(es) of max',
        PORTS_QUERY_CHUNK_SIZE
      );

      // Execute batched queries
      try {
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          console.log(`[MindMesh Ports] Fetching batch ${i + 1}/${chunks.length} (${chunk.length} IDs)`);

          const { data: batchPorts, error: batchError } = await supabase
            .from('mindmesh_ports')
            .select('*')
            .in('container_id', chunk);

          if (batchError) {
            console.error(`[MindMesh Ports] Batch ${i + 1} failed:`, batchError);
            throw new Error(
              `Port query failed for batch ${i + 1}/${chunks.length}: ${batchError.message}`
            );
          }

          if (batchPorts) {
            ports.push(...batchPorts);
          }
        }

        console.log('[MindMesh Ports] Successfully fetched', ports.length, 'port(s)');
      } catch (error) {
        console.error('[MindMesh Ports] Port query failed:', error);
        return new Response(
          JSON.stringify({
            error: 'port_query_failed',
            details: {
              message: error.message,
              batchSize: PORTS_QUERY_CHUNK_SIZE,
              totalContainers: containerIds.length,
              totalBatches: chunks.length,
            },
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // CRITICAL: Fetch ALL references for the workspace (not just for existing containers)
    // This is the authoritative source for entity-to-container mappings
    // Note: mindmesh_container_references doesn't have workspace_id, so we query by container_id
    const containerIds = containers.map((c: any) => c.id);

    let references: any[] = [];

    if (containerIds.length === 0) {
      console.log('[MindMesh References] No containers, skipping references query');
    } else {
      // Use same chunking approach for references query
      const REFERENCES_QUERY_CHUNK_SIZE = 50;
      const refChunks = chunkArray(containerIds, REFERENCES_QUERY_CHUNK_SIZE);

      console.log(
        '[MindMesh References] Querying',
        containerIds.length,
        'container IDs in',
        refChunks.length,
        'batch(es) of max',
        REFERENCES_QUERY_CHUNK_SIZE
      );

      try {
        for (let i = 0; i < refChunks.length; i++) {
          const chunk = refChunks[i];

          const { data: batchReferences, error: batchError } = await supabase
            .from('mindmesh_container_references')
            .select('*')
            .in('container_id', chunk);

          if (batchError) {
            console.error(`[MindMesh References] Batch ${i + 1} failed:`, batchError);
            throw batchError;
          }

          if (batchReferences) {
            references.push(...batchReferences);
          }
        }

        console.log('[MindMesh References] Successfully fetched', references.length, 'reference(s)');
      } catch (error) {
        console.error('[MindMesh References] References query failed:', error);
        throw error;
      }
    }

    // ========================================================================
    // STEP 1: RECONCILIATION (Authoritative identity check)
    // ========================================================================

    // Build reconciliation map from references (source of truth)
    const reconciliationMap = buildReconciliationMap(references);

    // CRITICAL: Check for duplicates and FAIL LOUDLY if found
    if (reconciliationMap.duplicates.length > 0) {
      const errorDetails = reconciliationMap.duplicates.map((dup: any) => ({
        entityType: dup.entityType,
        entityId: dup.entityId,
        containerCount: dup.containerIds.length,
        containerIds: dup.containerIds,
      }));

      console.error('[MindMesh Graph] DATA INTEGRITY VIOLATION');
      console.error('[MindMesh Graph] Duplicate containers detected:', errorDetails);

      return new Response(
        JSON.stringify({
          error: 'Mind Mesh data integrity issue: Duplicate containers detected',
          details: {
            message: 'Multiple containers exist for the same Guardrails entity',
            duplicateCount: reconciliationMap.duplicates.length,
            duplicates: errorDetails,
            workspaceId,
          },
          recoveryInstructions: 'Manual database cleanup required. Contact system administrator.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[MindMesh Reconciliation] ✓ No duplicates detected');
    console.log('[MindMesh Reconciliation]', reconciliationMap.entityToContainer.size, 'unique entity-to-container mappings');

    // ========================================================================
    // STEP 2: GHOST MATERIALIZATION (Idempotent, reconciliation-based)
    // ========================================================================

    // Auto-materialize missing Guardrails Tracks/Subtracks
    const projectId = workspace.master_project_id;

    // Fetch all tracks (both top-level and subtracks) for this project
    const { data: allTracks, error: tracksError } = await supabase
      .from('guardrails_tracks')
      .select('id, name, description, parent_track_id, ordering_index')
      .eq('master_project_id', projectId)
      .order('ordering_index', { ascending: true });

    if (tracksError) {
      console.error('[MindMesh Auto-materialize] Failed to fetch tracks:', tracksError);
    }

    if (allTracks && allTracks.length > 0) {
      // Auto-create ghost containers for missing tracks/subtracks
      // CRITICAL: Use reconciliation map to check existence (not metadata!)
      const ghostsToCreate = [];
      let yPosition = 100;
      let xPosition = 100;
      const TRACK_SPACING_Y = 600;
      const TRACK_SPACING_X = 400;
      const SUBTRACK_OFFSET_X = 50;
      const SUBTRACK_OFFSET_Y = 300;

      // Group tracks by parent
      const topLevelTracks = allTracks.filter((t: any) => !t.parent_track_id);
      const subtracksMap = new Map<string, any[]>();
      allTracks.filter((t: any) => t.parent_track_id).forEach((st: any) => {
        if (!subtracksMap.has(st.parent_track_id)) {
          subtracksMap.set(st.parent_track_id, []);
        }
        subtracksMap.get(st.parent_track_id)!.push(st);
      });

      // Create ghosts for top-level tracks (reconciliation-based)
      for (const track of topLevelTracks) {
        // Check using reconciliation map (authoritative source)
        if (!containerExistsForEntity(reconciliationMap, 'track', track.id)) {
          ghostsToCreate.push({
            workspace_id: workspaceId,
            title: track.name,
            body: track.description || null,
            x_position: xPosition,
            y_position: yPosition,
            width: 300,
            height: 200,
            is_ghost: true,
            metadata: { entity_id: track.id, entity_type: 'track' },
          });

          // Create ghosts for subtracks of this track (reconciliation-based)
          const subtracks = subtracksMap.get(track.id) || [];
          let subtrackY = yPosition + SUBTRACK_OFFSET_Y;
          for (const subtrack of subtracks) {
            // Check using reconciliation map (authoritative source)
            if (!containerExistsForEntity(reconciliationMap, 'track', subtrack.id)) {
              ghostsToCreate.push({
                workspace_id: workspaceId,
                title: subtrack.name,
                body: subtrack.description || null,
                x_position: xPosition + SUBTRACK_OFFSET_X,
                y_position: subtrackY,
                width: 300,
                height: 200,
                is_ghost: true,
                metadata: { entity_id: subtrack.id, entity_type: 'track' },
              });
              subtrackY += SUBTRACK_OFFSET_Y;
            }
          }

          xPosition += TRACK_SPACING_X;
          if (xPosition > 1200) {
            xPosition = 100;
            yPosition += TRACK_SPACING_Y * 2;
          }
        }
      }

      // Insert ghost containers if any need to be created
      // CRITICAL: Use idempotent insert with ON CONFLICT to handle race conditions
      if (ghostsToCreate.length > 0) {
        console.log('[MindMesh Auto-materialize] Attempting to create', ghostsToCreate.length, 'ghost containers');

        const { data: newContainers, error: insertError } = await supabase
          .from('mindmesh_containers')
          .insert(ghostsToCreate)
          .select();

        if (insertError) {
          console.error('[MindMesh Auto-materialize] Failed to create ghost containers:', insertError);
        } else if (newContainers && newContainers.length > 0) {
          console.log('[MindMesh Auto-materialize] Created', newContainers.length, 'ghost containers');

          // CRITICAL: Create references with idempotent insert
          // Use the unique constraint (workspace_id, entity_type, entity_id) where is_primary=true
          // If a duplicate exists (race condition), the insert will fail and we clean up the orphaned container
          const newReferences = newContainers.map((c: any) => ({
            workspace_id: workspaceId,
            container_id: c.id,
            entity_type: c.metadata.entity_type,
            entity_id: c.metadata.entity_id,
            is_primary: true,
          }));

          // Try to insert all references
          const { data: insertedReferences, error: refInsertError } = await supabase
            .from('mindmesh_container_references')
            .insert(newReferences)
            .select('container_id');

          if (refInsertError) {
            console.error('[MindMesh Auto-materialize] Reference insert failed (possible race condition):', refInsertError);

            // CRITICAL: Clean up ALL orphaned containers (race condition losers)
            // If reference insert failed, these containers are duplicates and must be deleted
            const orphanedContainerIds = newContainers.map((c: any) => c.id);

            console.log('[MindMesh Auto-materialize] Cleaning up', orphanedContainerIds.length, 'orphaned containers');

            const { error: cleanupError } = await supabase
              .from('mindmesh_containers')
              .delete()
              .in('id', orphanedContainerIds);

            if (cleanupError) {
              console.error('[MindMesh Auto-materialize] Failed to clean up orphaned containers:', cleanupError);
            } else {
              console.log('[MindMesh Auto-materialize] Successfully cleaned up orphaned containers');
            }
          } else if (insertedReferences) {
            // Success: references were created
            const successfulContainerIds = new Set(insertedReferences.map((r: any) => r.container_id));

            console.log('[MindMesh Auto-materialize] Successfully created', insertedReferences.length, 'references');

            // CRITICAL: If not all references were created (partial failure), clean up orphaned containers
            if (insertedReferences.length < newContainers.length) {
              const orphanedContainers = newContainers.filter((c: any) => !successfulContainerIds.has(c.id));
              const orphanedContainerIds = orphanedContainers.map((c: any) => c.id);

              console.log('[MindMesh Auto-materialize] Partial success: cleaning up', orphanedContainerIds.length, 'orphaned containers');

              const { error: cleanupError } = await supabase
                .from('mindmesh_containers')
                .delete()
                .in('id', orphanedContainerIds);

              if (cleanupError) {
                console.error('[MindMesh Auto-materialize] Failed to clean up orphaned containers:', cleanupError);
              }
            }

            // Add only successful containers to the response
            const successfulContainers = newContainers.filter((c: any) => successfulContainerIds.has(c.id));

            successfulContainers.forEach((c: any) => {
              containers.push({
                id: c.id,
                workspace_id: c.workspace_id,
                entity_id: c.metadata?.entity_id || '',
                entity_type: c.metadata?.entity_type || 'track',
                state: 'ghost',
                x: parseFloat(c.x_position),
                y: parseFloat(c.y_position),
                width: parseFloat(c.width),
                height: parseFloat(c.height),
                spawn_strategy: 'vertical_stack',
                layout_broken: false,
                user_positioned: false,
                last_interaction_at: c.updated_at,
                created_at: c.created_at,
                updated_at: c.updated_at,
                title: c.title || '',
                body: c.body || '',
              });
            });

            // Add successful references to references array
            insertedReferences.forEach((ref: any) => {
              // Find the full reference data
              const fullRef = newReferences.find((r: any) => r.container_id === ref.container_id);
              if (fullRef) {
                references.push(fullRef);
              }
            });

            console.log('[MindMesh Auto-materialize] Added', successfulContainers.length, 'containers to response');
          }
        }
      }
    }

    const { data: currentLock, error: lockError } = await supabase
      .from('mindmesh_canvas_locks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (lockError) {
      console.error('Lock query error:', lockError);
    }

    const visibility: Record<string, boolean> = {};
    containers.forEach((c: any) => {
      visibility[c.id] = true;
    });

    const graphState = {
      workspace,
      containers: containers || [],
      nodes: nodes || [],
      ports: ports || [],
      references: references || [],
      currentLock: currentLock || null,
      visibility,
    };

    console.log('[MindMesh Graph] Returning graph state with', containers?.length || 0, 'containers');

    return new Response(
      JSON.stringify(graphState),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[MindMesh Graph] Error fetching graph:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});