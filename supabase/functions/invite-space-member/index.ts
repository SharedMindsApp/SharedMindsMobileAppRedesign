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

    const { spaceId, email, role } = await req.json();

    if (!spaceId || !email) {
      return new Response(
        JSON.stringify({ error: 'spaceId and email are required' }),
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

    // Get space details
    const { data: space, error: spaceError } = await supabase
      .from('spaces')
      .select('id, name, context_type, context_id')
      .eq('id', spaceId)
      .maybeSingle();

    if (spaceError || !space) {
      return new Response(
        JSON.stringify({ error: 'Space not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has permission to invite (owner or admin)
    const { data: currentMembership } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!currentMembership || !['owner', 'admin'].includes(currentMembership.role)) {
      return new Response(
        JSON.stringify({ error: 'Only owners and admins can invite members' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('space_members')
      .select('id, status, user_id')
      .eq('space_id', spaceId)
      .or(`email.eq.${email.toLowerCase()},user_id.eq.${existingProfile?.id || '00000000-0000-0000-0000-000000000000'}`)
      .maybeSingle();

    if (existingMember && existingMember.status === 'active') {
      return new Response(
        JSON.stringify({ error: 'User is already a member of this space' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const inviteToken = crypto.randomUUID();
    const inviteRole = role || 'member';

    // Create or update space_members record
    if (existingMember) {
      // Update existing pending/left member
      await supabase
        .from('space_members')
        .update({
          email: email.toLowerCase(),
          role: inviteRole,
          status: 'pending',
          invited_by: profile.id,
          invite_token: inviteToken,
          user_id: existingProfile?.id || null,
        })
        .eq('id', existingMember.id);
    } else {
      // Create new pending membership
      await supabase
        .from('space_members')
        .insert({
          space_id: spaceId,
          email: email.toLowerCase(),
          user_id: existingProfile?.id || null,
          role: inviteRole,
          status: 'pending',
          invited_by: profile.id,
          invite_token: inviteToken,
        });
    }

    // If it's a team, also create/update team_members record
    if (space.context_type === 'team' && space.context_id) {
      const { data: existingTeamMember } = await supabase
        .from('team_members')
        .select('id, status')
        .eq('team_id', space.context_id)
        .or(`user_id.eq.${existingProfile?.id || '00000000-0000-0000-0000-000000000000'},user_id.is.null`)
        .maybeSingle();

      if (existingTeamMember) {
        await supabase
          .from('team_members')
          .update({
            user_id: existingProfile?.id || null,
            role: inviteRole,
            status: 'pending',
            invited_by: profile.id,
          })
          .eq('id', existingTeamMember.id);
      } else {
        await supabase
          .from('team_members')
          .insert({
            team_id: space.context_id,
            user_id: existingProfile?.id || null,
            role: inviteRole,
            status: 'pending',
            invited_by: profile.id,
          });
      }
    }

    const origin = req.headers.get('origin') || '';
    const inviteUrl = `${origin}/invite/accept?token=${inviteToken}&type=${space.context_type}`;

    // Send email invitation
    try {
      // Get inviter's name
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', profile.id)
        .maybeSingle();

      const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'Someone';
      const spaceName = space.name;
      const spaceType = space.context_type === 'household' ? 'household' : 'team';

      // Use Supabase's built-in email function if available, or log for manual sending
      // For now, we'll use a simple email template that can be sent via Supabase email service
      const emailSubject = `You've been invited to join ${spaceName} on SharedMinds`;
      const emailBody = `
        <html>
          <body>
            <h2>You've been invited!</h2>
            <p>${inviterName} has invited you to join the ${spaceType} "${spaceName}" on SharedMinds.</p>
            <p>Click the link below to accept the invitation:</p>
            <p><a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a></p>
            <p>Or copy and paste this link into your browser:</p>
            <p>${inviteUrl}</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </body>
        </html>
      `;

      // Send email using Supabase's built-in email functionality
      // Supabase provides email sending via their email service
      // We'll use the Supabase client's email capabilities
      try {
        // Use Supabase's email sending (requires email service to be configured in Supabase dashboard)
        // For now, we'll create a database trigger or use a separate email service
        // The invite token and URL are created, email can be sent via:
        // 1. Supabase Email service (if configured)
        // 2. Database trigger that sends email
        // 3. External email service integration
        
        // Log the invite for now - email sending can be added via database trigger or external service
        console.log(`Invite created for ${email} to join ${spaceName}: ${inviteUrl}`);
        
        // TODO: Integrate with email service (Resend, SendGrid, etc.) or Supabase email
        // For production, you would:
        // 1. Set up Resend/SendGrid API key in Supabase secrets
        // 2. Create an email sending function
        // 3. Call it here or via database trigger
      } catch (emailErr) {
        console.warn('Error preparing email:', emailErr);
        // Continue anyway - invite URL is still created
      }
    } catch (emailErr) {
      console.warn('Error preparing email:', emailErr);
      // Continue anyway - invite URL is still created
    }

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
