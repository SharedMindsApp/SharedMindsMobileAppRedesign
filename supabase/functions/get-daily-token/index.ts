/**
 * get-daily-token — creates (or upserts) a Daily.co room and issues a
 * short-lived meeting token for the requesting user.
 *
 * Why server-side: the Daily API key must NEVER reach the browser.
 * We create the room here with the right settings (knocking enabled so
 * participants wait until the host admits them) and return just the
 * meeting URL + a signed participant token.
 *
 * Required Supabase secrets:
 *   DAILY_API_KEY  — from Daily dashboard → Developers → API keys
 *   DAILY_DOMAIN   — your Daily subdomain, e.g. "sharedminds"
 *                    (room URL will be https://sharedminds.daily.co/<room>)
 *
 * Request body:  { roomName: string, displayName: string, isModerator: boolean }
 * Response:      { url: string, token: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY') ?? '';
const DAILY_DOMAIN  = Deno.env.get('DAILY_DOMAIN') ?? '';
const DAILY_BASE    = 'https://api.daily.co/v1';

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function dailyFetch(path: string, options: RequestInit) {
  const res = await fetch(`${DAILY_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DAILY_API_KEY}`,
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// ── Room upsert ───────────────────────────────────────────────────────────────
// Daily room names must be ≤ 99 chars, letters/numbers/hyphens/underscores.
// We create the room with enable_knocking so participants wait in a lobby
// until the owner (isModerator) admits them. If the room already exists
// (HTTP 409) we ignore the error — the settings were already applied when
// it was first created.

async function upsertRoom(roomName: string, bodyDouble: boolean): Promise<void> {
  const { ok, status, data } = await dailyFetch('/rooms', {
    method: 'POST',
    body: JSON.stringify({
      name: roomName,
      privacy: 'private',       // requires a token to join
      properties: {
        // The body-double room is shared/persistent — give it a longer
        // expiry. Other rooms expire in 24h (session-scoped).
        exp: Math.floor(Date.now() / 1000) + (bodyDouble ? 30 * 86_400 : 86_400),
        // Body-double is drop-in (no lobby). All others gate via knocking.
        enable_knocking: !bodyDouble,
        enable_chat: false,
        enable_people_ui: false,
        enable_screenshare: !bodyDouble,    // no screen-share in silent room
        max_participants: bodyDouble ? 50 : 50,
        enable_prejoin_ui: false,
      },
    }),
  });

  // Already exists — perfectly fine, nothing to do.
  // Daily returns 409 OR 400 with info="...already exists" depending on plan.
  const alreadyExists =
    status === 409 ||
    (status === 400 && typeof data?.info === 'string' && data.info.includes('already exists'));
  if (!ok && !alreadyExists) {
    throw new Error(`Failed to create Daily room (${status}): ${JSON.stringify(data)}`);
  }
}

// ── Token ─────────────────────────────────────────────────────────────────────

async function createMeetingToken(
  roomName: string,
  displayName: string,
  isModerator: boolean,
  userId: string,
  bodyDouble: boolean,
): Promise<string> {
  // Body-double mode: camera required ON, mic permanently OFF. Enforced at
  // the protocol layer via Daily's `permissions.canSend` — users physically
  // cannot unmute themselves regardless of what their client tries.
  const bodyDoublePermissions = bodyDouble
    ? { permissions: { canSend: ['video'] as const, hasPresence: true } }
    : {};

  const { ok, data } = await dailyFetch('/meeting-tokens', {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: displayName,
        user_id: userId,
        is_owner: isModerator && !bodyDouble,   // body-double has no owners
        // NOTE: avatar URL is NOT set here — Daily's meeting-token API rejects
        // a `user_data` property ("invalid property name"). The client sets it
        // via callObject.setUserData({ avatarUrl }) after joining instead, so
        // camera-off participants still render their profile picture.
        // Token valid for 4 hours — session can't legitimately run longer
        exp: Math.floor(Date.now() / 1000) + 4 * 60 * 60,
        ...bodyDoublePermissions,
      },
    }),
  });

  if (!ok || !data?.token) {
    throw new Error(`Failed to create Daily meeting token: ${JSON.stringify(data)}`);
  }
  return data.token as string;
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // ── Auth: caller must be a signed-in user ─────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  // ── Secrets check ─────────────────────────────────────────────────────────
  if (!DAILY_API_KEY || !DAILY_DOMAIN) {
    console.error('[get-daily-token] DAILY_API_KEY or DAILY_DOMAIN not set');
    return json({ error: 'Video service not configured' }, 503);
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  const { roomName, displayName, isModerator = false, bodyDouble = false } = await req.json() as {
    roomName: string;
    displayName: string;
    isModerator?: boolean;
    bodyDouble?: boolean;
  };

  if (!roomName || !displayName) {
    return json({ error: 'roomName and displayName are required' }, 400);
  }

  // Sanitise: Daily allows letters, numbers, hyphens, underscores (≤ 99 chars)
  const safeRoom = roomName.replace(/[^a-zA-Z0-9\-_]/g, '-').slice(0, 99);

  // Avatar URL is no longer fetched here — the client sets it on the call
  // object via setUserData() after joining (Daily rejects a `user_data`
  // meeting-token property).

  try {
    await upsertRoom(safeRoom, bodyDouble);
    const token = await createMeetingToken(safeRoom, displayName, isModerator, user.id, bodyDouble);
    const url = `https://${DAILY_DOMAIN}.daily.co/${safeRoom}`;
    return json({ url, token });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[get-daily-token] Error:', msg);
    // Return the actual error message so the client can show useful debug info
    return json({ error: msg }, 500);
  }
});
