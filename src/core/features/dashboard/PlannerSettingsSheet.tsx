/**
 * PlannerSettingsSheet — one place to configure how the planner & calendars
 * behave (popup on web, bottom-sheet on mobile). Three sections:
 *   1. Day window — the visible hour range (start/end) shown on EVERY
 *      calendar surface (home planner + /sessions). Stored on the profile so
 *      it's universal: no contradiction between views. Saving re-fetches the
 *      profile so all grids re-render.
 *   2. Your saved templates — apply one to this week or next (materialises
 *      its blocks into the live calendar; today-onward, idempotent).
 *   3. Start from a preset — adopt a curated starter: map its project slots
 *      (Project 1–4) to your real projects, name it, and it becomes a new
 *      editable template.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, CalendarCheck, Trash2, Loader2, Check, ChevronLeft, Sparkles, Clock } from 'lucide-react';
import {
  TimeBlockTemplateService, type TimeBlockTemplate,
} from '../../services/TimeBlockTemplateService';
import { TIME_BLOCK_STARTERS, type TimeBlockStarter } from '../../../lib/timeBlockStarters';
import { useAuth } from '../../auth/AuthProvider';
import { supabase } from '../../../lib/supabase';

const DEFAULT_PLANNER_START = 7;
const DEFAULT_PLANNER_END   = 22;

/** "7am" / "12pm" / "10pm" for an hour 0–23. */
function formatHour(h: number): string {
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** Monday of the week containing `d` (local midnight). */
function mondayOf(d: Date): Date {
  const r = new Date(d);
  const dow = (r.getDay() + 6) % 7; // 0 = Monday
  r.setDate(r.getDate() - dow);
  r.setHours(0, 0, 0, 0);
  return r;
}
function weekLabel(monday: Date): string {
  const sun = new Date(monday); sun.setDate(sun.getDate() + 6);
  const fmt = (x: Date) => x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${fmt(monday)} – ${fmt(sun)}`;
}

export function PlannerSettingsSheet({
  projects, onApplied, onClose,
}: {
  projects: { id: string; name: string }[];
  /** Fired after a template is applied so the planner can reload blocks. */
  onApplied: () => void;
  onClose: () => void;
}) {
  const { user, profile, refreshProfile } = useAuth();

  // ── Day window (universal, profile-backed) ───────────────────────
  const dayStart = Math.max(0, Math.min(22, profile?.planner_start_hour ?? DEFAULT_PLANNER_START));
  const dayEnd   = Math.max(dayStart + 1, Math.min(23, profile?.planner_end_hour ?? DEFAULT_PLANNER_END));
  const [savingWindow, setSavingWindow] = useState(false);

  async function saveDayWindow(nextStart: number, nextEnd: number) {
    if (!user || savingWindow) return;
    const s = Math.max(0, Math.min(22, nextStart));
    const e = Math.max(s + 1, Math.min(23, nextEnd));
    if (s === dayStart && e === dayEnd) return;
    setSavingWindow(true);
    try {
      await supabase.from('profiles').update({ planner_start_hour: s, planner_end_hour: e }).eq('id', user.id);
      await refreshProfile();
    } catch (err) {
      console.warn('[PlannerSettings] saveDayWindow failed:', err);
    } finally {
      setSavingWindow(false);
    }
  }

  const [templates, setTemplates] = useState<TimeBlockTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Adopt-a-starter flow. null = browsing the list.
  const [adopt, setAdopt] = useState<{ starter: TimeBlockStarter; name: string; slots: Record<number, string | null> } | null>(null);
  const [saving, setSaving] = useState(false);

  const thisMon = mondayOf(new Date());
  const nextMon = new Date(thisMon); nextMon.setDate(nextMon.getDate() + 7);

  async function reload() {
    setLoading(true);
    try { setTemplates(await TimeBlockTemplateService.listTemplates()); }
    catch (e) { console.warn('[Templates] list failed:', e); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, []);

  async function applyTemplate(tplId: string, weekStart: Date, label: string) {
    if (busy) return;
    setBusy(`apply:${tplId}:${label}`);
    setMsg(null);
    try {
      const n = await TimeBlockTemplateService.applyToWeek(tplId, weekStart);
      setMsg(n > 0 ? `Added ${n} block${n === 1 ? '' : 's'} to ${label}.` : `Nothing new to add to ${label} (already there).`);
      onApplied();
    } catch (e) {
      console.warn('[Templates] apply failed:', e);
      setMsg('Could not apply — try again.');
    } finally { setBusy(null); }
  }

  async function deleteTemplate(tplId: string) {
    if (busy) return;
    setBusy(`del:${tplId}`);
    try {
      await TimeBlockTemplateService.deleteTemplate(tplId);
      setTemplates((prev) => prev.filter((t) => t.id !== tplId));
    } catch (e) { console.warn('[Templates] delete failed:', e); }
    finally { setBusy(null); }
  }

  function startAdopt(starter: TimeBlockStarter) {
    const slots: Record<number, string | null> = {};
    for (let s = 1; s <= starter.projectSlots; s++) slots[s] = projects[s - 1]?.id ?? null;
    setAdopt({ starter, name: starter.name, slots });
  }

  async function confirmAdopt() {
    if (!adopt || saving) return;
    setSaving(true);
    try {
      await TimeBlockTemplateService.adoptStarter(adopt.starter, adopt.name.trim() || adopt.starter.name, adopt.slots);
      setAdopt(null);
      setMsg('Template created — apply it to a week below.');
      await reload();
    } catch (e) {
      console.warn('[Templates] adopt failed:', e);
    } finally { setSaving(false); }
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md min-h-[60dvh] max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-surface shadow-2xl"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1"><span className="w-9 h-1 rounded-full bg-surface-container" /></div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-3 sticky top-0 bg-surface z-10">
          <div className="flex items-center gap-2 min-w-0">
            {adopt && (
              <button type="button" onClick={() => setAdopt(null)} aria-label="Back" className="w-8 h-8 rounded-full grid place-items-center stitch-text-secondary hover:bg-surface-container-low">
                <ChevronLeft size={18} />
              </button>
            )}
            <h2 className="text-lg font-extrabold stitch-text-primary leading-tight truncate">
              {adopt ? 'Set up template' : 'Planner settings'}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 w-8 h-8 rounded-full grid place-items-center stitch-text-secondary hover:bg-surface-container-low">
            <X size={16} />
          </button>
        </div>

        {/* ── Adopt-a-starter step ───────────────────────────────── */}
        {adopt ? (
          <div className="px-5 pb-6 space-y-4">
            <p className="text-xs stitch-text-secondary leading-snug">
              {adopt.starter.description}
            </p>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest stitch-text-secondary mb-1.5">Name</label>
              <input
                type="text"
                value={adopt.name}
                onChange={(e) => setAdopt({ ...adopt, name: e.target.value.slice(0, 80) })}
                className="w-full text-sm font-semibold stitch-text-primary bg-surface-container-low rounded-xl px-3 py-2.5 outline-none ring-1 ring-surface-container focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {adopt.starter.projectSlots > 0 && (
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest stitch-text-secondary">Assign your projects</label>
                {Array.from({ length: adopt.starter.projectSlots }, (_, i) => i + 1).map((slot) => (
                  <div key={slot} className="flex items-center gap-2">
                    <span className="text-xs font-bold stitch-text-secondary w-16 shrink-0">Project {slot}</span>
                    <select
                      value={adopt.slots[slot] ?? ''}
                      onChange={(e) => setAdopt({ ...adopt, slots: { ...adopt.slots, [slot]: e.target.value || null } })}
                      className="flex-1 text-sm font-semibold stitch-text-primary bg-surface-container-low rounded-lg px-2.5 py-2 outline-none ring-1 ring-surface-container"
                    >
                      <option value="">No project</option>
                      {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                    </select>
                  </div>
                ))}
                {projects.length === 0 && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-2">
                    You have no projects yet — the template will be created without project links; you can add them later.
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={confirmAdopt}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl bg-primary text-white text-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={3} />}
              Create template
            </button>
          </div>
        ) : (
          <div className="px-5 pb-6 space-y-5">
            {msg && (
              <p className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{msg}</p>
            )}

            {/* Day window — applies to every calendar surface */}
            <section>
              <div className="flex items-center gap-1.5 mb-2">
                <Clock size={12} className="text-violet-600" />
                <p className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary">Day window</p>
                {savingWindow && <Loader2 size={11} className="animate-spin stitch-text-secondary ml-1" />}
              </div>
              <div className="rounded-xl bg-surface-container-low ring-1 ring-surface-container p-3">
                <div className="flex items-center gap-2">
                  <select
                    value={dayStart}
                    onChange={(e) => saveDayWindow(Number(e.target.value), dayEnd)}
                    disabled={savingWindow}
                    aria-label="Day starts at"
                    className="flex-1 text-sm font-semibold stitch-text-primary bg-surface rounded-lg px-2.5 py-2 outline-none ring-1 ring-surface-container disabled:opacity-50"
                  >
                    {Array.from({ length: 23 }, (_, i) => i).map((h) => (
                      <option key={h} value={h}>{formatHour(h)}</option>
                    ))}
                  </select>
                  <span className="text-xs font-bold stitch-text-secondary">to</span>
                  <select
                    value={dayEnd}
                    onChange={(e) => saveDayWindow(dayStart, Number(e.target.value))}
                    disabled={savingWindow}
                    aria-label="Day ends at"
                    className="flex-1 text-sm font-semibold stitch-text-primary bg-surface rounded-lg px-2.5 py-2 outline-none ring-1 ring-surface-container disabled:opacity-50"
                  >
                    {Array.from({ length: 23 }, (_, i) => i + 1).filter((h) => h > dayStart).map((h) => (
                      <option key={h} value={h}>{formatHour(h)}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] stitch-text-secondary/80 mt-2 leading-snug">
                  The hours shown on your home planner and the sessions calendar. Set it once — it applies everywhere.
                </p>
              </div>
            </section>

            {/* Your templates */}
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary mb-2">Your templates</p>
              {loading ? (
                <div className="flex items-center gap-2 stitch-text-secondary py-3"><Loader2 size={14} className="animate-spin" /><span className="text-xs">Loading…</span></div>
              ) : templates.length === 0 ? (
                <p className="text-xs stitch-text-secondary italic px-1 py-2">No templates yet — start from a preset below.</p>
              ) : (
                <div className="space-y-2">
                  {templates.map((t) => (
                    <div key={t.id} className="rounded-xl bg-surface-container-low ring-1 ring-surface-container p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-sm font-bold stitch-text-primary truncate">{t.name}</p>
                        <button
                          type="button"
                          onClick={() => deleteTemplate(t.id)}
                          disabled={busy !== null}
                          aria-label="Delete template"
                          className="shrink-0 w-7 h-7 rounded-md grid place-items-center text-rose-600/70 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                        >
                          {busy === `del:${t.id}` ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => applyTemplate(t.id, thisMon, 'this week')}
                          disabled={busy !== null}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-primary text-white text-xs font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
                        >
                          {busy === `apply:${t.id}:this week` ? <Loader2 size={12} className="animate-spin" /> : <CalendarCheck size={12} />}
                          This week
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTemplate(t.id, nextMon, 'next week')}
                          disabled={busy !== null}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-surface-container stitch-text-primary text-xs font-bold hover:bg-surface-container-high active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          {busy === `apply:${t.id}:next week` ? <Loader2 size={12} className="animate-spin" /> : <CalendarCheck size={12} />}
                          Next week
                        </button>
                      </div>
                      <p className="text-[10px] stitch-text-secondary/70 mt-1.5">
                        This week: {weekLabel(thisMon)} · Next: {weekLabel(nextMon)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Starter gallery */}
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary mb-2">Start from a preset</p>
              <div className="space-y-2">
                {TIME_BLOCK_STARTERS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => startAdopt(s)}
                    className="w-full text-left rounded-xl bg-surface ring-1 ring-surface-container hover:ring-primary/30 p-3 active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <Sparkles size={13} className="text-primary shrink-0" />
                      <p className="text-sm font-bold stitch-text-primary">{s.name}</p>
                      <span className="ml-auto text-[10px] font-bold stitch-text-secondary bg-surface-container-low px-1.5 py-0.5 rounded-full shrink-0">
                        {s.projectSlots} project{s.projectSlots === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p className="text-[11px] stitch-text-secondary leading-snug">{s.description}</p>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
