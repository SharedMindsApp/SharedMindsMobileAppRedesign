// send-daily-digest Edge Function
// Groups all digest_queued notifications by user and sends one bundled email
// per user via Resend. Designed to run once per day (e.g. 08:00 user-local
// time, or simply once globally at a fixed UTC hour via pg_cron).
//
// Deploy:
//   supabase functions deploy send-daily-digest
//   supabase secrets set RESEND_API_KEY=re_...
//   supabase secrets set DISPATCH_SECRET=some-secret-token
//
// Invoke:
//   POST https://<project>.supabase.co/functions/v1/send-daily-digest
//   Authorization: Bearer <DISPATCH_SECRET>

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DigestNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  deep_link: string | null;
  created_at: string;
}

interface UserDigestBundle {
  userId: string;
  email: string;
  displayName: string;
  notifications: DigestNotification[];
}

// ---------------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------------

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// ---------------------------------------------------------------------------
// Type → emoji map
// ---------------------------------------------------------------------------

const TYPE_EMOJI: Record<string, string> = {
  new_dm: '💬',
  post_reply: '↩️',
  post_reaction: '👏',
  connection_request: '🤝',
  connection_accepted: '✅',
  project_invite: '📁',
  session_reminder_24h: '📅',
  session_reminder_15min: '⏰',
  community_session_reminder: '📅',
  weekly_review_prompt: '✨',
  onboarding_day_1: '🌱',
  onboarding_day_3: '🌱',
  onboarding_day_7: '🌱',
  stuck_help_offered: '🙋',
};

function typeEmoji(type: string): string {
  return TYPE_EMOJI[type] ?? '🔔';
}

// ---------------------------------------------------------------------------
// Type → accent color (used for card left-border)
// ---------------------------------------------------------------------------

const TYPE_COLOR: Record<string, string> = {
  session_reminder_24h: '#0891b2',
  session_reminder_15min: '#0891b2',
  community_session_reminder: '#0891b2',
  weekly_review_prompt: '#7c3aed',
  onboarding_day_1: '#7c3aed',
  onboarding_day_3: '#7c3aed',
  onboarding_day_7: '#7c3aed',
  new_dm: '#2563eb',
  post_reply: '#2563eb',
  post_reaction: '#2563eb',
  stuck_help_offered: '#2563eb',
  connection_request: '#059669',
  connection_accepted: '#059669',
  project_invite: '#059669',
};

