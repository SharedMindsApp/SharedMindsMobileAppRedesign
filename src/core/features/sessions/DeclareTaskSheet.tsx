// DeclareTaskSheet
//
// A focused bottom-sheet (mobile) / centered popover (desktop) for declaring
// what you'll work on: pick an existing open task, or type a new one. Used by
// the Match-me-now waiting room, where the task is declared after the door
// opens. Portaled to <body> so it escapes the session header's stacking
// context.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, List, PenLine, Check, Loader2, Plus } from 'lucide-react';
import { useCoreData } from '../../data/CoreDataContext';
import type { CoreTask } from '../../data/CoreDataContext';
import { TimeBlockService } from '../../services/TimeBlockService';

type ProjectFilter = string | 'all' | 'unscoped';

const PROJECT_COLOR_HEX: Record<string, string> = {
  cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
  emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
};
const projectSwatch = (token: string | null | undefined) =>
  PROJECT_COLOR_HEX[token ?? ''] ?? PROJECT_COLOR_HEX.blue;

interface Props {
  onClose: () => void;
  /** Called with the chosen task title + (when an existing task) its id. */
  onChoose: (title: string, taskId?: string) => void;
  /** Optional eyebrow, e.g. "Step 1 of 2" — shown when this is part of the
   *  combined match-me-now check-in (task → mood/focus). */
  stepLabel?: string;
}

export function DeclareTaskSheet({ onClose, onChoose, stepLabel }: Props) {
  const { state: { tasks, projects }, addTaskAsync } = useCoreData();
  const allOpenTasks = tasks.filter((t) => !t.done);

  // Only show project chips that actually have open tasks.
  const projectsWithTasks = projects.filter((p) =>
    allOpenTasks.some((t) => t.projectId === p.id),
  );
  const hasUnscoped = allOpenTasks.some((t) => !t.projectId);

  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('all');

  // Auto-apply the project of the time block covering the current hour, so
  // when someone's blocked "10:00 Pitch deck" the picker opens pre-filtered
  // to that project's tasks. Falls back to 'all' if no block / no project.
  useEffect(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    TimeBlockService.getBlocksForDate(todayStr)
      .then((blocks) => {
        const covering = blocks.find((b) => {
          if (!b.project_id) return false;
          const [h, m] = b.start_time.split(':').map(Number);
          const startMin = h * 60 + m;
          return nowMin >= startMin && nowMin < startMin + b.duration_mins;
        });
        // Only apply if that project still has open tasks to show.
        if (covering?.project_id && projectsWithTasks.some((p) => p.id === covering.project_id)) {
          setProjectFilter(covering.project_id);
        }
      })
      .catch(() => { /* non-fatal — leave on 'all' */ });
    // run once on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openTasks = (() => {
    if (projectFilter === 'all') return allOpenTasks;
    if (projectFilter === 'unscoped') return allOpenTasks.filter((t) => !t.projectId);
    return allOpenTasks.filter((t) => t.projectId === projectFilter);
  })();

  const [tab, setTab] = useState<'pick' | 'type'>(allOpenTasks.length > 0 ? 'pick' : 'type');
  const [typed, setTyped] = useState('');
  const [saving, setSaving] = useState(false);

  function pick(t: CoreTask) {
    onChoose(t.title, t.id);
  }

  async function submitTyped() {
    const title = typed.trim();
    if (!title || saving) return;
    setSaving(true);
    try {
      // Persist as a real task so it shows up next time + can be marked done.
      const id = await addTaskAsync(title);
      onChoose(title, id);
    } catch {
      // Even if the save fails, still set the goal text so the session isn't blocked.
      onChoose(title);
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
        className="relative w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[82dvh] flex flex-col"
      >
        {/* grab handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-2 pb-1"><span className="w-9 h-1 rounded-full bg-black/15" /></div>

        {/* header */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-2 sm:pt-4 pb-3">
          <div className="min-w-0">
            {stepLabel && (
              <p className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary mb-0.5">{stepLabel}</p>
            )}
            <h2 className="text-base font-extrabold stitch-text-primary">What will you work on?</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-full bg-surface-container-low hover:bg-surface-container transition-colors"
          >
            <X size={15} className="stitch-text-secondary" />
          </button>
        </div>

        {/* tabs */}
        <div className="shrink-0 px-5 pb-3">
          <div className="flex p-1 bg-surface-container-low rounded-full gap-1">
            <button
              type="button"
              onClick={() => setTab('pick')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-bold transition-colors ${
                tab === 'pick' ? 'stitch-btn--primary text-white' : 'stitch-text-secondary'
              }`}
            >
              <List size={13} /> My tasks
            </button>
            <button
              type="button"
              onClick={() => setTab('type')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-bold transition-colors ${
                tab === 'type' ? 'stitch-btn--primary text-white' : 'stitch-text-secondary'
              }`}
            >
              <PenLine size={13} /> Write one
            </button>
          </div>
        </div>

        {/* project filter — only in the pick tab, only if there are projects
            with open tasks. Auto-selects the current time block's project. */}
        {tab === 'pick' && projectsWithTasks.length > 0 && (
          <div className="shrink-0 px-5 pb-3 -mt-1">
            <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
              <FilterChip label="All" selected={projectFilter === 'all'} onClick={() => setProjectFilter('all')} />
              {projectsWithTasks.map((p) => (
                <FilterChip
                  key={p.id}
                  label={p.title}
                  dot={projectSwatch((p as { color?: string | null }).color)}
                  selected={projectFilter === p.id}
                  onClick={() => setProjectFilter(p.id)}
                />
              ))}
              {hasUnscoped && (
                <FilterChip label="No project" selected={projectFilter === 'unscoped'} onClick={() => setProjectFilter('unscoped')} />
              )}
            </div>
          </div>
        )}

        {/* body */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 min-h-0">
          {tab === 'pick' ? (
            openTasks.length === 0 ? (
              <p className="text-sm stitch-text-secondary py-6 text-center leading-snug">
                No open tasks. Switch to <span className="font-bold">Write one</span> to note your focus.
              </p>
            ) : (
              <div className="space-y-1.5">
                {openTasks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => pick(t)}
                    className="w-full flex items-center gap-2.5 px-3 py-3 rounded-xl bg-surface-container-low hover:bg-surface-container active:scale-[0.99] transition-all text-left"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      t.energy === 'deep' ? 'bg-red-400' : t.energy === 'medium' ? 'bg-emerald-400' : 'bg-sky-400'
                    }`} />
                    <span className="text-sm font-semibold stitch-text-primary truncate flex-1 min-w-0">{t.title}</span>
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="pt-1">
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void submitTyped(); }}
                placeholder="e.g. Draft the pitch deck intro"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm outline-none focus:ring-2 ring-primary/25 transition-all"
              />
              <button
                type="button"
                onClick={() => void submitTyped()}
                disabled={!typed.trim() || saving}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl stitch-btn--primary text-white text-sm font-bold disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Set as my focus
              </button>
              <p className="text-[11px] stitch-text-secondary mt-2 px-1 leading-snug inline-flex items-center gap-1">
                <Plus size={11} /> Saved to your tasks so you can finish it later.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function FilterChip({ label, dot, selected, onClick }: {
  label: string;
  dot?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
        selected ? 'stitch-btn--primary text-white' : 'bg-surface-container-low stitch-text-secondary hover:bg-surface-container'
      }`}
    >
      {dot && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dot }} />}
      <span className="max-w-[120px] truncate">{label}</span>
    </button>
  );
}
