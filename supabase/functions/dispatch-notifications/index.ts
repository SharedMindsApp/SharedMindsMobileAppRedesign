// dispatch-notifications Edge Function
// Fetches pending notifications and dispatches them via email (Resend) AND
// Web Push (VAPID). Respects per-user digest_mode and category preferences.
//
// Deploy:
//   supabase functions deploy dispatch-notifications
//
// Required secrets:
//   supabase secrets set RESEND_API_KEY=re_...
//   supabase secrets set DISPATCH_SECRET=<random-token>
//   supabase secrets set VAPID_PUBLIC_KEY=<base64url>   # from: npx web-push generate-vapid-keys
//   supabase secrets set VAPID_PRIVATE_KEY=<base64url>
//   supabase secrets set VAPID_SUBJECT=mailto:hello@sharedminds.app
//   supabase secrets set APP_URL=https://app.sharedminds.app
//
// Schedule via pg_cron (every minute) — see migration 20260520000019.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  related_id: string | null;
  deep_link: string | null;
  read_at: string | null;
  email_sent_at: string | null;
  email_status: string | null;
  scheduled_for: string | null;
  created_at: string;
  // joined
  display_name: string;
  timezone: string | null;
  last_seen_at: string | null;
  user_email: string;
  email_session_reminders: boolean | null;
  email_messages: boolean | null;
  email_post_replies: boolean | null;
  email_connection_requests: boolean | null;
  email_weekly_review: boolean | null;
  email_onboarding: boolean | null;
  email_community_sessions: boolean | null;
  email_marketing: boolean | null;
  digest_mode: 'realtime' | 'daily' | 'off' | null;
  dm_inactivity_threshold_hours: number | null;
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
// Category preference mapping
// ---------------------------------------------------------------------------

type PreferenceKey =
  | 'email_session_reminders'
  | 'email_messages'
  | 'email_post_replies'
  | 'email_connection_requests'
  | 'email_weekly_review'
  | 'email_onboarding'
  | 'email_community_sessions'
  | 'email_marketing';

const TYPE_TO_PREFERENCE: Record<string, PreferenceKey> = {
  session_reminder_24h: 'email_session_reminders',
  session_reminder_15min: 'email_session_reminders',
  session_reminder_5min: 'email_session_reminders',
  session_missed: 'email_session_reminders',
  community_session_reminder: 'email_community_sessions',
  new_dm: 'email_messages',
  post_reply: 'email_post_replies',
  post_reaction: 'email_post_replies',
  connection_request: 'email_connection_requests',
  connection_accepted: 'email_connection_requests',
  weekly_review_prompt: 'email_weekly_review',
  onboarding_day_1: 'email_onboarding',
  onboarding_day_3: 'email_onboarding',
  onboarding_day_7: 'email_onboarding',
  stuck_help_offered: 'email_messages',
  project_invite: 'email_connection_requests',
};

// ---------------------------------------------------------------------------
// Accent colors by notification type
// ---------------------------------------------------------------------------

