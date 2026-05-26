/**
 * WantedSkillsCard — "I'd love to connect with people who can…"
 *
 * Lives at the top of the People/Connections > Discover tab. Lets the
 * viewer declare a list of skills they want to find in other members.
 * Saves to `profiles.wanted_skills`, which feeds the 🧲 wanted match
 * badge on every PersonRow (Pulse + this page).
 *
 * Distinct from `seeking` (which is task-y — "Cold email review") because
 * this is identity-oriented — "a fundraising person", "a Figma pro".
 */

import { useState } from 'react';
import { Magnet, Loader2, Check } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { updateProfile } from '../../services/ProfileService';
import { SkillsEditor } from '../../ui/SkillsEditor';
import { SurfaceCard } from '../../ui/CorePage';

export function WantedSkillsCard() {
  const { profile, refreshProfile } = useAuth();
  const [draft, setDraft] = useState<string[]>(profile?.wanted_skills ?? []);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  // Drift between draft and persisted set — controls the Save button state.
  const persisted = profile?.wanted_skills ?? [];
  const dirty = !sameSet(draft, persisted);

  async function handleSave() {
    if (!dirty) return;
    setSaving(true);
    try {
      await updateProfile({ wanted_skills: draft });
      await refreshProfile();
      setSavedAt(Date.now());
    } catch (err) {
      console.error('[WantedSkillsCard] save failed:', err);
    } finally {
      setSaving(false);
    }
  }

  const summary = persisted.length === 0
    ? "Tell us who you'd love to find. We'll surface them in Pulse."
    : `${persisted.length} skill${persisted.length === 1 ? '' : 's'} on your wishlist — people with these get a 🧲 badge.`;

  return (
    <SurfaceCard className="!p-0 overflow-hidden">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-surface-container-low transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
          <Magnet size={16} className="text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold stitch-text-primary leading-tight">
            People I'd love to connect with
          </p>
          <p className="text-[11px] stitch-text-secondary mt-0.5 leading-snug">
            {summary}
          </p>
          {/* Mini preview of current wishlist when collapsed */}
          {!open && persisted.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {persisted.slice(0, 4).map((s) => (
                <span key={s} className="inline-flex text-[10px] font-bold text-violet-700 bg-violet-50 ring-1 ring-violet-100 px-1.5 py-0.5 rounded-full">
                  {s}
                </span>
              ))}
              {persisted.length > 4 && (
                <span className="text-[10px] stitch-text-secondary font-semibold">
                  +{persisted.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
        <span className="text-[11px] font-bold text-violet-700 shrink-0 mt-1">
          {open ? 'Close' : (persisted.length === 0 ? 'Add' : 'Edit')}
        </span>
      </button>

      {/* Editor body */}
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-surface-container">
          <SkillsEditor value={draft} onChange={setDraft} max={20} />

          <div className="flex items-center justify-between mt-3">
            <p className="text-[11px] stitch-text-secondary">
              {savedAt && !dirty
                ? <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><Check size={11} strokeWidth={3} /> Saved</span>
                : dirty ? `${draft.length} skill${draft.length === 1 ? '' : 's'} selected` : 'No changes'}
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full stitch-btn--primary text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 size={11} className="animate-spin" />}
              Save
            </button>
          </div>
        </div>
      )}
    </SurfaceCard>
  );
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((x) => setB.has(x));
}
