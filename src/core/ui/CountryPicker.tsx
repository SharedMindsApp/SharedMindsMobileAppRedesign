import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import { COUNTRIES, findCountry, type Country } from '../../lib/countries';

interface Props {
  value: string | null;            // ISO-2 code
  onChange: (code: string | null) => void;
  placeholder?: string;
}

export function CountryPicker({ value, onChange, placeholder = 'Pick your country' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = findCountry(value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q,
    );
  }, [query]);

  // Focus search on open
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    } else {
      setQuery('');
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  function pick(c: Country) {
    onChange(c.code);
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Trigger — div+role so the nested clear button is valid DOM */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-medium border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all text-left cursor-pointer"
      >
        {selected ? (
          <>
            <span className="text-xl leading-none">{selected.flag}</span>
            <span className="flex-1 truncate">{selected.name}</span>
            <button
              type="button"
              onClick={clear}
              aria-label="Clear country"
              className="stitch-text-secondary hover:text-red-500 transition-colors p-0.5"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 stitch-text-secondary truncate">{placeholder}</span>
            <ChevronDown size={15} className="stitch-text-secondary" />
          </>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-2 rounded-2xl bg-white shadow-xl shadow-black/10 border border-surface-container overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-surface-container">
            <Search size={14} className="stitch-text-secondary shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries…"
              className="flex-1 text-sm stitch-text-primary placeholder:stitch-text-secondary bg-transparent outline-none border-0"
            />
          </div>

          {/* Options */}
          <div className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm stitch-text-secondary">
                No matches
              </div>
            ) : (
              filtered.map((c) => {
                const isSelected = value === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => pick(c)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-primary/8 stitch-text-primary font-semibold'
                        : 'stitch-text-primary hover:bg-surface-container-low'
                    }`}
                  >
                    <span className="text-lg leading-none">{c.flag}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    {isSelected && <Check size={14} className="text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
