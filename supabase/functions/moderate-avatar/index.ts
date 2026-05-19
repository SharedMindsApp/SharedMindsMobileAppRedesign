// Avatar moderation Edge Function.
// Receives a base64-encoded image, runs it through OpenAI's omni-moderation
// model (free for image moderation), and returns approved/flagged.
//
// Deploy:
//   supabase functions deploy moderate-avatar
//   supabase secrets set OPENAI_API_KEY=sk-...
//
// To bypass moderation in dev (NOT for prod):
//   supabase secrets set DISABLE_MODERATION=true

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ModerationRequest {
  /** Data URL (e.g. "data:image/jpeg;base64,...") */
  image: string;
}

interface ModerationResponse {
  approved: boolean;
  reasons?: string[];
  error?: string;
}

interface OpenAIModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  category_scores: Record<string, number>;
}

interface OpenAIModerationApiResponse {
  results: OpenAIModerationResult[];
}

/** Categories we strictly reject for avatars. */
const REJECT_CATEGORIES = [
  'sexual',
  'sexual/minors',
  'violence',
  'violence/graphic',
  'hate',
  'hate/threatening',
  'self-harm',
  'self-harm/intent',
  'self-harm/instructions',
  'harassment/threatening',
];

function bad(message: string, status = 400): Response {
  const body: ModerationResponse = { approved: false, error: message };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function ok(body: ModerationResponse): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return bad('Method not allowed', 405);
  }

  // Dev bypass
  if (Deno.env.get('DISABLE_MODERATION') === 'true') {
    return ok({ approved: true });
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    return bad('OPENAI_API_KEY not configured', 500);
  }

  let body: ModerationRequest;
  try {
    body = await req.json();
  } catch {
    return bad('Invalid JSON');
  }

  if (!body.image || typeof body.image !== 'string') {
    return bad('Missing image');
  }
  if (!body.image.startsWith('data:image/')) {
    return bad('image must be a data URL (data:image/...)');
  }
  if (body.image.length > 8 * 1024 * 1024) {
    // ~6 MB after base64 decode — well over our 512x512 JPEG (~200 KB)
    return bad('Image too large');
  }

  // Call OpenAI moderation
  let moderationResponse: Response;
  try {
    moderationResponse = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: [
          {
            type: 'image_url',
            image_url: { url: body.image },
          },
        ],
      }),
    });
  } catch (e) {
    console.error('OpenAI fetch failed:', e);
    return bad('Moderation service unavailable', 503);
  }

  if (!moderationResponse.ok) {
    const errText = await moderationResponse.text().catch(() => '');
    console.error('OpenAI returned non-200:', moderationResponse.status, errText);
    return bad('Moderation service error', 502);
  }

  const data = (await moderationResponse.json()) as OpenAIModerationApiResponse;
  const result = data.results?.[0];
  if (!result) {
    return bad('Moderation returned no result', 502);
  }

  // Check our reject list — OpenAI returns more granular categories, we
  // only block on the ones that matter for a profile photo.
  const flaggedReasons: string[] = [];
  for (const cat of REJECT_CATEGORIES) {
    if (result.categories[cat]) {
      flaggedReasons.push(cat);
    }
  }

  if (flaggedReasons.length > 0) {
    console.log('Image rejected:', flaggedReasons.join(', '));
    return ok({ approved: false, reasons: flaggedReasons });
  }

  return ok({ approved: true });
});
