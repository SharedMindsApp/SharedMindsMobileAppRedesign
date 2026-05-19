import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, X, Search, Sparkles } from 'lucide-react';
import { SKILL_CATEGORIES, MAX_SKILLS_PER_PROFILE, findSkillCategory } from '../../lib/skills';

interface Props {
  value: string[];
  onChange: (skills: string[]) => void;
  max?: number;
}

export function SkillsEditor({ value, onChange, max = MAX_SKILLS_PER_PROFILE }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isFull = value.length >= max;
  const selectedLower = useMemo(
    () => new Set(value.map((s) => s.toLowerCase())),
    [value],
  );

  // Filter & group suggestions by category, hiding already-selected skills.
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SKILL_CATEGORIES.map((cat) => ({
      ...cat,
      skills: cat.skills.filter(
        (s) => !selectedLower.has(s.toLowerCase()) && (q === '' || s.toLowerCase().includes(q)),
      ),
    })).filter((cat) => cat.skills.length > 0);
  }, [query, selectedLower]);

  // Trimmed query — when user types something not in the curated list,
  // surface an "Add ..." action.
  const trimmedQuery = query.trim();
  const queryAlreadySelected = trimmedQuery && selectedLower.has(trimmedQuery.toLowerCase());
  const queryInCurated = useMemo(() => {
    if (!trimmedQuery) return false;
    return SKILL_CATEGORIES.some((cat) =>
      cat.skills.some((s) => s.toLowerCase() === trimmedQuery.toLowerCase()),
    );
  }, [trimmedQuery]);
  const showCustomAddRow =
    trimmedQuery.length > 0 && !queryAlreadySelected && !queryInCurated;

  function add(skill: string) {
    const cleaned = skill.trim();
    if (!cleaned) return;
    if (isFull) return;
    if (selectedLower.has(cleaned.toLowerCase())) return;
    onChange([...value, cleaned]);
    setQuery('');
    // Keep dropdown open for rapid multi-add
    inputRef.current?.focus();
  }

  function remove(skill: string) {
    onChange(value.filter((s) => s !== skill));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && trimmedQuery) {
      e.preventDefault();
      // Prefer an exact curated match if there is one
      const exactMatch = SKILL_CATEGORIES.flatMap((c) => c.skills).find(
        (s) => s.toLowerCase() === trimmedQuery.toLowerCase(),
      );
      add(exactMatch ?? trimmedQuery);
    } else if (e.key === 'Backspace' && !query && value.length > 0) {
      // Backspace on empty input removes the last skill
      remove(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  // Close on click outside
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

  return (
    <div ref={wrapperRef} className="space-y-2.5">
      {/* Selected skills — wrapping pill row */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((skill) => {
            const cat = findSkillCategory(skill);
            return (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold"
              >
                {cat && <span className="text-sm leading-none">{cat.emoji}</span>}
                {skill}
                <button
                  type="button"
                  onClick={() => remove(skill)}
                  aria-label={`Remove ${skill}`}
                  className="rounded-full hover:bg-primary/15 p-0.5 transition-colors"
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface-container-low focus-within:ring-2 focus-within:ring-primary/30 transition-all">
          <Search size={13} className="stitch-text-secondary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={
              isFull
                ? `Skill limit reached (${max})`
                : value.length === 0
                ? 'Search skills or type your own…'
                : 'Add another skill…'
            }
            disabled={isFull}
            maxLength={40}
            className="flex-1 bg-transparent text-sm stitch-text-primary placeholder:stitch-text-secondary outline-none border-0 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          {value.length > 0 && (
            <span className="text-[10px] stitch-text-secondary tabular-nums shrink-0">
              {value.length}/{max}
            </span>
          )}
        </div>

        {/* Dropdown */}
        {open && !isFull && (grouped.length > 0 || showCustomAddRow) && (
          <div className="absolute z-30 left-0 right-0 mt-2 rounded-2xl bg-white shadow-xl shadow-black/10 border border-surface-container overflow-hidden">
            <div className="max-h-80 overflow-y-auto py-1">
              {/* Custom add row */}
              {showCustomAddRow && (
                <button
                  type="button"
                  onClick={() => add(trimmedQuery)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-primary hover:bg-primary/8 transition-colors border-b border-surface-container"
                >
                  <Plus size={13} strokeWidth={2.5} />
                  Add "{trimmedQuery}"
                  <span className="ml-auto text-[10px] stitch-text-secondary font-normal">
                    custom
                  </span>
                </button>
              )}

              {/* Grouped suggestions */}
              {grouped.map((cat) => (
                <div key={cat.id} className="py-1">
                  <div className="px-4 py-1 text-[10px] font-bold stitch-text-secondary tracking-widest uppercase flex items-center gap-1.5">
                    <span>{cat.emoji}</span>
                    {cat.label}
                  </div>
                  {cat.skills.slice(0, 12).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => add(s)}
                      className="w-full flex items-center gap-2 px-4 py-1.5 text-left text-sm stitch-text-primary hover:bg-surface-container-low transition-colors"
                    >
                      <Plus size={11} className="stitch-text-secondary" />
                      {s}
                    </button>
                  ))}
                </div>
              ))}

              {grouped.length === 0 && !showCustomAddRow && (
                <div className="px-4 py-6 text-center text-sm stitch-text-secondary flex flex-col items-center gap-1.5">
                  <Sparkles size={14} />
                  No matches. Press Enter to add anyway.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {value.length === 0 && (
        <p className="text-[11px] stitch-text-secondary leading-relaxed">
          Add skills that complement what you do — tools, crafts, languages, anything you bring to a session.
        </p>
      )}
    </div>
  );
}
