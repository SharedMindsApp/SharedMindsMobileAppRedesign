/**
 * IntentionWizard — guided multi-step flow for setting the week's 3 intentions.
 *
 * Designed for the first-time-this-week experience and for use during the
 * write phase of a community planning session. ADHD-friendly: one decision
 * at a time, full-screen focus, auto-saves on every step so people can
 * bounce without losing work.
 *
 * Steps:
 *   0. Welcome — frame the week, "three, no more"
 *   1. Intention 1 (required if creating new; optional otherwise)
 *   2. Intention 2 (skippable)
 *   3. Intention 3 (skippable)
 *   4. Review — see all three together, edit any
 *   5. Done — quick celebration + close
 */

import { useEffect, useMemo, useState } from 'react';
import {
  X, ArrowLeft, ArrowRight, Sparkles, Check, Loader2,
  Target, ChevronRight, Pencil,
} from 'lucide-react';
import { InputWell } from '../../ui/CorePage';
import { useCoreData } from '../../data/CoreDataContext';
import {
  ReflectionService, mondayOf, formatWeekRange,
  type WeeklyIntention,
} from '../../services/ReflectionService';

type DraftIntention = {
  // Persisted row id (set after first save)
  id: string | null;
  title: string;
  note: string;            // why/done-definition
  projectId: string | null;
};

const PROJECT_HEX: Record<string, string> = {
  cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
  emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
};
function projectDot(token: string | null) {
  return PROJECT_HEX[token ?? ''] ?? PROJECT_HEX.blue;
}

const STEP_TITLES = ['Welcome', 'Intention 1', 'Intention 2', 'Intention 3', 'Review', 'Done'];

