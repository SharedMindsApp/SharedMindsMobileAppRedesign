import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound, ChevronRight, Loader2, LogOut, MapPin, Briefcase, FileText, Building2, Sparkles, Camera, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/AuthProvider';
import { SurfaceCard } from '../../ui/CorePage';
import { CountryPicker } from '../../ui/CountryPicker';
import { CityAutocomplete } from '../../ui/CityAutocomplete';
import { SkillsEditor } from '../../ui/SkillsEditor';
import { formatLocation } from '../../../lib/countries';
import { uploadAvatar, AvatarRejectedError } from '../../services/ProfileService';
import { getPreferences, updatePreferences, type NotificationPreferences } from '../../services/NotificationService';

const WORK_TYPES = [
  { id: 'designer',     label: 'Designer',             emoji: '🎨' },
  { id: 'developer',    label: 'Developer',            emoji: '💻' },
  { id: 'writer',       label: 'Writer / Creator',     emoji: '✍️' },
  { id: 'founder',      label: 'Founder',              emoji: '🚀' },
  { id: 'filmmaker',    label: 'Filmmaker / Producer', emoji: '🎬' },
  { id: 'marketer',     label: 'Marketer',             emoji: '📣' },
  { id: 'consultant',   label: 'Consultant',           emoji: '🎯' },
  { id: 'researcher',   label: 'Researcher',           emoji: '🔬' },
  { id: 'sales',        label: 'Sales',                emoji: '💼' },
  { id: 'coach',        label: 'Coach / Therapist',    emoji: '🧭' },
  { id: 'educator',     label: 'Educator / Teacher',   emoji: '📚' },
  { id: 'accountant',   label: 'Accountant / Finance', emoji: '🧾' },
  { id: 'photographer', label: 'Photographer',         emoji: '📸' },
  { id: 'other',        label: 'Something else',       emoji: '✨' },
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

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so the same file can be re-picked after a failure
    if (!file) return;
    setAvatarError(null);
    setUploadingAvatar(true);
    try {
      await uploadAvatar(file);
      await refreshProfile();
    } catch (err) {
      if (err instanceof AvatarRejectedError) {
        setAvatarError('That image was rejected by moderation. Please pick a different photo.');
      } else if (err instanceof Error) {
        setAvatarError(err.message);
      } else {
        setAvatarError('Upload failed.');
      }
      setTimeout(() => setAvatarError(null), 6000);
    } finally {
      setUploadingAvatar(false);
    }
  }

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

        {/* Avatar upload */}
        <div className="mb-5 flex items-start gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="relative w-20 h-20 rounded-2xl shrink-0 overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            aria-label="Change profile photo"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name ?? 'Profile'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full stitch-card--accent flex items-center justify-center text-2xl font-extrabold text-white">
                {(profile?.display_name ?? user?.email ?? '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              {uploadingAvatar ? (
                <Loader2 size={20} className="animate-spin text-white" />
              ) : (
                <Camera
                  size={18}
                  className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  strokeWidth={2.25}
                />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFile}
              className="hidden"
            />
          </button>
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1.5">
              Profile photo
            </p>
            <p className="text-xs stitch-text-secondary leading-relaxed">
              Click your avatar to upload a new one.<br />
              JPG, PNG, or WebP. Resized to 512×512 on upload.
            </p>
          </div>
        </div>

        {avatarError && (
          <div className="mb-4 flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 text-red-700 text-xs">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            <p className="leading-relaxed">{avatarError}</p>
          </div>
        )}

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

      {/* ── Notifications ─────────────────────────────────── */}
      <SurfaceCard>
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-3">Notifications</p>
        <NotificationPreferencesPanel />
      </SurfaceCard>

      {/* ── Privacy ───────────────────────────────────────── */}
      <SurfaceCard>
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-3">Privacy</p>
        <PrivacyToggle
          hidden={!!profile?.is_hidden_from_directory}
          onChange={async (next) => {
            if (!user) return;
            await supabase.from('profiles')
              .update({ is_hidden_from_directory: next, updated_at: new Date().toISOString() })
              .eq('id', user.id);
            await refreshProfile();
          }}
        />
      </SurfaceCard>

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

/* ── PrivacyToggle ──────────────────────────────────────────────
   Switches the directory-visibility flag with an optimistic update.
   The backing column is profiles.is_hidden_from_directory. */
function PrivacyToggle({
  hidden,
  onChange,
}: {
  hidden: boolean;
  onChange: (next: boolean) => Promise<void>;
}) {
  const [local, setLocal] = useState(hidden);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLocal(hidden); }, [hidden]);

  async function toggle() {
    if (saving) return;
    const next = !local;
    setLocal(next); // optimistic
    setSaving(true);
    try {
      await onChange(next);
    } catch {
      setLocal(!next); // revert
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
        local
          ? 'bg-amber-50 ring-1 ring-amber-200/60'
          : 'bg-surface-container-low hover:bg-surface-container'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        local ? 'bg-amber-500 text-white' : 'bg-white stitch-text-secondary'
      }`}>
        {saving ? <Loader2 size={15} className="animate-spin" /> : local ? <EyeOff size={15} /> : <Eye size={15} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold stitch-text-primary leading-tight">
          Hide my profile from the directory
          {local && <span className="ml-2 text-amber-700">· on</span>}
        </p>
        <p className="text-[11px] stitch-text-secondary leading-snug mt-0.5">
          {local
            ? "You won't show up in /people or Suggested. Your profile is still visible to anyone with a direct link — connections, DM partners, and people who've joined a session with you."
            : 'You appear in the members directory and suggested-connections lists.'}
        </p>
      </div>
      <div className={`w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
        local ? 'bg-amber-500' : 'bg-surface-container'
      }`}>
        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
          local ? 'translate-x-4' : 'translate-x-0'
        }`} />
      </div>
    </button>
  );
}

