import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCcw } from 'lucide-react';
import type { PantryQuantityRepairSuggestion } from '../../lib/pantryQuantityRepair';
import { BottomSheet } from './BottomSheet';

type PantryQuantityRepairSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  suggestions: PantryQuantityRepairSuggestion[];
  saving: boolean;
  onSave: (
    updates: Array<{
      pantryItemId: string;
      quantityValue: string;
      quantityUnit: string;
      estimatedWeightGrams: number | null;
    }>
  ) => Promise<void> | void;
};

type DraftRepair = {
  approved: boolean;
  quantityValue: string;
  quantityUnit: string;
  estimatedWeightGrams: string;
};

const COMMON_UNITS = [
  'item',
  'can',
  'tin',
  'jar',
  'bag',
  'box',
  'pack',
  'bottle',
  'carton',
  'g',
  'kg',
  'ml',
  'L',
];

export function PantryQuantityRepairSheet({
  isOpen,
  onClose,
  suggestions,
  saving,
  onSave,
}: PantryQuantityRepairSheetProps) {
  const [drafts, setDrafts] = useState<Record<string, DraftRepair>>({});

  useEffect(() => {
    if (!isOpen) {
      setDrafts({});
      return;
    }

    setDrafts(
      Object.fromEntries(
        suggestions.map((suggestion) => [
          suggestion.pantryItemId,
          {
            approved: true,
            quantityValue: suggestion.proposedQuantityValue,
            quantityUnit: suggestion.proposedQuantityUnit,
            estimatedWeightGrams:
              suggestion.proposedWeightGrams !== null && suggestion.proposedWeightGrams !== undefined
                ? String(suggestion.proposedWeightGrams)
                : '',
          },
        ])
      )
    );
  }, [isOpen, suggestions]);

  const approvedCount = Object.values(drafts).filter((draft) => draft.approved).length;

  const handleSave = async () => {
    const updates = suggestions
      .map((suggestion) => {
        const draft = drafts[suggestion.pantryItemId];
        if (!draft?.approved) return null;

        const trimmedQuantityValue = draft.quantityValue.trim();
        const trimmedQuantityUnit = draft.quantityUnit.trim();
        if (!trimmedQuantityValue || !trimmedQuantityUnit) return null;

        const parsedWeight = draft.estimatedWeightGrams.trim().length > 0
          ? Number.parseFloat(draft.estimatedWeightGrams)
          : null;

        return {
          pantryItemId: suggestion.pantryItemId,
          quantityValue: trimmedQuantityValue,
          quantityUnit: trimmedQuantityUnit,
          estimatedWeightGrams: parsedWeight !== null && Number.isFinite(parsedWeight) && parsedWeight >= 0 ? parsedWeight : null,
        };
      })
      .filter(
        (
          update
        ): update is {
          pantryItemId: string;
          quantityValue: string;
          quantityUnit: string;
          estimatedWeightGrams: number | null;
        } => Boolean(update)
      );

    await onSave(updates);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Review quantity fixes"
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
            disabled={saving || approvedCount === 0}
            className="flex-1 rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-60"
          >
            {saving ? 'Saving...' : `Save ${approvedCount} fix${approvedCount === 1 ? '' : 'es'}`}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-[1.5rem] border border-stone-200 bg-[linear-gradient(135deg,#fafaf9,#f5f5f4)] p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              {saving ? <Loader2 size={18} className="animate-spin text-stone-700" /> : <RefreshCcw size={18} className="text-stone-700" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Data review</p>
              <h3 className="mt-1 text-lg font-semibold text-stone-900">{suggestions.length} Pantry lines need a check</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                We found quantities that look off, like `0 g`, tiny gram values on count-based items, or entries with no unit. Adjust anything you want before saving.
              </p>
            </div>
          </div>
        </div>

        {suggestions.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-500">
            No suspicious Pantry quantities were found.
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion) => {
              const draft = drafts[suggestion.pantryItemId];
              if (!draft) return null;

              return (
                <div key={suggestion.pantryItemId} className="rounded-[1.5rem] border border-stone-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setDrafts((current) => ({
                          ...current,
                          [suggestion.pantryItemId]: {
                            ...current[suggestion.pantryItemId],
                            approved: !current[suggestion.pantryItemId].approved,
                          },
                        }))
                      }
                      className={`mt-0.5 h-5 w-5 shrink-0 rounded border transition-colors ${
                        draft.approved ? 'border-stone-900 bg-stone-900' : 'border-stone-300 bg-white'
                      }`}
                      aria-label={draft.approved ? 'Unapprove fix' : 'Approve fix'}
                    >
                      {draft.approved && <span className="block text-center text-[11px] text-white">✓</span>}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-stone-900">{suggestion.itemLabel}</div>
                      <div className="mt-1 text-xs text-stone-500">Current value: {suggestion.currentQuantityLabel}</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      <span>{suggestion.reason}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)_160px]">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                        Quantity
                      </label>
                      <input
                        type="text"
                        value={draft.quantityValue}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [suggestion.pantryItemId]: {
                              ...current[suggestion.pantryItemId],
                              quantityValue: event.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                        Unit
                      </label>
                      <input
                        type="text"
                        list={`pantry-repair-units-${suggestion.pantryItemId}`}
                        value={draft.quantityUnit}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [suggestion.pantryItemId]: {
                              ...current[suggestion.pantryItemId],
                              quantityUnit: event.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-500"
                      />
                      <datalist id={`pantry-repair-units-${suggestion.pantryItemId}`}>
                        {COMMON_UNITS.map((unit) => (
                          <option key={unit} value={unit} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                        Pack weight (g)
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="1"
                        value={draft.estimatedWeightGrams}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [suggestion.pantryItemId]: {
                              ...current[suggestion.pantryItemId],
                              estimatedWeightGrams: event.target.value,
                            },
                          }))
                        }
                        placeholder="Optional"
                        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-500"
                      />
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
