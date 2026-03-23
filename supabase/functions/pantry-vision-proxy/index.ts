import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

export const config = {
  verifyJWT: false,
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL =
  Deno.env.get('OPENROUTER_PANTRY_VISION_MODEL') ||
  'google/gemini-3.1-flash-lite-preview';

interface PantryVisionRequest {
  image: string;
  mimeType?: string;
  filename?: string;
}

interface PantryVisionItem {
  item_name: string;
  item_type: string | null;
  category: string | null;
  quantity_value: string | null;
  quantity_unit: string | null;
  estimated_weight_grams: number | null;
  expires_on: string | null;
  expiry_source: 'visible' | 'estimated' | 'unknown';
  confidence: number | null;
  notes: string | null;
}

interface PantryVisionResponse {
  success: boolean;
  items?: PantryVisionItem[];
  model?: string;
  error?: string;
  statusCode?: number;
}

function buildSystemPrompt() {
  return [
    'You are analyzing a pantry or food stock photo for inventory intake.',
    'Return JSON only.',
    'Detect multiple distinct food items in the same photo.',
    'Aggregate visible duplicates of the same product into one item and use quantity_value/quantity_unit to reflect count, for example 6 tins or 3 packets.',
    'Prefer exact packaging text when visible.',
    'Output values should be ready to pre-fill an inventory form for human confirmation and editing.',
    'item_name should be the clean product or food name suitable for a pantry database.',
    'item_type should describe the packaging or product form, for example canned beans, dry pasta, bottled water. Use a best guess instead of null unless impossible.',
    'category should be a short grocery-style category such as canned goods, grains, pasta, snacks, beverages, baking, condiments, frozen, produce, meat, dairy, pet food, medical nutrition, other. Use a best guess instead of null unless impossible.',
    'quantity_value should almost always be filled when an item is visible. For one visible package, use 1. For multiple visible duplicates, use the visible count. Use null only if counting is genuinely impossible.',
    'quantity_unit should be the packaging/count unit such as tin, tins, can, cans, bottle, bottles, packet, packets, box, boxes, bag, bags, jar, jars, carton, cartons, item, items. Prefer the packaging type visible in the image.',
    'estimated_weight_grams should be the best estimate for the amount in one tracked unit or package. Use grams for solids and gram-equivalent estimates for liquids when possible. Prefer a reasonable best guess instead of null when the product type is clear.',
    'expires_on must be YYYY-MM-DD when exact date is visible or can be conservatively estimated. If not possible, use null.',
    'expiry_source must be one of visible, estimated, unknown.',
    'confidence must be between 0 and 1.',
    'notes should briefly mention uncertainty, visible expiry text, inferred assumptions, or anything useful for user review and correction.',
    'Do not invent extra items that are not reasonably visible.',
    'If no food items are visible, return an empty items array.',
  ].join(' ');
}

function buildResponseFormat() {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'pantry_vision_result',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                item_name: { type: 'string' },
                item_type: { type: ['string', 'null'] },
                category: { type: ['string', 'null'] },
                quantity_value: { type: ['string', 'null'] },
                quantity_unit: { type: ['string', 'null'] },
                estimated_weight_grams: { type: ['number', 'null'] },
                expires_on: { type: ['string', 'null'] },
                expiry_source: {
                  type: 'string',
                  enum: ['visible', 'estimated', 'unknown'],
                },
                confidence: { type: ['number', 'null'] },
                notes: { type: ['string', 'null'] },
              },
              required: [
                'item_name',
                'item_type',
                'category',
                'quantity_value',
                'quantity_unit',
                'estimated_weight_grams',
                'expires_on',
                'expiry_source',
                'confidence',
                'notes',
              ],
            },
          },
        },
        required: ['items'],
      },
    },
  };
}

