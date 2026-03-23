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

    const { householdId, accessLevel } = await req.json();

    if (!householdId || !accessLevel) {
      return new Response(
        JSON.stringify({ error: 'householdId and accessLevel are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['summary', 'full_insights'].includes(accessLevel)) {
      return new Response(
        JSON.stringify({ error: 'Invalid accessLevel. Must be summary or full_insights' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile.role !== 'professional') {
      return new Response(
        JSON.stringify({ error: 'Only professionals can request access' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: household } = await supabase
      .from('households')
      .select('id, name')
      .eq('id', householdId)
      .maybeSingle();

    if (!household) {
      return new Response(
        JSON.stringify({ error: 'Household not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existingAccess } = await supabase
      .from('professional_households')
      .select('id, status')
      .eq('professional_id', profile.id)
      .eq('household_id', householdId)
      .maybeSingle();

    if (existingAccess) {
      if (existingAccess.status === 'approved') {
        return new Response(
          JSON.stringify({ error: 'You already have access to this household' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (existingAccess.status === 'pending') {
        return new Response(
          JSON.stringify({ error: 'You already have a pending request for this household' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: accessRequest, error: insertError } = await supabase
      .from('professional_households')
      .insert({
        professional_id: profile.id,
        household_id: householdId,
        access_level: accessLevel,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create access request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        accessRequest,
        message: `Access request sent to ${household.name}`,
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