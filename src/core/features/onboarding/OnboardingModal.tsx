import { useState } from 'react';
import { ArrowRight, Loader2, Target, Video, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/AuthProvider';

interface Props {
  onComplete: () => void;
}

const WORK_TYPES = [
  { id: 'designer', label: 'Designer', emoji: '🎨' },
  { id: 'developer', label: 'Developer', emoji: '💻' },
  { id: 'writer', label: 'Writer / Creator', emoji: '✍️' },
  { id: 'founder', label: 'Founder', emoji: '🚀' },
  { id: 'filmmaker', label: 'Filmmaker / Producer', emoji: '🎬' },
  { id: 'marketer', label: 'Marketer', emoji: '📣' },
  { id: 'consultant', label: 'Consultant', emoji: '🎯' },
  { id: 'researcher', label: 'Researcher', emoji: '🔬' },
  { id: 'other', label: 'Something else', emoji: '✨' },
];

const LOOP_STEPS = [
  {
    icon: Target,
    color: 'bg-violet-100 text-violet-600',
    title: 'Declare',
    description: 'Name what you\'re working on before you start. Saying it out loud makes it real.',
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
    title: 'Ship',
    description: 'Report what actually happened. Your track record builds in public — one session at a time.',
  },
];

const MAX_WORK_TYPES_ONBOARDING = 3;

async function saveProfile(name: string, workTypes: string[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('profiles')
    .update({
      display_name: name.trim(),
      work_types: workTypes,
      // Legacy column gets the first selection for backwards compat
      work_type: workTypes[0] ?? null,
      onboarding_completed: true,
    })
    .eq('id', user.id);
}

export function OnboardingModal({ onComplete }: Props) {
  const { profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<'name' | 'work' | 'loop'>('name');
  const [name, setName] = useState(profile?.display_name ?? '');
  const initialTypes = profile?.work_types?.length
    ? profile.work_types
    : profile?.work_type
    ? [profile.work_type]
    : [];
  const [workTypes, setWorkTypes] = useState<string[]>(initialTypes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleWorkType(id: string) {
    setWorkTypes((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      if (current.length >= MAX_WORK_TYPES_ONBOARDING) return current;
      return [...current, id];
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
      await saveProfile(name, workTypes);
      await refreshProfile();
      setStep('loop');
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
        {(['name', 'work', 'loop'] as const).map((s) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              s === step ? 'w-6 bg-primary' : 'w-1.5 bg-surface-container'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6 py-6">

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

              <div className="space-y-4">
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
            </div>

            <button
              type="button"
              onClick={handleNameNext}
              disabled={!name.trim()}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold transition-all duration-200 ${
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
            <div className="flex-1 flex flex-col justify-center">
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
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold transition-all duration-200 ${
                workTypes.length > 0 && !saving
                  ? 'stitch-btn--primary text-white shadow-lg shadow-primary/25 hover:-translate-y-0.5 active:scale-[0.98]'
                  : 'bg-surface-container-low stitch-text-secondary cursor-not-allowed'
              }`}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : (
                <> Next <ArrowRight size={18} /> </>
              )}
            </button>
          </>
        )}

        {/* ── Step 3: How it works ──────────────────────── */}
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

              <div className="space-y-5">
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
            </div>

            <button
              type="button"
              onClick={onComplete}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold stitch-btn--primary text-white shadow-lg shadow-primary/25 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
            >
              Let's go <ArrowRight size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
