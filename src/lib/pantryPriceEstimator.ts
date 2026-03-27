import { supabase } from './supabase';
import type { PantryItem } from './intelligentGrocery';

export interface PantryPriceEstimateInput {
  pantryItemId: string;
  itemName: string;
  itemDetail: string | null;
  category: string;
  itemType: string | null;
  quantityValue: string | null;
  quantityUnit: string | null;
  estimatedWeightGrams: number | null;
  notes: string | null;
}

export interface PantryPriceEstimateSuggestion {
  pantryItemId: string;
  estimatedCost: number | null;
  confidence: number | null;
  rationale: string | null;
}

export interface PantryPriceEstimateResult {
  suggestions: PantryPriceEstimateSuggestion[];
  model: string | null;
  currencyCode: string | null;
}

interface PantryPriceEstimatorResponse {
  success: boolean;
  model?: string;
  currency_code?: string | null;
  suggestions?: Array<{
    pantry_item_id: string;
    estimated_cost: number | null;
    confidence: number | null;
    rationale: string | null;
  }>;
  error?: string;
}

export function getMissingPricePantryItems(items: PantryItem[]): PantryPriceEstimateInput[] {
  return items
    .filter((item) => item.estimated_cost === null || item.estimated_cost === undefined)
    .map((item) => ({
      pantryItemId: item.id,
      itemName: item.food_item?.name || item.item_name || 'Unknown item',
      itemDetail: item.item_detail?.trim() || null,
      category: item.category || 'other',
      itemType: item.item_type || null,
      quantityValue: item.quantity_value || item.quantity || null,
      quantityUnit: item.quantity_unit || item.unit || null,
      estimatedWeightGrams: item.estimated_weight_grams ?? null,
      notes: item.notes || null,
    }));
}

export async function estimateMissingPantryPrices(params: {
  city: string;
  country: string;
  items: PantryPriceEstimateInput[];
}): Promise<PantryPriceEstimateResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pantry-price-estimator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      city: params.city.trim(),
      country: params.country.trim(),
      items: params.items,
    }),
  });

  let data: PantryPriceEstimatorResponse | null = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || `Pantry price estimate request failed with status ${response.status}`);
  }

  return {
    suggestions: (data.suggestions || []).map((suggestion) => ({
      pantryItemId: suggestion.pantry_item_id,
      estimatedCost:
        typeof suggestion.estimated_cost === 'number' && suggestion.estimated_cost >= 0
          ? Number(suggestion.estimated_cost.toFixed(2))
          : null,
      confidence:
        typeof suggestion.confidence === 'number'
          ? Math.max(0, Math.min(1, suggestion.confidence))
          : null,
      rationale: typeof suggestion.rationale === 'string' ? suggestion.rationale.trim() : null,
    })),
    model: data.model || null,
    currencyCode: data.currency_code || null,
  };
}
