/**
 * SkillsPromptModal — one-time skills self-rating prompt.
 *
 * Armed (via lib/skillsPrompt) when a user schedules a session or books
 * into someone else's — the moment skills become socially relevant
 * (people in shared sessions can see what you bring). Shown once on the
 * next dashboard mount, when the user has no skills yet. Reuses the
 * SkillsEditor with star self-rating. Fully skippable; permanently
 * dismissed after save or skip.
 *
 * Trigger/gating lives in DashboardPage; this is pure UI + save.
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Wrench } from 'lucide-react';
import { SkillsEditor } from '../../ui/SkillsEditor';
import { updateProfile } from '../../services/ProfileService';

interface Props {
  open: boolean;
  initialSkills?: string[] | null;
  initialLevels?: Record<string, number> | null;
  onClose: () => void;       // skip OR after save
  onSaved?: () => void;
}

export function SkillsPromptModal({ open, initialSkills, initialLevels, onClose, onSaved }: Props) {
  const [skills, setSkills] = useState<string[]>(initialSkills ?? []);
  const [levels, setLevels] = useState<Record<string, number>>(initialLevels ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSave() {
    if (saving || skills.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ skills, skill_levels: levels });
      onSaved?.();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Could not save. Please try again.');
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
        aria-hidden="true"
      />

      <div className="relative w-full sm:max-w-lg bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl ring-1 ring-surface-container/60 p-6 pb-7 max-h-[88vh] overflow-y-auto animate-[slideUp_0.25s_ease-out]">
        <button
          type="button"
          onClick={() => !saving && onClose()}
          aria-label="Skip for now"
          className="absolute top-4 right-4 w-8 h-8 rounded-full grid place-items-center stitch-text-secondary hover:bg-surface-container-low transition-colors"
        >
          <X size={16} />
        </button>

        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 grid place-items-center text-white mb-3 shadow-sm">
          <Wrench size={20} strokeWidth={2.25} />
        </div>

        <h2 className="text-lg font-extrabold stitch-text-primary leading-tight">
          What do you bring to the work?
        </h2>
        <p className="text-sm stitch-text-secondary leading-relaxed mt-1 mb-5">
          Now that you're working alongside others, add a few skills so people in shared sessions know what you do — and so you turn up when someone's looking for your craft. Rate yourself if you like; it's optional.
        </p>

        <SkillsEditor
          value={skills}
          onChange={setSkills}
          levels={levels}
          onLevelsChange={setLevels}
        />

        {error && <p className="text-xs font-semibold text-red-600 mt-3">{error}</p>}

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={() => !saving && onClose()}
            disabled={saving}
            className="flex-1 px-4 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-semibold hover:bg-surface-container transition-all active:scale-[0.98]"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || skills.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-extrabold shadow-sm hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            {saving ? 'Saving…' : 'Save skills'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
