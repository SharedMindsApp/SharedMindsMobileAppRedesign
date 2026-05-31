/**
 * daily-usage — returns ACTUAL Daily.co usage (the billing source of truth).
 *
 * The admin cost page previously *estimated* participant-minutes from session
 * durations, which massively overcounts: Daily bills only for the seconds a
 * participant is actually connected to a room, not the declared session length.
 * This function pulls the real figures from Daily's REST API instead.
 *
 * Admin-only. Aggregates the /meetings endpoint over a time window into total
 * participant-minutes (sum of each participant's connected seconds ÷ 60), which
 * is exactly what Daily charges on.
 *
 * Required Supabase secrets: DAILY_API_KEY (already set for get-daily-token).
 *
 * Request body: { days?: number }  (default 30)
 * Response: { participantMinutes, meetingCount, ongoing, windowDays, byDay: [{date, minutes}] }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY') ?? '';
const DAILY_BASE = 'https://api.daily.co/v1';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

interface DailyParticipant { duration?: number }
interface DailyMeeting {
  id: string;
  start_time?: number;          // unix seconds
  duration?: number;            // seconds
  ongoing?: boolean;
  participants?: DailyParticipant[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // ── Auth: signed-in admin only ──────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if ((prof as { role?: string } | null)?.role !== 'admin') {
    return json({ error: 'Forbidden — admin only' }, 403);
  }

  if (!DAILY_API_KEY) {
    console.error('[daily-usage] DAILY_API_KEY not set');
    return json({ error: 'Video service not configured' }, 503);
  }

  let days = 30;
  try {
    const body = await req.json();
    if (typeof body?.days === 'number' && body.days > 0) days = Math.min(365, body.days);
  } catch { /* default window */ }

  const nowSec = Math.floor(Date.now() / 1000);
  const startSec = nowSec - days * 86400;

  // ── Page through /meetings within the window ──────────────────────────────
  let participantSeconds = 0;
  let meetingCount = 0;
  let ongoing = 0;
  const byDay = new Map<string, number>();   // date → participant-minutes

  let startingAfter: string | null = null;
  for (let page = 0; page < 50; page++) {     // hard cap: 50 × 100 = 5,000 meetings
    const params = new URLSearchParams({
      limit: '100',
      timeframe_start: String(startSec),
      timeframe_end: String(nowSec),
    });
    if (startingAfter) params.set('starting_after', startingAfter);

    const res = await fetch(`${DAILY_BASE}/meetings?${params}`, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[daily-usage] Daily API error', res.status, text);
      return json({ error: `Daily API error (${res.status})` }, 502);
    }
    const payload = await res.json() as { data?: DailyMeeting[] };
    const meetings = payload.data ?? [];
    if (meetings.length === 0) break;

    for (const m of meetings) {
      meetingCount++;
      if (m.ongoing) ongoing++;
      const mins = (m.participants ?? []).reduce((sum, p) => sum + (p.duration ?? 0), 0) / 60;
      participantSeconds += (m.participants ?? []).reduce((sum, p) => sum + (p.duration ?? 0), 0);
      if (m.start_time) {
        const date = new Date(m.start_time * 1000).toISOString().slice(0, 10);
        byDay.set(date, (byDay.get(date) ?? 0) + mins);
      }
    }

    if (meetings.length < 100) break;
    startingAfter = meetings[meetings.length - 1].id;
  }

  return json({
    participantMinutes: Math.round(participantSeconds / 60),
    meetingCount,
    ongoing,
    windowDays: days,
    byDay: Array.from(byDay.entries())
      .map(([date, minutes]) => ({ date, minutes: Math.round(minutes) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  });
});
