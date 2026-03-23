import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { count: totalUsers } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: freeUsers } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'free');

    const { count: premiumUsers } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'premium');

    const { count: adminUsers } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');

    const { count: totalHouseholds } = await adminClient
      .from('households')
      .select('*', { count: 'exact', head: true });

    const { count: totalReports } = await adminClient
      .from('reports')
      .select('*', { count: 'exact', head: true });

    const { data: recentEvents, error: eventsError } = await adminClient
      .from('analytics_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    const eventsByType: Record<string, number> = {};
    recentEvents?.forEach((event) => {
      eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1;
    });

    const { data: dailyActivity, error: activityError } = await adminClient
      .rpc('get_daily_activity', {});

    return new Response(
      JSON.stringify({
        summary: {
          totalUsers: totalUsers || 0,
          freeUsers: freeUsers || 0,
          premiumUsers: premiumUsers || 0,
          adminUsers: adminUsers || 0,
          totalHouseholds: totalHouseholds || 0,
          totalReports: totalReports || 0,
        },
        eventsByType,
        recentEvents: recentEvents?.slice(0, 10) || [],
        dailyActivity: dailyActivity || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});