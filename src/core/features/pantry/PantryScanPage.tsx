import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, ChevronDown, Loader2, ScanSearch, Upload, X } from 'lucide-react';
import { PageGreeting } from '../../ui/CorePage';
import { ensureDefaultLocations, type PantryLocation } from '../../../lib/pantryLocations';
import {
  analyzePantryPhoto,
  importVisionItemsToPantry,
  type PantryVisionItem,
} from '../../../lib/pantryVisionService';
import { showToast } from '../../../components/Toast';

interface PantryScanPageProps {
  spaceId: string;
  spaceName: string;
}

export function PantryScanPage({ spaceId, spaceName }: PantryScanPageProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [locations, setLocations] = useState<PantryLocation[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisItems, setAnalysisItems] = useState<PantryVisionItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [analysisModel, setAnalysisModel] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showLocationSheet, setShowLocationSheet] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadLocations = async () => {
      try {
        setIsLoadingLocations(true);
        const nextLocations = await ensureDefaultLocations(spaceId);
        if (!isMounted) return;

        setLocations(nextLocations);

        const lastUsedKey = `last_used_location_${spaceId}`;
        const lastUsed = sessionStorage.getItem(lastUsedKey);
        if (lastUsed && nextLocations.some((location) => location.id === lastUsed)) {
          setSelectedLocationId(lastUsed);
        } else {
          setSelectedLocationId(null);
        }
      } catch (error) {
        console.error('Failed to load pantry locations for scan page:', error);
        if (isMounted) {
          showToast('error', 'Failed to load pantry locations');
        }
      } finally {
        if (isMounted) {
          setIsLoadingLocations(false);
        }
      }
    };

    loadLocations();

    return () => {
      isMounted = false;
    };
  }, [spaceId]);

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

  const handleItemChange = (itemId: string, updates: Partial<PantryVisionItem>) => {
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

      if (selectedLocationId) {
        const lastUsedKey = `last_used_location_${spaceId}`;
        sessionStorage.setItem(lastUsedKey, selectedLocationId);
      }

      showToast(
        'success',
        `Imported ${selectedItems.length} pantry item${selectedItems.length === 1 ? '' : 's'}`
      );
      navigate('/pantry');
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
          className="w-full rounded-2xl border border-stone-300 bg-white px-3 py-3 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
          className="flex min-h-[52px] w-full items-center justify-between rounded-2xl border border-stone-300 bg-white px-3 py-3 text-left text-sm text-stone-900"
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
    <div className="space-y-5 sm:space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <PageGreeting
            greeting="Pantry Scan"
            subtitle={`Capture a shelf, crate, or box for ${spaceName}, then confirm the detected items before they land in inventory.`}
          />
        </div>
        <button
          type="button"
          onClick={() => navigate('/pantry')}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Back to inventory
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-[2rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <ScanSearch size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-stone-900">Capture and scan</h3>
              <p className="mt-1 text-sm text-stone-500">
                Use one clear photo. Multiple matching products in the same image will be grouped.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Selected pantry scan"
                  className="h-72 w-full object-cover"
                />
              ) : (
                <div className="flex h-72 flex-col items-center justify-center px-6 text-center">
                  <Camera size={42} className="mb-3 text-stone-400" />
                  <p className="text-sm font-medium text-stone-700">Choose or take a pantry photo</p>
                  <p className="mt-1 text-xs text-stone-500">
                    Best results come from visible labels, packaging, and best-before dates.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
              >
                <Upload size={16} />
                Choose photo
              </button>
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
              >
                <Camera size={16} />
                Take photo
              </button>
            </div>

            <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50/70 p-4">
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                Import into location
              </label>
              {isLoadingLocations ? (
                <div className="rounded-2xl border border-stone-200 bg-white px-3 py-3 text-sm text-stone-500">
                  Loading pantry locations...
                </div>
              ) : (
                renderLocationPicker()
              )}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!selectedFile || isAnalyzing}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[1.25rem] bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <ScanSearch size={18} />}
              {isAnalyzing ? 'Scanning photo...' : 'Scan photo'}
            </button>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.25rem] border border-stone-200 bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Detected</p>
                <p className="mt-2 text-2xl font-semibold text-stone-900">{analysisItems.length}</p>
                <p className="text-xs text-stone-500">candidate items</p>
              </div>
              <div className="rounded-[1.25rem] border border-stone-200 bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Selected</p>
                <p className="mt-2 text-2xl font-semibold text-stone-900">{selectedItems.length}</p>
                <p className="text-xs text-stone-500">ready to import</p>
              </div>
              <div className="rounded-[1.25rem] border border-stone-200 bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Model</p>
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-stone-900">
                  {analysisModel || 'Awaiting scan'}
                </p>
              </div>
            </div>

            {analysisError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {analysisError}
              </div>
            )}

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
        </section>

        <section className="flex min-h-[640px] flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="border-b border-stone-200 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-semibold text-stone-900">Review detected items</h4>
                <p className="text-sm text-stone-500">
                  Confirm names, quantities, weights, categories, and expiry dates before import.
                </p>
              </div>
              {analysisItems.length > 0 && (
                <div className="rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-700">
                  {selectedItems.length} of {analysisItems.length} selected
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {analysisItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-stone-500">
                <ScanSearch size={44} className="mb-4 text-stone-300" />
                <p className="text-base font-medium text-stone-700">No scan results yet</p>
                <p className="mt-2 max-w-md text-sm text-stone-500">
                  Upload a photo, run the scan, then review each detected product before anything is added to Pantry.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {analysisItems.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-[1.5rem] border p-4 transition-colors ${
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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-5 py-4">
            <p className="text-xs text-stone-500">
              Scans are suggestions. Review dates and quantities before import.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/pantry')}
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
        </section>
      </div>
    </div>
  );
}
