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
  /** Detailed verdict: which gate did the image fail at? */
  status?: 'approved' | 'rejected_face' | 'rejected_safety' | 'error';
  /** Short human-readable reason (shown to user when rejected) */
  reason?: string;
  /** Legacy field — kept for backward compatibility with old clients */
  reasons?: string[];
  error?: string;
}

interface FaceCheckResult {
  is_real_photo_of_person: boolean;
  single_person: boolean;
  face_clearly_visible: boolean;
  appropriate_for_profile: boolean;
  reason: string;
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
    console.log('Image rejected (safety):', flaggedReasons.join(', '));
    return ok({
      approved: false,
      status: 'rejected_safety',
      reason: 'Image flagged for inappropriate content.',
      reasons: flaggedReasons,
    });
  }

  // ── Face verification ─────────────────────────────────────────────────────
  // Safety passed — now verify it's actually a real photograph of a single
  // human face. This is what prevents people from staying anonymous behind
  // cartoons, logos, AI-generated images, or pet photos.
  let faceResult: FaceCheckResult;
  try {
    const visionResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // gpt-4o-mini — verified OpenAI model name with vision support.
        // Plenty smart for a single-image face-presence check, and cheap
        // (~$0.0002 per request). Falls through to fail-open below if
        // anything errors, so user uploads aren't blocked.
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You evaluate profile photos for a professional coworking platform. ' +
              'Profile photos must be REAL photographs of a single, clearly identifiable human face. ' +
              'Reject: illustrations, drawings, cartoons, anime, AI-generated faces, animals, ' +
              'logos, scenery, multiple people, severely obscured faces (sunglasses + hat + mask), ' +
              'photos of photos, screenshots from media. ' +
              'Accept: clear unedited photographs of one real person\'s face, well-lit, suitable as a headshot.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'Reply ONLY with this JSON shape (no prose):\n' +
                  '{\n' +
                  '  "is_real_photo_of_person": boolean,\n' +
                  '  "single_person": boolean,\n' +
                  '  "face_clearly_visible": boolean,\n' +
                  '  "appropriate_for_profile": boolean,\n' +
                  '  "reason": "short explanation (max 80 chars)"\n' +
                  '}',
              },
              { type: 'image_url', image_url: { url: body.image } },
            ],
          },
        ],
      }),
    });

    if (!visionResp.ok) {
      console.error('Face check non-200:', visionResp.status);
      // Fail-open on infrastructure errors — better to approve a doubtful
      // photo than to block legitimate users when our API is down.
      return ok({
        approved: true,
        status: 'approved',
        reason: 'Verification service unavailable; approved provisionally.',
      });
    }

    const visionJson = await visionResp.json();
    const content = visionJson?.choices?.[0]?.message?.content ?? '{}';
    faceResult = JSON.parse(content) as FaceCheckResult;
  } catch (e) {
    console.error('Face check failed:', e);
    return ok({
      approved: true,
      status: 'approved',
      reason: 'Verification service error; approved provisionally.',
    });
  }

  const facePassed =
    faceResult.is_real_photo_of_person &&
    faceResult.single_person &&
    faceResult.face_clearly_visible;

  if (!facePassed) {
    console.log('Image rejected (face):', faceResult.reason);
    return ok({
      approved: false,
      status: 'rejected_face',
      reason: faceResult.reason || 'Please upload a clear photo of your face.',
    });
  }

  return ok({ approved: true, status: 'approved' });
});
