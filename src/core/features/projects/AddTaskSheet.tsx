/**
 * AddTaskSheet — the project board's "add a task" bottom sheet.
 *
 * Replaces the old inline "Add a task for today…" row with a focused sheet
 * that does three things:
 *   1. Capture a task by hand (the fast path).
 *   2. Focus on a milestone / phase — picking one scopes the AI suggestions
 *      to the part of the roadmap you're actually working on.
 *   3. "Help me figure out what to do" — asks your current mood, maps it to a
 *      cognitive-load level (reentry.ts), and asks the suggest-project-roadmap
 *      edge function for next steps. Suggestions that match your energy float
 *      to the top, and anything you add inherits that load tag.
 *
 * Created tasks land on `defaultScheduledFor` (the day the board is showing).
 * The milestone/phase choice focuses the AI only — it is NOT persisted on the
 * task (no schema for that yet), by design.
 */

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Sparkles, Loader2, Check, Target } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useCoreData, type BrainStateId } from '../../data/CoreDataContext';
import { loadForMood, loadCopy, type Load } from '../../../lib/reentry';
import { TaskLoadPicker } from '../../ui/TaskLoadBadge';
import type { ProjectMilestone, ProjectPhase } from '../../services/ProjectService';

type EnergyLevel = 'high' | 'medium' | 'low';
function loadToEnergy(load: Load): EnergyLevel {
  return load === 'deep' ? 'high' : load === 'light' ? 'low' : 'medium';
}

/** A suggestion returned by the AI, with its estimated load. */
type Suggestion = { title: string; load: Load };

const LOAD_RANK: Record<Load, number> = { deep: 2, medium: 1, light: 0 };

