// ActivityPickerSheet
//
// First-run "pick your shortcuts" UI. Shown the first time a user
// opens the Quick Timer dropdown with no activities. Curates a grid
// of templates pre-filtered to their work_types (+ universal) and
// lets them tick the 5-15 they actually do.
//
// Why this exists: the auto-seed heuristic was always going to guess
// wrong for some users — "Cold calling" for a Founder who only does
// product, or "Bookkeeping" for an Accountant who's outsourced it.
// Asking once at the start is faster than fixing it later in Manage.
//
// Re-usable: the same sheet can be re-opened from the Manage sheet's
// "Reset & pick again" button so users can recurate any time.

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, X, Sparkles } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { supabase } from '../../../lib/supabase';
import { ActivityService, type ActivityTemplate } from '../../services/ActivityService';

const MIN_PICKS = 1;
const MAX_PICKS = 15;
/** Recommended sweet spot — surfaced as a soft prompt, not enforced. */
const RECOMMENDED = 10;

interface Props {
  onClose: () => void;
  /** Fires after the user submits picks (or skips) — parent should
   *  re-fetch user_activities so the dropdown refreshes. */
  onDone: () => void;
  /** Title override — different copy for first-run vs "reset". */
  title?: string;
  subtitle?: string;
  /** If true, archive every existing user_activity row before
   *  inserting the new picks. Used by the "Reset & pick again" flow
   *  from the Manage sheet so the user effectively starts fresh. */
  replaceExisting?: boolean;
}

