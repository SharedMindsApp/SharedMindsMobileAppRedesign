import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function sendInviteEmailWithResend(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
  const resendFromName = Deno.env.get('RESEND_FROM_NAME') || 'SharedMinds';
  const resendReplyTo = Deno.env.get('RESEND_REPLY_TO') || resendFromEmail;

  if (!resendApiKey) {
    return {
      sent: false,
      provider: 'none',
      reason: 'missing_resend_api_key',
    } as const;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      from: `${resendFromName} <${resendFromEmail}>`,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      reply_to: resendReplyTo,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Resend send failed (${response.status}): ${payload?.message || payload?.error || 'Unknown error'}`
    );
  }

  return {
    sent: true,
    provider: 'resend',
    id: payload?.id ?? null,
  } as const;
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

    const origin =
      req.headers.get('origin') ||
      Deno.env.get('APP_BASE_URL') ||
      Deno.env.get('SITE_URL') ||
      '';
    const inviteUrl = `${origin}/invite/accept?token=${inviteToken}&type=${space.context_type}`;
    let emailDelivery: {
      sent: boolean;
      provider: string;
      id?: string | null;
      reason?: string;
    } = {
      sent: false,
      provider: 'none',
      reason: 'not_attempted',
    };

    // Send email invitation
    try {
      // Get inviter's name
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('full_name, display_name, email')
        .eq('id', profile.id)
        .maybeSingle();

      const inviterName =
        inviterProfile?.full_name ||
        inviterProfile?.display_name ||
        inviterProfile?.email ||
        'Someone';
      const spaceName = space.name;
      const spaceType = space.context_type === 'household' ? 'household' : 'team';
      const safeInviterName = escapeHtml(inviterName);
      const safeSpaceName = escapeHtml(spaceName);
      const safeOrigin = escapeHtml(origin);

      const emailSubject = `You've been invited to join ${spaceName} on SharedMinds`;
      const emailBody = `
        <html>
          <body>
            <h2>You've been invited!</h2>
            <p>${safeInviterName} has invited you to join the ${spaceType} "${safeSpaceName}" on SharedMinds.</p>
            <p>Click the link below to accept the invitation:</p>
            <p><a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a></p>
            <p>Or copy and paste this link into your browser:</p>
            <p>${inviteUrl}</p>
            <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;" />
            <h3 style="margin:0 0 12px;">Install SharedMinds on your device</h3>
            <p style="margin:0 0 12px;">After you open SharedMinds, you can install it like an app for quicker access.</p>
            <ul style="padding-left:20px; margin:0 0 12px;">
              <li><strong>iPhone or iPad:</strong> Open in Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</li>
              <li><strong>Android:</strong> Open in Chrome, tap the browser menu, then choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
              <li><strong>Desktop:</strong> Open SharedMinds in Chrome or Edge and click the <strong>Install</strong> icon in the address bar.</li>
            </ul>
            <p style="margin:0 0 12px;">Open SharedMinds here: <a href="${origin}">${safeOrigin}</a></p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </body>
        </html>
      `;
      const emailText = `${inviterName} has invited you to join the ${spaceType} "${spaceName}" on SharedMinds.\n\nAccept the invitation:\n${inviteUrl}\n\nInstall SharedMinds on your device:\n- iPhone or iPad: open in Safari, tap Share, then Add to Home Screen.\n- Android: open in Chrome, tap the browser menu, then Install app or Add to Home screen.\n- Desktop: open SharedMinds in Chrome or Edge and click the Install icon in the address bar.\n\nOpen SharedMinds here:\n${origin}\n\nIf you didn't expect this invitation, you can safely ignore this email.`;

      emailDelivery = await sendInviteEmailWithResend({
        to: email.toLowerCase(),
        subject: emailSubject,
        html: emailBody,
        text: emailText,
      });

      if (!emailDelivery.sent) {
        console.log(`Invite created for ${email} to join ${spaceName}: ${inviteUrl}`);
      }
    } catch (emailErr) {
      console.warn('Error sending invite email:', emailErr);
      // Continue anyway - invite URL is still created
    }

    return new Response(
      JSON.stringify({
        success: true,
        inviteUrl,
        emailSent: emailDelivery.sent,
        emailProvider: emailDelivery.provider,
        emailReason: emailDelivery.reason || null,
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
