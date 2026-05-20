/**
 * get-jaas-token — signs a JaaS (8x8 Jitsi as a Service) JWT for a user.
 *
 * The JWT is RS256-signed with the JaaS private key (kept in Supabase secrets,
 * never exposed to the browser). The moderator flag is determined by the caller
 * (ActiveSessionPage compares session.user_id === auth.user.id).
 *
 * Required secrets:
 *   JAAS_APP_ID      = vpaas-magic-cookie-7bdbb65dfc884656b9832f9662e6046e
 *   JAAS_API_KEY_ID  = <the Key ID shown in your JaaS dashboard>
 *   JAAS_PRIVATE_KEY = <PEM-encoded RSA private key, newlines as \n>
 *
 * Request body: { roomName: string, displayName: string, isModerator: boolean }
 * Response:     { token: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SignJWT, importPKCS8 } from 'npm:jose';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_ID   = Deno.env.get('JAAS_APP_ID') ?? '';
const KEY_ID   = Deno.env.get('JAAS_API_KEY_ID') ?? '';
// Supabase secrets store literal \n — convert to real newlines for PEM parsing
const PRIV_PEM = (Deno.env.get('JAAS_PRIVATE_KEY') ?? '').replace(/\\n/g, '\n');

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // ── Auth: verify the calling user is logged in ────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  // ── Validate secrets are configured ──────────────────────────────────────
  if (!APP_ID || !KEY_ID || !PRIV_PEM) {
    console.error('[get-jaas-token] Missing JAAS secrets — check JAAS_APP_ID, JAAS_API_KEY_ID, JAAS_PRIVATE_KEY');
    return json({ error: 'JaaS not configured' }, 503);
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  const { roomName, displayName, isModerator = false } = await req.json() as {
    roomName: string;
    displayName: string;
    isModerator?: boolean;
  };

  if (!roomName || !displayName) {
    return json({ error: 'roomName and displayName are required' }, 400);
  }

  // ── Sign the JaaS JWT ─────────────────────────────────────────────────────
  try {
    const privateKey = await importPKCS8(PRIV_PEM, 'RS256');

    const token = await new SignJWT({
      // JaaS context — user identity + feature gates
      context: {
        features: {
          livestreaming: false,
          'outbound-call': false,
          'sip-outbound-call': false,
          transcription: false,
        },
        user: {
          'hidden-from-recorder': false,
          moderator: isModerator,
          name: displayName,
          id: user.id,
          email: user.email ?? '',
          avatar: '',
        },
      },
      // Room scope: specific room so the token can't be replayed elsewhere
      room: roomName,
    })
      .setProtectedHeader({ alg: 'RS256', kid: `${APP_ID}/${KEY_ID}`, typ: 'JWT' })
      .setIssuer('chat')
      .setSubject(APP_ID)
      .setAudience('jitsi')
      .setIssuedAt()
      .setNotBefore('0s')
      .setExpirationTime('2h')
      .sign(privateKey);

    return json({ token });
  } catch (err) {
    console.error('[get-jaas-token] JWT signing failed:', err);
    return json({ error: 'Token generation failed' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
