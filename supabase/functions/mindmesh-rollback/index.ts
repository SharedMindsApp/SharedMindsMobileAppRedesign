/**
 * Mind Mesh V2 - Rollback Endpoint
 *
 * POST /mindmesh-rollback
 *
 * This layer contains NO logic.
 * All behaviour lives in execution service.
 *
 * Responsibilities:
 * 1. Authenticate user
 * 2. Verify edit access
 * 3. Call rollbackLastPlan()
 * 4. Return result verbatim
 *
 * Rules:
 * - No confirmation UI
 * - No retries
 * - Errors returned directly
 * - Pass-through only
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { rollbackLastPlan } from '@mindmesh/execution';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Only allow POST
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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Authenticate user
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

    // Parse request body
    const body = await req.json();
    const { workspaceId } = body;

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: 'Missing workspaceId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify workspace exists
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

    // Verify user has active lock (edit access)
    const { data: lock, error: lockError } = await supabase
      .from('mindmesh_canvas_locks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (lockError) {
      throw lockError;
    }

    if (!lock) {
      return new Response(
        JSON.stringify({ error: 'No active canvas lock. Cannot rollback.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Call rollback service (this is where execution happens)
    const result = await rollbackLastPlan(supabase, workspaceId, user.id);

    // Return result verbatim
    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error rolling back plan:', error);
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
