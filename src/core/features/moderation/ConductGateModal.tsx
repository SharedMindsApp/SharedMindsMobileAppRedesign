/**
 * ConductGateModal — blocking modal shown before a user's first session.
 *
 * Displays the community ground rules and requires explicit checkbox
 * acceptance on each item before the user can proceed. Once accepted,
 * profiles.conduct_accepted_at is set so they never see it again
 * (unless we bump CONDUCT_VERSION and force re-acceptance).
 *
 * Design choices:
 *   - Required checkboxes per item, not a single "I agree to all" — so
 *     the user genuinely reads each rule. We tested this internally and
 *     the small extra friction is a fair price for genuine consent.
 *   - The "I'm 18+" item is non-negotiable (matches our ToS).
 *   - The exact text shown is versioned via CONDUCT_VERSION below; if
 *     we revise it materially, bump the version + null the column for
 *     all users to force re-acceptance.
 *
 * This modal does NOT replace the ToS / Privacy Policy — those still
 * govern. This is a "warm reminder" of the parts most relevant to live
 * video sessions specifically.
 */

import { useState } from 'react';
import { ShieldCheck, Loader2, AlertTriangle, Camera, Heart, MessageSquare } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { supabase } from '../../../lib/supabase';

export const CONDUCT_VERSION = '2026-05-25';

interface Props {
  /** Called after the user accepts. The session start flow should
   *  await onAccepted() before proceeding into the video room. */
  onAccepted: () => void;
  /** Optional dismiss path — only show when the gate isn't strictly
   *  required (e.g. when re-opened from Settings). Default: not provided
   *  → modal cannot be dismissed without accepting. */
  onCancel?: () => void;
}

interface Rule {
  id: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  required: true;
}

const RULES: Rule[] = [
  {
    id: 'age',
    icon: <AlertTriangle size={16} className="text-amber-600" />,
    title: 'I am 18 or older.',
    body: 'SharedMinds is for adults. Underage accounts will be removed.',
    required: true,
  },
  {
    id: 'clothing',
    icon: <Camera size={16} className="text-rose-600" />,
    title: 'I will be appropriately clothed on camera.',
    body: "Fully clothed, no nudity or partial nudity. We're a workspace, not a webcam site. Violations get reported, captured, and may result in a permanent ban.",
    required: true,
  },
  {
    id: 'respect',
    icon: <Heart size={16} className="text-violet-600" />,
    title: 'I will treat others with respect.',
    body: 'No harassment, slurs, hate speech, or unwanted attention. Sessions are professional — keep them that way.',
    required: true,
  },
  {
    id: 'noRecording',
    icon: <MessageSquare size={16} className="text-blue-600" />,
    title: "I won't record or screenshot others without consent.",
    body: 'Sessions are private. Recording or capturing other members without their explicit consent breaks trust and may break the law.',
    required: true,
  },
  {
    id: 'report',
    icon: <ShieldCheck size={16} className="text-emerald-600" />,
    title: "I'll report behaviour that crosses these lines.",
    body: 'Every card has a Report button. We review reports within 24 hours and act fast on safety issues.',
    required: true,
  },
];

export function ConductGateModal({ onAccepted, onCancel }: Props) {
  const { user, refreshProfile } = useAuth();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allChecked = RULES.every((r) => checked[r.id]);

  async function handleAccept() {
    if (!user || !allChecked || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({
          conduct_accepted_at: new Date().toISOString(),
          conduct_accepted_version: CONDUCT_VERSION,
        })
        .eq('id', user.id);
      if (err) throw err;
      await refreshProfile();
      onAccepted();
    } catch (e) {
      console.error('[ConductGateModal] failed to record acceptance:', e);
      setError('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    // z-[120] so this sits ON TOP of every other overlay when triggered from a
    // session-start flow. The DeclareSessionModal is z-[100]/[101]; anything
    // lower than that here would render BEHIND the declare sheet, leaving the
    // gate unreachable and the Start button looking like it does nothing.
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full sm:max-w-md max-h-[90vh] flex flex-col bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-surface-container">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} className="text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-extrabold stitch-text-primary leading-tight">
                Before your first session
              </h2>
              <p className="text-[11px] stitch-text-secondary mt-0.5">
                A quick read — takes 30 seconds.
              </p>
            </div>
          </div>
          <p className="text-xs stitch-text-secondary leading-relaxed">
            Sessions are live video with strangers. To keep this a workspace
            people actually want to be in, please confirm each ground rule.
          </p>
        </div>

        {/* Scrollable rules list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {RULES.map((rule) => (
            <button
              key={rule.id}
              type="button"
              onClick={() => setChecked((prev) => ({ ...prev, [rule.id]: !prev[rule.id] }))}
              className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-colors ring-1 ${
                checked[rule.id]
                  ? 'bg-emerald-50 ring-emerald-200'
                  : 'bg-surface-container-low ring-surface-container hover:bg-surface-container'
              }`}
            >
              <div className="shrink-0 mt-0.5">{rule.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold stitch-text-primary leading-tight">
                  {rule.title}
                </p>
                <p className="text-[11px] stitch-text-secondary leading-snug mt-1">
                  {rule.body}
                </p>
              </div>
              {/* Native-ish checkbox */}
              <div className={`shrink-0 w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center transition-all ${
                checked[rule.id]
                  ? 'bg-emerald-600 border-emerald-600'
                  : 'border-surface-container bg-white'
              }`}>
                {checked[rule.id] && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </button>
          ))}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-container space-y-2">
          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-bold hover:bg-surface-container transition-colors disabled:opacity-60"
              >
                Not now
              </button>
            )}
            <button
              type="button"
              onClick={handleAccept}
              disabled={!allChecked || saving}
              className={`flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                allChecked && !saving
                  ? 'stitch-btn--primary text-white'
                  : 'bg-surface-container stitch-text-secondary cursor-not-allowed'
              }`}
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {allChecked ? 'I agree — start' : `Check all ${RULES.length} to continue`}
            </button>
          </div>
          <p className="text-[10px] stitch-text-secondary text-center leading-snug">
            By accepting you confirm you've read our{' '}
            <a href="/terms" target="_blank" className="text-primary font-bold">Terms</a>
            {' '}and{' '}
            <a href="/privacy" target="_blank" className="text-primary font-bold">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
