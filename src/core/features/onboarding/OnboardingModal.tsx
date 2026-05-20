import { useState } from 'react';
import { ArrowRight, Loader2, Target, Video, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/AuthProvider';

interface Props {
  onComplete: () => void;
}

const WORK_TYPES = [
  { id: 'designer',   label: 'Designer',            emoji: '🎨' },
  { id: 'developer',  label: 'Developer',           emoji: '💻' },
  { id: 'writer',     label: 'Writer / Creator',    emoji: '✍️' },
  { id: 'founder',    label: 'Founder',             emoji: '🚀' },
  { id: 'filmmaker',  label: 'Filmmaker / Producer',emoji: '🎬' },
  { id: 'marketer',   label: 'Marketer',            emoji: '📣' },
  { id: 'consultant', label: 'Consultant',          emoji: '🎯' },
  { id: 'researcher', label: 'Researcher',          emoji: '🔬' },
  { id: 'other',      label: 'Something else',      emoji: '✨' },
];

// Quick-pick skills shown during onboarding — curated across all work types.
// Displayed as a flat chip grid so users can tap 1–5 in seconds.
const QUICK_SKILLS: { emoji: string; label: string }[] = [
  { emoji: '🎨', label: 'UI Design' },
  { emoji: '🎨', label: 'Brand Identity' },
  { emoji: '💻', label: 'React' },
  { emoji: '💻', label: 'TypeScript' },
  { emoji: '💻', label: 'Python' },
  { emoji: '🤖', label: 'AI Engineering' },
  { emoji: '✍️', label: 'Copywriting' },
  { emoji: '✍️', label: 'Content Writing' },
  { emoji: '📣', label: 'Social Media' },
  { emoji: '📣', label: 'Email Marketing' },
  { emoji: '📣', label: 'SEO' },
  { emoji: '🎬', label: 'Video Editing' },
  { emoji: '🎬', label: 'YouTube' },
  { emoji: '🎙️', label: 'Podcasting' },
  { emoji: '🎵', label: 'Music Production' },
  { emoji: '📊', label: 'Product Management' },
  { emoji: '📊', label: 'Strategy' },
  { emoji: '📊', label: 'Project Management' },
  { emoji: '🔬', label: 'User Research' },
  { emoji: '📱', label: 'iOS Development' },
  { emoji: '🌐', label: 'Next.js' },
  { emoji: '🗄️', label: 'PostgreSQL' },
  { emoji: '📐', label: 'Figma' },
  { emoji: '🖊️', label: 'Technical Writing' },
];

const MAX_WORK_TYPES_ONBOARDING = 3;
const MAX_QUICK_SKILLS = 5;

const LOOP_STEPS = [
  {
    icon: Target,
    color: 'bg-violet-100 text-violet-600',
    title: 'Declare',
    description: "Name what you're working on before you start. Saying it out loud makes it real.",
  },
  {
    icon: Video,
    color: 'bg-blue-100 text-blue-600',
    title: 'Work',
    description: 'Show up alongside other solopreneurs and creatives. No small talk — just presence.',
  },
  {
    icon: CheckCircle2,
    color: 'bg-emerald-100 text-emerald-600',
    title: 'Finish',
    description: 'Report what actually happened. Your track record builds one session at a time.',
  },
];

type Step = 'name' | 'work' | 'skills' | 'loop';
const STEPS: Step[] = ['name', 'work', 'skills', 'loop'];

/** Save name + work types — does NOT mark onboarding complete yet. */
async function saveWorkProfile(name: string, workTypes: string[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('profiles')
    .update({
      display_name: name.trim(),
      work_types: workTypes,
      work_type: workTypes[0] ?? null,
    })
    .eq('id', user.id);
}

/** Save skills and mark onboarding complete. */
async function saveSkillsAndComplete(skills: string[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('profiles')
    .update({
      skills: skills.length > 0 ? skills : null,
      onboarding_completed: true,
    })
    .eq('id', user.id);
}

export function OnboardingModal({ onComplete }: Props) {
  const { profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState(profile?.display_name ?? '');
  const initialTypes = profile?.work_types?.length
    ? profile.work_types
    : profile?.work_type
    ? [profile.work_type]
    : [];
  const [workTypes, setWorkTypes] = useState<string[]>(initialTypes);
  const [skills, setSkills] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);

  function toggleWorkType(id: string) {
    setWorkTypes((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      if (current.length >= MAX_WORK_TYPES_ONBOARDING) return current;
      return [...current, id];
    });
  }

  function toggleSkill(label: string) {
    setSkills((current) => {
      if (current.includes(label)) return current.filter((s) => s !== label);
      if (current.length >= MAX_QUICK_SKILLS) return current;
      return [...current, label];
    });
  }

  async function handleNameNext() {
    if (!name.trim() || saving) return;
    setStep('work');
  }

  async function handleWorkNext() {
    if (workTypes.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveWorkProfile(name, workTypes);
      setStep('skills');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleSkillsNext() {
    // Skills step always advances (skills are optional)
    setStep('loop');
  }

  async function handleComplete() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveSkillsAndComplete(skills);
      await refreshProfile();
      onComplete();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 pt-8 pb-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === stepIndex
                ? 'w-6 bg-primary'
                : i < stepIndex
                ? 'w-4 bg-primary/40'
                : 'w-1.5 bg-surface-container'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6 py-6 overflow-y-auto">

        {/* ── Step 1: Name ──────────────────────────────── */}
        {step === 'name' && (
          <>
            <div className="flex-1 flex flex-col justify-center">
              <div className="mb-8">
                <div className="w-14 h-14 rounded-2xl stitch-card--accent flex items-center justify-center mb-6">
                  <span className="text-2xl">👋</span>
                </div>
                <h1 className="stitch-headline text-2xl font-extrabold tracking-tight mb-2">
                  Welcome to SharedMinds
                </h1>
                <p className="text-sm stitch-text-secondary leading-relaxed">
                  A virtual coworking space for solopreneurs and creative professionals.
                  Show up, get work done, build your network.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase block mb-2">
                  What should we call you?
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameNext()}
                  placeholder="Your name"
                  maxLength={50}
                  autoFocus
                  className="w-full px-4 py-3.5 rounded-xl bg-surface-container-low stitch-text-primary text-base font-medium placeholder:stitch-text-secondary border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleNameNext}
              disabled={!name.trim()}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold transition-all duration-200 mt-6 ${
                name.trim()
                  ? 'stitch-btn--primary text-white shadow-lg shadow-primary/25 hover:-translate-y-0.5 active:scale-[0.98]'
                  : 'bg-surface-container-low stitch-text-secondary cursor-not-allowed'
              }`}
            >
              Next <ArrowRight size={18} />
            </button>
          </>
        )}

        {/* ── Step 2: Work type ─────────────────────────── */}
        {step === 'work' && (
          <>
            <div className="flex-1 flex flex-col">
              <div className="mb-6">
                <h2 className="stitch-headline text-2xl font-extrabold tracking-tight mb-2">
                  What kind of work do you do?
                </h2>
                <p className="text-sm stitch-text-secondary">
                  Pick up to {MAX_WORK_TYPES_ONBOARDING}. Many creatives wear more than one hat.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {WORK_TYPES.map((wt) => {
                  const isSelected = workTypes.includes(wt.id);
                  const isDisabled = !isSelected && workTypes.length >= MAX_WORK_TYPES_ONBOARDING;
                  return (
                    <button
                      key={wt.id}
                      type="button"
                      onClick={() => toggleWorkType(wt.id)}
                      disabled={isDisabled}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left text-sm font-bold transition-all active:scale-[0.97] ${
                        isSelected
                          ? 'stitch-btn--primary text-white shadow-md shadow-primary/20'
                          : isDisabled
                          ? 'bg-surface-container-low stitch-text-secondary opacity-50 cursor-not-allowed'
                          : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                      } ${wt.id === 'other' ? 'col-span-2' : ''}`}
                    >
                      <span className="text-lg">{wt.emoji}</span>
                      {wt.label}
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] stitch-text-secondary text-center mt-3 tabular-nums">
                {workTypes.length}/{MAX_WORK_TYPES_ONBOARDING} selected
              </p>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 mt-4">{error}</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleWorkNext}
              disabled={workTypes.length === 0 || saving}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold transition-all duration-200 mt-6 ${
                workTypes.length > 0 && !saving
                  ? 'stitch-btn--primary text-white shadow-lg shadow-primary/25 hover:-translate-y-0.5 active:scale-[0.98]'
                  : 'bg-surface-container-low stitch-text-secondary cursor-not-allowed'
              }`}
            >
              {saving
                ? <Loader2 size={18} className="animate-spin" />
                : <> Next <ArrowRight size={18} /></>
              }
            </button>
          </>
        )}

        {/* ── Step 3: Skills ────────────────────────────── */}
        {step === 'skills' && (
          <>
            <div className="flex-1 flex flex-col">
              <div className="mb-6">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
                  <Sparkles size={18} className="text-violet-600" />
                </div>
                <h2 className="stitch-headline text-2xl font-extrabold tracking-tight mb-2">
                  What are you working with?
                </h2>
                <p className="text-sm stitch-text-secondary">
                  Tap up to {MAX_QUICK_SKILLS} skills. Others can filter by these when browsing the community.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {QUICK_SKILLS.map(({ emoji, label }) => {
                  const isSelected = skills.includes(label);
                  const isDisabled = !isSelected && skills.length >= MAX_QUICK_SKILLS;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleSkill(label)}
                      disabled={isDisabled}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.96] ${
                        isSelected
                          ? 'bg-primary text-white shadow-sm shadow-primary/25'
                          : isDisabled
                          ? 'bg-surface-container-low stitch-text-secondary opacity-40 cursor-not-allowed'
                          : 'bg-surface-container stitch-text-primary hover:bg-surface-container-high'
                      }`}
                    >
                      <span>{emoji}</span>
                      {label}
                    </button>
                  );
                })}
              </div>

              {skills.length > 0 && (
                <p className="text-[11px] stitch-text-secondary text-center mt-4 tabular-nums">
                  {skills.length}/{MAX_QUICK_SKILLS} selected · You can add more from your profile later
                </p>
              )}
            </div>

            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                onClick={handleSkillsNext}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold stitch-btn--primary text-white shadow-lg shadow-primary/25 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
              >
                {skills.length > 0 ? 'Looks good' : 'Skip for now'} <ArrowRight size={18} />
              </button>
            </div>
          </>
        )}

        {/* ── Step 4: How it works ──────────────────────── */}
        {step === 'loop' && (
          <>
            <div className="flex-1 flex flex-col justify-center">
              <div className="mb-8">
                <h2 className="stitch-headline text-2xl font-extrabold tracking-tight mb-2">
                  Here's how it works
                </h2>
                <p className="text-sm stitch-text-secondary">
                  Every session follows the same simple loop.
                </p>
              </div>

              <div className="space-y-5 mb-8">
                {LOOP_STEPS.map(({ icon: Icon, color, title, description }, i) => (
                  <div key={title} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                        <Icon size={18} />
                      </div>
                      {i < LOOP_STEPS.length - 1 && (
                        <div className="w-px flex-1 bg-surface-container mt-2" />
                      )}
                    </div>
                    <div className="pb-5">
                      <p className="text-sm font-extrabold stitch-text-primary mb-0.5">{title}</p>
                      <p className="text-sm stitch-text-secondary leading-relaxed">{description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Context line about who else is here */}
              <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-blue-50/50 ring-1 ring-primary/10 px-4 py-3.5">
                <p className="text-xs stitch-text-secondary leading-relaxed">
                  <span className="font-bold stitch-text-primary">You're not coworking alone.</span>{' '}
                  SharedMinds matches you with other solopreneurs and creators doing deep work at the same time.
                  Presence is the accountability.
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 mt-4">{error}</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleComplete}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold stitch-btn--primary text-white shadow-lg shadow-primary/25 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 mt-6"
            >
              {saving
                ? <Loader2 size={18} className="animate-spin" />
                : <> Let's go <ArrowRight size={18} /></>
              }
            </button>
          </>
        )}
      </div>
    </div>
  );
}