/* ── NotificationPreferencesPanel ───────────────────────────────
   Per-category email opt-out + digest mode. Saves optimistically
   per-toggle so users get instant feedback. */
function NotificationPreferencesPanel() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPreferences().then((p) => {
      if (!cancelled) { setPrefs(p); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  async function toggle(field: keyof Omit<NotificationPreferences, 'user_id' | 'updated_at' | 'digest_mode' | 'dm_inactivity_threshold_hours'>) {
    if (!prefs) return;
    const next = !prefs[field];
    setPrefs({ ...prefs, [field]: next });
    try {
      await updatePreferences({ [field]: next });
    } catch {
      setPrefs((p) => p ? { ...p, [field]: !next } : p);
    }
  }

  async function setDigestMode(mode: NotificationPreferences['digest_mode']) {
    if (!prefs) return;
    const prev = prefs.digest_mode;
    setPrefs({ ...prefs, digest_mode: mode });
    try {
      await updatePreferences({ digest_mode: mode });
    } catch {
      setPrefs((p) => p ? { ...p, digest_mode: prev } : p);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={16} className="animate-spin stitch-text-secondary" />
      </div>
    );
  }

  if (!prefs) {
    return <p className="text-xs stitch-text-secondary">Couldn't load notification preferences.</p>;
  }

  const rows: { key: keyof typeof prefs; label: string; help: string }[] = [
    { key: 'email_session_reminders',  label: 'Session reminders',     help: '24 hours and 15 minutes before sessions you have booked' },
    { key: 'email_messages',           label: 'Direct messages',       help: 'Only when you have been offline for a while' },
    { key: 'email_post_replies',       label: 'Replies to your posts', help: 'When someone replies in the community feed' },
    { key: 'email_connection_requests',label: 'Connection requests',   help: 'When someone wants to connect with you' },
    { key: 'email_weekly_review',      label: 'Weekly review prompt',  help: 'Sunday evening nudge to reflect on your week' },
    { key: 'email_community_sessions', label: 'Community sessions',    help: 'Reminders for admin-scheduled recurring sessions' },
    { key: 'email_onboarding',         label: 'Onboarding tips',       help: 'First-week guidance — auto-stops after 7 days' },
    { key: 'email_marketing',          label: 'Product updates',       help: 'Occasional emails about new features and tips (opt-in)' },
  ];

  return (
    <div className="space-y-1">
      {/* Per-category toggles */}
      <p className="text-[11px] stitch-text-secondary mb-2 leading-relaxed">
        Email me about:
      </p>
      {rows.map((row) => {
        const value = !!prefs[row.key];
        return (
          <button
            key={row.key}
            type="button"
            onClick={() => toggle(row.key as any)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container-low transition-colors text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold stitch-text-primary leading-tight">
                {row.label}
              </p>
              <p className="text-[11px] stitch-text-secondary leading-snug mt-0.5">
                {row.help}
              </p>
            </div>
            <div className={`w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
              value ? 'bg-primary' : 'bg-surface-container'
            }`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                value ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </div>
          </button>
        );
      })}

      {/* Digest mode */}
      <div className="mt-4 pt-4 border-t border-surface-container/50">
        <p className="text-[11px] stitch-text-secondary mb-2 leading-relaxed">
          Email delivery:
        </p>
        <div className="space-y-1.5">
          {(['realtime', 'daily', 'off'] as const).map((mode) => {
            const label = mode === 'realtime'
              ? 'Send each email as it happens'
              : mode === 'daily'
              ? 'Bundle into one daily digest at 7pm'
              : 'Turn off all emails (in-app stays on)';
            const isSel = prefs.digest_mode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setDigestMode(mode)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  isSel ? 'bg-primary/8 ring-1 ring-primary/25' : 'hover:bg-surface-container-low'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  isSel ? 'border-primary' : 'border-surface-container-high'
                }`}>
                  {isSel && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <span className={`text-sm leading-tight ${isSel ? 'font-bold stitch-text-primary' : 'stitch-text-primary'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
