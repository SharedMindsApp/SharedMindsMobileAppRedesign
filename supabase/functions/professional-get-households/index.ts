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

    const url = new URL(req.url);
    const householdId = url.searchParams.get('householdId');

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
        JSON.stringify({ error: 'Only professionals can access this endpoint' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (householdId) {
      const { data: accessRecord } = await supabase
        .from('professional_households')
        .select('*, households(*)')
        .eq('professional_id', profile.id)
        .eq('household_id', householdId)
        .eq('status', 'approved')
        .maybeSingle();

      if (!accessRecord) {
        return new Response(
          JSON.stringify({ error: 'Access denied or not found' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: members } = await supabase
        .from('members')
        .select('id, name, age, role')
        .eq('household_id', householdId)
        .order('created_at');

      const { data: latestReport } = await supabase
        .from('reports')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          success: true,
          household: accessRecord.households,
          accessLevel: accessRecord.access_level,
          members: members || [],
          latestReport,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      const { data: accessRecords } = await supabase
        .from('professional_households')
        .select('*, households(*)')
        .eq('professional_id', profile.id)
        .eq('status', 'approved')
        .order('approved_at', { ascending: false });

      const householdsWithCounts = await Promise.all(
        (accessRecords || []).map(async (record) => {
          const { count } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('household_id', record.household_id);

          return {
            ...record,
            memberCount: count || 0,
          };
        })
      );

      const { data: pendingRequests } = await supabase
        .from('professional_households')
        .select('*, households(*)')
        .eq('professional_id', profile.id)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      return new Response(
        JSON.stringify({
          success: true,
          households: householdsWithCounts,
          pendingRequests: pendingRequests || [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});