// Version: 2024-12-18-v6 with DeleteNode support
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateManualContainerIntent {
  type: 'CreateManualContainer';
  containerType: 'idea' | 'note';
  position: { x: number; y: number };
  title?: string;
  body?: string;
  width?: number;
  height?: number;
}

interface UpdateContainerIntent {
  type: 'UpdateContainer';
  containerId: string;
  title?: string;
  body?: string;
}

interface DeleteContainerIntent {
  type: 'DeleteContainer';
  containerId: string;
}

interface UpdateTaskStatusIntent {
  type: 'UpdateTaskStatus';
  containerId: string;
  entityId: string;
  status: string;
}

interface ActivateContainerIntent {
  type: 'ActivateContainer';
  containerId: string;
  reason?: string;
}

interface MoveContainerIntent {
  type: 'MoveContainer';
  containerId: string;
  newPosition: { x: number; y: number };
}

interface ResizeContainerIntent {
  type: 'ResizeContainer';
  containerId: string;
  newDimensions: { width: number; height: number };
}

interface CreateManualNodeIntent {
  type: 'CreateManualNode';
  sourcePortId: string;
  targetPortId: string;
  relationshipType: string;
  relationshipDirection: string;
}

interface DeleteNodeIntent {
  type: 'DeleteNode';
  nodeId: string;
}

