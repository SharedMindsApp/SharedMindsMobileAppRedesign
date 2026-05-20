/**
 * TodayPlannerCard — micro time-block calendar for the current day.
 *
 * Three sections:
 *   1. Header — date + one-line "what's today about?" intention (persisted
 *      to daily_plans.intention, same as the old DailyIntentionCard).
 *   2. Quick-add strip — tap a template to drop a block at the next free
 *      slot. Replaces the old QuickStartTemplates component.
 *   3. Hour grid — 7am → 9pm, scrollable. Empty slots show a "+ block"
 *      affordance. Occupied slots render a BlockCard with start / done /
 *      delete actions.
 *
 * Tapping ▶ Start on any block calls onStartSession(title, duration) which
 * the parent (DashboardPage) wires to DeclareSessionModal.
 */

import { useState, useEffect, useRef } from 'react';
import {
  Sun, Mail, Zap, PenLine, Layers, Target, Phone,
  Play, CheckCircle2, Circle, X, Loader2, Check, Plus,
} from 'lucide-react';
import { TimeBlockService, type TimeBlock, type BlockType } from '../../services/TimeBlockService';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/AuthProvider';
import { useCoreData } from '../../data/CoreDataContext';

// ── Constants ──────────────────────────────────────────────────────

/** Visible hour range on the grid (7am = 7, 9pm = 21). */
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);

interface QuickTemplate {
  title: string;
  durationMins: number;
  blockType: BlockType;
  Icon: React.ElementType;
  chipCls: string;
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  { title: 'Inbox zero',  durationMins: 25, blockType: 'admin',    Icon: Mail,    chipCls: 'bg-sky-50    text-sky-700'     },
  { title: 'Deep work',   durationMins: 90, blockType: 'deep',     Icon: Zap,     chipCls: 'bg-violet-50 text-violet-700'  },
  { title: 'Write',       durationMins: 50, blockType: 'focus',    Icon: PenLine, chipCls: 'bg-primary/8 text-primary'     },
  { title: 'Admin pile',  durationMins: 25, blockType: 'admin',    Icon: Layers,  chipCls: 'bg-amber-50  text-amber-700'   },
  { title: 'Strategy',    durationMins: 90, blockType: 'deep',     Icon: Target,  chipCls: 'bg-indigo-50 text-indigo-700'  },
  { title: 'Sales call',  durationMins: 25, blockType: 'focus',    Icon: Phone,   chipCls: 'bg-rose-50   text-rose-700'    },
];

const BLOCK_STYLES: Record<BlockType, { bg: string; ring: string; dot: string; label: string }> = {
  focus:    { bg: 'bg-primary/8',   ring: 'ring-primary/20',   dot: 'bg-primary',    label: 'Focus'    },
  deep:     { bg: 'bg-violet-50',   ring: 'ring-violet-200',   dot: 'bg-violet-600', label: 'Deep'     },
  admin:    { bg: 'bg-amber-50',    ring: 'ring-amber-200',    dot: 'bg-amber-500',  label: 'Admin'    },
  break:    { bg: 'bg-emerald-50',  ring: 'ring-emerald-200',  dot: 'bg-emerald-500',label: 'Break'    },
  personal: { bg: 'bg-rose-50',     ring: 'ring-rose-200',     dot: 'bg-rose-500',   label: 'Personal' },
};

// ── Utilities ──────────────────────────────────────────────────────

