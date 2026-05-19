import { useState, useEffect, useRef } from 'react';
import { Building2, Loader2, X, Search } from 'lucide-react';

interface Props {
  value: string;
  onChange: (city: string) => void;
  /** ISO-2 country code — scopes results to that country (highly recommended). */
  countryCode: string | null;
  placeholder?: string;
  disabled?: boolean;
}

interface NominatimResult {
  display_name: string;
  name: string;
  place_id: number;
  type: string;
  class?: string;
  addresstype?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    suburb?: string;
    borough?: string;
    state?: string;
    county?: string;
    country?: string;
  };
}

// Acceptable "populated place" types — covers cities, towns, villages, etc.
const PLACE_TYPES = new Set([
  'city',
  'town',
  'village',
  'hamlet',
  'municipality',
  'borough',
  'suburb',
  'administrative',
  'locality',
]);

interface Suggestion {
  id: string;
  city: string;     // canonical city name
  region: string;   // state / county / region for disambiguation
}

// Tiny in-memory cache per (countryCode, query) — avoid refetching when the
// user backspaces and retypes the same string.
const cache = new Map<string, Suggestion[]>();

function buildSuggestion(r: NominatimResult): Suggestion | null {
  // Only keep populated-place types — skip streets, businesses, water features, etc.
  const isPlace =
    (r.class === 'place' || r.class === 'boundary') &&
    PLACE_TYPES.has(r.type) ||
    (r.addresstype && PLACE_TYPES.has(r.addresstype));
  if (!isPlace) return null;

  const city =
    r.address?.city ||
    r.address?.town ||
    r.address?.village ||
    r.address?.hamlet ||
    r.address?.municipality ||
    r.address?.borough ||
    r.address?.suburb ||
    r.name;
  if (!city) return null;
  const region = r.address?.state || r.address?.county || '';
  return { id: String(r.place_id), city, region };
}

async function searchCities(
  query: string,
  countryCode: string | null,
): Promise<Suggestion[]> {
  const cacheKey = `${countryCode ?? '*'}::${query.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: '15', // ask for more, filter client-side
    'accept-language': 'en',
  });
  if (countryCode) params.set('countrycodes', countryCode.toLowerCase());

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as NominatimResult[];

  // Deduplicate by city+region, cap at 8
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const r of data) {
    const s = buildSuggestion(r);
    if (!s) continue;
    const key = `${s.city}|${s.region}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= 8) break;
  }

  // Only cache positive results — empty results may be transient (network blip,
  // user typing mid-word) and we don't want to lock in a wrong "no matches" state.
  if (out.length > 0) cache.set(cacheKey, out);
  return out;
}

export function CityAutocomplete({
  value,
  onChange,
  countryCode,
  placeholder = 'Start typing a city…',
  disabled,
}: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(!!value); // true when current value came from picking a suggestion
  const wrapperRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Keep local input in sync if parent value changes externally.
  useEffect(() => {
    setQuery(value);
    setPicked(!!value);
  }, [value]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    // Skip fetching if the current query matches what was already picked
    if (picked && trimmed === value.trim()) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const results = await searchCities(trimmed, countryCode);
        if (!ac.signal.aborted) {
          setSuggestions(results);
          setLoading(false);
        }
      } catch {
        if (!ac.signal.aborted) {
          setSuggestions([]);
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query, countryCode, open, picked, value]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  function pick(s: Suggestion) {
    onChange(s.city);
    setQuery(s.city);
    setPicked(true);
    setOpen(false);
    setSuggestions([]);
  }

  function clear() {
    onChange('');
    setQuery('');
    setPicked(false);
    setSuggestions([]);
  }

  const noCountry = !countryCode;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPicked(false);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={noCountry ? 'Pick a country first' : placeholder}
          disabled={disabled || noCountry}
          maxLength={60}
          className="w-full px-4 py-3 pr-10 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-medium placeholder:stitch-text-secondary border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        />
        {/* Right-edge adornment: loader / clear / search icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
          {loading ? (
            <Loader2 size={14} className="animate-spin stitch-text-secondary" />
          ) : query ? (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear city"
              className="stitch-text-secondary hover:text-red-500 transition-colors p-0.5"
            >
              <X size={14} />
            </button>
          ) : (
            <Search size={13} className="stitch-text-secondary" />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {open && !noCountry && suggestions.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-2 rounded-2xl bg-white shadow-xl shadow-black/10 border border-surface-container overflow-hidden">
          <div className="max-h-72 overflow-y-auto py-1">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => pick(s)}
                className="w-full flex items-start gap-3 px-4 py-2.5 text-left stitch-text-primary hover:bg-surface-container-low transition-colors"
              >
                <Building2 size={13} className="stitch-text-secondary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{s.city}</p>
                  {s.region && (
                    <p className="text-[11px] stitch-text-secondary truncate">{s.region}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="px-3 py-1.5 border-t border-surface-container text-[10px] stitch-text-secondary text-center">
            Powered by OpenStreetMap
          </div>
        </div>
      )}

      {/* Empty state */}
      {open && !noCountry && !loading && query.trim().length >= 2 && suggestions.length === 0 && !picked && (
        <div className="absolute z-30 left-0 right-0 mt-2 rounded-2xl bg-white shadow-xl shadow-black/10 border border-surface-container overflow-hidden">
          <p className="px-4 py-3 text-sm stitch-text-secondary text-center">
            No matches in this country. Try a different spelling.
          </p>
        </div>
      )}
    </div>
  );
}