type MindMeshIntent = CreateManualContainerIntent | UpdateContainerIntent | DeleteContainerIntent | UpdateTaskStatusIntent | ActivateContainerIntent | MoveContainerIntent | ResizeContainerIntent | CreateManualNodeIntent | DeleteNodeIntent;

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await req.json();
    const { workspaceId, intent } = body as { workspaceId: string; intent: MindMeshIntent };

    if (!workspaceId || !intent) {
      return new Response(
        JSON.stringify({ error: 'Missing workspaceId or intent' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!intent.type) {
      return new Response(
        JSON.stringify({ error: 'Invalid intent: missing type' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[MindMesh Edge] Handling intent:', intent.type, 'for workspace:', workspaceId);

    if (intent.type === 'CreateManualContainer') {
      const { data: workspace, error: wsError } = await supabase
        .from('mindmesh_workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

      if (wsError || !workspace) {
        return new Response(
          JSON.stringify({ error: 'Workspace not found', details: wsError }),
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
        .single();

      if (projectError || !project || project.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const containerId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      const containerData = {
        id: containerId,
        workspace_id: workspaceId,
        title: intent.title || `New ${intent.containerType === 'idea' ? 'Idea' : 'Note'}`,
        body: intent.body || '',
        is_ghost: false,
        x_position: intent.position.x,
        y_position: intent.position.y,
        width: intent.width || 280,
        height: intent.height || 200,
        metadata: {
          container_type: intent.containerType,
        },
        created_at: timestamp,
        updated_at: timestamp,
      };

      console.log('[MindMesh Edge] Creating container:', containerData);

      const { data: newContainer, error: insertError } = await supabase
        .from('mindmesh_containers')
        .insert(containerData)
        .select()
        .single();

      if (insertError) {
        console.error('[MindMesh Edge] Container creation failed:', insertError);
        return new Response(
          JSON.stringify({
            success: false,
            error: insertError.message,
            planningErrors: [],
            executionErrors: [insertError.message],
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('[MindMesh Edge] Container created successfully:', newContainer.id);

      const formattedContainer = {
        id: newContainer.id,
        workspace_id: newContainer.workspace_id,
        entity_id: '',
        entity_type: 'side_project',
        state: 'active',
        x: parseFloat(newContainer.x_position),
        y: parseFloat(newContainer.y_position),
        width: parseFloat(newContainer.width),
        height: parseFloat(newContainer.height),
        spawn_strategy: 'manual',
        layout_broken: false,
        user_positioned: true,
        last_interaction_at: newContainer.updated_at,
        created_at: newContainer.created_at,
        updated_at: newContainer.updated_at,
        title: newContainer.title || '',
        body: newContainer.body || '',
      };

      return new Response(
        JSON.stringify({
          success: true,
          planningErrors: [],
          executionErrors: [],
          createdContainerId: newContainer.id,
          createdContainer: formattedContainer,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (intent.type === 'UpdateContainer') {
      const { data: container, error: containerError } = await supabase
        .from('mindmesh_containers')
        .select('workspace_id')
        .eq('id', intent.containerId)
        .single();

      if (containerError || !container) {
        return new Response(
          JSON.stringify({ error: 'Container not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: workspace, error: wsError } = await supabase
        .from('mindmesh_workspaces')
        .select('master_project_id')
        .eq('id', container.workspace_id)
        .single();

      if (wsError || !workspace) {
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
        .single();

      if (projectError || !project || project.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (intent.title !== undefined) {
        updateData.title = intent.title;
      }

      if (intent.body !== undefined) {
        updateData.body = intent.body;
      }

      const { error: updateError } = await supabase
        .from('mindmesh_containers')
        .update(updateData)
        .eq('id', intent.containerId);

      if (updateError) {
        console.error('[MindMesh Edge] Container update failed:', updateError);
        return new Response(
          JSON.stringify({
            success: false,
            error: updateError.message,
            planningErrors: [],
            executionErrors: [updateError.message],
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('[MindMesh Edge] Container updated successfully:', intent.containerId);

      return new Response(
        JSON.stringify({
          success: true,
          planningErrors: [],
          executionErrors: [],
          updatedContainerId: intent.containerId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (intent.type === 'DeleteContainer') {
      const { data: container, error: containerError } = await supabase
        .from('mindmesh_containers')
        .select('workspace_id')
        .eq('id', intent.containerId)
        .single();

      if (containerError || !container) {
        return new Response(
          JSON.stringify({ error: 'Container not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: workspace, error: wsError } = await supabase
        .from('mindmesh_workspaces')
        .select('master_project_id')
        .eq('id', container.workspace_id)
        .single();

      if (wsError || !workspace) {
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
        .single();

      if (projectError || !project || project.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { error: deleteError } = await supabase
        .from('mindmesh_containers')
        .delete()
        .eq('id', intent.containerId);

      if (deleteError) {
        console.error('[MindMesh Edge] Container deletion failed:', deleteError);
        return new Response(
          JSON.stringify({
            success: false,
            error: deleteError.message,
            planningErrors: [],
            executionErrors: [deleteError.message],
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('[MindMesh Edge] Container deleted successfully:', intent.containerId);

      return new Response(
        JSON.stringify({
          success: true,
          planningErrors: [],
          executionErrors: [],
          deletedContainerId: intent.containerId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (intent.type === 'UpdateTaskStatus') {
      const { data: container, error: containerError } = await supabase
        .from('mindmesh_containers')
        .select('workspace_id, entity_type')
        .eq('id', intent.containerId)
        .single();

      if (containerError || !container) {
        return new Response(
          JSON.stringify({ error: 'Container not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (container.entity_type !== 'roadmap_item') {
        return new Response(
          JSON.stringify({ error: 'Container is not a roadmap item' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: workspace, error: wsError } = await supabase
        .from('mindmesh_workspaces')
        .select('master_project_id')
        .eq('id', container.workspace_id)
        .single();

      if (wsError || !workspace) {
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
        .single();

      if (projectError || !project || project.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { error: updateError } = await supabase
        .from('roadmap_items')
        .update({
          status: intent.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', intent.entityId);

      if (updateError) {
        console.error('[MindMesh Edge] Task status update failed:', updateError);
        return new Response(
          JSON.stringify({
            success: false,
            error: updateError.message,
            planningErrors: [],
            executionErrors: [updateError.message],
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('[MindMesh Edge] Task status updated successfully:', intent.entityId, 'to', intent.status);

      return new Response(
        JSON.stringify({
          success: true,
          planningErrors: [],
          executionErrors: [],
          updatedEntityId: intent.entityId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (intent.type === 'ActivateContainer') {
      const { data: container, error: containerError } = await supabase
        .from('mindmesh_containers')
        .select('workspace_id, is_ghost')
        .eq('id', intent.containerId)
        .single();

      if (containerError || !container) {
        return new Response(
          JSON.stringify({ error: 'Container not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!container.is_ghost) {
        return new Response(
          JSON.stringify({
            success: true,
            planningErrors: [],
            executionErrors: [],
            message: 'Container is already active',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: workspace, error: wsError } = await supabase
        .from('mindmesh_workspaces')
        .select('master_project_id')
        .eq('id', container.workspace_id)
        .single();

      if (wsError || !workspace) {
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
        .single();

      if (projectError || !project || project.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { error: updateError } = await supabase
        .from('mindmesh_containers')
        .update({
          is_ghost: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', intent.containerId);

      if (updateError) {
        console.error('[MindMesh Edge] Container activation failed:', updateError);
        return new Response(
          JSON.stringify({
            success: false,
            error: updateError.message,
            planningErrors: [],
            executionErrors: [updateError.message],
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('[MindMesh Edge] Container activated successfully:', intent.containerId);

      return new Response(
        JSON.stringify({
          success: true,
          planningErrors: [],
          executionErrors: [],
          activatedContainerId: intent.containerId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (intent.type === 'MoveContainer') {
      const { data: container, error: containerError } = await supabase
        .from('mindmesh_containers')
        .select('workspace_id')
        .eq('id', intent.containerId)
        .single();

      if (containerError || !container) {
        return new Response(
          JSON.stringify({ error: 'Container not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: workspace, error: wsError } = await supabase
        .from('mindmesh_workspaces')
        .select('master_project_id')
        .eq('id', container.workspace_id)
        .single();

      if (wsError || !workspace) {
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
        .single();

      if (projectError || !project || project.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { error: updateError } = await supabase
        .from('mindmesh_containers')
        .update({
          x_position: intent.newPosition.x,
          y_position: intent.newPosition.y,
          updated_at: new Date().toISOString(),
        })
        .eq('id', intent.containerId);

      if (updateError) {
        console.error('[MindMesh Edge] Container move failed:', updateError);
        return new Response(
          JSON.stringify({
            success: false,
            error: updateError.message,
            planningErrors: [],
            executionErrors: [updateError.message],
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('[MindMesh Edge] Container moved successfully:', intent.containerId, 'to', intent.newPosition);

      return new Response(
        JSON.stringify({
          success: true,
          planningErrors: [],
          executionErrors: [],
          movedContainerId: intent.containerId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (intent.type === 'ResizeContainer') {
      const { data: container, error: containerError } = await supabase
        .from('mindmesh_containers')
        .select('workspace_id')
        .eq('id', intent.containerId)
        .single();

      if (containerError || !container) {
        return new Response(
          JSON.stringify({ error: 'Container not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: workspace, error: wsError } = await supabase
        .from('mindmesh_workspaces')
        .select('master_project_id')
        .eq('id', container.workspace_id)
        .single();

      if (wsError || !workspace) {
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
        .single();

      if (projectError || !project || project.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { error: updateError } = await supabase
        .from('mindmesh_containers')
        .update({
          width: intent.newDimensions.width,
          height: intent.newDimensions.height,
          updated_at: new Date().toISOString(),
        })
        .eq('id', intent.containerId);

      if (updateError) {
        console.error('[MindMesh Edge] Container resize failed:', updateError);
        return new Response(
          JSON.stringify({
            success: false,
            error: updateError.message,
            planningErrors: [],
            executionErrors: [updateError.message],
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('[MindMesh Edge] Container resized successfully:', intent.containerId, 'to', intent.newDimensions);

      return new Response(
        JSON.stringify({
          success: true,
          planningErrors: [],
          executionErrors: [],
          resizedContainerId: intent.containerId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (intent.type === 'CreateManualNode') {
      const { data: sourcePort, error: sourcePortError } = await supabase
        .from('mindmesh_ports')
        .select('container_id')
        .eq('id', intent.sourcePortId)
        .single();

      if (sourcePortError || !sourcePort) {
        return new Response(
          JSON.stringify({ error: 'Source port not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: targetPort, error: targetPortError } = await supabase
        .from('mindmesh_ports')
        .select('container_id')
        .eq('id', intent.targetPortId)
        .single();

      if (targetPortError || !targetPort) {
        return new Response(
          JSON.stringify({ error: 'Target port not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: sourceContainer, error: sourceContainerError } = await supabase
        .from('mindmesh_containers')
        .select('workspace_id')
        .eq('id', sourcePort.container_id)
        .single();

      if (sourceContainerError || !sourceContainer) {
        return new Response(
          JSON.stringify({ error: 'Source container not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: workspace, error: wsError } = await supabase
        .from('mindmesh_workspaces')
        .select('master_project_id')
        .eq('id', sourceContainer.workspace_id)
        .single();

      if (wsError || !workspace) {
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
        .single();

      if (projectError || !project || project.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const nodeId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      const nodeData = {
        id: nodeId,
        workspace_id: sourceContainer.workspace_id,
        source_port_id: intent.sourcePortId,
        target_port_id: intent.targetPortId,
        relationship_type: intent.relationshipType,
        relationship_direction: intent.relationshipDirection,
        auto_generated: false,
        created_at: timestamp,
      };

      const { data: newNode, error: insertError } = await supabase
        .from('mindmesh_nodes')
        .insert(nodeData)
        .select()
        .single();

      if (insertError) {
        console.error('[MindMesh Edge] Node creation failed:', insertError);
        return new Response(
          JSON.stringify({
            success: false,
            error: insertError.message,
            planningErrors: [],
            executionErrors: [insertError.message],
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('[MindMesh Edge] Node created successfully:', newNode.id);

      return new Response(
        JSON.stringify({
          success: true,
          planningErrors: [],
          executionErrors: [],
          createdNodeId: newNode.id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (intent.type === 'DeleteNode') {
      const { data: node, error: nodeError } = await supabase
        .from('mindmesh_nodes')
        .select('workspace_id')
        .eq('id', intent.nodeId)
        .single();

      if (nodeError || !node) {
        return new Response(
          JSON.stringify({ error: 'Node not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: workspace, error: wsError } = await supabase
        .from('mindmesh_workspaces')
        .select('master_project_id')
        .eq('id', node.workspace_id)
        .single();

      if (wsError || !workspace) {
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
        .single();

      if (projectError || !project || project.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { error: deleteError } = await supabase
        .from('mindmesh_nodes')
        .delete()
        .eq('id', intent.nodeId);

      if (deleteError) {
        console.error('[MindMesh Edge] Node deletion failed:', deleteError);
        return new Response(
          JSON.stringify({
            success: false,
            error: deleteError.message,
            planningErrors: [],
            executionErrors: [deleteError.message],
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('[MindMesh Edge] Node deleted successfully:', intent.nodeId);

      return new Response(
        JSON.stringify({
          success: true,
          planningErrors: [],
          executionErrors: [],
          deletedNodeId: intent.nodeId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: `Unsupported intent type: ${intent.type}`,
        planningErrors: [],
        executionErrors: [`Unsupported intent type: ${intent.type}`],
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[MindMesh Edge] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        planningErrors: [],
        executionErrors: [error.message],
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