function formatHour(h: number): string {
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Map arbitrary duration to the three DeclareSessionModal options. */
function nearestDuration(mins: number): 25 | 50 | 90 {
  if (mins <= 37) return 25;
  if (mins <= 70) return 50;
  return 90;
}

/**
 * Find the next free hour slot from the current time (or 7am if before that).
 * Skips hours already occupied by a block.
 */
function nextFreeSlot(blocks: TimeBlock[]): number {
  const now = new Date();
  const takenHours = new Set(blocks.map((b) => parseInt(b.start_time.split(':')[0], 10)));
  let h = Math.max(7, now.getHours());
  while (h <= 20 && takenHours.has(h)) h++;
  return Math.min(h, 20);
}

// ── BlockCard ──────────────────────────────────────────────────────

function BlockCard({
  block, onToggle, onStart, onDelete,
}: {
  block: TimeBlock;
  onToggle: (b: TimeBlock) => void;
  onStart: (b: TimeBlock) => void;
  onDelete: (id: string) => void;
}) {
  const s = BLOCK_STYLES[block.block_type];
  const done = !!block.completed_at;

  return (
    <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2 mb-1.5 ring-1 transition-opacity ${s.bg} ${s.ring} ${done ? 'opacity-50' : ''}`}>
      {/* Complete toggle */}
      <button type="button" onClick={() => onToggle(block)} className="shrink-0">
        {done
          ? <CheckCircle2 size={15} className="text-emerald-600" strokeWidth={2.5} />
          : <Circle       size={15} className="stitch-text-secondary" strokeWidth={2} />
        }
      </button>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-tight ${done ? 'line-through' : 'stitch-text-primary'}`}>
          {block.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
          <span className="text-[10px] stitch-text-secondary font-semibold">
            {s.label} · {block.duration_mins}min
          </span>
        </div>
      </div>

      {/* Start button — only when not done */}
      {!done && (
        <button
          type="button"
          onClick={() => onStart(block)}
          className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-primary bg-white rounded-lg px-2 py-1 shadow-sm ring-1 ring-primary/20 hover:bg-primary hover:text-white transition-colors"
        >
          <Play size={10} fill="currentColor" strokeWidth={0} />
          Start
        </button>
      )}

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(block.id)}
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/8 transition-colors"
        aria-label="Remove block"
      >
        <X size={12} className="stitch-text-secondary" />
      </button>
    </div>
  );
}

// ── AddBlockForm ───────────────────────────────────────────────────

function AddBlockForm({
  defaultTitle = '',
  onAdd,
  onCancel,
}: {
  defaultTitle?: string;
  onAdd: (title: string, durationMins: number, blockType: BlockType) => void;
  onCancel: () => void;
}) {
  const [title, setTitle]       = useState(defaultTitle);
  const [duration, setDuration] = useState<25 | 50 | 90>(50);
  const [type, setType]         = useState<BlockType>('focus');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), duration, type);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 py-1 pr-1 mb-1">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        placeholder="What will you work on?"
        maxLength={200}
        className="text-sm font-semibold stitch-text-primary bg-surface-container-low rounded-lg px-3 py-2 outline-none ring-1 ring-surface-container-high focus:ring-primary/40 w-full placeholder:font-normal placeholder:stitch-text-secondary"
      />
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value) as 25 | 50 | 90)}
          className="text-[11px] font-semibold stitch-text-secondary bg-surface-container-low rounded-lg px-2 py-1.5 outline-none ring-1 ring-surface-container-high"
        >
          <option value={25}>25 min</option>
          <option value={50}>50 min</option>
          <option value={90}>90 min</option>
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as BlockType)}
          className="text-[11px] font-semibold stitch-text-secondary bg-surface-container-low rounded-lg px-2 py-1.5 outline-none ring-1 ring-surface-container-high flex-1"
        >
          {(Object.keys(BLOCK_STYLES) as BlockType[]).map((t) => (
            <option key={t} value={t}>{BLOCK_STYLES[t].label}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!title.trim()}
          className="text-[11px] font-bold text-white bg-primary rounded-lg px-3 py-1.5 disabled:opacity-40 transition-opacity"
        >
          Add
        </button>
        <button type="button" onClick={onCancel} className="p-1.5 stitch-text-secondary hover:stitch-text-primary">
          <X size={13} />
        </button>
      </div>
    </form>
  );
}

// ── TodayPlannerCard ───────────────────────────────────────────────