export function IntentionWizard({
  onClose,
  onComplete,
  /** Optional override of which week we're planning (default: this week's Monday) */
  weekStart,
}: {
  onClose: () => void;
  onComplete?: () => void;
  weekStart?: string;
}) {
  const { state: { projects } } = useCoreData();
  const targetWeek = weekStart ?? mondayOf();

  const [step, setStep] = useState(0);
  const [reflectionId, setReflectionId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftIntention[]>([
    { id: null, title: '', note: '', projectId: null },
    { id: null, title: '', note: '', projectId: null },
    { id: null, title: '', note: '', projectId: null },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Bootstrap: ensure a reflection row + hydrate existing intentions ──
  async function runBootstrap() {
    setLoading(true);
    setError(null);
    try {
      const refl = await ReflectionService.ensureReflection(targetWeek);
      setReflectionId(refl.id);

      // Pull existing intentions (could be 0-3) directly by reflection id —
      // ensureReflection already gave us the row, so no need to re-fetch it.
      const ints = await ReflectionService.listIntentions(refl.id);
      const filled: DraftIntention[] = [0, 1, 2].map((i) => {
        const found = ints.find((x) => x.sort_order === i);
        if (!found) return { id: null, title: '', note: '', projectId: null };
        return {
          id: found.id,
          title: found.title,
          note: found.notes ?? '',
          projectId: found.project_id,
        };
      });
      setDrafts(filled);
    } catch (err: any) {
      console.error('[IntentionWizard] bootstrap failed:', err);
      // Surface it: without a reflection row, intentions can't save, so we
      // must NOT let the wizard look functional and silently discard work.
      setError(err?.message ?? "Couldn't load your week. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runBootstrap();
    return () => { /* no-op */ };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist a single intention row (create or update) ─────────
  async function persistDraft(slot: 0 | 1 | 2): Promise<void> {
    if (!reflectionId) return;
    const d = drafts[slot];
    const title = d.title.trim();

    if (!title) {
      // Title empty — if it was previously saved, delete the row so the user
      // ends up with N intentions, not three with blanks.
      if (d.id) {
        await ReflectionService.deleteIntention(d.id);
        const next = [...drafts];
        next[slot] = { ...d, id: null };
        setDrafts(next);
      }
      return;
    }

    try {
      setSaving(true);
      if (d.id) {
        await ReflectionService.updateIntention(d.id, {
          title,
          project_id: d.projectId,
          notes: d.note.trim() || null,
        });
      } else {
        const created = await ReflectionService.addIntention({
          reflectionId,
          title,
          projectId: d.projectId,
          sortOrder: slot,
        });
        // Also persist note if any
        if (d.note.trim()) {
          await ReflectionService.updateIntention(created.id, { notes: d.note.trim() });
        }
        const next = [...drafts];
        next[slot] = { ...d, id: created.id, title };
        setDrafts(next);
      }
    } catch (err: any) {
      console.error('[IntentionWizard] persist failed:', err);
      // 23514 = max-3 trigger. Shouldn't fire here because we slot by index.
      alert(err?.message ?? 'Could not save intention. Try again.');
    } finally {
      setSaving(false);
    }
  }

  function updateDraft(slot: 0 | 1 | 2, patch: Partial<DraftIntention>) {
    setDrafts((prev) => prev.map((d, i) => (i === slot ? { ...d, ...patch } : d)));
  }

  // ── Step navigation ────────────────────────────────────────────
  async function goNext() {
    // On intention steps, persist before advancing
    if (step >= 1 && step <= 3) {
      await persistDraft((step - 1) as 0 | 1 | 2);
    }
    setStep((s) => Math.min(s + 1, 5));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleComplete() {
    // Final flush — make sure the current step's draft is persisted
    if (step >= 1 && step <= 3) {
      await persistDraft((step - 1) as 0 | 1 | 2);
    }
    onComplete?.();
    onClose();
  }

  const totalSteps = STEP_TITLES.length;
  const filledCount = drafts.filter((d) => d.title.trim().length > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      <div className="relative w-full h-full flex flex-col max-w-2xl mx-auto">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-surface-container/60">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl stitch-card--accent flex items-center justify-center shrink-0">
                <Sparkles size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="stitch-headline text-base font-extrabold leading-tight">
                  Set your week
                </h2>
                <p className="text-xs stitch-text-secondary truncate">
                  {formatWeekRange(targetWeek)} · {STEP_TITLES[step]}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container transition-colors shrink-0"
              aria-label="Close wizard"
            >
              <X size={15} className="stitch-text-secondary" />
            </button>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${
                  i < step ? 'bg-primary' : i === step ? 'bg-primary/60' : 'bg-surface-container-low'
                }`}
              />
            ))}
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-6 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 stitch-text-secondary">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : error ? (
            <div className="max-w-md mx-auto text-center py-10">
              <h3 className="stitch-headline text-xl font-extrabold mb-2">Couldn't load your week</h3>
              <p className="text-sm stitch-text-secondary leading-relaxed mb-5">{error}</p>
              <button
                type="button"
                onClick={runBootstrap}
                className="inline-flex items-center gap-2 py-3 px-6 rounded-xl stitch-btn--primary text-white text-sm font-bold active:scale-[0.98]"
              >
                <ArrowRight size={14} /> Try again
              </button>
            </div>
          ) : step === 0 ? (
            <WelcomeStep filledCount={filledCount} weekStart={targetWeek} />
          ) : step === 1 ? (
            <IntentionStep
              slot={0}
              draft={drafts[0]}
              projects={projects}
              required
              onChange={(patch) => updateDraft(0, patch)}
            />
          ) : step === 2 ? (
            <IntentionStep
              slot={1}
              draft={drafts[1]}
              projects={projects}
              onChange={(patch) => updateDraft(1, patch)}
            />
          ) : step === 3 ? (
            <IntentionStep
              slot={2}
              draft={drafts[2]}
              projects={projects}
              onChange={(patch) => updateDraft(2, patch)}
            />
          ) : step === 4 ? (
            <ReviewStep
              drafts={drafts}
              projects={projects}
              onEdit={(slot) => setStep(slot + 1)}
            />
          ) : (
            <DoneStep filledCount={filledCount} />
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        {!error && !loading && (
        <div className="shrink-0 px-5 py-4 border-t border-surface-container/60 flex items-center justify-between gap-2">
          {step > 0 && step < 5 ? (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold stitch-text-secondary hover:stitch-text-primary transition-colors"
            >
              <ArrowLeft size={12} /> Back
            </button>
          ) : <span />}

          {step === 5 ? (
            <button
              type="button"
              onClick={handleComplete}
              className="ml-auto inline-flex items-center gap-2 py-3 px-6 rounded-xl stitch-btn--primary text-white text-sm font-bold shadow-lg shadow-primary/25 active:scale-[0.98]"
            >
              <Check size={14} strokeWidth={3} />
              Done
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={saving || (step === 1 && !drafts[0].title.trim())}
              className="ml-auto inline-flex items-center gap-2 py-3 px-6 rounded-xl stitch-btn--primary text-white text-sm font-bold shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : (
                <>
                  {step === 0 ? 'Begin' :
                   step >= 1 && step <= 3 && !drafts[step - 1].title.trim() ? 'Skip' :
                   step === 4 ? 'Lock in' : 'Next'}
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

// ── Step components ─────────────────────────────────────────────

function WelcomeStep({ filledCount, weekStart }: { filledCount: number; weekStart: string }) {
  return (
    <div className="max-w-md mx-auto text-center py-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-200/40 flex items-center justify-center mx-auto mb-5">
        <Target size={28} className="text-primary" strokeWidth={1.75} />
      </div>
      <h3 className="stitch-headline text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
        Three intentions for the week of {formatWeekRange(weekStart)}.
      </h3>
      <p className="text-base stitch-text-secondary leading-relaxed mb-2">
        The cap is the point. Three things you actually want done by Sunday — no more.
      </p>
      <p className="text-sm stitch-text-secondary leading-relaxed">
        You can edit them all week. We'll review together next Monday.
      </p>

      {filledCount > 0 && (
        <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold ring-1 ring-amber-200/40">
          <Pencil size={11} />
          You have {filledCount} already — the wizard will continue where you left off.
        </div>
      )}
    </div>
  );
}

function IntentionStep({
  slot, draft, projects, required, onChange,
}: {
  slot: 0 | 1 | 2;
  draft: DraftIntention;
  projects: { id: string; name: string; color: string | null }[];
  required?: boolean;
  onChange: (patch: Partial<DraftIntention>) => void;
}) {
  const labels = [
    {
      heading: 'What\'s the one big thing you want done this week?',
      help: 'Think of the thing that, if you finished it, would make this week feel like a win.',
    },
    {
      heading: 'What\'s the second intention?',
      help: 'Maybe a project moving forward, or a habit you\'re building.',
    },
    {
      heading: 'And the third?',
      help: 'Last one. Or skip — three is the cap, two is fine.',
    },
  ];
  const labelContent = labels[slot];

  return (
    <div className="max-w-lg mx-auto py-2 space-y-5">
      <div>
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">
          Intention {slot + 1} of 3 {required ? '· required' : '· optional'}
        </p>
        <h3 className="stitch-headline text-xl sm:text-2xl font-extrabold tracking-tight leading-tight mb-2">
          {labelContent.heading}
        </h3>
        <p className="text-sm stitch-text-secondary leading-relaxed">
          {labelContent.help}
        </p>
      </div>

      {/* Title */}
      <div>
        <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2 block">
          The intention
        </label>
        <InputWell
          value={draft.title}
          onChange={(v) => onChange({ title: v })}
          placeholder="e.g. Land 2 discovery calls"
        />
      </div>

      {/* Why / done definition */}
      <div>
        <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2 block">
          Why this matters <span className="opacity-60 normal-case font-medium">(optional)</span>
        </label>
        <InputWell
          value={draft.note}
          onChange={(v) => onChange({ note: v })}
          placeholder="What does done look like? Why this week?"
          multiline
          rows={3}
        />
      </div>

      {/* Project link */}
      {projects.length > 0 && (
        <div>
          <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2 block">
            Link to a project <span className="opacity-60 normal-case font-medium">(optional)</span>
          </label>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              type="button"
              onClick={() => onChange({ projectId: null })}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                draft.projectId === null
                  ? 'stitch-btn--primary text-white'
                  : 'bg-surface-container-low stitch-text-secondary hover:bg-surface-container'
              }`}
            >
              No project
            </button>
            {projects.map((p) => {
              const sel = draft.projectId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChange({ projectId: p.id })}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    sel
                      ? 'stitch-btn--primary text-white'
                      : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: projectDot(p.color) }} />
                  <span className="truncate max-w-[140px]">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {required && !draft.title.trim() && (
        <p className="text-xs stitch-text-secondary leading-relaxed italic">
          At least one intention is needed. Don't worry — you can always adjust it later.
        </p>
      )}
    </div>
  );
}

function ReviewStep({
  drafts, projects, onEdit,
}: {
  drafts: DraftIntention[];
  projects: { id: string; name: string; color: string | null }[];
  onEdit: (slot: 0 | 1 | 2) => void;
}) {
  const filled = drafts.filter((d) => d.title.trim().length > 0);

  return (
    <div className="max-w-lg mx-auto py-2">
      <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">
        Locking in
      </p>
      <h3 className="stitch-headline text-xl sm:text-2xl font-extrabold tracking-tight leading-tight mb-2">
        {filled.length === 0
          ? 'No intentions yet?'
          : filled.length === 1
          ? 'One thing this week.'
          : filled.length === 2
          ? 'Two things this week.'
          : 'Three things this week.'}
      </h3>
      <p className="text-sm stitch-text-secondary leading-relaxed mb-5">
        Tap any to edit, or lock in to head back.
      </p>

      <div className="space-y-2">
        {drafts.map((d, i) => {
          if (!d.title.trim()) {
            return (
              <button
                key={i}
                type="button"
                onClick={() => onEdit(i as 0 | 1 | 2)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-surface-container-high hover:border-primary/40 hover:bg-primary/5 transition-all text-left stitch-text-secondary"
              >
                <span className="text-[10px] font-bold tabular-nums">#{i + 1}</span>
                <span className="flex-1 text-sm">Add intention {i + 1}</span>
                <ChevronRight size={13} />
              </button>
            );
          }
          const project = d.projectId ? projects.find((p) => p.id === d.projectId) : null;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onEdit(i as 0 | 1 | 2)}
              className="w-full text-left rounded-xl bg-surface-container-low hover:bg-surface-container transition-all p-3 active:scale-[0.99]"
            >
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[10px] font-bold stitch-text-secondary tabular-nums">#{i + 1}</span>
                <p className="text-sm font-bold stitch-text-primary leading-snug flex-1">
                  {d.title}
                </p>
                <Pencil size={11} className="stitch-text-secondary opacity-70 shrink-0" />
              </div>
              {d.note && (
                <p className="text-xs stitch-text-secondary leading-snug ml-6 mb-1.5 italic">
                  "{d.note}"
                </p>
              )}
              {project && (
                <div className="ml-6 inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: projectDot(project.color) }} />
                  <span className="text-[10px] font-bold stitch-text-secondary uppercase tracking-wider">
                    {project.name}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DoneStep({ filledCount }: { filledCount: number }) {
  return (
    <div className="max-w-md mx-auto text-center py-10">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/30">
        <Check size={36} className="text-white" strokeWidth={3} />
      </div>
      <h3 className="stitch-headline text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
        Locked in.
      </h3>
      <p className="text-base stitch-text-secondary leading-relaxed mb-2">
        {filledCount === 0 ? 'Set them whenever you\'re ready.' :
         filledCount === 1 ? 'One thing. Go finish it.' :
         filledCount === 2 ? 'Two things. Show up.' :
         'Three things. The cap is the point.'}
      </p>
      <p className="text-sm stitch-text-secondary leading-relaxed">
        We'll review together next Monday.
      </p>
    </div>
  );
}

// Suppress unused-import warning for types only
export type { WeeklyIntention };
