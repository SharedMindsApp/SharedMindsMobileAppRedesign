/**
 * OnboardingNudges — post-first-session prompts to complete the
 * optional bits we deliberately cut from the wizard.
 *
 * Two cards, both gated on the user having finished ≥1 session
 * (earned context), both dismissable (localStorage), both hidden
 * once their underlying need is met:
 *
 *   1. "Plan a project"      — when projects.length === 0
 *   2. "Complete your profile" — when country_code is null OR bio is empty
 *
 * The component returns null when:
 *   • no sessions completed yet (user hasn't earned the prompt)
 *   • all applicable nudges are dismissed
 *   • no applicable nudges remain (both conditions met)
 *
 * Lives on the home page just after the hero / live-now strip,
 * before the "what now?" planning surfaces. Doesn't fight for
 * attention with the Up Next pill or active-session takeover.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, UserCircle, X, ArrowRight, FolderPlus } from 'lucide-react';

interface Props {
  hasProjects: boolean;
  profileCountry: string | null | undefined;
  profileBio: string | null | undefined;
  sessionsCompleted: number;
}

const LS_PROJECT_DISMISSED = 'sm.nudge.plan-project.dismissed';
const LS_PROFILE_DISMISSED = 'sm.nudge.complete-profile.dismissed';

function readBoolLS(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage.getItem(key) === 'true'; }
  catch { return false; }
}

function writeBoolLS(key: string, value: boolean): void {
  try { window.localStorage.setItem(key, String(value)); }
  catch { /* private mode */ }
}

export function OnboardingNudges({
  hasProjects, profileCountry, profileBio, sessionsCompleted,
}: Props) {
  const navigate = useNavigate();
  // Local mirror of the dismissed flags — needed so dismissing a card
  // makes it disappear without a page reload.
  const [projectDismissed, setProjectDismissed] = useState<boolean>(() => readBoolLS(LS_PROJECT_DISMISSED));
  const [profileDismissed, setProfileDismissed] = useState<boolean>(() => readBoolLS(LS_PROFILE_DISMISSED));

  // Earned-context gate: don't pester users before they've felt what
  // a session is like. After session #1 they actually understand
  // what they'd be filling in.
  if (sessionsCompleted < 1) return null;

  // Profile-first priority: while the profile is still pending (incomplete
  // and not dismissed) it's the only nudge shown. The "Plan a project" card
  // waits until the profile is complete or dismissed, so we never split
  // attention between two asks at once.
  const profilePending = (!profileCountry || !profileBio) && !profileDismissed;
  const showProfile = profilePending;
  const showProject = !hasProjects && !projectDismissed && !profilePending;

  if (!showProject && !showProfile) return null;

  function dismissProject() {
    setProjectDismissed(true);
    writeBoolLS(LS_PROJECT_DISMISSED, true);
  }
  function dismissProfile() {
    setProfileDismissed(true);
    writeBoolLS(LS_PROFILE_DISMISSED, true);
  }

  return (
    <section aria-label="Suggested next steps" className="space-y-2">
      <p className="text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary px-1">
        Set yourself up
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {showProject && (
          <NudgeCard
            tone="violet"
            Icon={Sparkles}
            kicker="Plan something bigger"
            title="Set up your first project"
            body="A project is the macro goal your sessions are chipping at. Pin sessions to it, watch the progress build up."
            cta="Plan a project"
            onCta={() => navigate('/projects')}
            onDismiss={dismissProject}
            ctaIcon={FolderPlus}
          />
        )}
        {showProfile && (
          <NudgeCard
            tone="cyan"
            Icon={UserCircle}
            kicker="A few details still missing"
            title="Complete your profile"
            body="Add where you're working from and a one-liner about what you do. Helps people in matched sessions place you."
            cta="Finish profile"
            onCta={() => navigate('/profile?tab=edit')}
            onDismiss={dismissProfile}
            ctaIcon={ArrowRight}
          />
        )}
      </div>
    </section>
  );
}

// ── Card ────────────────────────────────────────────────────────────

const TONES: Record<'violet' | 'cyan', { bg: string; ring: string; iconBg: string; iconText: string; kicker: string; btn: string }> = {
  violet: {
    bg: 'bg-gradient-to-br from-violet-50 to-fuchsia-50',
    ring: 'ring-violet-100',
    iconBg: 'bg-violet-100',
    iconText: 'text-violet-600',
    kicker: 'text-violet-700',
    btn: 'bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90 text-white',
  },
  cyan: {
    bg: 'bg-gradient-to-br from-cyan-50 to-blue-50',
    ring: 'ring-cyan-100',
    iconBg: 'bg-cyan-100',
    iconText: 'text-cyan-600',
    kicker: 'text-cyan-700',
    btn: 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 text-white',
  },
};

function NudgeCard({
  tone, Icon, kicker, title, body, cta, onCta, onDismiss, ctaIcon: CtaIcon,
}: {
  tone: 'violet' | 'cyan';
  Icon: typeof Sparkles;
  kicker: string;
  title: string;
  body: string;
  cta: string;
  onCta: () => void;
  onDismiss: () => void;
  ctaIcon: typeof ArrowRight;
}) {
  const t = TONES[tone];
  return (
    <div className={`relative rounded-2xl ${t.bg} ring-1 ${t.ring} p-4 pr-3`}>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss this nudge"
        title="Dismiss"
        className="absolute top-2 right-2 w-6 h-6 rounded-full grid place-items-center stitch-text-secondary opacity-60 hover:opacity-100 hover:bg-black/5 transition-all"
      >
        <X size={12} />
      </button>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl ${t.iconBg} ${t.iconText} grid place-items-center shrink-0`}>
          <Icon size={16} strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-extrabold uppercase tracking-widest ${t.kicker} leading-tight`}>
            {kicker}
          </p>
          <h3 className="text-sm font-extrabold stitch-text-primary leading-tight mt-0.5">
            {title}
          </h3>
        </div>
      </div>
      <p className="text-xs stitch-text-secondary leading-relaxed mb-3 pr-4">
        {body}
      </p>
      <button
        type="button"
        onClick={onCta}
        className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-2 rounded-lg shadow-sm active:scale-95 transition-all ${t.btn}`}
      >
        <CtaIcon size={12} />
        {cta}
      </button>
    </div>
  );
}
