/**
 * ProfileCompletionModal — the proactive nudge we lost when profile
 * setup was cut from the onboarding wizard.
 *
 * Shown ONCE, as a bottom-sheet, the first time a user lands on the
 * dashboard after completing their first session (earned context — they
 * just felt the value, so asking for a couple of details now converts
 * far better than a passive card). Asks only for the two lightest,
 * highest-value fields:
 *   • country  — so people in matched/shared sessions can place you
 *   • one-line bio — a sentence about what you do
 *
 * Fully skippable. A localStorage flag means it never re-appears once
 * seen, and the passive OnboardingNudges "Complete your profile" card
 * remains as the fallback for anyone who skips.
 *
 * Trigger + gating live in DashboardPage; this component is pure UI +
 * save. It renders nothing unless `open` is true.
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Sparkles, Loader2 } from 'lucide-react';
import { CountryPicker } from '../../ui/CountryPicker';
import { InputWell } from '../../ui/CorePage';
import { updateProfile } from '../../services/ProfileService';

interface Props {
  open: boolean;
  initialCountry?: string | null;
  initialBio?: string | null;
  onClose: () => void;        // called on skip OR after save
  onSaved?: () => void;        // called after a successful save (to refresh profile)
}

export function ProfileCompletionModal({ open, initialCountry, initialBio, onClose, onSaved }: Props) {
  const [country, setCountry] = useState<string>(initialCountry ?? '');
  const [bio, setBio] = useState<string>(initialBio ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        country_code: country || null,
        bio: bio.trim() || null,
      });
      onSaved?.();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Could not save. Please try again.');
      setSaving(false);
    }
  }

  const canSave = !!country || bio.trim().length > 0;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop — tapping it = skip */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
        aria-hidden="true"
      />

      <div className="relative w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl ring-1 ring-surface-container/60 p-6 pb-7 animate-[slideUp_0.25s_ease-out]">
        <button
          type="button"
          onClick={() => !saving && onClose()}
          aria-label="Skip for now"
          className="absolute top-4 right-4 w-8 h-8 rounded-full grid place-items-center stitch-text-secondary hover:bg-surface-container-low transition-colors"
        >
          <X size={16} />
        </button>

        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center text-white mb-3 shadow-sm">
          <Sparkles size={20} strokeWidth={2.25} />
        </div>

        <h2 className="text-lg font-extrabold stitch-text-primary leading-tight">
          Nice — first session done.
        </h2>
        <p className="text-sm stitch-text-secondary leading-relaxed mt-1 mb-5">
          Add a couple of details so people in shared sessions can place you. Takes ten seconds — you can always edit it later.
        </p>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider stitch-text-secondary mb-1.5">
              <MapPin size={12} /> Where you're working from
            </label>
            <CountryPicker value={country} onChange={setCountry} placeholder="Pick your country" />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider stitch-text-secondary mb-1.5">
              One line about what you do
            </label>
            <InputWell
              value={bio}
              onChange={setBio}
              placeholder="e.g. Filmmaker editing my first feature"
              multiline
              rows={2}
            />
          </div>
        </div>

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
            disabled={saving || !canSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-extrabold shadow-sm hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