const TYPE_TO_COLOR: Record<string, string> = {
  session_reminder_24h: '#0891b2',
  session_reminder_15min: '#0891b2',
  session_reminder_5min: '#d97706',
  session_missed: '#475569',  // slate — muted, non-alarming
  // streak_at_risk has no email entry above: it's habit_nudges
  // category which is intentionally in-app only. No email key needed.
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

function accentColor(type: string): string {
  return TYPE_TO_COLOR[type] ?? '#0891b2';
}

// ---------------------------------------------------------------------------
// Email builder
// ---------------------------------------------------------------------------

function buildEmail(params: {
  notificationType: string;
  title: string;
  body: string;
  deepLink: string | null;
  displayName: string;
  appUrl: string;
  settingsUrl: string;
}): { subject: string; html: string } {
  const { notificationType, title, body, deepLink, displayName, appUrl, settingsUrl } = params;
  const accent = accentColor(notificationType);
  const ctaUrl = deepLink ? `${appUrl}${deepLink}` : appUrl;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(title)}</title>
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
            <td style="height:4px;background-color:${accent};font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">

              <!-- Title -->
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
                ${escapeHtml(title)}
              </h1>

              <!-- Body text -->
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#475569;">
                ${escapeHtml(body)}
              </p>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background-color:${accent};">
                    <a href="${ctaUrl}"
                       target="_blank"
                       style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">
                      View in SharedMinds
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
                Hi ${escapeHtml(displayName)} — you're receiving this because you're a SharedMinds member.
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

  return { subject: title, html };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

  const supabaseUrl      = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendApiKey     = Deno.env.get('RESEND_API_KEY');
  const appUrl           = Deno.env.get('APP_URL') ?? 'https://app.sharedminds.app';
  const vapidPublicKey   = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey  = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject     = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@sharedminds.app';

  // Configure web-push VAPID credentials (optional — push just skipped if absent)
  const pushEnabled = !!(vapidPublicKey && vapidPrivateKey);
  if (pushEnabled) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey!, vapidPrivateKey!);
  }
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
  // Fetch up to 50 pending notifications (with profile join only)
  // notification_preferences has no FK to notifications so we fetch it
  // separately below to avoid schema-cache join errors.
  // ------------------------------------------------------------------
  const { data: notifications, error: fetchError } = await supabase
    .from('notifications')
    .select(`
      id, user_id, type, title, body, related_id, deep_link,
      read_at, email_sent_at, email_status, scheduled_for, created_at,
      profiles!inner ( display_name, timezone, last_seen_at )
    `)
    .is('email_sent_at', null)
    .not('email_status', 'in', '("sent","failed","skipped","digest_queued")')
    .or('scheduled_for.is.null,scheduled_for.lte.' + new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(50);

  if (fetchError) {
    console.error('Error fetching notifications:', fetchError);
    return jsonResponse({ error: 'Failed to fetch notifications', details: fetchError.message }, 500);
  }

  // Collect unique user IDs for follow-up queries
  const userIds = [...new Set(((notifications ?? []) as Record<string, unknown>[]).map((n) => n['user_id'] as string))];

  // Fetch notification preferences separately (no FK to notifications table)
  const prefsMap: Record<string, Record<string, unknown>> = {};
  if (userIds.length > 0) {
    const { data: prefsRows } = await supabase
      .from('notification_preferences')
      .select('user_id, email_session_reminders, email_messages, email_post_replies, email_connection_requests, email_weekly_review, email_onboarding, email_community_sessions, email_marketing, digest_mode, dm_inactivity_threshold_hours')
      .in('user_id', userIds);
    for (const p of (prefsRows ?? []) as Record<string, unknown>[]) {
      prefsMap[p['user_id'] as string] = p;
    }
  }

  // Flatten notifications + profiles + prefs into rows
  const rows: NotificationRow[] = ((notifications ?? []) as Record<string, unknown>[]).map((n) => {
    const profile = (n['profiles'] as Record<string, unknown> | null) ?? {};
    const prefs: Record<string, unknown> = prefsMap[n['user_id'] as string] ?? {};
    return {
      id: n['id'] as string,
      user_id: n['user_id'] as string,
      type: n['type'] as string,
      title: n['title'] as string,
      body: n['body'] as string,
      related_id: n['related_id'] as string | null,
      deep_link: n['deep_link'] as string | null,
      read_at: n['read_at'] as string | null,
      email_sent_at: n['email_sent_at'] as string | null,
      email_status: n['email_status'] as string | null,
      scheduled_for: n['scheduled_for'] as string | null,
      created_at: n['created_at'] as string,
      display_name: (profile['display_name'] as string) ?? 'there',
      timezone: profile['timezone'] as string | null,
      last_seen_at: profile['last_seen_at'] as string | null,
      user_email: '',
      email_session_reminders: prefs['email_session_reminders'] as boolean | null,
      email_messages: prefs['email_messages'] as boolean | null,
      email_post_replies: prefs['email_post_replies'] as boolean | null,
      email_connection_requests: prefs['email_connection_requests'] as boolean | null,
      email_weekly_review: prefs['email_weekly_review'] as boolean | null,
      email_onboarding: prefs['email_onboarding'] as boolean | null,
      email_community_sessions: prefs['email_community_sessions'] as boolean | null,
      email_marketing: prefs['email_marketing'] as boolean | null,
      digest_mode: (prefs['digest_mode'] as 'realtime' | 'daily' | 'off' | null) ?? 'realtime',
      dm_inactivity_threshold_hours: prefs['dm_inactivity_threshold_hours'] as number | null,
    };
  });

  // Fetch auth.users emails via admin API (not accessible via normal join)
  const emailMap: Record<string, string> = {};

  if (userIds.length > 0) {
    // Use the admin listUsers approach (paginated, but 50 max rows means ≤50 users)
    for (const uid of userIds) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(uid);
      if (userError || !userData?.user?.email) {
        console.warn(`Could not fetch email for user ${uid}:`, userError?.message);
      } else {
        emailMap[uid] = userData.user.email;
      }
    }
  }

  // ------------------------------------------------------------------
  // Pre-fetch push subscriptions for all users in this batch
  // (one query instead of N queries inside the loop)
  // ------------------------------------------------------------------
  const pushSubsByUser: Record<string, Array<{ endpoint: string; p256dh: string; auth_key: string }>> = {};

  if (pushEnabled && userIds.length > 0) {
    const { data: pushSubs } = await supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth_key')
      .in('user_id', userIds);

    for (const sub of (pushSubs ?? []) as Array<{ user_id: string; endpoint: string; p256dh: string; auth_key: string }>) {
      if (!pushSubsByUser[sub.user_id]) pushSubsByUser[sub.user_id] = [];
      pushSubsByUser[sub.user_id].push({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth_key: sub.auth_key });
    }
  }

  // ------------------------------------------------------------------
  // Process each notification
  // ------------------------------------------------------------------
  const stats = { processed: 0, sent: 0, skipped: 0, queued_for_digest: 0, failed: 0, push_sent: 0 };

  for (const row of rows) {
    stats.processed++;
    const userEmail = emailMap[row.user_id];
    if (!userEmail) {
      // Can't send without email; mark failed
      await supabase
        .from('notifications')
        .update({ email_status: 'failed' })
        .eq('id', row.id);
      stats.failed++;
      continue;
    }

    const digestMode = row.digest_mode ?? 'realtime';

    // digest_mode: off → skip
    if (digestMode === 'off') {
      await supabase
        .from('notifications')
        .update({ email_status: 'skipped' })
        .eq('id', row.id);
      stats.skipped++;
      continue;
    }

    // digest_mode: daily → queue for digest
    if (digestMode === 'daily') {
      await supabase
        .from('notifications')
        .update({ email_status: 'digest_queued' })
        .eq('id', row.id);
      stats.queued_for_digest++;
      continue;
    }

    // digest_mode: realtime — check category preference
    const prefKey = TYPE_TO_PREFERENCE[row.type];
    if (prefKey) {
      const enabled = row[prefKey];
      // null means no row in notification_preferences → default to enabled
      if (enabled === false) {
        await supabase
          .from('notifications')
          .update({ email_status: 'skipped' })
          .eq('id', row.id);
        stats.skipped++;
        continue;
      }
    }

    // DM inactivity check: skip if user was recently active
    if (row.type === 'new_dm') {
      const threshold = row.dm_inactivity_threshold_hours ?? 0;
      if (threshold > 0 && row.last_seen_at) {
        const lastSeenMs = new Date(row.last_seen_at).getTime();
        const thresholdMs = threshold * 60 * 60 * 1000;
        if (Date.now() - lastSeenMs < thresholdMs) {
          // User is active — no need to email
          await supabase
            .from('notifications')
            .update({ email_status: 'skipped' })
            .eq('id', row.id);
          stats.skipped++;
          continue;
        }
      }
    }

    // Send via Resend
    const { subject, html } = buildEmail({
      notificationType: row.type,
      title: row.title,
      body: row.body,
      deepLink: row.deep_link,
      displayName: row.display_name,
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
          to: [userEmail],
          subject,
          html,
        }),
      });

      if (resendRes.ok) {
        sendOk = true;
      } else {
        const errText = await resendRes.text().catch(() => '');
        console.error(`Resend error for notification ${row.id} (${resendRes.status}):`, errText);
      }
    } catch (e) {
      console.error(`Resend fetch threw for notification ${row.id}:`, e);
    }

    if (sendOk) {
      await supabase
        .from('notifications')
        .update({ email_status: 'sent', email_sent_at: new Date().toISOString() })
        .eq('id', row.id);
      stats.sent++;
    } else {
      await supabase
        .from('notifications')
        .update({ email_status: 'failed' })
        .eq('id', row.id);
      stats.failed++;
    }

    // ── Web Push ────────────────────────────────────────────────────────────
    // Send push independently of email — different channel, different opt-in.
    // We always attempt push for realtime notifications (never for digest_queued
    // or skipped-by-category). Push preference checked via push_enabled column.
    if (pushEnabled && digestMode !== 'off' && digestMode !== 'daily') {
      const subs = pushSubsByUser[row.user_id] ?? [];
      if (subs.length === 0) {
        await supabase
          .from('notifications')
          .update({ push_status: 'no_subscription' })
          .eq('id', row.id);
      } else {
        const payload = JSON.stringify({
          title:     row.title,
          body:      row.body,
          deepLink:  row.deep_link ?? '/',
          tag:       `sm-${row.type}-${row.id}`,
          type:      row.type,
        });

        let pushOk = false;
        const expiredEndpoints: string[] = [];

        await Promise.allSettled(
          subs.map(async (sub) => {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
                payload,
                { TTL: 60 * 60 * 24 }, // expire after 24 hours if undeliverable
              );
              pushOk = true;
            } catch (err: any) {
              // 410 Gone / 404 = subscription expired, clean it up
              if (err?.statusCode === 410 || err?.statusCode === 404) {
                expiredEndpoints.push(sub.endpoint);
              } else {
                console.warn(`Push failed for ${sub.endpoint}:`, err?.message ?? err);
              }
            }
          }),
        );

        // Clean up expired subscriptions
        if (expiredEndpoints.length > 0) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', row.user_id)
            .in('endpoint', expiredEndpoints);
        }

        await supabase
          .from('notifications')
          .update({
            push_status:  pushOk ? 'sent' : 'failed',
            push_sent_at: pushOk ? new Date().toISOString() : null,
          })
          .eq('id', row.id);

        if (pushOk) stats.push_sent++;
      }
    }
  }

  return jsonResponse(stats);
});
