/**
 * ReflectionPage — /reflection
 *
 * Three tabs:
 *   1. This week     — set/edit up to 3 intentions for the current week
 *   2. Last week     — tick off + 1-5 rate each + write overall reflection
 *   3. History       — past weeks at a glance
 *
 * Plus a "Schedule a review call" button that pre-fills DeclareSessionModal
 * with a weekly review goal so users can do the ritual with another person.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Calendar, Check, Circle, Loader2, Plus,
  Sparkles, Star, Trash2, UserPlus,
} from 'lucide-react';
import {
  ReflectionService, mondayOf, mondayPlusWeeks, formatWeekRange,
  type ReflectionWithIntentions, type WeeklyIntention,
} from '../../services/ReflectionService';
import { useCoreData } from '../../data/CoreDataContext';
import { DeclareSessionModal } from '../sessions/DeclareSessionModal';
import { IntentionWizard } from './IntentionWizard';
import { PageGreeting, SurfaceCard, GradientButton, InputWell } from '../../ui/CorePage';

type Tab = 'this' | 'last' | 'history';

const PROJECT_HEX: Record<string, string> = {
  cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
  emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
};
function projectDot(token: string | null) {
  return PROJECT_HEX[token ?? ''] ?? PROJECT_HEX.blue;
}

export function ReflectionPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('this');
  const [thisWeek, setThisWeek] = useState<ReflectionWithIntentions | null>(null);
  const [lastWeek, setLastWeek] = useState<ReflectionWithIntentions | null>(null);
  const [history, setHistory] = useState<ReflectionWithIntentions[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  const thisMonday = useMemo(() => mondayOf(), []);
  const lastMonday = useMemo(() => mondayPlusWeeks(-1), []);

  async function reloadAll() {
    const [t, l, h] = await Promise.all([
      ReflectionService.getReflectionByWeek(thisMonday),
      ReflectionService.getReflectionByWeek(lastMonday),
      ReflectionService.getRecentReflections(12),
    ]);
    setThisWeek(t);
    setLastWeek(l);
    setHistory(h);
    setLoaded(true);
  }

  useEffect(() => {
    reloadAll().catch(() => setLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If last week exists with intentions but no reflection, default to "Last week" tab
  useEffect(() => {
    if (!loaded || !lastWeek) return;
    if (lastWeek.intentions.length > 0 && lastWeek.reflection.status !== 'complete') {
      setTab('last');
    }
  }, [loaded, lastWeek]);

  return (
    <div className="space-y-5 sm:space-y-6 max-w-3xl mx-auto">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold stitch-text-secondary hover:stitch-text-primary"
      >
        <ArrowLeft size={13} /> Back
      </button>

      <PageGreeting
        greeting="Weekly Review"
        subtitle="Three intentions. Tick them off, reflect, and pick three more. ADHD-friendly — no more."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <GradientButton size="sm" onClick={() => setShowWizard(true)}>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles size={13} /> Guided wizard
              </span>
            </GradientButton>
            <GradientButton size="sm" variant="secondary" onClick={() => setShowReviewModal(true)}>
              <span className="inline-flex items-center gap-1.5">
                <UserPlus size={13} /> Review with someone
              </span>
            </GradientButton>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex p-1 bg-surface-container-low rounded-full gap-1">
        {([
          { id: 'this' as const, label: `This week · ${formatWeekRange(thisMonday)}` },
          { id: 'last' as const, label: `Last week · ${formatWeekRange(lastMonday)}` },
          { id: 'history' as const, label: 'History' },
        ]).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold transition-all truncate ${
              tab === id ? 'bg-white shadow-sm text-primary' : 'stitch-text-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!loaded && (
        <div className="flex items-center justify-center py-12 stitch-text-secondary">
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}

      {loaded && tab === 'this' && (
        <ThisWeekTab
          weekStart={thisMonday}
          existing={thisWeek}
          onChange={reloadAll}
        />
      )}

      {loaded && tab === 'last' && (
        <LastWeekTab
          weekStart={lastMonday}
          data={lastWeek}
          onChange={reloadAll}
          onSetThisWeek={() => setTab('this')}
        />
      )}

      {loaded && tab === 'history' && (
        <HistoryTab items={history} />
      )}

      {showReviewModal && (
        <DeclareSessionModal
          onClose={() => setShowReviewModal(false)}
          initialGoal="Weekly review together"
          initialDuration={50}
        />
      )}

      {showWizard && (
        <IntentionWizard
          weekStart={thisMonday}
          onClose={() => setShowWizard(false)}
          onComplete={reloadAll}
        />
      )}
    </div>
  );
}

// ── This Week tab ────────────────────────────────────────────────

function ThisWeekTab({
  weekStart, existing, onChange,
}: {
  weekStart: string;
  existing: ReflectionWithIntentions | null;
  onChange: () => Promise<void>;
}) {
  const { state: { projects } } = useCoreData();
  const [adding, setAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftProject, setDraftProject] = useState<string | null>(null);

  const intentions = existing?.intentions ?? [];
  const canAdd = intentions.length < 3;

  async function handleAdd() {
    const title = draftTitle.trim();
    if (!title) return;
    try {
      const refl = existing?.reflection ?? await ReflectionService.ensureReflection(weekStart);
      await ReflectionService.addIntention({
        reflectionId: refl.id,
        title,
        projectId: draftProject,
        sortOrder: intentions.length as 0 | 1 | 2,
      });
      setDraftTitle('');
      setDraftProject(null);
      setAdding(false);
      await onChange();
    } catch (err: any) {
      alert(err?.message ?? 'Could not add intention.');
    }
  }

  async function handleToggle(intent: WeeklyIntention) {
    await ReflectionService.toggleIntentionComplete(intent);
    await onChange();
  }

  async function handleDelete(intent: WeeklyIntention) {
    if (!confirm(`Remove "${intent.title}" from this week?`)) return;
    await ReflectionService.deleteIntention(intent.id);
    await onChange();
  }

  return (
    <SurfaceCard>
      <div className="mb-3">
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1">
          Your three intentions
        </p>
        <p className="text-xs stitch-text-secondary">
          One sentence each. Tick them off as the week unfolds.
        </p>
      </div>

      <div className="space-y-2">
        {intentions.map((it, i) => (
          <IntentionRow
            key={it.id}
            index={i}
            intention={it}
            projects={projects}
            onToggle={() => handleToggle(it)}
            onDelete={() => handleDelete(it)}
          />
        ))}

        {canAdd && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-container-low hover:bg-surface-container border-2 border-dashed border-surface-container-high transition-all stitch-text-secondary text-sm font-bold"
          >
            <Plus size={14} />
            Add intention {intentions.length + 1} of 3
          </button>
        )}

        {adding && (
          <div className="rounded-xl bg-surface-container-low p-3 space-y-2.5">
            <InputWell
              value={draftTitle}
              onChange={setDraftTitle}
              onSubmit={handleAdd}
              placeholder="e.g. Land 2 new discovery calls"
            />
            {projects.length > 0 && (
              <div>
                <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1.5">
                  Link to a project <span className="opacity-60 normal-case font-medium">(optional)</span>
                </p>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setDraftProject(null)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      draftProject === null
                        ? 'stitch-btn--primary text-white'
                        : 'bg-white stitch-text-secondary hover:bg-surface-container'
                    }`}
                  >
                    No project
                  </button>
                  {projects.map((p) => {
                    const sel = draftProject === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setDraftProject(p.id)}
                        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          sel
                            ? 'stitch-btn--primary text-white'
                            : 'bg-white stitch-text-primary hover:bg-surface-container'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: projectDot(p.color) }}
                        />
                        <span className="truncate max-w-[120px]">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setAdding(false); setDraftTitle(''); setDraftProject(null); }}
                className="px-3 py-2 text-xs font-bold rounded-full stitch-text-secondary hover:bg-surface-container"
              >
                Cancel
              </button>
              <GradientButton size="sm" onClick={handleAdd} disabled={!draftTitle.trim()}>
                Add intention
              </GradientButton>
            </div>
          </div>
        )}

        {!canAdd && (
          <div className="rounded-xl bg-amber-50 border border-amber-200/60 px-4 py-3">
            <p className="text-xs text-amber-800 leading-relaxed">
              You're at the three-intention cap — that's the point. If something
              changed and an intention no longer fits, remove it before adding
              a new one.
            </p>
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}

// ── A single intention row in This Week ──────────────────────────

function IntentionRow({
  index, intention, projects, onToggle, onDelete,
}: {
  index: number;
  intention: WeeklyIntention;
  projects: { id: string; name: string; color: string | null }[];
  onToggle: () => void;
  onDelete: () => void;
}) {
  const done = !!intention.completed_at;
  const project = intention.project_id ? projects.find((p) => p.id === intention.project_id) : null;

  return (
    <div className={`group flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all ${
      done ? 'bg-emerald-50' : 'bg-surface-container-low hover:bg-surface-container'
    }`}>
      <button
        type="button"
        onClick={onToggle}
        className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          done ? 'bg-emerald-500 text-white' : 'bg-white ring-1 ring-surface-container-high hover:ring-primary/40'
        }`}
        aria-label={done ? 'Undo' : 'Mark complete'}
      >
        {done ? <Check size={12} strokeWidth={3} /> : <Circle size={10} className="stitch-text-secondary" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[10px] font-bold stitch-text-secondary tabular-nums">
            #{index + 1}
          </span>
          <p className={`text-sm font-semibold leading-snug ${done ? 'line-through stitch-text-secondary' : 'stitch-text-primary'}`}>
            {intention.title}
          </p>
        </div>
        {project && (
          <div className="mt-1 inline-flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: projectDot(project.color) }}
            />
            <span className="text-[10px] font-bold stitch-text-secondary uppercase tracking-wider">
              {project.name}
            </span>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity stitch-text-secondary hover:text-rose-600 p-1"
        aria-label="Delete intention"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ── Last Week tab ────────────────────────────────────────────────

function LastWeekTab({
  weekStart, data, onChange, onSetThisWeek,
}: {
  weekStart: string;
  data: ReflectionWithIntentions | null;
  onChange: () => Promise<void>;
  onSetThisWeek: () => void;
}) {
  const { state: { projects } } = useCoreData();
  const [reflectionText, setReflectionText] = useState(data?.reflection.reflection_text ?? '');
  const [savingReflection, setSavingReflection] = useState(false);

  useEffect(() => {
    setReflectionText(data?.reflection.reflection_text ?? '');
  }, [data]);

  if (!data || data.intentions.length === 0) {
    return (
      <SurfaceCard>
        <div className="text-center py-10 px-6">
          <Calendar size={28} className="mx-auto mb-3 stitch-text-secondary opacity-50" />
          <p className="text-sm font-bold stitch-text-primary mb-1">
            No intentions set for {formatWeekRange(weekStart)}
          </p>
          <p className="text-xs stitch-text-secondary leading-relaxed max-w-[280px] mx-auto mb-5">
            That's fine — start fresh this week. Set up to three intentions
            and we'll review them next Monday.
          </p>
          <GradientButton size="sm" onClick={onSetThisWeek}>
            <span className="inline-flex items-center gap-1.5">
              Set this week's intentions
              <ArrowRight size={12} />
            </span>
          </GradientButton>
        </div>
      </SurfaceCard>
    );
  }

  const allRated = data.intentions.every((i) => i.rating !== null);

  async function setRating(intent: WeeklyIntention, rating: number) {
    await ReflectionService.updateIntention(intent.id, { rating });
    await onChange();
  }

  async function setComplete(intent: WeeklyIntention, value: boolean) {
    await ReflectionService.updateIntention(intent.id, {
      completed_at: value ? new Date().toISOString() : null,
    });
    await onChange();
  }

  async function saveReflectionDebounced() {
    if (!data) return;
    setSavingReflection(true);
    await ReflectionService.updateReflection(data.reflection.id, {
      reflection_text: reflectionText.trim() || null,
    });
    setSavingReflection(false);
  }

  async function markComplete() {
    if (!data) return;
    await ReflectionService.updateReflection(data.reflection.id, {
      reflection_text: reflectionText.trim() || null,
      status: 'complete',
    });
    await onChange();
    onSetThisWeek();
  }

  return (
    <div className="space-y-4">
      <SurfaceCard>
        <div className="mb-4">
          <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1">
            How did it go?
          </p>
          <p className="text-xs stitch-text-secondary">
            Tick each, rate 1–5 by how you actually feel about it (not whether it's "done").
          </p>
        </div>

        <div className="space-y-3">
          {data.intentions.map((it, i) => {
            const project = it.project_id ? projects.find((p) => p.id === it.project_id) : null;
            return (
              <div key={it.id} className="rounded-xl bg-surface-container-low p-3">
                <div className="flex items-start gap-3 mb-2.5">
                  <button
                    type="button"
                    onClick={() => setComplete(it, !it.completed_at)}
                    className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      it.completed_at ? 'bg-emerald-500 text-white' : 'bg-white ring-1 ring-surface-container-high'
                    }`}
                  >
                    {it.completed_at ? <Check size={12} strokeWidth={3} /> : <Circle size={10} className="stitch-text-secondary" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-bold stitch-text-secondary tabular-nums">#{i + 1}</span>
                      <p className={`text-sm font-semibold leading-snug ${it.completed_at ? 'line-through stitch-text-secondary' : 'stitch-text-primary'}`}>
                        {it.title}
                      </p>
                    </div>
                    {project && (
                      <div className="mt-1 inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: projectDot(project.color) }} />
                        <span className="text-[10px] font-bold stitch-text-secondary uppercase tracking-wider">{project.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold stitch-text-secondary uppercase tracking-wider mr-1">Rate</span>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const filled = (it.rating ?? 0) >= n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(it, n)}
                        className="p-0.5 transition-transform active:scale-90"
                        aria-label={`Rate ${n}`}
                      >
                        <Star
                          size={16}
                          className={filled ? 'text-amber-400' : 'stitch-text-secondary opacity-40'}
                          fill={filled ? 'currentColor' : 'none'}
                        />
                      </button>
                    );
                  })}
                  {it.rating != null && (
                    <button
                      type="button"
                      onClick={() => setRating(it, 0)}
                      className="ml-auto text-[10px] stitch-text-secondary hover:text-rose-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1">
          One reflection
        </p>
        <p className="text-xs stitch-text-secondary mb-3">
          What was the week really about? What surprised you? What's worth carrying forward?
        </p>
        <InputWell
          value={reflectionText}
          onChange={setReflectionText}
          onSubmit={saveReflectionDebounced}
          placeholder="Free-write a few lines…"
          multiline
          rows={4}
        />
        <div className="flex items-center justify-between mt-3 gap-2">
          <p className="text-[10px] stitch-text-secondary">
            {savingReflection ? 'Saving…' : 'Auto-saves on submit'}
          </p>
          <GradientButton
            size="sm"
            onClick={markComplete}
            disabled={!allRated}
          >
            <span className="inline-flex items-center gap-1.5">
              <Sparkles size={12} />
              {allRated ? 'Lock in & plan next week' : 'Rate all three first'}
            </span>
          </GradientButton>
        </div>
      </SurfaceCard>
    </div>
  );
}

// ── History tab ──────────────────────────────────────────────────

function HistoryTab({ items }: { items: ReflectionWithIntentions[] }) {
  const { state: { projects } } = useCoreData();

  if (items.length === 0) {
    return (
      <SurfaceCard>
        <div className="text-center py-10 px-6">
          <Calendar size={28} className="mx-auto mb-3 stitch-text-secondary opacity-50" />
          <p className="text-sm font-bold stitch-text-primary mb-1">No past reviews yet</p>
          <p className="text-xs stitch-text-secondary">
            Your weekly history will fill up here as you go.
          </p>
        </div>
      </SurfaceCard>
    );
  }

  return (
    <div className="space-y-3">
      {items.map(({ reflection, intentions }) => {
        const doneCount = intentions.filter((i) => i.completed_at).length;
        const avgRating = intentions.length > 0
          ? intentions.reduce((acc, i) => acc + (i.rating ?? 0), 0) / intentions.length
          : 0;
        return (
          <SurfaceCard key={reflection.id}>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <p className="text-sm font-bold stitch-text-primary">{formatWeekRange(reflection.week_start)}</p>
              <span className="text-[10px] font-bold uppercase tracking-wider stitch-text-secondary">
                {doneCount}/{intentions.length} done{avgRating > 0 ? ` · ${avgRating.toFixed(1)}/5 avg` : ''}
              </span>
            </div>
            <div className="space-y-1.5">
              {intentions.map((it) => {
                const project = it.project_id ? projects.find((p) => p.id === it.project_id) : null;
                return (
                  <div key={it.id} className="flex items-center gap-2 text-xs">
                    {it.completed_at
                      ? <Check size={11} className="text-emerald-500 shrink-0" strokeWidth={3} />
                      : <Circle size={11} className="stitch-text-secondary shrink-0" />}
                    <span className={it.completed_at ? 'line-through stitch-text-secondary' : 'stitch-text-primary'}>
                      {it.title}
                    </span>
                    {project && (
                      <span className="inline-flex items-center gap-1 ml-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: projectDot(project.color) }} />
                      </span>
                    )}
                    {it.rating != null && (
                      <span className="ml-auto text-amber-500 font-bold tabular-nums">{it.rating}/5</span>
                    )}
                  </div>
                );
              })}
            </div>
            {reflection.reflection_text && (
              <p className="text-xs stitch-text-secondary leading-snug mt-3 pt-3 border-t border-surface-container/60 italic">
                "{reflection.reflection_text}"
              </p>
            )}
          </SurfaceCard>
        );
      })}
    </div>
  );
}
