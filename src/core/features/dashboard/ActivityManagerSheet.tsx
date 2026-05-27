// ActivityManagerSheet
//
// CRUD surface for the user's Quick Activities. Opened from the
// "Manage" link inside the Quick Timer dropdown. Three sections:
//
//   1. My activities — the seeded + custom list. Each row has an
//      archive button (soft delete; the row stays for historical
//      session ↔ activity links, but the UI hides it).
//   2. Add custom — inline form for activities not in the library.
//      Default emoji is ⏱️ but the user can pick from a small palette.
//   3. Browse library — templates from activity_templates that aren't
//      already in the user's list, filtered to their work_types so
//      we don't show 80 unrelated activities. One-click adopt copies
//      the template into user_activities.

import { useEffect, useState } from 'react';
import { X, Plus, Trash2, Library, ChevronDown, ChevronUp, Loader2, Sparkles } from 'lucide-react';
import { ActivityService, type UserActivity, type ActivityTemplate } from '../../services/ActivityService';
import { useAuth } from '../../auth/AuthProvider';
import { ActivityPickerSheet } from './ActivityPickerSheet';

const EMOJI_PALETTE = ['⏱️', '☎️', '📝', '🔍', '📊', '🧠', '💡', '🎯', '📧', '🛠️', '🎨', '🎬', '🤝', '💰', '📚', '🧹', '✍️', '🔥'];

interface Props {
  onClose: () => void;
  /** Notify parent so it can re-fetch its activities list. */
  onChanged?: () => void;
}