export function AddTaskSheet({
  projectTitle,
  projectDescription,
  milestones,
  phases,
  defaultScheduledFor,
  dayLabel,
  colorHex,
  onClose,
  onCreate,
}: {
  projectTitle: string;
  projectDescription: string | null;
  milestones: ProjectMilestone[];
  phases: ProjectPhase[];
  /** YYYY-MM-DD the created task is scheduled for (the viewed day). */
  defaultScheduledFor: string | null;
  /** Human label for that day ("today", "Wed 28"). */
  dayLabel: string;
  colorHex: string;
  onClose: () => void;
  onCreate: (input: { title: string; energyLevel: EnergyLevel; scheduledFor: string | null }) => Promise<void>;
}) {
  const { brainStateOptions } = useCoreData();

  const [title, setTitle] = useState('');
  const [manualLoad, setManualLoad] = useState<Load>('medium');
  const [saving, setSaving] = useState(false);

  // Focus: which milestone / phase the AI should anchor on. null = whole project.
  const [focusMilestoneId, setFocusMilestoneId] = useState<string | null>(null);
  const [focusPhaseId, setFocusPhaseId] = useState<string | null>(null);

  // AI assist flow.
  const [assistOpen, setAssistOpen] = useState(false);
  const [mood, setMood] = useState<BrainStateId | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [addedTitles, setAddedTitles] = useState<Set<string>>(new Set());

  const focusMilestone = focusMilestoneId ? milestones.find((m) => m.id === focusMilestoneId) ?? null : null;
  const focusPhases = useMemo(
    () => (focusMilestoneId ? phases.filter((p) => p.milestone_id === focusMilestoneId) : []),
    [phases, focusMilestoneId],
  );
  const focusPhase = focusPhaseId ? phases.find((p) => p.id === focusPhaseId) ?? null : null;

  const targetLoad = mood ? loadForMood(mood) : null;

  async function handleManualAdd() {
    const t = title.trim();
    if (!t || saving) return;
    setSaving(true);
    try {
      await onCreate({ title: t, energyLevel: loadToEnergy(manualLoad), scheduledFor: defaultScheduledFor });
      setTitle('');
      onClose();
    } catch { /* host logs + reverts */ }
    finally { setSaving(false); }
  }

  /** Ask the edge function for next steps, scoped to the focused milestone/phase. */
  async function fetchSuggestions(forMood: BrainStateId) {
    setSuggesting(true);
    setAiError(null);
    setSuggestions([]);
    try {
      // Scope the phase context: a specific phase → just it; a milestone →
      // its phases; otherwise the whole project's phases.
      const phaseTitles = (
        focusPhase ? [focusPhase.title]
        : focusMilestone ? focusPhases.map((p) => p.title)
        : phases.map((p) => p.title)
      ).filter((s) => s.trim());

      const load = loadForMood(forMood);
      const { data, error } = await supabase.functions.invoke('suggest-project-roadmap', {
        body: {
          mode: 'tasks',
          project: {
            title: projectTitle,
            brain_dump: projectDescription || null,
          },
          phases: phaseTitles,
          // Hint the model toward the user's current capacity. It may ignore
          // this; we also re-rank + tag client-side so the mood always counts.
          target_load: load,
          mood: forMood,
          user_context: { work_types: [], industries: [], skills: [] },
        },
      });
      if (error) throw error;

      const raw: Suggestion[] = (data?.tasks ?? [])
        .filter((t: any) => t?.title)
        .map((t: any): Suggestion => {
          const hint = String(t.load ?? t.energy_level ?? t.energy ?? '').toLowerCase();
          const l: Load =
            /deep|hard|heavy|high/.test(hint) ? 'deep'
            : /light|easy|quick|low/.test(hint) ? 'light'
            : load; // default to the mood-matched load when the model is silent
          return { title: String(t.title).slice(0, 160), load: l };
        });

      // Float the suggestions that best fit the user's current energy.
      raw.sort((a, b) =>
        Math.abs(LOAD_RANK[a.load] - LOAD_RANK[load]) - Math.abs(LOAD_RANK[b.load] - LOAD_RANK[load]));

      if (raw.length === 0) {
        setAiError('No suggestions came back — add one by hand below.');
      }
      setSuggestions(raw);
    } catch (e) {
      console.warn('[AddTaskSheet] suggestions failed:', e);
      setAiError("Couldn't reach the suggestion service — add a task by hand below.");
    } finally {
      setSuggesting(false);
    }
  }

  function pickMood(id: BrainStateId) {
    setMood(id);
    void fetchSuggestions(id);
  }

  async function addSuggestion(s: Suggestion) {
    if (addedTitles.has(s.title)) return;
    setAddedTitles((prev) => new Set(prev).add(s.title));
    try {
      await onCreate({ title: s.title, energyLevel: loadToEnergy(s.load), scheduledFor: defaultScheduledFor });
    } catch {
      // Roll back the "added" tick so the user can retry.
      setAddedTitles((prev) => { const next = new Set(prev); next.delete(s.title); return next; });
    }
  }

  const loadHint = targetLoad ? loadCopy(targetLoad) : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md h-[94dvh] sm:h-auto sm:max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-surface shadow-2xl"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <span className="w-9 h-1 rounded-full bg-surface-container" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-3 pb-3">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold stitch-text-primary leading-tight">Add a task</h2>
            <p className="text-xs stitch-text-secondary leading-snug">
              Lands on <span className="font-semibold stitch-text-primary">{dayLabel}</span> · {projectTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-8 h-8 rounded-full grid place-items-center stitch-text-secondary hover:bg-surface-container-low"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* 1. Manual capture */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface-container-low ring-1 ring-surface-container">
            <Plus size={14} className="stitch-text-secondary shrink-0" />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 140))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleManualAdd(); }}
              autoFocus
              maxLength={140}
              placeholder="What do you want to get done?"
              className="flex-1 bg-transparent text-sm stitch-text-primary placeholder:stitch-text-secondary outline-none border-0 min-w-0"
            />
            {title.trim() && (
              <button
                type="button"
                onClick={handleManualAdd}
                disabled={saving}
                className="shrink-0 px-3 py-1 rounded-full text-[11px] font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: colorHex }}
              >
                {saving ? '…' : 'Add'}
              </button>
            )}
          </div>

          {/* Difficulty / focus for the new task */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary">Focus</span>
            <TaskLoadPicker value={manualLoad} onChange={setManualLoad} size="sm" />
          </div>

          {/* 2. Milestone / phase focus — used to anchor AI suggestions */}
          {milestones.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary mb-1.5">
                Focus (optional)
              </p>
              <div className="flex flex-wrap gap-1.5">
                <FocusChip
                  label="Whole project"
                  active={focusMilestoneId === null}
                  onClick={() => { setFocusMilestoneId(null); setFocusPhaseId(null); }}
                />
                {milestones.map((m) => (
                  <FocusChip
                    key={m.id}
                    label={m.title}
                    active={focusMilestoneId === m.id}
                    onClick={() => {
                      setFocusMilestoneId(m.id === focusMilestoneId ? null : m.id);
                      setFocusPhaseId(null);
                    }}
                  />
                ))}
              </div>
              {/* Sub-phases of the chosen milestone */}
              {focusMilestone && focusPhases.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5 pl-2 border-l-2 border-surface-container">
                  {focusPhases.map((p) => (
                    <FocusChip
                      key={p.id}
                      label={p.title}
                      small
                      active={focusPhaseId === p.id}
                      onClick={() => setFocusPhaseId(p.id === focusPhaseId ? null : p.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. AI assist */}
          <div className="rounded-2xl bg-primary/5 ring-1 ring-primary/15 p-3">
            {!assistOpen ? (
              <button
                type="button"
                onClick={() => setAssistOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary text-white text-sm font-bold active:scale-[0.98] transition-transform"
              >
                <Sparkles size={15} /> Help me figure out what to do
              </button>
            ) : (
              <div className="space-y-3">
                {/* Mood step */}
                <div>
                  <p className="text-sm font-bold stitch-text-primary leading-tight">
                    How's your head right now?
                  </p>
                  <p className="text-[11px] stitch-text-secondary leading-snug mb-2">
                    We'll match the suggestion to your energy.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {brainStateOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => pickMood(opt.id)}
                        aria-pressed={mood === opt.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                          mood === opt.id ? `${opt.tone} ring-2 ring-primary/30` : 'bg-surface-container-low stitch-text-secondary hover:bg-surface-container'
                        }`}
                      >
                        <span>{opt.emoji}</span> {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Matched-load header */}
                {loadHint && !suggesting && (
                  <div className="rounded-lg bg-surface px-3 py-2">
                    <p className="text-xs font-bold stitch-text-primary">{loadHint.label}</p>
                    <p className="text-[11px] stitch-text-secondary leading-snug">{loadHint.hint}</p>
                  </div>
                )}

                {/* Loading */}
                {suggesting && (
                  <div className="flex items-center gap-2 px-1 py-3 stitch-text-secondary">
                    <Loader2 size={15} className="animate-spin" />
                    <span className="text-xs font-semibold">Thinking about your next step…</span>
                  </div>
                )}

                {aiError && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-2">{aiError}</p>
                )}

                {/* Suggestions */}
                {!suggesting && suggestions.length > 0 && (
                  <div className="space-y-1.5">
                    {suggestions.map((s) => {
                      const added = addedTitles.has(s.title);
                      return (
                        <button
                          key={s.title}
                          type="button"
                          onClick={() => addSuggestion(s)}
                          disabled={added}
                          className={`w-full flex items-start gap-2 text-left rounded-xl px-3 py-2.5 ring-1 transition-all ${
                            added ? 'bg-emerald-50 ring-emerald-200' : 'bg-surface ring-surface-container hover:ring-primary/30 active:scale-[0.99]'
                          }`}
                        >
                          <span className="shrink-0 mt-0.5">
                            {added
                              ? <Check size={14} className="text-emerald-600" strokeWidth={3} />
                              : <Plus size={14} className="text-primary" />}
                          </span>
                          <span className={`flex-1 text-xs font-semibold leading-snug ${added ? 'text-emerald-800 line-through' : 'stitch-text-primary'}`}>
                            {s.title}
                          </span>
                          <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide stitch-text-secondary/70 mt-0.5">
                            {s.load}
                          </span>
                        </button>
                      );
                    })}
                    <p className="text-[10px] stitch-text-secondary/70 px-1 pt-0.5">
                      Tap to add — pick as many as you like, then close.
                    </p>
                  </div>
                )}

                {/* Focus reminder */}
                {(focusMilestone || focusPhase) && (
                  <p className="flex items-center gap-1 text-[10px] stitch-text-secondary px-1">
                    <Target size={10} /> Focused on {focusPhase?.title ?? focusMilestone?.title}
                  </p>
                )}
              </div>
            )}
          </div>

          {addedTitles.size > 0 && (
            <button
              type="button"
              onClick={onClose}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-bold hover:bg-surface-container active:scale-[0.98] transition-all"
            >
              Done — added {addedTitles.size} task{addedTitles.size === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function FocusChip({
  label, active, onClick, small,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center rounded-full font-semibold transition-all active:scale-95 max-w-[180px] truncate ${
        small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
      } ${
        active
          ? 'bg-primary text-white'
          : 'bg-surface-container-low stitch-text-secondary hover:bg-surface-container'
      }`}
      title={label}
    >
      {label}
    </button>
  );
}
