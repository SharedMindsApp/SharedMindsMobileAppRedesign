/**
 * WeeklyIntentionsCard — this week's 3 intentions, with microtask breakdown.
 *
 * The ADHD insight: "Post on social this week" looks like 1 task, but is
 * actually 15+ micro-actions. Revealing the steps makes the real effort
 * visible. Instead of asking "how long?", we use energy level as a proxy:
 *
 *   Deep   = 1 full focus session (~90 min)
 *   Medium = ½ session, batch 2 (~50 min each)
 *   Quick  = ¼ session, batch 4 (~25 min each)
 *
 * The card computes "~N sessions" from the energy breakdown so users can
 * see BEFORE the week starts whether they've over-committed.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, Circle, ArrowRight, Sparkles, Plus, ChevronDown, ChevronRight,
  Zap, Brain, Minus, Trash2, X,
} from 'lucide-react';
import {
  ReflectionService, mondayOf, estimateSessions,
  ENERGY_LABEL, ENERGY_DESCRIPTION,
  type ReflectionWithIntentions, type WeeklyIntentionWithMicrotasks,
  type Microtask, type MicrotaskEnergy,
} from '../../services/ReflectionService';
import { useCoreData } from '../../data/CoreDataContext';
import { IntentionWizard } from '../reflection/IntentionWizard';

// ── Energy badge ─────────────────────────────────────────────────

const ENERGY_CONFIG: Record<MicrotaskEnergy, {
  icon: React.ReactNode;
  bg: string;
  text: string;
  border: string;
}> = {
  deep: {
    icon: <Brain size={9} strokeWidth={2.5} />,
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
  },
  medium: {
    icon: <Circle size={9} strokeWidth={2.5} />,
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  quick: {
    icon: <Zap size={9} strokeWidth={2.5} />,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
};

const ENERGY_CYCLE: MicrotaskEnergy[] = ['quick', 'medium', 'deep'];

function EnergyBadge({
  level, onClick, title,
}: {
  level: MicrotaskEnergy;
  onClick?: () => void;
  title?: string;
}) {
  const cfg = ENERGY_CONFIG[level];
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? ENERGY_DESCRIPTION[level]}
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border
        ${cfg.bg} ${cfg.text} ${cfg.border}
        ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}
      `}
    >
      {cfg.icon}
      {ENERGY_LABEL[level]}
    </button>
  );
}

// ── Session cost badge ────────────────────────────────────────────

function SessionEstimate({ sessions }: { sessions: number }) {
  if (sessions === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-primary/70 bg-primary/8 px-1.5 py-0.5 rounded-full tabular-nums">
      ~{sessions} session{sessions !== 1 ? 's' : ''}
    </span>
  );
}

// ── Microtask row ─────────────────────────────────────────────────

function MicrotaskRow({
  microtask,
  onToggle,
  onEnergyChange,
  onDelete,
}: {
  microtask: Microtask;
  onToggle: () => void;
  onEnergyChange: (next: MicrotaskEnergy) => void;
  onDelete: () => void;
}) {
  const done = !!microtask.completed_at;

  function cycleEnergy() {
    const idx = ENERGY_CYCLE.indexOf(microtask.energy_level);
    const next = ENERGY_CYCLE[(idx + 1) % ENERGY_CYCLE.length];
    onEnergyChange(next);
  }

  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 rounded-xl group transition-colors ${
      done ? 'opacity-60' : 'hover:bg-surface-container-low'
    }`}>
      {/* Check */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          done
            ? 'bg-emerald-500 text-white'
            : 'bg-surface-container ring-1 ring-surface-container-high hover:ring-primary/40'
        }`}
      >
        {done && <Check size={8} strokeWidth={3} />}
      </button>

      {/* Title */}
      <span className={`flex-1 text-xs leading-snug ${
        done ? 'line-through stitch-text-secondary' : 'stitch-text-primary'
      }`}>
        {microtask.title}
      </span>

      {/* Energy badge — cycles on tap */}
      {!done && (
        <EnergyBadge
          level={microtask.energy_level}
          onClick={cycleEnergy}
          title={`Effort: ${ENERGY_DESCRIPTION[microtask.energy_level]} — tap to change`}
        />
      )}

      {/* Delete — only on hover */}
      <button
        type="button"
        onClick={onDelete}
        className="w-4 h-4 flex items-center justify-center stitch-text-secondary opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-rose-500 transition-all shrink-0"
        title="Remove step"
      >
        <X size={10} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ── Add microtask inline ──────────────────────────────────────────

function AddMicrotaskRow({
  onAdd,
  onCancel,
}: {
  onAdd: (title: string, energy: MicrotaskEnergy) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [energy, setEnergy] = useState<MicrotaskEnergy>('medium');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && title.trim()) {
      onAdd(title.trim(), energy);
      setTitle('');
      inputRef.current?.focus();
    }
    if (e.key === 'Escape') onCancel();
  }

  function cycleEnergy() {
    const idx = ENERGY_CYCLE.indexOf(energy);
    setEnergy(ENERGY_CYCLE[(idx + 1) % ENERGY_CYCLE.length]);
  }

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-xl bg-surface-container-low">
      <div className="w-4 h-4 rounded-full shrink-0 bg-surface-container ring-1 ring-surface-container-high" />
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKey}
        placeholder="What's the step? ↵ to add"
        maxLength={200}
        className="flex-1 text-xs bg-transparent outline-none stitch-text-primary placeholder:stitch-text-secondary placeholder:font-normal"
      />
      <EnergyBadge
        level={energy}
        onClick={cycleEnergy}
        title={`${ENERGY_DESCRIPTION[energy]} — tap to change`}
      />
      {title.trim() && (
        <button
          type="button"
          onClick={() => { onAdd(title.trim(), energy); setTitle(''); inputRef.current?.focus(); }}
          className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full hover:bg-primary/20 transition-colors shrink-0"
        >
          Add
        </button>
      )}
    </div>
  );
}

// ── Intention row (with expandable microtasks) ────────────────────

function IntentionRow({
  intention,
  index,
  projectColor,
  onToggle,
  onMicrotaskToggle,
  onMicrotaskEnergyChange,
  onMicrotaskDelete,
  onMicrotaskAdd,
}: {
  intention: WeeklyIntentionWithMicrotasks;
  index: number;
  projectColor: string | null;
  onToggle: () => void;
  onMicrotaskToggle: (m: Microtask) => void;
  onMicrotaskEnergyChange: (m: Microtask, next: MicrotaskEnergy) => void;
  onMicrotaskDelete: (m: Microtask) => void;
  onMicrotaskAdd: (title: string, energy: MicrotaskEnergy) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const done = !!intention.completed_at;
  const microtasks = intention.microtasks ?? [];
  const doneSteps = microtasks.filter((m) => m.completed_at).length;
  const sessions = estimateSessions(microtasks);

  const PROJECT_HEX: Record<string, string> = {
    cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
    emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
  };

  function handleAdd(title: string, energy: MicrotaskEnergy) {
    onMicrotaskAdd(title, energy);
  }

  return (
    <div className={`rounded-xl transition-all ${
      done ? 'bg-emerald-50' : 'bg-white'
    }`}>
      {/* Intention header row */}
      <div className="flex items-center gap-2 px-2.5 py-2">
        {/* Complete toggle */}
        <button
          type="button"
          onClick={onToggle}
          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            done
              ? 'bg-emerald-500 text-white'
              : 'bg-surface-container-low ring-1 ring-surface-container-high hover:ring-primary/40'
          }`}
        >
          {done ? <Check size={10} strokeWidth={3} /> : <Circle size={8} className="stitch-text-secondary" />}
        </button>

        {/* Index */}
        <span className="text-[10px] font-bold stitch-text-secondary tabular-nums shrink-0">
          #{index + 1}
        </span>

        {/* Title */}
        <span className={`flex-1 text-sm font-semibold leading-tight ${
          done ? 'line-through stitch-text-secondary' : 'stitch-text-primary'
        }`}>
          {intention.title}
        </span>

        {/* Chips: microtask count + session estimate */}
        <div className="flex items-center gap-1 shrink-0">
          {microtasks.length > 0 && (
            <span className="text-[9px] font-bold stitch-text-secondary tabular-nums">
              {doneSteps}/{microtasks.length}
            </span>
          )}
          {sessions > 0 && <SessionEstimate sessions={sessions} />}
          {projectColor && (
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: projectColor }}
            />
          )}
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? 'Collapse steps' : 'Break down into steps'}
          className="w-5 h-5 flex items-center justify-center stitch-text-secondary hover:text-primary transition-colors shrink-0"
        >
          {expanded ? <ChevronDown size={13} strokeWidth={2.5} /> : <ChevronRight size={13} strokeWidth={2.5} />}
        </button>
      </div>

      {/* Microtask panel */}
      {expanded && (
        <div className="px-2 pb-2">
          {/* ADHD framing — only shown when there are no microtasks yet */}
          {microtasks.length === 0 && (
            <p className="text-[10px] stitch-text-secondary leading-relaxed px-2 py-1.5 mb-1">
              What are <em>all</em> the steps? List them out — hidden work becomes visible, and you'll know what this actually costs.
            </p>
          )}

          {/* Existing microtasks */}
          {microtasks.length > 0 && (
            <div className="space-y-0.5 mb-1.5">
              {microtasks.map((m) => (
                <MicrotaskRow
                  key={m.id}
                  microtask={m}
                  onToggle={() => onMicrotaskToggle(m)}
                  onEnergyChange={(next) => onMicrotaskEnergyChange(m, next)}
                  onDelete={() => onMicrotaskDelete(m)}
                />
              ))}
            </div>
          )}

          {/* Add form */}
          {showAdd ? (
            <AddMicrotaskRow
              onAdd={(title, energy) => {
                handleAdd(title, energy);
              }}
              onCancel={() => setShowAdd(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-[10px] font-bold stitch-text-secondary hover:bg-surface-container-low transition-colors"
            >
              <Plus size={10} strokeWidth={2.5} />
              Add step
            </button>
          )}

          {/* Session cost breakdown — shown when ≥1 microtask with energy context */}
          {microtasks.length > 0 && (
            <div className="mt-2 pt-2 border-t border-surface-container flex items-center gap-2 flex-wrap">
              <span className="text-[9px] stitch-text-secondary">Effort breakdown:</span>
              {(['deep', 'medium', 'quick'] as MicrotaskEnergy[]).map((level) => {
                const count = microtasks.filter((m) => !m.completed_at && m.energy_level === level).length;
                if (count === 0) return null;
                return (
                  <EnergyBadge
                    key={level}
                    level={level}
                    title={`${count} ${ENERGY_LABEL[level]} step${count !== 1 ? 's' : ''}`}
                  />
                );
              })}
              {sessions > 0 && (
                <span className="text-[9px] font-bold text-primary ml-auto">
                  ~{sessions} session{sessions !== 1 ? 's' : ''} total
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────

const PROJECT_HEX: Record<string, string> = {
  cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
  emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
};
function projectDot(token: string | null) {
  return PROJECT_HEX[token ?? ''] ?? PROJECT_HEX.blue;
}

export function WeeklyIntentionsCard() {
  const navigate = useNavigate();
  const { state: { projects } } = useCoreData();
  const [data, setData] = useState<ReflectionWithIntentions | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  async function reload() {
    const d = await ReflectionService.getReflectionByWeek(mondayOf());
    setData(d);
    setLoaded(true);
  }

  useEffect(() => { reload().catch(() => setLoaded(true)); }, []);

  // ── Intention toggle ──────────────────────────────────────────

  async function handleToggle(intent: WeeklyIntentionWithMicrotasks) {
    setData((prev) => prev && {
      ...prev,
      intentions: prev.intentions.map((it) =>
        it.id === intent.id ? { ...it, completed_at: it.completed_at ? null : new Date().toISOString() } : it,
      ),
    });
    try {
      await ReflectionService.toggleIntentionComplete(intent);
    } catch {
      reload();
    }
  }

  // ── Microtask actions ─────────────────────────────────────────

  function patchMicrotask(intentionId: string, updated: Microtask) {
    setData((prev) => prev && {
      ...prev,
      intentions: prev.intentions.map((it) =>
        it.id !== intentionId ? it : {
          ...it,
          microtasks: it.microtasks.map((m) => m.id === updated.id ? updated : m),
        }
      ),
    });
  }

  function removeMicrotask(intentionId: string, microtaskId: string) {
    setData((prev) => prev && {
      ...prev,
      intentions: prev.intentions.map((it) =>
        it.id !== intentionId ? it : {
          ...it,
          microtasks: it.microtasks.filter((m) => m.id !== microtaskId),
        }
      ),
    });
  }

  function appendMicrotask(intentionId: string, m: Microtask) {
    setData((prev) => prev && {
      ...prev,
      intentions: prev.intentions.map((it) =>
        it.id !== intentionId ? it : {
          ...it,
          microtasks: [...it.microtasks, m],
        }
      ),
    });
  }

  async function handleMicrotaskToggle(intentionId: string, m: Microtask) {
    const optimistic = { ...m, completed_at: m.completed_at ? null : new Date().toISOString() };
    patchMicrotask(intentionId, optimistic);
    try {
      const updated = await ReflectionService.toggleMicrotaskComplete(m);
      patchMicrotask(intentionId, updated);
    } catch {
      patchMicrotask(intentionId, m); // revert
    }
  }

  async function handleMicrotaskEnergyChange(intentionId: string, m: Microtask, next: MicrotaskEnergy) {
    const optimistic = { ...m, energy_level: next };
    patchMicrotask(intentionId, optimistic);
    try {
      const updated = await ReflectionService.updateMicrotask(m.id, { energy_level: next });
      patchMicrotask(intentionId, updated);
    } catch {
      patchMicrotask(intentionId, m);
    }
  }

  async function handleMicrotaskDelete(intentionId: string, m: Microtask) {
    removeMicrotask(intentionId, m.id);
    try {
      await ReflectionService.deleteMicrotask(m.id);
    } catch {
      appendMicrotask(intentionId, m); // revert
    }
  }

  async function handleMicrotaskAdd(
    intentionId: string,
    title: string,
    energy: MicrotaskEnergy,
    currentCount: number,
  ) {
    try {
      const newMicrotask = await ReflectionService.addMicrotask({
        intentionId,
        title,
        energyLevel: energy,
        sortOrder: currentCount,
      });
      appendMicrotask(intentionId, newMicrotask);
    } catch {
      // silently fail — user can try again
    }
  }

  // ── Render ────────────────────────────────────────────────────

  if (!loaded) return null;

  const intentions = data?.intentions ?? [];
  const doneCount = intentions.filter((i) => i.completed_at).length;
  const totalSessions = intentions.reduce(
    (sum, it) => sum + estimateSessions(it.microtasks ?? []),
    0,
  );

  // Empty state
  if (intentions.length === 0) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowWizard(true)}
          className="w-full text-left rounded-2xl bg-gradient-to-br from-violet-50 via-blue-50/40 to-cyan-50/40 ring-1 ring-violet-200/40 hover:from-violet-100/80 transition-all p-4 active:scale-[0.99] group"
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-violet-600" />
              <p className="text-[10px] font-bold text-violet-700 tracking-widest uppercase">This week</p>
            </div>
            <ArrowRight size={13} className="text-violet-600" />
          </div>
          <p className="text-sm font-bold stitch-text-primary leading-snug mb-1">
            Pick up to 3 things you want to finish this week.
          </p>
          <p className="text-xs stitch-text-secondary leading-relaxed">
            Then break each one into steps — it reveals how much is really there.
          </p>
          <span className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-violet-700 bg-white px-2.5 py-1.5 rounded-full">
            <Sparkles size={11} strokeWidth={3} /> Set intentions
          </span>
        </button>
        {showWizard && (
          <IntentionWizard
            onClose={() => setShowWizard(false)}
            onComplete={reload}
          />
        )}
      </>
    );
  }

  return (
    <>
      <section className="rounded-2xl bg-surface-container-low/60 ring-1 ring-violet-200/30 p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Sparkles size={12} className="text-violet-600 shrink-0" />
            <p className="text-[10px] font-bold text-violet-700 tracking-widest uppercase">
              This week · {doneCount}/{intentions.length}
            </p>
            {totalSessions > 0 && (
              <span className="text-[9px] font-bold text-primary/60 bg-primary/8 px-1.5 py-0.5 rounded-full tabular-nums">
                ~{totalSessions} sessions
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate('/reflection')}
            className="text-[10px] font-semibold text-primary hover:opacity-70 transition-opacity inline-flex items-center gap-0.5 shrink-0"
          >
            Edit <ArrowRight size={10} />
          </button>
        </div>

        {/* Intentions */}
        <div className="space-y-1.5">
          {intentions.map((it, i) => {
            const project = it.project_id ? projects.find((p) => p.id === it.project_id) : null;
            return (
              <IntentionRow
                key={it.id}
                intention={it}
                index={i}
                projectColor={project ? projectDot(project.color) : null}
                onToggle={() => handleToggle(it)}
                onMicrotaskToggle={(m) => handleMicrotaskToggle(it.id, m)}
                onMicrotaskEnergyChange={(m, next) => handleMicrotaskEnergyChange(it.id, m, next)}
                onMicrotaskDelete={(m) => handleMicrotaskDelete(it.id, m)}
                onMicrotaskAdd={(title, energy) =>
                  handleMicrotaskAdd(it.id, title, energy, (it.microtasks ?? []).length)
                }
              />
            );
          })}
        </div>

        {/* Add intention (if <3) */}
        {intentions.length < 3 && (
          <button
            type="button"
            onClick={() => navigate('/reflection')}
            className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-bold stitch-text-secondary hover:bg-surface-container-low transition-colors"
          >
            <Plus size={10} /> Add intention {intentions.length + 1} of 3
          </button>
        )}
      </section>

      {showWizard && (
        <IntentionWizard
          onClose={() => setShowWizard(false)}
          onComplete={reload}
        />
      )}
    </>
  );
}