export function ActivityManagerSheet({ onClose, onChanged }: Props) {
  const { profile } = useAuth();
  const [mine, setMine] = useState<UserActivity[]>([]);
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Custom add state
  const [newLabel, setNewLabel] = useState('');
  const [newEmoji, setNewEmoji] = useState('⏱️');
  const [newMinutes, setNewMinutes] = useState<number>(25);
  const [adding, setAdding] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [myList, tpls] = await Promise.all([
        ActivityService.listMine(),
        ActivityService.listTemplates(profile?.work_types ?? undefined),
      ]);
      setMine(myList);
      setTemplates(tpls);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.work_types?.join(',')]);

  async function handleArchive(a: UserActivity) {
    setBusyId(a.id);
    setError(null);
    try {
      await ActivityService.archive(a.id);
      await refresh();
      onChanged?.();
    } catch (e: any) {
      setError(e?.message ?? 'Could not remove activity.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddCustom() {
    const label = newLabel.trim();
    if (!label) return;
    setAdding(true);
    setError(null);
    try {
      const created = await ActivityService.addCustom({
        label, emoji: newEmoji, defaultMinutes: newMinutes,
      });
      if (created) {
        setNewLabel('');
        setNewEmoji('⏱️');
        setNewMinutes(25);
        await refresh();
        onChanged?.();
      } else {
        setError('Could not add — does an activity with that name already exist?');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Could not add.');
    } finally {
      setAdding(false);
    }
  }

  async function handleAdoptTemplate(t: ActivityTemplate) {
    setBusyId(t.id);
    setError(null);
    try {
      await ActivityService.addCustom({
        label: t.label, emoji: t.emoji, defaultMinutes: t.default_minutes,
      });
      await refresh();
      onChanged?.();
    } catch (e: any) {
      setError(e?.message ?? 'Could not add.');
    } finally {
      setBusyId(null);
    }
  }

  // Library shows templates the user doesn't already have (by label,
  // case-insensitive — matches the DB unique constraint).
  const haveLabels = new Set(mine.map((a) => a.label.toLowerCase()));
  const availableTemplates = templates.filter((t) => !haveLabels.has(t.label.toLowerCase()));

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-start justify-center p-0 sm:pt-8 sm:p-4 bg-black/20 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden my-auto sm:my-0"
      >
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            <h2 className="text-lg font-extrabold stitch-text-primary leading-tight">
              Quick activities
            </h2>
            <p className="text-xs stitch-text-secondary mt-0.5">
              Your shortcuts. Tap to remove, type to add new.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full grid place-items-center stitch-text-secondary hover:bg-surface-container-low"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
          {/* ── My activities ─────────────────────────────────── */}
          <section>
            <p className="text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary mb-2">
              My activities {mine.length > 0 && `· ${mine.length}`}
            </p>
            {loading ? (
              <div className="flex items-center gap-2 text-xs stitch-text-secondary py-2">
                <Loader2 size={12} className="animate-spin" /> Loading…
              </div>
            ) : mine.length === 0 ? (
              <p className="text-xs stitch-text-secondary italic py-2">
                Nothing yet — add a custom one or browse the library below.
              </p>
            ) : (
              <ul className="space-y-1">
                {mine.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface-container-low/60 hover:bg-surface-container-low"
                  >
                    <span className="text-lg shrink-0">{a.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold stitch-text-primary truncate">
                        {a.label}
                      </p>
                      <p className="text-[10px] stitch-text-secondary">
                        {a.default_minutes} min · used {a.sessions_count}×
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleArchive(a)}
                      disabled={busyId === a.id}
                      className="shrink-0 w-7 h-7 rounded-md grid place-items-center text-rose-600/70 hover:bg-rose-50 hover:text-rose-700 transition-colors disabled:opacity-40"
                      title="Remove from list"
                      aria-label={`Remove ${a.label}`}
                    >
                      {busyId === a.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Add custom ────────────────────────────────────── */}
          <section className="rounded-2xl ring-1 ring-surface-container p-3 space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary">
              Add custom
            </p>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustom(); }}
              placeholder="e.g. Recording podcast intros"
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low stitch-text-primary text-sm ring-1 ring-surface-container focus:ring-2 focus:ring-primary/30 outline-none"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex flex-wrap gap-1">
                {EMOJI_PALETTE.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setNewEmoji(e)}
                    className={`w-7 h-7 rounded-md grid place-items-center text-base transition-colors ${
                      newEmoji === e ? 'bg-primary/15 ring-1 ring-primary/30' : 'hover:bg-surface-container-low'
                    }`}
                    aria-label={`Pick emoji ${e}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={5}
                max={180}
                value={newMinutes}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setNewMinutes(Number.isFinite(n) ? n : 25);
                }}
                className="w-16 px-2 py-1 rounded-md text-xs font-bold stitch-text-primary tabular-nums bg-surface-container-low ring-1 ring-surface-container focus:ring-2 focus:ring-primary/30 outline-none"
              />
              <span className="text-[11px] stitch-text-secondary">min · default duration</span>
              <button
                type="button"
                onClick={handleAddCustom}
                disabled={adding || !newLabel.trim()}
                className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {adding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                Add
              </button>
            </div>
          </section>

          {/* ── Browse library ────────────────────────────────── */}
          <section className="rounded-2xl ring-1 ring-surface-container">
            <button
              type="button"
              onClick={() => setLibraryOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-surface-container-low/40 transition-colors rounded-2xl"
            >
              <Library size={14} className="stitch-text-secondary" />
              <span className="text-xs font-extrabold uppercase tracking-widest stitch-text-secondary flex-1">
                Browse library {availableTemplates.length > 0 && `· ${availableTemplates.length}`}
              </span>
              {libraryOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {libraryOpen && (
              <div className="px-3 pb-3 max-h-[200px] overflow-y-auto">
                {availableTemplates.length === 0 ? (
                  <p className="text-xs stitch-text-secondary italic py-2">
                    You've got every library activity that matches your roles. Add custom ones above.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {availableTemplates.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-container-low/60"
                      >
                        <span className="text-base shrink-0">{t.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold stitch-text-primary truncate">
                            {t.label}
                          </p>
                          <p className="text-[10px] stitch-text-secondary">
                            {t.default_minutes} min
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAdoptTemplate(t)}
                          disabled={busyId === t.id}
                          className="shrink-0 inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-extrabold bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
                          title="Add to my list"
                        >
                          {busyId === t.id ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                          Add
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {error && (
            <p className="text-[11px] font-semibold text-rose-700 bg-rose-50 ring-1 ring-rose-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* ── Reset & pick again ──────────────────────────────
              For users who want to start over — opens the curated
              picker, which archives existing rows on save. */}
          {mine.length > 0 && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold stitch-text-secondary hover:bg-surface-container-low transition-colors"
            >
              <Sparkles size={11} /> Reset & pick again
            </button>
          )}

          <p className="text-[10px] stitch-text-secondary leading-snug px-1">
            Removing an activity hides it from your shortcuts but doesn't delete past
            sessions tagged with it — your history stays intact.
          </p>
        </div>
      </div>

      {pickerOpen && (
        <ActivityPickerSheet
          title="Reset your activities"
          subtitle="Pick the ones you actually do — your previous list will be replaced."
          replaceExisting
          onClose={() => setPickerOpen(false)}
          onDone={() => { setPickerOpen(false); refresh(); onChanged?.(); }}
        />
      )}
    </div>
  );
}