function typeColor(type: string): string {
  return TYPE_COLOR[type] ?? '#0891b2';
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ---------------------------------------------------------------------------
// Digest email builder
// ---------------------------------------------------------------------------

function buildDigestEmail(params: {
  displayName: string;
  notifications: DigestNotification[];
  appUrl: string;
  settingsUrl: string;
}): { subject: string; html: string } {
  const { displayName, notifications, appUrl, settingsUrl } = params;
  const count = notifications.length;
  const subject = `Your SharedMinds digest — ${count} update${count === 1 ? '' : 's'}`;

  const notifCards = notifications
    .map((n) => {
      const emoji = typeEmoji(n.type);
      const color = typeColor(n.type);
      const ctaUrl = n.deep_link ? `${appUrl}${n.deep_link}` : appUrl;

      return `
      <!-- Notification card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;border-radius:8px;border:1px solid #e8edf2;overflow:hidden;">
        <tr>
          <!-- Color strip -->
          <td width="4" style="background-color:${color};font-size:0;line-height:0;">&nbsp;</td>
          <!-- Content -->
          <td style="padding:14px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#0f172a;line-height:1.3;">
                    ${escapeHtml(emoji)}&nbsp;&nbsp;${escapeHtml(n.title)}
                  </p>
                  <p style="margin:0 0 10px;font-size:13px;color:#64748b;line-height:1.5;">
                    ${escapeHtml(n.body)}
                  </p>
                  <a href="${ctaUrl}"
                     target="_blank"
                     style="font-size:12px;font-weight:600;color:${color};text-decoration:none;letter-spacing:0.2px;">
                    View &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08),0 4px 16px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid #f0f0f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:20px;font-weight:800;color:#0891b2;letter-spacing:-0.5px;">SharedMinds</span>
                    <span style="display:block;font-size:12px;color:#94a3b8;margin-top:2px;font-weight:400;">Virtual coworking &amp; accountability</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Accent bar -->
          <tr>
            <td style="height:4px;background-color:#0891b2;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding:28px 32px 16px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
                Your daily digest
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.5;">
                Hi ${escapeHtml(displayName)}, here's what happened while you were away — ${count} update${count === 1 ? '' : 's'} waiting for you.
              </p>

              <!-- Notification cards -->
              ${notifCards}

              <!-- Go to app CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td style="border-radius:8px;background-color:#0891b2;">
                    <a href="${appUrl}"
                       target="_blank"
                       style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">
                      Open SharedMinds
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #f0f0f0;background-color:#fafafa;border-radius:0 0 12px 12px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
                You're receiving this daily digest because you're a SharedMinds member.
                <br/>
                <a href="${settingsUrl}" style="color:#64748b;text-decoration:underline;">Manage notification settings</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Bearer token guard
  const dispatchSecret = Deno.env.get('DISPATCH_SECRET');
  if (dispatchSecret) {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (token !== dispatchSecret) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const appUrl = Deno.env.get('APP_URL') ?? 'https://app.sharedminds.app';
  const fromAddress = 'notifications@sharedminds.app';
  const settingsUrl = `${appUrl}/settings`;

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase env vars not configured' }, 500);
  }
  if (!resendApiKey) {
    return jsonResponse({ error: 'RESEND_API_KEY not configured' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // ------------------------------------------------------------------
  // 1. Fetch all digest_queued notifications
  // ------------------------------------------------------------------
  const { data: queuedRows, error: fetchError } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, body, deep_link, created_at')
    .eq('email_status', 'digest_queued')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('Error fetching queued digest notifications:', fetchError);
    return jsonResponse({ error: 'Failed to fetch notifications', details: fetchError.message }, 500);
  }

  const rows = (queuedRows ?? []) as DigestNotification[];

  if (rows.length === 0) {
    return jsonResponse({ processed_users: 0, sent: 0, failed: 0, total_notifications: 0 });
  }

  // ------------------------------------------------------------------
  // 2. Group by user
  // ------------------------------------------------------------------
  const byUser = new Map<string, DigestNotification[]>();
  for (const row of rows) {
    const existing = byUser.get(row.user_id) ?? [];
    existing.push(row);
    byUser.set(row.user_id, existing);
  }

  // ------------------------------------------------------------------
  // 3. Fetch profile data (display_name) for each user
  // ------------------------------------------------------------------
  const userIds = [...byUser.keys()];
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds);

  if (profileError) {
    console.error('Error fetching profiles:', profileError);
    return jsonResponse({ error: 'Failed to fetch profiles', details: profileError.message }, 500);
  }

  const profileMap: Record<string, string> = {};
  for (const p of (profiles ?? []) as { id: string; display_name: string }[]) {
    profileMap[p.id] = p.display_name ?? 'there';
  }

  // ------------------------------------------------------------------
  // 4. Fetch emails from auth.users
  // ------------------------------------------------------------------
  const emailMap: Record<string, string> = {};
  for (const uid of userIds) {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(uid);
    if (userError || !userData?.user?.email) {
      console.warn(`Could not fetch email for user ${uid}:`, userError?.message);
    } else {
      emailMap[uid] = userData.user.email;
    }
  }

  // ------------------------------------------------------------------
  // 5. Build bundles and send
  // ------------------------------------------------------------------
  const bundles: UserDigestBundle[] = [];
  for (const [userId, notifications] of byUser.entries()) {
    const email = emailMap[userId];
    if (!email) {
      console.warn(`Skipping digest for user ${userId}: no email found`);
      continue;
    }
    bundles.push({
      userId,
      email,
      displayName: profileMap[userId] ?? 'there',
      notifications,
    });
  }

  const stats = {
    processed_users: bundles.length,
    sent: 0,
    failed: 0,
    total_notifications: rows.length,
  };

  for (const bundle of bundles) {
    const { subject, html } = buildDigestEmail({
      displayName: bundle.displayName,
      notifications: bundle.notifications,
      appUrl,
      settingsUrl,
    });

    let sendOk = false;
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `SharedMinds <${fromAddress}>`,
          to: [bundle.email],
          subject,
          html,
        }),
      });

      if (resendRes.ok) {
        sendOk = true;
      } else {
        const errText = await resendRes.text().catch(() => '');
        console.error(
          `Resend error for digest to ${bundle.userId} (${resendRes.status}):`,
          errText,
        );
      }
    } catch (e) {
      console.error(`Resend fetch threw for digest to ${bundle.userId}:`, e);
    }

    const notifIds = bundle.notifications.map((n) => n.id);

    if (sendOk) {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ email_status: 'sent', email_sent_at: new Date().toISOString() })
        .in('id', notifIds);

      if (updateError) {
        console.error(`Failed to mark notifications as sent for user ${bundle.userId}:`, updateError);
        // Don't double-count as failed since email was actually sent
      }
      stats.sent++;
    } else {
      // Mark as failed so dispatch-notifications can retry or flag
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ email_status: 'failed' })
        .in('id', notifIds);

      if (updateError) {
        console.error(`Failed to mark notifications as failed for user ${bundle.userId}:`, updateError);
      }
      stats.failed++;
    }
  }

  return jsonResponse(stats);
});
