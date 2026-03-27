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
  Deno.env.get('OPENROUTER_PANTRY_PRICE_MODEL') ||
  'x-ai/grok-4.1-fast';

interface PantryPriceEstimateRequest {
  city: string;
  country: string;
  items: Array<{
    pantryItemId: string;
    itemName: string;
    itemDetail?: string | null;
    category?: string | null;
    itemType?: string | null;
    quantityValue?: string | null;
    quantityUnit?: string | null;
    estimatedWeightGrams?: number | null;
    notes?: string | null;
  }>;
}

interface PantryPriceEstimateSuggestion {
  pantry_item_id: string;
  estimated_cost: number | null;
  confidence: number | null;
  rationale: string | null;
}

interface PantryPriceEstimateResponse {
  success: boolean;
  suggestions?: PantryPriceEstimateSuggestion[];
  currency_code?: string | null;
  model?: string;
  error?: string;
}

function extractMessageText(content: unknown): string {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object') {
          const record = part as Record<string, unknown>;
          if (typeof record.text === 'string') return record.text;
          if (record.type === 'text' && typeof record.content === 'string') return record.content;
        }
        return '';
      })
      .join('\n')
      .trim();
  }

  return '';
}

function extractJsonPayload(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectStart = trimmed.indexOf('{');
  const objectEnd = trimmed.lastIndexOf('}');
  if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
    return trimmed.slice(objectStart, objectEnd + 1);
  }

  return trimmed;
}

function buildSystemPrompt() {
  return [
    'You estimate current retail prices for pantry and grocery items.',
    'Return JSON only.',
    'Use the provided city and country as the location context.',
    'Estimate a typical mid-market consumer price for one tracked package or unit, not a bulk wholesale price.',
    'Use the item name, detail, quantity, unit, category, package type, and estimated pack weight when available.',
    'If the item likely varies a lot by brand or flavour, still give a useful estimate and explain the assumption briefly.',
    'estimated_cost must be a number rounded to two decimals in the local currency for the provided location.',
    'confidence must be between 0 and 1.',
    'rationale should be concise and mention the assumed pack size or product context.',
    'If an item truly cannot be estimated, return estimated_cost as null and explain why.',
  ].join(' ');
}

function buildResponseFormat() {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'pantry_price_estimate_result',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          currency_code: {
            type: ['string', 'null'],
          },
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                pantry_item_id: { type: 'string' },
                estimated_cost: { type: ['number', 'null'] },
                confidence: { type: ['number', 'null'] },
                rationale: { type: ['string', 'null'] },
              },
              required: ['pantry_item_id', 'estimated_cost', 'confidence', 'rationale'],
            },
          },
        },
        required: ['currency_code', 'suggestions'],
      },
    },
  };
}

function sanitizeSuggestions(value: unknown): PantryPriceEstimateSuggestion[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const record = item as Record<string, unknown>;
      const pantryItemId =
        typeof record.pantry_item_id === 'string' ? record.pantry_item_id.trim() : '';
      const estimatedCost =
        typeof record.estimated_cost === 'number' && Number.isFinite(record.estimated_cost) && record.estimated_cost >= 0
          ? Number(record.estimated_cost.toFixed(2))
          : null;
      const confidenceRaw =
        typeof record.confidence === 'number' && Number.isFinite(record.confidence)
          ? record.confidence
          : null;

      return {
        pantry_item_id: pantryItemId,
        estimated_cost: estimatedCost,
        confidence: confidenceRaw === null ? null : Math.max(0, Math.min(1, confidenceRaw)),
        rationale: typeof record.rationale === 'string' ? record.rationale.trim() : null,
      };
    })
    .filter((item) => item.pantry_item_id.length > 0);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
        } as PantryPriceEstimateResponse),
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
        } as PantryPriceEstimateResponse),
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
        } as PantryPriceEstimateResponse),
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
          error: 'OpenRouter API key missing on server.',
        } as PantryPriceEstimateResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = (await req.json()) as PantryPriceEstimateRequest;
    const city = body?.city?.trim();
    const country = body?.country?.trim();
    const items = Array.isArray(body?.items) ? body.items.slice(0, 200) : [];

    if (!city || !country) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'city and country are required',
        } as PantryPriceEstimateResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (items.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          suggestions: [],
          currency_code: null,
          model: DEFAULT_MODEL,
        } as PantryPriceEstimateResponse),
        {
          status: 200,
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
        'X-OpenRouter-Title': 'SharedMinds Pantry Pricing',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.1,
        max_tokens: 2200,
        response_format: buildResponseFormat(),
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(),
          },
          {
            role: 'user',
            content: JSON.stringify({
              location: {
                city,
                country,
              },
              items: items.map((item) => ({
                pantry_item_id: item.pantryItemId,
                item_name: item.itemName,
                item_detail: item.itemDetail || null,
                category: item.category || null,
                item_type: item.itemType || null,
                quantity_value: item.quantityValue || null,
                quantity_unit: item.quantityUnit || null,
                estimated_weight_grams: item.estimatedWeightGrams ?? null,
                notes: item.notes || null,
              })),
            }),
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
        } as PantryPriceEstimateResponse),
        {
          status: response.status >= 400 && response.status < 500 ? response.status : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    const rawContent = extractMessageText(data?.choices?.[0]?.message?.content);

    if (rawContent.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OpenRouter returned an empty response',
        } as PantryPriceEstimateResponse),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let parsed: { currency_code?: unknown; suggestions?: unknown };
    try {
      parsed = JSON.parse(extractJsonPayload(rawContent));
    } catch (error) {
      console.error('[pantry-price-estimator] Failed to parse model JSON:', error, rawContent);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OpenRouter did not return valid JSON',
        } as PantryPriceEstimateResponse),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        suggestions: sanitizeSuggestions(parsed.suggestions),
        currency_code: typeof parsed.currency_code === 'string' ? parsed.currency_code.trim().toUpperCase() : null,
        model: data?.model || DEFAULT_MODEL,
      } as PantryPriceEstimateResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[pantry-price-estimator] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      } as PantryPriceEstimateResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
