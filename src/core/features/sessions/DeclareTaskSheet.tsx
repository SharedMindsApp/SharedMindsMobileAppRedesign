// DeclareTaskSheet
//
// A focused bottom-sheet (mobile) / centered popover (desktop) for declaring
// what you'll work on: pick an existing open task, or type a new one. Used by
// the Match-me-now waiting room, where the task is declared after the door
// opens. Portaled to <body> so it escapes the session header's stacking
// context.

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, List, PenLine, Check, Loader2, Plus } from 'lucide-react';
import { useCoreData } from '../../data/CoreDataContext';
import type { CoreTask } from '../../data/CoreDataContext';

interface Props {
  onClose: () => void;
  /** Called with the chosen task title + (when an existing task) its id. */
  onChoose: (title: string, taskId?: string) => void;
}

export function DeclareTaskSheet({ onClose, onChoose }: Props) {
  const { state: { tasks }, addTaskAsync } = useCoreData();
  const openTasks = tasks.filter((t) => !t.done);
  const [tab, setTab] = useState<'pick' | 'type'>(openTasks.length > 0 ? 'pick' : 'type');
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
          <h2 className="text-base font-extrabold stitch-text-primary">What will you work on?</h2>
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
