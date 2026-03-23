import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { householdId, professionalId, action, accessLevel } = await req.json();

    if (!householdId || !professionalId || !action) {
      return new Response(
        JSON.stringify({ error: 'householdId, professionalId, and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['approve', 'deny', 'revoke', 'change_level'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be approve, deny, revoke, or change_level' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'change_level' && !accessLevel) {
      return new Response(
        JSON.stringify({ error: 'accessLevel is required for change_level action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: membership } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', householdId)
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership || membership.role !== 'owner') {
      return new Response(
        JSON.stringify({ error: 'Only household owners can manage professional access' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: accessRecord } = await supabase
      .from('professional_households')
      .select('*')
      .eq('household_id', householdId)
      .eq('professional_id', professionalId)
      .maybeSingle();

    if (!accessRecord) {
      return new Response(
        JSON.stringify({ error: 'Access record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updateData: any = {};
    let message = '';

    if (action === 'approve') {
      if (accessRecord.status === 'approved') {
        return new Response(
          JSON.stringify({ error: 'Access already approved' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      updateData = {
        status: 'approved',
        approved_at: new Date().toISOString(),
      };
      message = 'Professional access approved';
    } else if (action === 'deny') {
      await supabase
        .from('professional_households')
        .delete()
        .eq('id', accessRecord.id);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Access request denied and removed',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else if (action === 'revoke') {
      if (accessRecord.status !== 'approved') {
        return new Response(
          JSON.stringify({ error: 'Can only revoke approved access' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      updateData = {
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by: profile.id,
      };
      message = 'Professional access revoked';
    } else if (action === 'change_level') {
      if (accessRecord.status !== 'approved') {
        return new Response(
          JSON.stringify({ error: 'Can only change access level for approved access' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      updateData = {
        access_level: accessLevel,
      };
      message = `Access level changed to ${accessLevel}`;
    }

    const { error: updateError } = await supabase
      .from('professional_households')
      .update(updateData)
      .eq('id', accessRecord.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update access' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});