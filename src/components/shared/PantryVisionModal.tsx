import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ChevronDown, Loader2, ScanSearch, Upload, X } from 'lucide-react';
import type { PantryLocation } from '../../lib/pantryLocations';
import {
  analyzePantryPhoto,
  importVisionItemsToPantry,
  type PantryVisionItem,
} from '../../lib/pantryVisionService';
import { showToast } from '../Toast';

interface PantryVisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  locations: PantryLocation[];
  defaultLocationId?: string | null;
  onImported: () => Promise<void> | void;
}

export function PantryVisionModal({
  isOpen,
  onClose,
  spaceId,
  locations,
  defaultLocationId = null,
  onImported,
}: PantryVisionModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisItems, setAnalysisItems] = useState<PantryVisionItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(defaultLocationId);
  const [analysisModel, setAnalysisModel] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showLocationSheet, setShowLocationSheet] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setAnalysisItems([]);
      setSelectedIds(new Set());
      setAnalysisModel(null);
      setAnalysisError(null);
      setSelectedLocationId(defaultLocationId);
    }
  }, [defaultLocationId, isOpen]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const selectedItems = useMemo(
    () => analysisItems.filter((item) => selectedIds.has(item.id)),
    [analysisItems, selectedIds]
  );
  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedLocationId) || null,
    [locations, selectedLocationId]
  );

  if (!isOpen) {
    return null;
  }

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    setAnalysisItems([]);
    setSelectedIds(new Set());
    setAnalysisModel(null);
    setAnalysisError(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      showToast('info', 'Choose a photo first');
      return;
    }

    try {
      setIsAnalyzing(true);
      setAnalysisError(null);
      const result = await analyzePantryPhoto(selectedFile);
      setAnalysisItems(result.items);
      setSelectedIds(new Set(result.items.map((item) => item.id)));
      setAnalysisModel(result.model);

      if (result.items.length === 0) {
        showToast('info', 'No clear food items were detected in that photo');
      }
    } catch (error) {
      console.error('Failed to analyze pantry photo:', error);
      const message = error instanceof Error ? error.message : 'Failed to analyze photo';
      setAnalysisError(message);
      showToast('error', 'Photo scan failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleItem = (itemId: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleItemChange = (
    itemId: string,
    updates: Partial<PantryVisionItem>
  ) => {
    setAnalysisItems((previous) =>
      previous.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    );
  };

  const handleImport = async () => {
    if (selectedItems.length === 0) {
      showToast('info', 'Select at least one item to import');
      return;
    }

    try {
      setIsImporting(true);
      await importVisionItemsToPantry({
        spaceId,
        items: selectedItems,
        locationId: selectedLocationId,
      });
      await onImported();
      showToast('success', `Imported ${selectedItems.length} pantry item${selectedItems.length === 1 ? '' : 's'}`);
      onClose();
    } catch (error) {
      console.error('Failed to import vision items:', error);
      showToast('error', 'Failed to import scanned items');
    } finally {
      setIsImporting(false);
    }
  };

  const renderLocationPicker = () => {
    if (!isMobile) {
      return (
        <select
          value={selectedLocationId || ''}
          onChange={(event) => setSelectedLocationId(event.target.value || null)}
          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">No location</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.icon ? `${location.icon} ` : ''}
              {location.name}
            </option>
          ))}
        </select>
      );
    }

    return (
      <>
        <button
          type="button"
          onClick={() => setShowLocationSheet(true)}
          className="flex min-h-[48px] w-full items-center justify-between rounded-xl border border-stone-300 px-3 py-2 text-left text-sm text-stone-900"
        >
          <span className="truncate">
            {selectedLocation
              ? `${selectedLocation.icon ? `${selectedLocation.icon} ` : ''}${selectedLocation.name}`
              : 'No location'}
          </span>
          <ChevronDown size={18} className="text-stone-500" />
        </button>

        {showLocationSheet && (
          <div className="fixed inset-0 z-[130] flex items-end bg-black/50">
            <button
              type="button"
              aria-label="Close location picker"
              className="absolute inset-0"
              onClick={() => setShowLocationSheet(false)}
            />
            <div
              className="relative flex h-full w-full flex-col bg-white px-4 pb-6 pt-4 shadow-2xl safe-bottom"
              style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-stone-300" />
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-base font-semibold text-stone-900">Choose location</h4>
                <button
                  type="button"
                  onClick={() => setShowLocationSheet(false)}
                  className="rounded-xl p-2 text-stone-500 hover:bg-stone-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto pb-6">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLocationId(null);
                    setShowLocationSheet(false);
                  }}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                    selectedLocationId === null
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                      : 'border-stone-200 text-stone-800'
                  }`}
                >
                  No location
                </button>
                {locations.map((location) => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => {
                      setSelectedLocationId(location.id);
                      setShowLocationSheet(false);
                    }}
                    className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                      selectedLocationId === location.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : 'border-stone-200 text-stone-800'
                    }`}
                  >
                    {location.icon ? `${location.icon} ` : ''}
                    {location.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm safe-top safe-bottom">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <ScanSearch size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-stone-900">Scan pantry photo</h3>
              <p className="text-sm text-stone-500">
                Detect multiple items, then review before import.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
            aria-label="Close pantry scan"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="border-b border-stone-200 p-5 lg:border-b-0 lg:border-r">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-stone-50">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Selected pantry scan"
                    className="h-64 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center px-6 text-center">
                    <Camera size={40} className="mb-3 text-stone-400" />
                    <p className="text-sm font-medium text-stone-700">Choose or take a pantry photo</p>
                    <p className="mt-1 text-xs text-stone-500">
                      Works best when labels and expiry dates are visible.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                >
                  <Upload size={16} />
                  Choose photo
                </button>
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                >
                  <Camera size={16} />
                  Take photo
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Import into location
                </label>
                {renderLocationPicker()}
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!selectedFile || isAnalyzing}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <ScanSearch size={18} />}
                {isAnalyzing ? 'Scanning photo...' : 'Scan photo'}
              </button>

              {analysisModel && (
                <p className="text-xs text-stone-500">
                  Vision model: <span className="font-medium">{analysisModel}</span>
                </p>
              )}

              {analysisError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {analysisError}
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
            />
          </div>

          <div className="flex min-h-0 flex-col">
            <div className="border-b border-stone-200 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-stone-900">Detected items</h4>
                  <p className="text-xs text-stone-500">
                    Review names, quantities, weights, and expiry dates before import.
                  </p>
                </div>
                {analysisItems.length > 0 && (
                  <div className="text-sm text-stone-600">
                    {selectedItems.length} of {analysisItems.length} selected
                  </div>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {analysisItems.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-stone-500">
                  <ScanSearch size={40} className="mb-3 text-stone-300" />
                  <p className="text-sm font-medium text-stone-700">No scan results yet</p>
                  <p className="mt-1 max-w-md text-sm text-stone-500">
                    Add a photo, run the scan, then review each detected product before it is added to Pantry.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {analysisItems.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-4 transition-colors ${
                        selectedIds.has(item.id)
                          ? 'border-emerald-300 bg-emerald-50/40'
                          : 'border-stone-200 bg-white'
                      }`}
                    >
                      <div className="mb-3 flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => handleToggleItem(item.id)}
                          className="mt-1 h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
                              Confidence
                            </span>
                            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
                              {item.confidence !== null ? `${Math.round(item.confidence * 100)}%` : 'Unknown'}
                            </span>
                            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
                              Expiry: {item.expirySource}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
                            Item name
                          </label>
                          <input
                            type="text"
                            value={item.itemName}
                            onChange={(event) => handleItemChange(item.id, { itemName: event.target.value })}
                            className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
                            Category
                          </label>
                          <input
                            type="text"
                            value={item.category || ''}
                            onChange={(event) => handleItemChange(item.id, { category: event.target.value || null })}
                            className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
                            Quantity
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={item.quantityValue || ''}
                              onChange={(event) =>
                                handleItemChange(item.id, { quantityValue: event.target.value || null })
                              }
                              placeholder="e.g. 6"
                              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                            <input
                              type="text"
                              value={item.quantityUnit || ''}
                              onChange={(event) =>
                                handleItemChange(item.id, { quantityUnit: event.target.value || null })
                              }
                              placeholder="e.g. tins"
                              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
                            Estimated weight (g)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.estimatedWeightGrams ?? ''}
                            onChange={(event) =>
                              handleItemChange(item.id, {
                                estimatedWeightGrams: event.target.value ? Number(event.target.value) : null,
                              })
                            }
                            className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
                            Expiry date
                          </label>
                          <input
                            type="date"
                            value={item.expiresOn || ''}
                            onChange={(event) => handleItemChange(item.id, { expiresOn: event.target.value || null })}
                            className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
                            Item type
                          </label>
                          <input
                            type="text"
                            value={item.itemType || ''}
                            onChange={(event) => handleItemChange(item.id, { itemType: event.target.value || null })}
                            className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
                          Notes
                        </label>
                        <textarea
                          rows={2}
                          value={item.notes || ''}
                          onChange={(event) => handleItemChange(item.id, { notes: event.target.value || null })}
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-stone-200 px-5 py-4">
              <p className="text-xs text-stone-500">
                Scans are suggestions. Review dates and quantities before import.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={isImporting || selectedItems.length === 0}
                  className="flex min-h-[44px] items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
                >
                  {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {isImporting ? 'Importing...' : `Import ${selectedItems.length || ''}`.trim()}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