export function TodayPlannerCard({
  onStartSession,
}: {
  /** Called when the user taps ▶ Start on a block. */
  onStartSession: (goal: string, duration: 25 | 50 | 90) => void;
}) {
  const { user } = useAuth();
  const { state: { spaces } } = useCoreData();
  const personalSpace = spaces.find((s) => s.type === 'personal');

  const today = todayKey();
  const now = new Date();
  const currentHour = now.getHours();

  // ── Daily intention ────────────────────────────────────────────
  const [intention,        setIntention]        = useState('');
  const [intentionLoaded,  setIntentionLoaded]  = useState(false);
  const [intentionSaving,  setIntentionSaving]  = useState(false);
  const [intentionSavedAt, setIntentionSavedAt] = useState<number | null>(null);
  const intentionInitRef   = useRef('');
  const intentionDebounce  = useRef<number | null>(null);

  // ── Time blocks ────────────────────────────────────────────────
  const [blocks,         setBlocks]         = useState<TimeBlock[]>([]);
  const [mutating,       setMutating]       = useState(false);
  const [addingAtHour,   setAddingAtHour]   = useState<number | null>(null);

  // Scroll ref for current hour
  const currentHourRef = useRef<HTMLDivElement>(null);

  // ── Fetch on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    // Intention
    supabase
      .from('daily_plans')
      .select('intention')
      .eq('user_id', user.id)
      .eq('plan_date', today)
      .maybeSingle()
      .then(({ data }) => {
        const text = data?.intention ?? '';
        setIntention(text);
        intentionInitRef.current = text;
        setIntentionLoaded(true);
      });
    // Blocks
    TimeBlockService.getBlocksForDate(today).then(setBlocks).catch(() => {});
  }, [user, today]);

  // Scroll to current hour once blocks load
  useEffect(() => {
    const id = setTimeout(() => {
      currentHourRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 150);
    return () => clearTimeout(id);
  }, []); // run once on mount

  // ── Debounced intention save ───────────────────────────────────
  useEffect(() => {
    if (!intentionLoaded || !user || !personalSpace) return;
    if (intention === intentionInitRef.current) return;
    if (intentionDebounce.current) window.clearTimeout(intentionDebounce.current);
    intentionDebounce.current = window.setTimeout(async () => {
      setIntentionSaving(true);
      const { error } = await supabase.from('daily_plans').upsert(
        { user_id: user.id, space_id: personalSpace.id, plan_date: today, intention: intention.trim() || null },
        { onConflict: 'user_id,plan_date' },
      );
      if (!error) { intentionInitRef.current = intention; setIntentionSavedAt(Date.now()); }
      setIntentionSaving(false);
    }, 800);
    return () => { if (intentionDebounce.current) window.clearTimeout(intentionDebounce.current); };
  }, [intention, intentionLoaded, user, personalSpace, today]);

  useEffect(() => {
    if (!intentionSavedAt) return;
    const id = window.setTimeout(() => setIntentionSavedAt(null), 1500);
    return () => window.clearTimeout(id);
  }, [intentionSavedAt]);

  // ── Block handlers ─────────────────────────────────────────────
  async function handleQuickAdd(template: QuickTemplate) {
    if (!user || mutating) return;
    const hour = nextFreeSlot(blocks);
    const startTime = `${String(hour).padStart(2, '0')}:00`;
    setMutating(true);
    try {
      const nb = await TimeBlockService.addBlock({
        blockDate: today, startTime,
        durationMins: template.durationMins,
        title: template.title,
        blockType: template.blockType,
      });
      setBlocks((prev) => [...prev, nb].sort((a, b) => a.start_time.localeCompare(b.start_time)));
    } finally {
      setMutating(false);
    }
  }

  async function handleAddAt(hour: number, title: string, durationMins: number, blockType: BlockType) {
    if (!user || mutating) return;
    const startTime = `${String(hour).padStart(2, '0')}:00`;
    setMutating(true);
    try {
      const nb = await TimeBlockService.addBlock({ blockDate: today, startTime, durationMins, title, blockType });
      setBlocks((prev) => [...prev, nb].sort((a, b) => a.start_time.localeCompare(b.start_time)));
      setAddingAtHour(null);
    } finally {
      setMutating(false);
    }
  }

  async function handleToggle(block: TimeBlock) {
    const updated = await TimeBlockService.toggleBlockComplete(block);
    setBlocks((prev) => prev.map((b) => b.id === updated.id ? updated : b));
  }

  async function handleDelete(blockId: string) {
    await TimeBlockService.deleteBlock(blockId);
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  }

  // ── Derived ────────────────────────────────────────────────────
  const dateLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const doneCount  = blocks.filter((b) => b.completed_at).length;
  const totalCount = blocks.length;

  return (
    <div className="rounded-2xl bg-surface ring-1 ring-surface-container/40 shadow-sm overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Sun size={13} className="text-amber-500" />
          <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">Today</p>
          <span className="text-[10px] stitch-text-secondary">· {dateLabel}</span>
          <div className="ml-auto flex items-center gap-2">
            {totalCount > 0 && (
              <span className="text-[10px] font-bold stitch-text-secondary tabular-nums">
                {doneCount}/{totalCount}
              </span>
            )}
            {intentionSaving && <Loader2 size={11} className="animate-spin stitch-text-secondary" />}
            {!intentionSaving && intentionSavedAt && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                <Check size={10} strokeWidth={3} /> Saved
              </span>
            )}
          </div>
        </div>
        <input
          type="text"
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
          maxLength={200}
          placeholder="What's today about? One line."
          className="w-full text-base font-semibold stitch-text-primary bg-transparent outline-none placeholder:font-normal placeholder:stitch-text-secondary"
        />
      </div>

      {/* ── Quick-add templates ──────────────────────────────────── */}
      <div className="px-4 pb-3">
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">
          Start in one tap
        </p>
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {QUICK_TEMPLATES.map((t) => (
            <button
              key={t.title}
              type="button"
              onClick={() => handleQuickAdd(t)}
              disabled={mutating}
              className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-full shrink-0 transition-opacity disabled:opacity-50 ${t.chipCls}`}
            >
              <t.Icon size={11} />
              {t.title}
              <span className="opacity-60">{t.durationMins}m</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Divider ─────────────────────────────────────────────── */}
      <div className="border-t border-surface-container/60" />

      {/* ── Hour grid ───────────────────────────────────────────── */}
      <div className="overflow-y-auto max-h-[400px] px-3 py-2" style={{ scrollbarWidth: 'none' }}>
        {HOURS.map((hour) => {
          const blocksHere = blocks.filter((b) => parseInt(b.start_time.split(':')[0], 10) === hour);
          const isPast    = hour < currentHour;
          const isCurrent = hour === currentHour;
          const isAdding  = addingAtHour === hour;

          return (
            <div
              key={hour}
              ref={isCurrent ? currentHourRef : undefined}
              className={`flex gap-2.5 transition-opacity ${isPast && !blocksHere.length ? 'opacity-20' : isPast ? 'opacity-50' : ''}`}
            >
              {/* Hour label */}
              <div className="w-10 pt-3 text-right shrink-0">
                <span className={`text-[10px] font-bold tabular-nums ${isCurrent ? 'text-primary' : 'text-slate-400'}`}>
                  {formatHour(hour)}
                </span>
              </div>

              {/* Lane */}
              <div className={`flex-1 border-l-2 pl-3 pt-2 pb-0.5 min-h-[48px] ${isCurrent ? 'border-primary/50' : 'border-surface-container-high'}`}>
                {/* "Now" pill */}
                {isCurrent && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                    <span className="text-[10px] font-bold text-primary">Now</span>
                  </div>
                )}

                {/* Blocks */}
                {blocksHere.map((block) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    onToggle={handleToggle}
                    onStart={(b) => onStartSession(b.title, nearestDuration(b.duration_mins))}
                    onDelete={handleDelete}
                  />
                ))}

                {/* Inline add form */}
                {isAdding && (
                  <AddBlockForm
                    onAdd={(title, dur, type) => handleAddAt(hour, title, dur, type)}
                    onCancel={() => setAddingAtHour(null)}
                  />
                )}

                {/* Empty-slot affordance */}
                {!isPast && !isAdding && (
                  <button
                    type="button"
                    onClick={() => setAddingAtHour(hour)}
                    className="group flex items-center gap-1 text-[11px] text-slate-300 hover:text-primary transition-colors py-1 w-full text-left"
                  >
                    <Plus size={11} />
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">add block</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {/* Bottom padding */}
        <div className="h-2" />
      </div>
    </div>
  );
}
