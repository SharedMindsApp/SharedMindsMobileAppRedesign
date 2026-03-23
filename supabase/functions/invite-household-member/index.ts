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

    const { householdId, email, name } = await req.json();

    if (!householdId || !email) {
      return new Response(
        JSON.stringify({ error: 'householdId and email are required' }),
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
        JSON.stringify({ error: 'Only billing owners can invite members' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existingMember } = await supabase
      .from('household_members')
      .select('id, status')
      .eq('household_id', householdId)
      .eq('email', email)
      .maybeSingle();

    if (existingMember && existingMember.status === 'active') {
      return new Response(
        JSON.stringify({ error: 'User is already a member of this household' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const inviteToken = crypto.randomUUID();

    if (existingMember) {
      await supabase
        .from('household_members')
        .update({
          invite_token: inviteToken,
          invited_by: profile.id,
          created_at: new Date().toISOString(),
        })
        .eq('id', existingMember.id);
    } else {
      await supabase
        .from('household_members')
        .insert({
          household_id: householdId,
          email: email,
          role: 'member',
          status: 'pending',
          invite_token: inviteToken,
          invited_by: profile.id,
        });
    }

    const inviteUrl = `${req.headers.get('origin') || ''}/invite/accept?token=${inviteToken}`;

    return new Response(
      JSON.stringify({
        success: true,
        inviteUrl,
        message: `Invite sent to ${email}`,
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