export function ActivityPickerSheet({
  onClose, onDone,
  title = 'Pick your activities',
  subtitle = 'These become your one-tap shortcuts in the Quick Timer. Choose what you actually do.',
  replaceExisting = false,
}: Props) {
  const { profile } = useAuth();
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load templates matching the user's work_types (+ universal).
  // Falls back to all-templates when the user hasn't picked any roles.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const types = profile?.work_types ?? [];
    const lookup = types.length > 0 ? [...types, 'all'] : undefined;
    ActivityService.listTemplates(lookup)
      .then((t) => { if (!cancelled) setTemplates(t); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.work_types?.join(',')]);

  // Lock page scroll while the sheet is open so the body and the
  // sheet's own inner scroll container don't fight each other.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Group by primary work_type for visual scannability. An activity
  // that touches multiple roles is shown under the user's PRIMARY
  // role (first in their work_types array) — avoids dupes in the UI.
  const grouped = useMemo(() => {
    const order: string[] = [...(profile?.work_types ?? []), 'all'];
    const seen = new Set<string>();
    const buckets = new Map<string, ActivityTemplate[]>();
    for (const role of order) buckets.set(role, []);
    for (const role of order) {
      for (const t of templates) {
        if (seen.has(t.id)) continue;
        if (t.work_types.includes(role)) {
          buckets.get(role)!.push(t);
          seen.add(t.id);
        }
      }
    }
    // Drop empty buckets.
    return Array.from(buckets.entries()).filter(([_, ts]) => ts.length > 0);
  }, [templates, profile?.work_types]);

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_PICKS) next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (picked.size < MIN_PICKS) {
      setError(`Pick at least ${MIN_PICKS} activity to get started.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Optional reset — archive existing rows. Soft-delete so past
      // session links stay intact.
      if (replaceExisting) {
        await supabase
          .from('user_activities')
          .update({ archived_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .is('archived_at', null);
      }

      // Bulk insert picked templates. on conflict do nothing handles
      // the case where a user re-picks something they already have
      // (uniqueness is on (user_id, lower(label))).
      const rows = templates
        .filter((t) => picked.has(t.id))
        .map((t) => ({
          user_id: user.id,
          template_id: t.id,
          label: t.label,
          emoji: t.emoji,
          default_minutes: t.default_minutes,
          sort_order: t.sort_order,
        }));
      const { error: insErr } = await supabase
        .from('user_activities')
        .insert(rows);
      if (insErr) throw insErr;

      onDone();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Could not save your picks.');
    } finally {
      setSubmitting(false);
    }
  }

  const countTone =
    picked.size === 0 ? 'stitch-text-secondary' :
    picked.size > MAX_PICKS - 1 ? 'text-amber-600' :
    picked.size === RECOMMENDED ? 'text-emerald-600' :
    'text-primary';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-start justify-center p-0 sm:pt-8 sm:p-4 bg-black/30 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[100dvh] sm:h-auto sm:max-h-[calc(100vh-4rem)] overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-3 border-b border-surface-container/60">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-primary/10 grid place-items-center shrink-0">
                <Sparkles size={16} className="text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-extrabold stitch-text-primary leading-tight">
                  {title}
                </h2>
                <p className="text-xs stitch-text-secondary mt-0.5 leading-snug">
                  {subtitle}
                </p>
              </div>
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
          <p className={`text-[11px] font-bold tabular-nums ${countTone}`}>
            {picked.size} / {MAX_PICKS} picked
            {picked.size > 0 && picked.size < RECOMMENDED && (
              <span className="ml-1 stitch-text-secondary font-normal">· {RECOMMENDED} is a good number</span>
            )}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm stitch-text-secondary py-8 justify-center">
              <Loader2 size={14} className="animate-spin" /> Loading activities…
            </div>
          ) : grouped.length === 0 ? (
            <p className="text-sm stitch-text-secondary italic text-center py-8">
              No matching activities — pick a role in your profile and reopen.
            </p>
          ) : (
            grouped.map(([role, ts]) => (
              <section key={role}>
                <p className="text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary mb-2">
                  {roleLabel(role)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ts.map((t) => {
                    const on = picked.has(t.id);
                    const disabled = !on && picked.size >= MAX_PICKS;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggle(t.id)}
                        disabled={disabled}
                        className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-bold transition-all ${
                          on
                            ? 'bg-primary text-white shadow-sm'
                            : disabled
                            ? 'bg-surface-container-low stitch-text-secondary opacity-40 cursor-not-allowed'
                            : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                        }`}
                        title={`${t.label} · ${t.default_minutes}min default`}
                      >
                        {on && <Check size={10} strokeWidth={3} />}
                        <span>{t.emoji}</span>
                        <span className="truncate max-w-[140px]">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-surface-container/60 px-5 py-3 space-y-2">
          {error && (
            <p className="text-[11px] font-semibold text-rose-700 bg-rose-50 ring-1 ring-rose-100 rounded-lg px-2.5 py-1.5">
              {error}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3 py-2 rounded-lg text-xs font-bold stitch-text-secondary hover:bg-surface-container-low transition-colors disabled:opacity-50"
            >
              Maybe later
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || picked.size < MIN_PICKS}
              className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-extrabold bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Save {picked.size > 0 && `(${picked.size})`}
            </button>
          </div>
          <p className="text-[10px] stitch-text-secondary leading-snug">
            You can always add, remove, or swap activities later from the Manage menu.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Pretty label for a role bucket. Matches the WORK_TYPES list in
 *  SettingsPage. Keeping this local to the picker so we don't import
 *  from settings.  */
function roleLabel(role: string): string {
  switch (role) {
    case 'designer':     return '🎨 Designer';
    case 'developer':    return '💻 Developer';
    case 'writer':       return '✍️ Writer / Creator';
    case 'founder':      return '🚀 Founder';
    case 'filmmaker':    return '🎬 Filmmaker / Producer';
    case 'marketer':     return '📣 Marketer';
    case 'consultant':   return '🎯 Consultant';
    case 'researcher':   return '🔬 Researcher';
    case 'sales':        return '💼 Sales';
    case 'coach':        return '🧭 Coach / Therapist';
    case 'educator':     return '📚 Educator / Teacher';
    case 'accountant':   return '🧾 Accountant / Finance';
    case 'photographer': return '📸 Photographer';
    case 'all':          return '✨ For everyone';
    default:             return role;
  }
}
