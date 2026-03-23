import { supabase } from './supabase';
import { addPantryItem } from './intelligentGrocery';
import { getOrCreateFoodItem } from './foodItems';

const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

export interface PantryVisionItem {
  id: string;
  itemName: string;
  itemType: string | null;
  category: string | null;
  quantityValue: string | null;
  quantityUnit: string | null;
  estimatedWeightGrams: number | null;
  expiresOn: string | null;
  expirySource: 'visible' | 'estimated' | 'unknown';
  confidence: number | null;
  notes: string | null;
}

interface PantryVisionProxyItem {
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

interface PantryVisionProxyResponse {
  success: boolean;
  items?: PantryVisionProxyItem[];
  model?: string;
  error?: string;
}

export interface PantryVisionAnalysisResult {
  items: PantryVisionItem[];
  model: string | null;
}

async function callPantryVisionEndpoint(params: {
  accessToken: string;
  payload: {
    image: string;
    mimeType: string;
    filename: string;
  };
}) {
  return fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pantry-vision-proxy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${params.accessToken}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(params.payload),
    }
  );
}

export async function fileToOptimizedDataUrl(file: File): Promise<string> {
  const image = await loadImageFromFile(file);
  const { width, height } = getScaledDimensions(image.width, image.height, MAX_IMAGE_DIMENSION);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to prepare image for analysis');
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Failed to decode image'));
      image.onload = () => resolve(image);
      image.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

function getScaledDimensions(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  if (width >= height) {
    const scale = maxDimension / width;
    return {
      width: maxDimension,
      height: Math.round(height * scale),
    };
  }

  const scale = maxDimension / height;
  return {
    width: Math.round(width * scale),
    height: maxDimension,
  };
}

function normalizeVisionItem(item: PantryVisionProxyItem, index: number): PantryVisionItem {
  return {
    id: crypto.randomUUID?.() || `vision-item-${Date.now()}-${index}`,
    itemName: item.item_name.trim(),
    itemType: item.item_type?.trim() || null,
    category: item.category?.trim() || null,
    quantityValue: item.quantity_value?.trim() || null,
    quantityUnit: item.quantity_unit?.trim() || null,
    estimatedWeightGrams:
      typeof item.estimated_weight_grams === 'number' && item.estimated_weight_grams > 0
        ? Math.round(item.estimated_weight_grams)
        : null,
    expiresOn: item.expires_on || null,
    expirySource: item.expiry_source || 'unknown',
    confidence: typeof item.confidence === 'number' ? item.confidence : null,
    notes: item.notes?.trim() || null,
  };
}

export async function analyzePantryPhoto(file: File): Promise<PantryVisionAnalysisResult> {
  const image = await fileToOptimizedDataUrl(file);
  const payload = {
    image,
    mimeType: file.type,
    filename: file.name,
  };

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  let response = await callPantryVisionEndpoint({
    accessToken: session.access_token,
    payload,
  });

  if (response.status === 401) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    const refreshedToken = refreshed.session?.access_token;

    if (refreshError || !refreshedToken) {
      throw new Error('Your session expired. Please sign in again and retry the photo scan.');
    }

    response = await callPantryVisionEndpoint({
      accessToken: refreshedToken,
      payload,
    });
  }

  let data: PantryVisionProxyResponse | null = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || `Pantry vision request failed with status ${response.status}`);
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to analyze pantry photo');
  }

  return {
    items: (data.items || []).map(normalizeVisionItem).filter((item) => item.itemName.length > 0),
    model: data.model || null,
  };
}

export async function importVisionItemsToPantry(params: {
  spaceId: string;
  items: PantryVisionItem[];
  locationId?: string | null;
}): Promise<void> {
  const { spaceId, items, locationId } = params;

  for (const item of items) {
    const foodItem = await getOrCreateFoodItem(item.itemName, item.category);
    await addPantryItem({
      householdId: spaceId,
      foodItemId: foodItem.id,
      category: item.category || undefined,
      quantityValue: item.quantityValue || undefined,
      quantityUnit: item.quantityUnit || undefined,
      expiresOn: item.expiresOn || undefined,
      locationId: locationId || undefined,
      status: 'have',
      notes: item.notes || undefined,
      estimatedWeightGrams: item.estimatedWeightGrams ?? null,
      visionMetadata: {
        source: 'openrouter_photo_scan',
        itemType: item.itemType,
        expirySource: item.expirySource,
        confidence: item.confidence,
      },
    });
  }
}
