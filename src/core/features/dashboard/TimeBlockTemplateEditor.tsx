/**
 * TimeBlockTemplateEditor — edit a saved weekly template's blocks.
 *
 * Rendered inside PlannerSettingsSheet (not its own portal) when the user
 * taps "Edit" on a template, or right after adopting a preset. Lets them:
 *   • rename the template
 *   • add / edit / delete blocks on any day (Mon–Sun)
 *   • set each block's start time, duration, type and project
 *
 * All edits persist immediately via TimeBlockTemplateService, so there's no
 * "save" step — the template is always up to date. This is what turns a
 * preset into a genuinely-custom template.
 */

import { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, Check, X, Pencil } from 'lucide-react';
import {
  TimeBlockTemplateService,
  type TimeBlockTemplate, type TimeBlockTemplateItem,
} from '../../services/TimeBlockTemplateService';
import type { BlockType } from '../../services/TimeBlockService';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const BLOCK_TYPES: { value: BlockType; label: string; dot: string }[] = [
  { value: 'focus',    label: 'Focus',    dot: 'bg-primary'      },
  { value: 'deep',     label: 'Deep',     dot: 'bg-violet-600'   },
  { value: 'admin',    label: 'Admin',    dot: 'bg-amber-500'    },
  { value: 'break',    label: 'Break',    dot: 'bg-emerald-500'  },
  { value: 'personal', label: 'Personal', dot: 'bg-rose-500'     },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 480];

