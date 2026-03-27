import { useEffect, useMemo, useState } from 'react';
import { Loader2, MapPin, Sparkles } from 'lucide-react';
import type { PantryItem } from '../../lib/intelligentGrocery';
import type { PantryPriceEstimateSuggestion } from '../../lib/pantryPriceEstimator';
import { BottomSheet } from './BottomSheet';

type PantryPriceEstimateSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  city: string;
  country: string;
  currencyCode: string | null;
  model: string | null;
  loading: boolean;
  items: PantryItem[];
  suggestions: PantryPriceEstimateSuggestion[];
  saving: boolean;
  onSave: (updates: Array<{ pantryItemId: string; estimatedCost: number }>) => Promise<void> | void;
};

function getItemLabel(item: PantryItem) {
  const baseName = item.food_item?.name || item.item_name || 'Unknown item';
  const detail = item.item_detail?.trim();
  return detail ? `${baseName} · ${detail}` : baseName;
}

function getQuantityLabel(item: PantryItem) {
  const quantity = item.quantity_value || item.quantity;
  const unit = item.quantity_unit || item.unit;
  return [quantity, unit].filter(Boolean).join(' ') || 'No quantity set';
}

export function PantryPriceEstimateSheet({
  isOpen,
  onClose,
  city,
  country,
  currencyCode,
  model,
  loading,
  items,
  suggestions,
  saving,
  onSave,
}: PantryPriceEstimateSheetProps) {
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});

  const suggestionsById = useMemo(
    () => new Map(suggestions.map((suggestion) => [suggestion.pantryItemId, suggestion])),
    [suggestions]
  );

  useEffect(() => {
    if (!isOpen) {
      setDraftPrices({});
      return;
    }

    setDraftPrices(
      Object.fromEntries(
        items.map((item) => [
          item.id,
          suggestionsById.get(item.id)?.estimatedCost !== null &&
          suggestionsById.get(item.id)?.estimatedCost !== undefined
            ? String(suggestionsById.get(item.id)?.estimatedCost)
            : '',
        ])
      )
    );
  }, [isOpen, items, suggestionsById]);

  const readyCount = Object.values(draftPrices).filter((value) => value.trim().length > 0).length;

  const handleSave = async () => {
    const updates = Object.entries(draftPrices)
      .map(([pantryItemId, value]) => ({
        pantryItemId,
        estimatedCost: Number.parseFloat(value),
      }))
      .filter((entry) => Number.isFinite(entry.estimatedCost) && entry.estimatedCost >= 0);

    await onSave(updates);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Review AI price estimates"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={loading || saving || readyCount === 0}
            className="flex-1 rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-60"
          >
            {saving ? 'Saving...' : `Save ${readyCount} prices`}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-[1.5rem] border border-stone-200 bg-[linear-gradient(135deg,#fafaf9,#f5f5f4)] p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              {loading ? <Loader2 size={18} className="animate-spin text-stone-700" /> : <Sparkles size={18} className="text-stone-700" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Batch estimate</p>
              <h3 className="mt-1 text-lg font-semibold text-stone-900">
                {loading ? 'Estimating missing Pantry prices' : `${items.length} items ready for review`}
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                The full missing-price list was sent together so the model could price items in context. Review each suggestion before saving it.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1">
                  <MapPin size={12} />
                  {city}, {country}
                </span>
                {currencyCode && (
                  <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1">
                    Currency {currencyCode}
                  </span>
                )}
                {model && (
                  <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1">
                    {model}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-500">
            Generating price suggestions for your missing-cost Pantry items...
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const suggestion = suggestionsById.get(item.id);
              return (
                <div key={item.id} className="rounded-[1.5rem] border border-stone-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-stone-900">{getItemLabel(item)}</div>
                      <div className="mt-1 text-xs text-stone-500">
                        {getQuantityLabel(item)}
                        {item.category ? ` • ${item.category}` : ''}
                      </div>
                    </div>
                    {suggestion?.confidence !== null && suggestion?.confidence !== undefined && (
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                        AI notes
                      </label>
                      <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm leading-6 text-stone-600">
                        {suggestion?.rationale || 'No AI estimate was returned for this line. You can still add a price manually.'}
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                        Estimated price
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                          {currencyCode === 'GBP' || !currencyCode ? '£' : ''}
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={draftPrices[item.id] ?? ''}
                          onChange={(event) =>
                            setDraftPrices((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))
                          }
                          placeholder="0.00"
                          className={`w-full rounded-xl border border-stone-300 bg-white py-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-500 ${
                            currencyCode === 'GBP' || !currencyCode ? 'pl-8 pr-3' : 'px-3'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