function sanitizeItems(items: unknown): PantryVisionItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const record = item as Record<string, unknown>;
      const itemName = typeof record.item_name === 'string' ? record.item_name.trim() : '';

      const expiresOnRaw = typeof record.expires_on === 'string' ? record.expires_on.trim() : '';
      const expiresOn = /^\d{4}-\d{2}-\d{2}$/.test(expiresOnRaw) ? expiresOnRaw : null;

      const confidenceRaw = typeof record.confidence === 'number' ? record.confidence : null;
      const confidence = confidenceRaw === null ? null : Math.max(0, Math.min(1, confidenceRaw));

      const estimatedWeightRaw =
        typeof record.estimated_weight_grams === 'number' ? record.estimated_weight_grams : null;
      const estimatedWeightGrams =
        estimatedWeightRaw === null || Number.isNaN(estimatedWeightRaw) || estimatedWeightRaw <= 0
          ? null
          : Math.round(estimatedWeightRaw);

      const expirySource =
        record.expiry_source === 'visible' || record.expiry_source === 'estimated'
          ? record.expiry_source
          : 'unknown';

      return {
        item_name: itemName,
        item_type: typeof record.item_type === 'string' ? record.item_type.trim() : null,
        category: typeof record.category === 'string' ? record.category.trim() : null,
        quantity_value: typeof record.quantity_value === 'string' ? record.quantity_value.trim() : null,
        quantity_unit: typeof record.quantity_unit === 'string' ? record.quantity_unit.trim() : null,
        estimated_weight_grams: estimatedWeightGrams,
        expires_on: expiresOn,
        expiry_source: expirySource,
        confidence,
        notes: typeof record.notes === 'string' ? record.notes.trim() : null,
      };
    })
    .filter((item) => item.item_name.length > 0);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        status: 'ok',
        provider: 'openrouter',
        feature: 'pantry-vision',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
        } as PantryVisionResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Supabase auth validation is not configured on the server.',
        } as PantryVisionResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
        } as PantryVisionResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const openRouterApiKey =
      Deno.env.get('OPENROUTER_API_KEY') ||
      Deno.env.get('VITE_OPENROUTER_API_KEY');

    if (!openRouterApiKey || openRouterApiKey.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OpenRouter API key missing on server. Set OPENROUTER_API_KEY or VITE_OPENROUTER_API_KEY in Supabase Edge Function secrets.',
        } as PantryVisionResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = (await req.json()) as PantryVisionRequest;
    if (!body?.image || typeof body.image !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'image is required',
        } as PantryVisionResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouterApiKey.trim()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://sharedminds.local',
        'X-OpenRouter-Title': 'SharedMinds Pantry Vision',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.1,
        max_tokens: 1600,
        response_format: buildResponseFormat(),
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(),
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: [
                  'Analyze this pantry or food-stock image.',
                  'Return one item per distinct product, aggregating visible duplicates.',
                  'Populate all inventory fields you can so the result can be used to pre-fill an editable pantry form.',
                  'For single visible items, default quantity_value to 1 and quantity_unit to the packaging type or item.',
                  'Capture the best estimate for quantity, package weight, category, item type, and best-before date.',
                  'If an expiry is not visible, use null unless a conservative estimate is genuinely possible, and explain that in notes.',
                ].join(' '),
              },
              {
                type: 'image_url',
                image_url: {
                  url: body.image,
                  detail: 'auto',
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: errorText || `OpenRouter request failed with ${response.status}`,
          statusCode: response.status,
        } as PantryVisionResponse),
        {
          status: response.status >= 400 && response.status < 500 ? response.status : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || content.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OpenRouter returned an empty response',
        } as PantryVisionResponse),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let parsed: { items?: unknown };
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      console.error('[pantry-vision-proxy] Failed to parse model JSON:', error, content);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OpenRouter did not return valid JSON',
        } as PantryVisionResponse),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        items: sanitizeItems(parsed.items),
        model: data?.model || DEFAULT_MODEL,
      } as PantryVisionResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[pantry-vision-proxy] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      } as PantryVisionResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
