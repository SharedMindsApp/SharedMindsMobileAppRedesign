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

    const { target_user_id, neurotype_profile_id } = await req.json();

    if (!target_user_id || !neurotype_profile_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: target_user_id, neurotype_profile_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: neurotypeProfile, error: neurotypeError } = await adminClient
      .from('neurotype_profiles')
      .select('*')
      .eq('id', neurotype_profile_id)
      .single();

    if (neurotypeError || !neurotypeProfile) {
      return new Response(
        JSON.stringify({ error: 'Invalid neurotype profile ID' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: existingPrefs } = await adminClient
      .from('user_ui_preferences')
      .select('id')
      .eq('user_id', target_user_id)
      .maybeSingle();

    if (existingPrefs) {
      const { error: updateError } = await adminClient
        .from('user_ui_preferences')
        .update({
          neurotype_profile_id: neurotype_profile_id,
          layout_mode: neurotypeProfile.default_layout,
          ui_density: neurotypeProfile.default_density,
          font_scale: neurotypeProfile.default_theme.fontScale,
          color_theme: neurotypeProfile.default_theme.colorTheme,
          contrast_level: neurotypeProfile.default_theme.contrastLevel,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', target_user_id);

      if (updateError) {
        throw updateError;
      }
    } else {
      const { error: insertError } = await adminClient
        .from('user_ui_preferences')
        .insert({
          user_id: target_user_id,
          neurotype_profile_id: neurotype_profile_id,
          layout_mode: neurotypeProfile.default_layout,
          ui_density: neurotypeProfile.default_density,
          font_scale: neurotypeProfile.default_theme.fontScale,
          color_theme: neurotypeProfile.default_theme.colorTheme,
          contrast_level: neurotypeProfile.default_theme.contrastLevel,
        });

      if (insertError) {
        throw insertError;
      }
    }

    await adminClient
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        action_type: 'update_user_neurotype',
        target_id: target_user_id,
        notes: `Changed neurotype to ${neurotypeProfile.display_name}`,
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: `User neurotype updated to ${neurotypeProfile.display_name}`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error updating user neurotype:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});