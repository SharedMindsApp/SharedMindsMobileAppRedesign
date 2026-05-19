import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound, ChevronRight, Loader2, LogOut, MapPin, Briefcase, FileText, Building2, Sparkles } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/AuthProvider';
import { SurfaceCard } from '../../ui/CorePage';
import { CountryPicker } from '../../ui/CountryPicker';
import { CityAutocomplete } from '../../ui/CityAutocomplete';
import { SkillsEditor } from '../../ui/SkillsEditor';
import { formatLocation } from '../../../lib/countries';

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

const MAX_WORK_TYPES = 3;

function workTypeLabel(id: string): string {
  return WORK_TYPES.find((w) => w.id === id)?.label ?? id;
}

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [countryCode, setCountryCode] = useState<string | null>(profile?.country_code ?? null);
  const [city, setCity] = useState(profile?.city ?? '');
  const [workTypes, setWorkTypes] = useState<string[]>(profile?.work_types ?? []);
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setBio(profile.bio ?? '');
      setCountryCode(profile.country_code ?? null);
      setCity(profile.city ?? '');
      // Prefer the new array; fall back to legacy single work_type for migrating users.
      const types = profile.work_types?.length
        ? profile.work_types
        : profile.work_type
        ? [profile.work_type]
        : [];
      setWorkTypes(types);
      setSkills(profile.skills ?? []);
    }
  }, [profile]);

  function toggleWorkType(id: string) {
    setWorkTypes((current) => {
      if (current.includes(id)) {
        return current.filter((x) => x !== id);
      }
      if (current.length >= MAX_WORK_TYPES) return current;
      return [...current, id];
    });
  }

  async function handleSave() {
    if (!user || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const trimmedCity = city.trim();
      const displayLocation = formatLocation(countryCode, trimmedCity);
      const { error: err } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          country_code: countryCode || null,
          city: trimmedCity || null,
          location: displayLocation || null,
          work_types: workTypes,
          // Mirror first selected work type into the legacy column for backwards compat
          work_type: workTypes[0] ?? null,
          skills,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (err) throw err;
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
  }

  const initialWorkTypes = profile?.work_types?.length
    ? profile.work_types
    : profile?.work_type
    ? [profile.work_type]
    : [];

  const hasChanges =
    displayName !== (profile?.display_name ?? '') ||
    bio !== (profile?.bio ?? '') ||
    countryCode !== (profile?.country_code ?? null) ||
    city !== (profile?.city ?? '') ||
    !arraysEqual(workTypes, initialWorkTypes) ||
    !arraysEqual(skills, profile?.skills ?? []);

  return (
    <div className="space-y-5">

      {/* ── Header ───────────────────────────────────────── */}
      <div>
        <h1 className="stitch-headline text-xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-xs stitch-text-secondary mt-0.5">Manage your profile and account</p>
      </div>

      {/* ── Profile link ─────────────────────────────────── */}
      <button
        type="button"
        onClick={() => navigate('/profile')}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors text-left"
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name ?? 'Profile'}
            className="w-9 h-9 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-xl stitch-card--accent flex items-center justify-center shrink-0">
            <UserRound size={16} className="text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold stitch-text-primary">{profile?.display_name ?? 'Your Profile'}</p>
          <p className="text-xs stitch-text-secondary truncate">
            {workTypes.length > 0
              ? workTypes.map(workTypeLabel).join(' · ')
              : 'Track record, bio, connections'}
          </p>
        </div>
        <ChevronRight size={16} className="stitch-text-secondary shrink-0" />
      </button>

      {/* ── Profile details ───────────────────────────────── */}
      <SurfaceCard>
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-4">Profile</p>

        <div className="space-y-3">
          {/* Display name */}
          <div>
            <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase block mb-1.5">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              maxLength={50}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-medium placeholder:stitch-text-secondary border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase block mb-1.5 flex items-center gap-1.5">
              <FileText size={10} /> Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What are you building? What lights you up?"
              maxLength={200}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-medium placeholder:stitch-text-secondary border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none leading-relaxed"
            />
            <p className="text-[10px] stitch-text-secondary text-right mt-1">{bio.length}/200</p>
          </div>

          {/* Country */}
          <div>
            <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase block mb-1.5 flex items-center gap-1.5">
              <MapPin size={10} /> Country
            </label>
            <CountryPicker
              value={countryCode}
              onChange={(code) => {
                setCountryCode(code);
                // Clear city when country changes — old city may not exist in new country
                if (code !== countryCode) setCity('');
              }}
            />
          </div>

          {/* City (optional, autocomplete) */}
          <div>
            <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase block mb-1.5 flex items-center gap-1.5">
              <Building2 size={10} /> City <span className="font-normal opacity-60 normal-case tracking-normal">— optional</span>
            </label>
            <CityAutocomplete
              value={city}
              onChange={setCity}
              countryCode={countryCode}
            />
          </div>
        </div>
      </SurfaceCard>

      {/* ── What you do ───────────────────────────────────── */}
      <SurfaceCard>
        <div className="flex items-baseline justify-between mb-1">
          <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
            <span className="flex items-center gap-1.5"><Briefcase size={10} /> What you do</span>
          </p>
          <p className="text-[10px] stitch-text-secondary tabular-nums">
            {workTypes.length}/{MAX_WORK_TYPES}
          </p>
        </div>
        <p className="text-xs stitch-text-secondary mb-4">
          Pick up to {MAX_WORK_TYPES} that describe you
        </p>
        <div className="grid grid-cols-2 gap-2">
          {WORK_TYPES.map((wt) => {
            const isSelected = workTypes.includes(wt.id);
            const isDisabled = !isSelected && workTypes.length >= MAX_WORK_TYPES;
            return (
              <button
                key={wt.id}
                type="button"
                onClick={() => toggleWorkType(wt.id)}
                disabled={isDisabled}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-xs font-bold transition-all active:scale-[0.97] ${
                  isSelected
                    ? 'stitch-btn--primary text-white shadow-sm shadow-primary/20'
                    : isDisabled
                    ? 'bg-surface-container-low stitch-text-secondary opacity-50 cursor-not-allowed'
                    : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                } ${wt.id === 'other' ? 'col-span-2' : ''}`}
              >
                <span>{wt.emoji}</span>
                {wt.label}
              </button>
            );
          })}
        </div>
      </SurfaceCard>

      {/* ── Skills ─────────────────────────────────────────── */}
      <SurfaceCard>
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1">
          <span className="flex items-center gap-1.5"><Sparkles size={10} /> Skills</span>
        </p>
        <p className="text-xs stitch-text-secondary mb-4">
          Tools, crafts, languages — anything you bring to the work
        </p>
        <SkillsEditor value={skills} onChange={setSkills} />
      </SurfaceCard>

      {/* ── Save button ───────────────────────────────────── */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={!hasChanges || saving}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 ${
          hasChanges && !saving
            ? saved
              ? 'bg-emerald-500 text-white'
              : 'stitch-btn--primary text-white shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-[0.98]'
            : 'bg-surface-container-low stitch-text-secondary cursor-not-allowed'
        }`}
      >
        {saving ? (
          <Loader2 size={16} className="animate-spin" />
        ) : saved ? (
          'Saved!'
        ) : (
          'Save changes'
        )}
      </button>

      {/* ── Account ───────────────────────────────────────── */}
      <SurfaceCard>
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-3">Account</p>
        <div className="space-y-2">
          <div className="px-1 py-1">
            <p className="text-xs stitch-text-secondary">Signed in as</p>
            <p className="text-sm font-semibold stitch-text-primary mt-0.5">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container-low hover:bg-red-50 hover:text-red-600 stitch-text-primary text-sm font-semibold transition-all active:scale-[0.98]"
          >
            <LogOut size={15} />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </SurfaceCard>

    </div>
  );
}
