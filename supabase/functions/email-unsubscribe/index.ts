// email-unsubscribe Edge Function — login-free opt-out from emails.
//
// Two entry points, per RFC 8058 + anti-prefetch best practice:
//
//   GET  /email-unsubscribe?token=…&cat=…
//        Renders a confirmation page with a one-click button. We do
//        NOT unsubscribe on GET, because mail clients and security
//        scanners prefetch links and would unsubscribe people who
//        never clicked.
//
//   POST /email-unsubscribe?token=…&cat=…
//        Performs the unsubscribe. This is hit by (a) the form on the
//        confirmation page and (b) Gmail/Yahoo's one-click handler,
//        which POSTs `List-Unsubscribe=One-Click`. Either way we flip
//        the preference off and show a success page.
//
// `cat` is an email_* preference column name, or 'all' (default) to
// turn off every non-essential category. Validation happens in the
// unsubscribe_by_token() RPC.
//
// Deploy:
//   supabase functions deploy email-unsubscribe --no-verify-jwt
//   (must be public — the user is not logged in when they click)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const APP_URL = Deno.env.get('APP_URL') ?? 'https://app.sharedminds.app';

function page(title: string, bodyHtml: string, status = 200): Response {
  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex" />
<title>${title} · SharedMinds</title>
<style>
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
         background:#f4f6f9; color:#0f172a; display:flex; align-items:center; justify-content:center;
         min-height:100vh; padding:24px; }
  .card { background:#fff; border-radius:16px; box-shadow:0 1px 3px rgba(0,0,0,.08),0 8px 24px rgba(0,0,0,.06);
          max-width:440px; width:100%; padding:36px 32px; text-align:center; }
  h1 { font-size:20px; margin:0 0 12px; }
  p { font-size:14px; line-height:1.6; color:#475569; margin:0 0 20px; }
  .btn { display:inline-block; padding:12px 26px; border-radius:10px; font-size:14px; font-weight:700;
         text-decoration:none; border:none; cursor:pointer; }
  .btn-primary { background:#0891b2; color:#fff; }
  .btn-ghost { background:#f1f5f9; color:#475569; margin-top:10px; }
  .muted { font-size:12px; color:#94a3b8; margin-top:18px; }
</style></head>
<body><div class="card">${bodyHtml}</div></body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'all non-essential',
  email_session_reminders: 'session reminder',
  email_messages: 'direct message',
  email_post_replies: 'post reply',
  email_connection_requests: 'connection',
  email_weekly_review: 'weekly review',
  email_onboarding: 'getting-started',
  email_community_sessions: 'community session',
  email_marketing: 'product & marketing',
};

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  const cat = url.searchParams.get('cat') ?? 'all';
  const label = CATEGORY_LABELS[cat] ?? 'these';

  if (!token) {
    return page('Invalid link', `<h1>That link looks broken</h1>
      <p>We couldn't read the unsubscribe token. Please use the link from a recent email, or manage your preferences in the app.</p>
      <a class="btn btn-primary" href="${APP_URL}/settings">Open settings</a>`, 400);
  }

  // ── GET: show confirmation (do NOT unsubscribe — avoid prefetch) ──
  if (req.method === 'GET') {
    return page('Unsubscribe', `
      <h1>Unsubscribe from ${label} emails?</h1>
      <p>You'll stop receiving ${cat === 'all' ? 'all non-essential' : label} emails from SharedMinds. Essential account emails (security, password resets) will still be sent.</p>
      <form method="POST" action="${url.pathname}?token=${encodeURIComponent(token)}&cat=${encodeURIComponent(cat)}">
        <button class="btn btn-primary" type="submit">Yes, unsubscribe me</button>
      </form>
      <a class="btn btn-ghost" href="${APP_URL}/settings">Manage all preferences instead</a>
      <p class="muted">You can re-enable any time in Settings → Notifications.</p>
    `);
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // ── POST: perform the unsubscribe ──
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return page('Something went wrong', `<h1>We hit a snag</h1>
      <p>Please try again, or email <a href="mailto:privacy@sharedminds.app">privacy@sharedminds.app</a>.</p>`, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc('unsubscribe_by_token', { p_token: token, p_category: cat });

  if (error || !data?.ok) {
    const reason = data?.error ?? error?.message ?? 'unknown';
    if (reason === 'invalid_token') {
      return page('Link expired', `<h1>This link is no longer valid</h1>
        <p>Your unsubscribe link may have changed. Please manage your email preferences in the app instead.</p>
        <a class="btn btn-primary" href="${APP_URL}/settings">Open settings</a>`, 410);
    }
    return page('Something went wrong', `<h1>We couldn't complete that</h1>
      <p>Please try again, or email <a href="mailto:privacy@sharedminds.app">privacy@sharedminds.app</a> and we'll sort it manually.</p>`, 500);
  }

  const name = (data?.name as string) ?? 'there';
  return page('Unsubscribed', `
    <h1>You're unsubscribed</h1>
    <p>Done, ${name}. You'll no longer receive ${cat === 'all' ? 'non-essential' : label} emails from SharedMinds. Essential account emails will still reach you.</p>
    <a class="btn btn-primary" href="${APP_URL}/settings">Fine-tune your preferences</a>
    <p class="muted">Changed your mind? Re-enable any category in Settings → Notifications.</p>
  `);
});
