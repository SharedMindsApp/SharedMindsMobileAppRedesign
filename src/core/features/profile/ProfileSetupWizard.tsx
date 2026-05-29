/**
 * ProfileSetupWizard — optional, skippable, resumable flow that takes a sparse
 * profile to advertising-grade. Distinct from the signup onboarding (the lean
 * gate). One focused ask per step, loss-framed, progressive save, finishing on
 * a live preview of the real profile.
 *
 * Steps: basics (photo + headline) → skills (work types + skills) →
 * intent (right now + open to) → work (one credit) → done (live preview).
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Loader2, Camera, Check, X, Sparkles } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { supabase } from '../../../lib/supabase';
import { uploadAvatar, AvatarRejectedError } from '../../services/ProfileService';
import { createWorkCredit } from '../../services/WorkCreditService';
import { SkillsEditor } from '../../ui/SkillsEditor';
import { OPEN_TO_OPTIONS, HEADLINE_MAX, CURRENT_FOCUS_MAX } from '../../../lib/openTo';
import { WORK_TYPES, MAX_WORK_TYPES } from './ProfileSettingsPage';
import { ProfilePage } from './ProfilePage';

type Step = 'basics' | 'skills' | 'intent' | 'work' | 'done';
const INPUT_STEPS: Step[] = ['basics', 'skills', 'intent', 'work'];

export function ProfileSetupWizard({ onClose }: { onClose: () => void }) {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>('basics');
  const [busy, setBusy] = useState(false);

  // Seed from current profile so a resumed run keeps prior answers.
  const [headline, setHeadline] = useState(profile?.headline ?? '');
  const [workTypes, setWorkTypes] = useState<string[]>(profile?.work_types ?? []);
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);
  const [currentFocus, setCurrentFocus] = useState(profile?.current_focus ?? '');
  const [openTo, setOpenTo] = useState<string[]>(profile?.open_to ?? []);
  const [credit, setCredit] = useState({ title: '', role: '' });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setAvatarError(null); setUploadingAvatar(true);
    try { setAvatarUrl(await uploadAvatar(file)); }
    catch (err) { setAvatarError(err instanceof AvatarRejectedError ? 'That image was rejected — pick another.' : 'Upload failed.'); }
    finally { setUploadingAvatar(false); }
  }

  async function saveProfile(patch: Record<string, unknown>) {
    if (!user) return;
    await supabase.from('profiles').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', user.id);
  }

  async function next() {
    if (busy) return;
    setBusy(true);
    try {
      if (step === 'basics') { await saveProfile({ headline: headline.trim() || null }); setStep('skills'); }
      else if (step === 'skills') { await saveProfile({ work_types: workTypes, work_type: workTypes[0] ?? null, skills }); setStep('intent'); }
      else if (step === 'intent') { await saveProfile({ current_focus: currentFocus.trim() || null, open_to: openTo }); setStep('work'); }
      else if (step === 'work') {
        if (credit.title.trim()) {
          try { await createWorkCredit({ title: credit.title, role: credit.role, description: '', year_label: '', url: '', thumbnail_url: '', skills: [] }); }
          catch { /* ignore */ }
        }
        await refreshProfile();
        setStep('done');
      }
    } finally { setBusy(false); }
  }

  function back() {
    const order: Step[] = ['basics', 'skills', 'intent', 'work'];
    const i = order.indexOf(step);
    if (i > 0) setStep(order[i - 1]);
  }

  async function finish(complete: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      await saveProfile({ profile_setup_completed_at: new Date().toISOString() });
      await refreshProfile();
    } finally { setBusy(false); onClose(); }
    void complete;
  }

  const stepIndex = INPUT_STEPS.indexOf(step);
  const pct = step === 'done' ? 100 : Math.round((stepIndex / INPUT_STEPS.length) * 100);

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-surface flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-4 pt-3 pb-2 flex items-center gap-3" style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}>
        {step !== 'done' && stepIndex > 0 ? (
          <button type="button" onClick={back} className="w-8 h-8 grid place-items-center rounded-full stitch-text-secondary hover:bg-surface-container-low"><ArrowLeft size={17} /></button>
        ) : <span className="w-8" />}
        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-surface-container overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button type="button" onClick={() => void finish(false)} className="text-xs font-bold stitch-text-secondary hover:stitch-text-primary px-1">
          {step === 'done' ? 'Done' : 'Skip'}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="max-w-md mx-auto">
          {step === 'basics' && (
            <Shell title="Put a face to your name" sub="Profiles with a photo and a one-line headline get noticed first.">
              <div className="flex flex-col items-center gap-3 mb-5">
                <button type="button" onClick={() => document.getElementById('wiz-avatar')?.click()} disabled={uploadingAvatar}
                  className="relative w-28 h-28 rounded-3xl overflow-hidden group ring-1 ring-surface-container">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-surface-container-low grid place-items-center"><Camera size={26} className="stitch-text-secondary" /></div>}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 grid place-items-center transition-colors">
                    {uploadingAvatar ? <Loader2 size={22} className="animate-spin text-white" /> : <Camera size={22} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </div>
                  <input id="wiz-avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatar} className="hidden" />
                </button>
                {avatarError && <p className="text-xs text-rose-600">{avatarError}</p>}
              </div>
              <Label>Headline</Label>
              <input value={headline} onChange={(e) => setHeadline(e.target.value.slice(0, HEADLINE_MAX))} placeholder="e.g. Founder building tools for focused work" className={INPUT} />
              <Counter n={headline.length} max={HEADLINE_MAX} />
            </Shell>
          )}

          {step === 'skills' && (
            <Shell title="What do you do?" sub="So you show up when someone's looking for exactly your skill.">
              <Label>Your work</Label>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {WORK_TYPES.map((wt) => {
                  const on = workTypes.includes(wt.id);
                  const disabled = !on && workTypes.length >= MAX_WORK_TYPES;
                  return (
                    <button key={wt.id} type="button" disabled={disabled}
                      onClick={() => setWorkTypes((c) => c.includes(wt.id) ? c.filter((x) => x !== wt.id) : [...c, wt.id])}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${on ? 'stitch-btn--primary text-white' : disabled ? 'bg-surface-container-low stitch-text-secondary opacity-50' : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'} ${wt.id === 'other' ? 'col-span-2' : ''}`}>
                      <span>{wt.emoji}</span>{wt.label}
                    </button>
                  );
                })}
              </div>
              <Label>Skills</Label>
              <SkillsEditor value={skills} onChange={setSkills} />
            </Shell>
          )}

          {step === 'intent' && (
            <Shell title="What are you working on?" sub="This is what makes people reach out. Say what you're building and what you're open to.">
              <Label>Right now</Label>
              <input value={currentFocus} onChange={(e) => setCurrentFocus(e.target.value.slice(0, CURRENT_FOCUS_MAX))} placeholder="e.g. Building GrowDo — looking for a designer to partner with" className={INPUT} />
              <Counter n={currentFocus.length} max={CURRENT_FOCUS_MAX} />
              <Label className="mt-4">Open to</Label>
              <div className="flex flex-wrap gap-2">
                {OPEN_TO_OPTIONS.map((o) => {
                  const on = openTo.includes(o.id);
                  return (
                    <button key={o.id} type="button" onClick={() => setOpenTo((c) => c.includes(o.id) ? c.filter((x) => x !== o.id) : [...c, o.id])}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${on ? 'stitch-btn--primary text-white' : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'}`}>
                      <span>{o.emoji}</span>{o.label}
                    </button>
                  );
                })}
              </div>
            </Shell>
          )}

          {step === 'work' && (
            <Shell title="Show one thing you've made" sub="One credit says more than a bio. Add a piece of work — you can tag who you made it with later.">
              <Label>Title</Label>
              <input value={credit.title} onChange={(e) => setCredit((c) => ({ ...c, title: e.target.value }))} placeholder="e.g. Brand film for Nike" className={INPUT} maxLength={120} />
              <Label className="mt-3">Your role</Label>
              <input value={credit.role} onChange={(e) => setCredit((c) => ({ ...c, role: e.target.value }))} placeholder="e.g. Director" className={INPUT} maxLength={80} />
              <p className="text-[11px] stitch-text-secondary mt-3">Add more detail and collaborators anytime from your profile.</p>
            </Shell>
          )}

          {step === 'done' && (
            <div className="text-center">
              <div className="inline-flex w-12 h-12 rounded-2xl bg-emerald-500/15 items-center justify-center mb-3"><Sparkles size={22} className="text-emerald-600" /></div>
              <h1 className="stitch-headline text-2xl font-extrabold tracking-tight mb-1">You're set up</h1>
              <p className="text-sm stitch-text-secondary mb-5">Here's how others will see you{skills.length ? ` — you'll show up when people search for ${skills.slice(0, 2).join(', ')}` : ''}.</p>
              <div className="text-left ring-1 ring-surface-container rounded-2xl p-3 bg-surface-container-low/40">
                <ProfilePage />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-5 py-3 border-t border-surface-container" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}>
        <div className="max-w-md mx-auto">
          {step === 'done' ? (
            <button type="button" onClick={() => void finish(true)} disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl stitch-btn--primary text-white text-base font-bold active:scale-[0.98] disabled:opacity-60">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />} View my profile
            </button>
          ) : (
            <button type="button" onClick={() => void next()} disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl stitch-btn--primary text-white text-base font-bold active:scale-[0.98] disabled:opacity-60">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <>Continue <ArrowRight size={16} /></>}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

const INPUT = 'w-full px-4 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-medium placeholder:stitch-text-secondary border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all';

function Shell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="stitch-headline text-2xl font-extrabold tracking-tight leading-tight">{title}</h1>
      <p className="text-sm stitch-text-secondary leading-relaxed mt-1 mb-5">{sub}</p>
      {children}
    </div>
  );
}
function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1.5 ${className}`}>{children}</p>;
}
function Counter({ n, max }: { n: number; max: number }) {
  return <p className="text-[10px] stitch-text-secondary text-right mt-1">{n}/{max}</p>;
}
