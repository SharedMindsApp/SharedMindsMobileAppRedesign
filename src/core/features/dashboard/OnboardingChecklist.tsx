/**
 * OnboardingChecklist — five-step setup with a progress meter.
 *
 * Each step is a real action that moves the user further into the product:
 *   1. Add an avatar          → /settings (or profile)
 *   2. Set your work type     → /settings
 *   3. Create a project       → /projects
 *   4. Make a connection      → /connections
 *   5. Finish your first session
 *
 * Completion is derived from existing state — no separate DB tracking.
 * Once all five are done the card auto-hides. Users can also dismiss it
 * manually via localStorage; the dismissal is per-device which is fine
 * for this kind of nudge.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Circle, Image, Briefcase, Target, Link2, Play, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useCoreData } from '../../data/CoreDataContext';
import type { ProfileStats } from '../../services/ProfileService';

const DISMISS_KEY = 'sharedminds-onboarding-dismissed-v1';

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}

type Step = {
  id: string;
  label: string;
  Icon: typeof Image;
  done: boolean;
  cta: string;
  onClick: () => void;
};

export function OnboardingChecklist({
  stats,
  connectionsCount,
}: {
  stats: ProfileStats | null;
  connectionsCount: number;
}) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { state: { projects } } = useCoreData();
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed());

  const hasAvatar = !!profile?.avatar_url;
  const hasWorkType = !!profile?.work_type;
  const hasProject = projects.length > 0;
  const hasConnection = connectionsCount > 0;
  const hasFinished = (stats?.totalSessions ?? 0) > 0;

  const steps: Step[] = [
    { id: 'avatar',     label: 'Add a profile picture',  Icon: Image,     done: hasAvatar,     cta: 'Upload',  onClick: () => navigate('/profile') },
    { id: 'work-type',  label: 'Set your work type',     Icon: Briefcase, done: hasWorkType,   cta: 'Pick',    onClick: () => navigate('/profile?tab=edit') },
    { id: 'project',    label: 'Create your first project', Icon: Target, done: hasProject,    cta: 'Create',  onClick: () => navigate('/projects') },
    { id: 'connection', label: 'Make a connection',      Icon: Link2,     done: hasConnection, cta: 'Browse',  onClick: () => navigate('/connections') },
    { id: 'session',    label: 'Finish your first session', Icon: Play,   done: hasFinished,   cta: 'Start',   onClick: () => navigate('/sessions') },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const progress = doneCount / steps.length;

  // Auto-hide when complete (or manually dismissed)
  if (dismissed || doneCount === steps.length) return null;

  function dismiss() {
    try { window.localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setDismissed(true);
  }

  return (
    <section className="rounded-2xl bg-gradient-to-br from-primary/5 via-blue-50/40 to-violet-50/30 ring-1 ring-primary/10 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-primary tracking-widest uppercase mb-1">
            Get set up · {doneCount}/{steps.length}
          </p>
          <p className="text-sm font-bold stitch-text-primary leading-tight">
            A few quick wins to make SharedMinds yours.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 w-7 h-7 rounded-full hover:bg-white/60 flex items-center justify-center transition-colors"
          aria-label="Dismiss checklist"
          title="Dismiss"
        >
          <X size={13} className="stitch-text-secondary" />
        </button>
      </div>

      {/* Progress meter */}
      <div className="h-1.5 rounded-full bg-white/70 overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Steps */}
      <ul className="space-y-1.5">
        {steps.map((s) => {
          const StepIcon = s.Icon;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={s.done ? undefined : s.onClick}
                disabled={s.done}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                  s.done
                    ? 'bg-white/40 cursor-default'
                    : 'bg-white hover:shadow-sm hover:-translate-y-px active:scale-[0.99]'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  s.done ? 'bg-emerald-500 text-white' : 'bg-surface-container-low'
                }`}>
                  {s.done ? <Check size={12} strokeWidth={3} /> : <Circle size={10} className="stitch-text-secondary" strokeWidth={2.5} />}
                </span>
                <StepIcon size={13} className={s.done ? 'text-emerald-700' : 'text-primary'} />
                <span className={`flex-1 text-xs font-semibold leading-tight ${
                  s.done ? 'stitch-text-secondary line-through' : 'stitch-text-primary'
                }`}>
                  {s.label}
                </span>
                {!s.done && (
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary">
                    {s.cta}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
