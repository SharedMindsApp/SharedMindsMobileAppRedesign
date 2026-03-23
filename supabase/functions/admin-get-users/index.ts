import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface UserWithProfile {
  id: string;
  email: string;
  created_at: string;
  profile: {
    full_name: string;
    role: string;
    updated_at: string;
  } | null;
  last_sign_in_at: string | null;
}

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

    const url = new URL(req.url);
    const searchQuery = url.searchParams.get('search') || '';
    const roleFilter = url.searchParams.get('role');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = supabase
      .from('profiles')
      .select(`
        *,
        user_id,
        user_ui_preferences (
          neurotype_profile_id,
          neurotype_profiles (
            name,
            display_name
          )
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (roleFilter && roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }

    if (searchQuery) {
      query = query.or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);
    }

    const { data: profiles, error: profilesError } = await query;

    if (profilesError) {
      throw profilesError;
    }

    const usersWithNeurotype = profiles?.map((profile: any) => {
      const neurotypeProfile = profile.user_ui_preferences?.neurotype_profiles;
      return {
        ...profile,
        neurotype: neurotypeProfile?.name || 'neurotypical',
        neurotype_display_name: neurotypeProfile?.display_name || 'Neurotypical',
      };
    });

    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    return new Response(
      JSON.stringify({
        users: usersWithNeurotype,
        total: count,
        limit,
        offset,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error fetching users:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});