/**
 * SkillsEditor — browse-first picker for the curated ~200 skill catalogue.
 *
 * UX shape:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ selected chips · removable                                   │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ 🔍 search… (type-ahead overrides category browsing)          │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ [All] [🎨 Design] [💻 Eng] [🧭 Product] [📊 Data] …          │  ← category pills
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ ＋Figma  ＋UI Design  ＋UX Design  ＋Brand Identity …         │  ← chip grid
 *   │ ＋Prototyping  ＋Design Systems …                             │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Why this is better than the old dropdown:
 *   • Categorisation is visible, not buried in a dropdown.
 *   • Tapping a chip adds it instantly — no scroll-and-click two-step.
 *   • Search still works for power users who know what they want.
 *   • Custom skills (free-text) hop into a curated category if recognised,
 *     otherwise live under "Other" — handled transparently.
 */

import { useState, useMemo } from 'react';
import { X, Search, Sparkles, Plus, Star } from 'lucide-react';
import {
  SKILL_CATEGORIES,
  MAX_SKILLS_PER_PROFILE,
  findSkillCategory,
  SKILL_LEVELS,
  type SkillLevel,
  type SkillLevelMap,
} from '../../lib/skills';

interface Props {
  value: string[];
  onChange: (skills: string[]) => void;
  max?: number;
  /** Optional: if provided, each selected chip gets a 5-star self-rating
   *  picker beneath the name. Omit when ratings don't make sense (e.g.
   *  WantedSkillsCard — you don't rate skills you wish other people had). */
  levels?: SkillLevelMap;
  onLevelsChange?: (levels: SkillLevelMap) => void;
}

const ALL_FILTER_ID = '__all__';

