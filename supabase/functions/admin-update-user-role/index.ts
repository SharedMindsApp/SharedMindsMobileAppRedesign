import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { target_user_id, new_role, member_limit } = await req.json();

    if (!target_user_id || !new_role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: target_user_id, new_role' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!['free', 'premium', 'admin'].includes(new_role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be: free, premium, or admin' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ role: new_role })
      .eq('user_id', target_user_id);

    if (updateError) {
      throw updateError;
    }

    if (member_limit) {
      const { data: memberData } = await adminClient
        .from('members')
        .select('household_id')
        .eq('user_id', target_user_id)
        .single();

      if (memberData?.household_id) {
        await adminClient
          .from('households')
          .update({ member_limit })
          .eq('id', memberData.household_id);
      }
    }

    await adminClient
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        action_type: 'update_user_role',
        target_id: target_user_id,
        notes: `Changed role to ${new_role}`,
      });

    return new Response(
      JSON.stringify({ success: true, message: `User role updated to ${new_role}` }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error updating user role:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});