/** "9:00am" / "12:30pm" from HH:MM[:SS]. */
function prettyTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr ?? '0', 10);
  const ampm = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`;
}
function prettyDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
/** DB start_time may be HH:MM:SS — the <input type=time> wants HH:MM. */
function toInputTime(t: string): string { return t.slice(0, 5); }

interface Draft {
  id: string | null;          // null = creating a new block
  dayOfWeek: number;
  startTime: string;          // HH:MM
  durationMins: number;
  title: string;
  blockType: BlockType;
  projectId: string | null;
}

export function TimeBlockTemplateEditor({
  template, projects, onChanged,
}: {
  template: TimeBlockTemplate;
  projects: { id: string; name: string }[];
  /** Fired when items/name change so the parent list can stay fresh. */
  onChanged?: () => void;
}) {
  const [name, setName] = useState(template.name);
  const [items, setItems] = useState<TimeBlockTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const projectName = (id: string | null) => projects.find((p) => p.id === id)?.name ?? null;

  async function reload() {
    setLoading(true);
    try { setItems(await TimeBlockTemplateService.listItems(template.id)); }
    catch (e) { console.warn('[TemplateEditor] listItems failed:', e); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, [template.id]);

  async function commitName() {
    const next = name.trim();
    if (!next || next === template.name) return;
    try { await TimeBlockTemplateService.renameTemplate(template.id, next); onChanged?.(); }
    catch (e) { console.warn('[TemplateEditor] rename failed:', e); }
  }

  function startAdd(dayOfWeek: number) {
    setDraft({ id: null, dayOfWeek, startTime: '09:00', durationMins: 60, title: '', blockType: 'focus', projectId: null });
  }
  function startEdit(it: TimeBlockTemplateItem) {
    setDraft({
      id: it.id, dayOfWeek: it.day_of_week, startTime: toInputTime(it.start_time),
      durationMins: it.duration_mins, title: it.title, blockType: it.block_type, projectId: it.project_id,
    });
  }

  async function saveDraft() {
    if (!draft || !draft.title.trim() || busy) return;
    setBusy(true);
    try {
      if (draft.id) {
        await TimeBlockTemplateService.updateItem(draft.id, {
          day_of_week: draft.dayOfWeek, start_time: draft.startTime,
          duration_mins: draft.durationMins, title: draft.title.trim(),
          block_type: draft.blockType, project_id: draft.projectId,
        });
      } else {
        await TimeBlockTemplateService.addItem({
          templateId: template.id, dayOfWeek: draft.dayOfWeek, startTime: draft.startTime,
          durationMins: draft.durationMins, title: draft.title.trim(),
          blockType: draft.blockType, projectId: draft.projectId,
        });
      }
      setDraft(null);
      await reload();
      onChanged?.();
    } catch (e) {
      console.warn('[TemplateEditor] saveDraft failed:', e);
    } finally { setBusy(false); }
  }

  async function deleteItem(id: string) {
    if (busy) return;
    setBusy(true);
    setItems((prev) => prev.filter((i) => i.id !== id)); // optimistic
    try { await TimeBlockTemplateService.deleteItem(id); onChanged?.(); }
    catch (e) { console.warn('[TemplateEditor] delete failed:', e); void reload(); }
    finally { setBusy(false); }
  }

  const byDay = (d: number) => items.filter((i) => i.day_of_week === d).sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="px-5 pb-6 space-y-4">
      {/* Name */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest stitch-text-secondary mb-1.5">Template name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 80))}
          onBlur={commitName}
          className="w-full text-sm font-semibold stitch-text-primary bg-surface-container-low rounded-xl px-3 py-2.5 outline-none ring-1 ring-surface-container focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 stitch-text-secondary py-4"><Loader2 size={14} className="animate-spin" /><span className="text-xs">Loading blocks…</span></div>
      ) : (
        <div className="space-y-3">
          {DAY_LABELS.map((label, day) => {
            const dayItems = byDay(day);
            return (
              <section key={day}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-extrabold stitch-text-primary">{label}</p>
                  <button
                    type="button"
                    onClick={() => startAdd(day)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:bg-primary/8 rounded-md px-1.5 py-1 transition-colors"
                  >
                    <Plus size={11} /> Add
                  </button>
                </div>

                {dayItems.length === 0 ? (
                  <p className="text-[11px] stitch-text-secondary/70 italic pl-0.5 pb-1">No blocks.</p>
                ) : (
                  <div className="space-y-1">
                    {dayItems.map((it) => {
                      const meta = BLOCK_TYPES.find((b) => b.value === it.block_type);
                      const pName = projectName(it.project_id);
                      return (
                        <div key={it.id} className="flex items-center gap-2 rounded-lg bg-surface-container-low ring-1 ring-surface-container px-2.5 py-2">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta?.dot ?? 'bg-slate-400'}`} />
                          <button type="button" onClick={() => startEdit(it)} className="flex-1 min-w-0 text-left">
                            <p className="text-xs font-bold stitch-text-primary truncate">{it.title}</p>
                            <p className="text-[10px] stitch-text-secondary">
                              {prettyTime(it.start_time)} · {prettyDuration(it.duration_mins)} · {meta?.label}
                              {pName && <span className="font-semibold"> · {pName}</span>}
                            </p>
                          </button>
                          <button type="button" onClick={() => startEdit(it)} aria-label="Edit block" className="shrink-0 w-6 h-6 rounded grid place-items-center stitch-text-secondary hover:bg-surface-container">
                            <Pencil size={11} />
                          </button>
                          <button type="button" onClick={() => deleteItem(it.id)} aria-label="Delete block" className="shrink-0 w-6 h-6 rounded grid place-items-center text-rose-600/70 hover:bg-rose-50 hover:text-rose-700">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Draft editor (add / edit a block) */}
      {draft && (
        <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDraft(null)}>
          <div
            className="w-full sm:max-w-sm max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-surface shadow-2xl p-5"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.25rem)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold stitch-text-primary">{draft.id ? 'Edit block' : 'Add block'}</h3>
              <button type="button" onClick={() => setDraft(null)} aria-label="Close" className="w-8 h-8 rounded-full grid place-items-center stitch-text-secondary hover:bg-surface-container-low"><X size={16} /></button>
            </div>

            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value.slice(0, 200) })}
              autoFocus
              placeholder="What will you work on?"
              className="w-full text-sm font-semibold stitch-text-primary bg-surface-container-low rounded-xl px-3 py-2.5 outline-none ring-1 ring-surface-container focus:ring-2 focus:ring-primary/30 mb-3"
            />

            <div className="grid grid-cols-2 gap-2 mb-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider stitch-text-secondary">Day</span>
                <select
                  value={draft.dayOfWeek}
                  onChange={(e) => setDraft({ ...draft, dayOfWeek: Number(e.target.value) })}
                  className="text-sm font-semibold stitch-text-primary bg-surface-container-low rounded-lg px-2.5 py-2 outline-none ring-1 ring-surface-container"
                >
                  {DAY_LABELS.map((l, d) => (<option key={d} value={d}>{l}</option>))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider stitch-text-secondary">Start</span>
                <input
                  type="time"
                  step={900}
                  value={draft.startTime}
                  onChange={(e) => setDraft({ ...draft, startTime: e.target.value || '09:00' })}
                  className="text-sm font-semibold stitch-text-primary bg-surface-container-low rounded-lg px-2.5 py-2 outline-none ring-1 ring-surface-container"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider stitch-text-secondary">Length</span>
                <select
                  value={draft.durationMins}
                  onChange={(e) => setDraft({ ...draft, durationMins: Number(e.target.value) })}
                  className="text-sm font-semibold stitch-text-primary bg-surface-container-low rounded-lg px-2.5 py-2 outline-none ring-1 ring-surface-container"
                >
                  {DURATION_OPTIONS.map((m) => (<option key={m} value={m}>{prettyDuration(m)}</option>))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider stitch-text-secondary">Type</span>
                <select
                  value={draft.blockType}
                  onChange={(e) => setDraft({ ...draft, blockType: e.target.value as BlockType })}
                  className="text-sm font-semibold stitch-text-primary bg-surface-container-low rounded-lg px-2.5 py-2 outline-none ring-1 ring-surface-container"
                >
                  {BLOCK_TYPES.map((b) => (<option key={b.value} value={b.value}>{b.label}</option>))}
                </select>
              </label>
            </div>

            {projects.length > 0 && (
              <label className="flex flex-col gap-1 mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider stitch-text-secondary">Project</span>
                <select
                  value={draft.projectId ?? ''}
                  onChange={(e) => setDraft({ ...draft, projectId: e.target.value || null })}
                  className="text-sm font-semibold stitch-text-primary bg-surface-container-low rounded-lg px-2.5 py-2 outline-none ring-1 ring-surface-container"
                >
                  <option value="">No project</option>
                  {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </label>
            )}

            <button
              type="button"
              onClick={saveDraft}
              disabled={!draft.title.trim() || busy}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl bg-primary text-white text-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={3} />}
              {draft.id ? 'Save block' : 'Add block'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