export function SkillsEditor({
  value, onChange, max = MAX_SKILLS_PER_PROFILE, levels, onLevelsChange,
}: Props) {
  const showLevels = levels !== undefined && onLevelsChange !== undefined;

  function setLevel(skill: string, level: SkillLevel) {
    if (!showLevels) return;
    onLevelsChange!({ ...levels!, [skill]: level });
  }

  function clearLevel(skill: string) {
    if (!showLevels) return;
    const next = { ...levels! };
    delete next[skill];
    onLevelsChange!(next);
  }

  const [query, setQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>(ALL_FILTER_ID);

  const isFull = value.length >= max;
  const selectedLower = useMemo(
    () => new Set(value.map((s) => s.toLowerCase())),
    [value],
  );

  // Build the chip grid the user will browse. Two modes:
  //
  //   1. Search mode (query !== ''): flat list across all categories that
  //      match the query, capped so we don't paint hundreds of chips.
  //   2. Browse mode: respect the active category filter. "All" shows every
  //      category in vertical sections.
  const trimmedQuery = query.trim();
  const inSearchMode = trimmedQuery.length > 0;

  const sections = useMemo(() => {
    const q = trimmedQuery.toLowerCase();

    if (inSearchMode) {
      // Single flat section of every match (cap at 60 so the UI stays light).
      const flat: { id: string; label: string; emoji: string; skills: string[] } = {
        id: 'search',
        label: 'Matches',
        emoji: '🔍',
        skills: [],
      };
      const seen = new Set<string>();
      for (const cat of SKILL_CATEGORIES) {
        for (const s of cat.skills) {
          if (seen.has(s)) continue;
          if (selectedLower.has(s.toLowerCase())) continue;
          if (s.toLowerCase().includes(q)) {
            flat.skills.push(s);
            seen.add(s);
            if (flat.skills.length >= 60) break;
          }
        }
        if (flat.skills.length >= 60) break;
      }
      return flat.skills.length > 0 ? [flat] : [];
    }

    const visible = activeCategoryId === ALL_FILTER_ID
      ? SKILL_CATEGORIES
      : SKILL_CATEGORIES.filter((c) => c.id === activeCategoryId);

    return visible
      .map((cat) => ({
        id: cat.id,
        label: cat.label,
        emoji: cat.emoji,
        skills: cat.skills.filter((s) => !selectedLower.has(s.toLowerCase())),
      }))
      .filter((cat) => cat.skills.length > 0);
  }, [activeCategoryId, inSearchMode, trimmedQuery, selectedLower]);

  // "Add custom" appears when the typed query doesn't match any curated skill.
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
    setQuery(''); // clear search after a pick so the user sees fresh state
  }

  function remove(skill: string) {
    onChange(value.filter((s) => s !== skill));
    // Also drop the level so we don't accumulate orphan ratings.
    if (showLevels && levels![skill]) clearLevel(skill);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && trimmedQuery) {
      e.preventDefault();
      const exactMatch = SKILL_CATEGORIES.flatMap((c) => c.skills).find(
        (s) => s.toLowerCase() === trimmedQuery.toLowerCase(),
      );
      add(exactMatch ?? trimmedQuery);
    } else if (e.key === 'Backspace' && !query && value.length > 0) {
      remove(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setQuery('');
    }
  }

  return (
    <div className="space-y-3">
      {/* ── Selected chips (compact, no levels) ───────────────────── */}
      {value.length > 0 && !showLevels && (
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

      {/* ── Selected rows with self-rating stars ───────────────────── */}
      {value.length > 0 && showLevels && (
        <div className="space-y-1.5">
          {value.map((skill) => {
            const cat = findSkillCategory(skill);
            const current = levels![skill];
            return (
              <div
                key={skill}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/8 ring-1 ring-primary/15"
              >
                {cat && <span className="text-sm leading-none shrink-0">{cat.emoji}</span>}
                <span className="text-xs font-bold text-primary flex-1 min-w-0 truncate">
                  {skill}
                </span>
                <StarRating
                  value={current}
                  onChange={(level) => setLevel(skill, level)}
                />
                <button
                  type="button"
                  onClick={() => remove(skill)}
                  aria-label={`Remove ${skill}`}
                  className="rounded-full hover:bg-primary/15 p-1 transition-colors shrink-0"
                >
                  <X size={11} strokeWidth={2.5} className="text-primary" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Search bar (always available) ─────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface-container-low focus-within:ring-2 focus-within:ring-primary/30 transition-all">
        <Search size={13} className="stitch-text-secondary shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isFull
              ? `Skill limit reached (${max})`
              : 'Search skills, or browse by category below…'
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

      {/* ── Category filter pills (hidden in search mode) ─────────── */}
      {!inSearchMode && !isFull && (
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-thin">
          <CategoryPill
            label="All"
            emoji="✨"
            active={activeCategoryId === ALL_FILTER_ID}
            onClick={() => setActiveCategoryId(ALL_FILTER_ID)}
          />
          {SKILL_CATEGORIES.map((cat) => (
            <CategoryPill
              key={cat.id}
              label={cat.label}
              emoji={cat.emoji}
              active={activeCategoryId === cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
            />
          ))}
        </div>
      )}

      {/* ── Custom add row (only when search has a novel string) ───── */}
      {showCustomAddRow && !isFull && (
        <button
          type="button"
          onClick={() => add(trimmedQuery)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-primary bg-primary/8 hover:bg-primary/15 rounded-xl transition-colors"
        >
          <Plus size={13} strokeWidth={2.5} />
          Add "{trimmedQuery}" as a custom skill
        </button>
      )}

      {/* ── Chip grid: scrollable area with category sections ─────── */}
      {!isFull && (
        <div className="max-h-72 overflow-y-auto pr-1 -mr-1 space-y-3">
          {sections.length === 0 && !showCustomAddRow && (
            <div className="px-3 py-8 text-center text-sm stitch-text-secondary flex flex-col items-center gap-1.5">
              <Sparkles size={14} />
              {inSearchMode
                ? <>No matches. Press <kbd className="px-1 bg-surface-container rounded text-[10px]">Enter</kbd> to add anyway.</>
                : 'All skills in this category are already selected.'}
            </div>
          )}

          {sections.map((sec) => (
            <div key={sec.id}>
              {/* Show the section header only in 'All' or search mode —
                  redundant when a single category is already selected. */}
              {(activeCategoryId === ALL_FILTER_ID || inSearchMode) && (
                <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1.5 px-1 flex items-center gap-1.5">
                  <span>{sec.emoji}</span>
                  {sec.label}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {sec.skills.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => add(s)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white ring-1 ring-surface-container hover:bg-primary/8 hover:ring-primary/30 hover:text-primary text-xs font-semibold stitch-text-primary transition-all active:scale-95"
                  >
                    <Plus size={10} strokeWidth={2.5} />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {value.length === 0 && (
        <p className="text-[11px] stitch-text-secondary leading-relaxed">
          Tap a chip to add. Skills feed the match scores on Pulse and let people find you on /people.
        </p>
      )}
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────

function StarRating({
  value, onChange,
}: {
  value: SkillLevel | undefined;
  onChange: (level: SkillLevel) => void;
}) {
  const [hover, setHover] = useState<SkillLevel | null>(null);
  const display = hover ?? value ?? 0;
  const label = (hover ?? value)
    ? SKILL_LEVELS.find((l) => l.value === (hover ?? value))?.label
    : 'Rate';

  return (
    <div
      className="flex items-center gap-1.5 shrink-0"
      onMouseLeave={() => setHover(null)}
      title={label}
    >
      {([1, 2, 3, 4, 5] as SkillLevel[]).map((n) => (
        <button
          key={n}
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(n); }}
          onMouseEnter={() => setHover(n)}
          aria-label={`${n} star${n === 1 ? '' : 's'} — ${SKILL_LEVELS[n - 1].label}`}
          // Larger hit area on touch — the visible icon stays small but the
          // padded button is ≥ 24px each side, so 5 stars give ~28px-tall
          // touch row without bloating the visual.
          className="p-1.5 sm:p-0.5 transition-transform active:scale-90"
        >
          <Star
            size={13}
            strokeWidth={2}
            className={n <= display
              ? 'fill-amber-400 text-amber-400'
              : 'text-primary/30'}
          />
        </button>
      ))}
    </div>
  );
}

function CategoryPill({
  label, emoji, active, onClick,
}: {
  label: string;
  emoji: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
        active
          ? 'bg-primary text-white shadow-sm'
          : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
      }`}
    >
      <span className="text-sm leading-none">{emoji}</span>
      {label}
    </button>
  );
}
