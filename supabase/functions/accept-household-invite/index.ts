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

    const { inviteToken } = await req.json();

    if (!inviteToken) {
      return new Response(
        JSON.stringify({ error: 'inviteToken is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let profileId = profile?.id;

    if (!profileId) {
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          full_name: user.email?.split('@')[0] || 'User',
        })
        .select('id')
        .single();

      if (profileError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      profileId = newProfile.id;
    }

    const { data: invite, error: inviteError } = await supabase
      .from('household_members')
      .select('*, households(*)')
      .eq('invite_token', inviteToken)
      .eq('status', 'pending')
      .maybeSingle();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invite' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invite.email !== user.email) {
      return new Response(
        JSON.stringify({ error: 'This invite is for a different email address' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: updateError } = await supabase
      .from('household_members')
      .update({
        user_id: profileId,
        status: 'active',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to accept invite' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        household: invite.households,
        message: `You've joined ${invite.households.name}`,
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