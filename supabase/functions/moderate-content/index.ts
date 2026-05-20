/**
 * moderate-content — Text moderation via OpenAI Moderation API.
 *
 * Called server-side (from a DB webhook or directly from the app) whenever
 * a new message, post, or reply is inserted. Scores the content against
 * OpenAI's free moderation model and, if it breaches the threshold, inserts
 * a content_flag row automatically (auto_flagged = true).
 *
 * Payload shape:
 * {
 *   content_type: 'chat' | 'dm' | 'post' | 'reply'
 *   content_id:   string (UUID of the message/post)
 *   content_text: string
 *   user_id:      string (author UUID)
 * }
 *
 * Deploy:
 *   supabase functions deploy moderate-content
 *   (OPENAI_API_KEY already set from moderate-avatar)
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ModerateRequest {
  content_type: 'chat' | 'dm' | 'post' | 'reply';
  content_id:   string;
  content_text: string;
  user_id:      string;
}

interface OpenAIModResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  category_scores: Record<string, number>;
}

/** Score thresholds — lower = stricter. OpenAI scale: 0.0 – 1.0 */
const THRESHOLDS: Record<string, number> = {
  'harassment':          0.5,
  'harassment/threatening': 0.4,
  'hate':                0.5,
  'hate/threatening':    0.4,
  'self-harm':           0.3,
  'self-harm/intent':    0.3,
  'sexual':              0.6,
  'sexual/minors':       0.1,  // extremely strict
  'violence':            0.6,
  'violence/graphic':    0.5,
};

/** Map OpenAI category → our reason field */
const CATEGORY_TO_REASON: Record<string, string> = {
  'harassment':             'harassment',
  'harassment/threatening': 'harassment',
  'hate':                   'hate_speech',
  'hate/threatening':       'hate_speech',
  'self-harm':              'safety_concern',
  'self-harm/intent':       'safety_concern',
  'sexual':                 'inappropriate',
  'sexual/minors':          'inappropriate',
  'violence':               'inappropriate',
  'violence/graphic':       'inappropriate',
};

/** Which content_flag column to set per content_type */
const CONTENT_TYPE_TO_COL: Record<string, string> = {
  chat:  'flagged_chat_id',
  dm:    'flagged_dm_id',
  post:  'flagged_post_id',
  reply: 'flagged_reply_id',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Skip in dev if explicitly disabled
  if (Deno.env.get('DISABLE_MODERATION') === 'true') {
    return new Response(JSON.stringify({ skipped: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    console.error('moderate-content: OPENAI_API_KEY not set');
    // Fail open — don't block the user's message
    return new Response(JSON.stringify({ approved: true, error: 'no_key' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: ModerateRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { content_type, content_id, content_text, user_id } = body;

  if (!content_text?.trim()) {
    return new Response(JSON.stringify({ approved: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Call OpenAI Moderation API ──────────────────────────────
  let result: OpenAIModResult;
  try {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: content_text }),
    });

    if (!res.ok) {
      console.error('moderate-content: OpenAI error', res.status);
      return new Response(JSON.stringify({ approved: true, error: 'openai_error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    result = data.results?.[0];
  } catch (err) {
    console.error('moderate-content: fetch failed', err);
    // Fail open
    return new Response(JSON.stringify({ approved: true, error: 'fetch_failed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!result) {
    return new Response(JSON.stringify({ approved: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Check against thresholds ────────────────────────────────
  let breachedCategory: string | null = null;
  let maxScore = 0;

  for (const [category, threshold] of Object.entries(THRESHOLDS)) {
    const score = result.category_scores[category] ?? 0;
    if (score >= threshold && score > maxScore) {
      maxScore = score;
      breachedCategory = category;
    }
  }

  const approved = breachedCategory === null;

  // ── If flagged, insert a content_flag row ───────────────────
  if (!approved && breachedCategory) {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      const reason = CATEGORY_TO_REASON[breachedCategory] ?? 'inappropriate';
      const flagCol = CONTENT_TYPE_TO_COL[content_type];

      await supabase.from('content_flags').insert({
        reporter_id:      user_id,   // self-report (auto)
        flagged_user_id:  user_id,
        [flagCol]:        content_id,
        content_type,
        reason,
        content_snapshot: content_text.slice(0, 500),
        auto_flagged:     true,
        auto_flag_score:  maxScore,
        status:           'open',
        notes:            `Auto-flagged by OpenAI: ${breachedCategory} (score ${maxScore.toFixed(3)})`,
      });
    } catch (err) {
      console.error('moderate-content: failed to insert flag', err);
      // Flag insertion failure should not block the message — log and continue
    }
  }

  return new Response(
    JSON.stringify({ approved, flagged_category: breachedCategory, score: maxScore }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
