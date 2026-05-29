/**
 * ProfileSettingsPage — /profile (own view)
 *
 * Single scrolling page (no tabs). Sections in order:
 *   1. Public preview — what others see (renders <ProfilePage />)
 *   2. Edit — name, bio, avatar, country, city, work types, skills
 *   3. Notifications — per-category email toggles + digest mode
 *   4. Account — directory privacy, email, sign out
 *
 * Previously this was a 4-tab UI; the user fragmented their identity into
 * separate pages and the design felt heavier than it needed to be. With
 * stats moved to Home → Stats, the profile page has less content overall
 * and works better as one continuous scroll.
 *
 * Public visits to /profile/:userId still hit <ProfilePage /> directly.
 *
 * The old ?tab= query param is honoured for back-compat: instead of
 * switching tabs we scroll-to the matching section anchor.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Loader2, LogOut, MapPin, Briefcase, FileText, Building2, Sparkles, Camera,
  AlertCircle, Eye, EyeOff, UserRound, Bell, Shield, Settings as SettingsIcon,
  Sun, Moon, Zap, Check, Smartphone, Download, Trash2, Plus, Pencil, ArrowLeft,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/AuthProvider';
import { getSessionSfxEnabled, setSessionSfxEnabled, previewAllSounds } from '../sessions/sessionSounds';
import { SurfaceCard } from '../../ui/CorePage';
import { CountryPicker } from '../../ui/CountryPicker';
import { CityAutocomplete } from '../../ui/CityAutocomplete';
import { SkillsEditor } from '../../ui/SkillsEditor';
import { formatLocation } from '../../../lib/countries';
import { OPEN_TO_OPTIONS, HEADLINE_MAX, CURRENT_FOCUS_MAX } from '../../../lib/openTo';
import { uploadAvatar, AvatarRejectedError } from '../../services/ProfileService';
import { exportMyData, deleteMyAccount } from '../../services/PrivacyService';
import { getPreferences, updatePreferences, type NotificationPreferences } from '../../services/NotificationService';
import {
  isPushSupported, getPushPermission, subscribeToPush, unsubscribeFromPush, isSubscribed,
} from '../../services/PushNotificationService';
import { useUIPreferences } from '../../../contexts/UIPreferencesContext';
import { useCoreData } from '../../data/CoreDataContext';
import { PlannerSettingsSheet } from '../dashboard/PlannerSettingsSheet';
import { ProfilePage } from './ProfilePage';
import { WorkCreditsEditor } from './WorkCredits';

/** "7am" / "12pm" / "10pm" for an hour 0–23. */
function fmtHour(h: number): string {
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

// ── Constants ─────────────────────────────────────────────────────────────

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

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Top-level tabs. Notifications is now its own tab (was a scroll section)
// so it's easy to find and doesn't get buried under the long edit form.
type SettingsTab = 'profile' | 'notifications' | 'account';

const TAB_DEFS: { id: SettingsTab; label: string; Icon: typeof Bell }[] = [
  { id: 'profile',       label: 'Profile',       Icon: UserRound },
  { id: 'notifications', label: 'Notifications', Icon: Bell },
  { id: 'account',       label: 'Account',       Icon: Shield },
];

// Map legacy ?tab= values to the new tab ids ('edit' used to scroll to the
// edit section — it now just lands on the Profile tab).
function resolveTab(raw: string | null): SettingsTab {
  if (raw === 'notifications' || raw === 'account') return raw;
  return 'profile';
}

// ── ProfileSettingsPage ───────────────────────────────────────────────────

export function ProfileSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<SettingsTab>(() => resolveTab(searchParams.get('tab')));
  // Profile is view-first: show the public profile, flip to the editor only
  // when the user taps "Edit profile".
  const [editingProfile, setEditingProfile] = useState(false);

  // Keep the tab in sync if the ?tab= param changes (e.g. avatar-dropdown
  // links to /profile?tab=notifications), and strip the param once consumed.
  useEffect(() => {
    const raw = searchParams.get('tab');
    if (raw) {
      setTab(resolveTab(raw));
      const params = new URLSearchParams(searchParams);
      params.delete('tab');
      setSearchParams(params, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex p-1 rounded-2xl bg-surface-container-low ring-1 ring-surface-container/60">
        {TAB_DEFS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all ${
                active ? 'bg-surface stitch-text-primary shadow-sm' : 'stitch-text-secondary hover:stitch-text-primary'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          );
        })}
      </div>

      {tab === 'profile' && (
        editingProfile ? (
          <div className="space-y-4">
            {/* Edit mode — flip back to the view with Done. */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className="inline-flex items-center gap-1.5 text-sm font-bold stitch-text-secondary hover:stitch-text-primary transition-colors"
              >
                <ArrowLeft size={15} /> Back to profile
              </button>
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full stitch-btn--primary text-white text-xs font-bold active:scale-95 transition-transform"
              >
                <Check size={13} strokeWidth={3} /> Done
              </button>
            </div>
            <EditTab />
          </div>
        ) : (
          <div className="space-y-4">
            {/* View mode — exactly what others see, plus one Edit affordance. */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setEditingProfile(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full ring-1 ring-surface-container stitch-text-primary text-xs font-bold hover:bg-surface-container-low active:scale-95 transition-all"
              >
                <Pencil size={12} /> Edit profile
              </button>
            </div>
            <ProfilePage onEdit={() => setEditingProfile(true)} />
          </div>
        )
      )}

      {tab === 'notifications' && (
        <section>
          <SectionHeading icon={<Bell size={12} />} title="Notifications" />
          <SurfaceCard>
            <NotificationPreferencesPanel />
          </SurfaceCard>
        </section>
      )}

      {tab === 'account' && (
        <section>
          <SectionHeading icon={<Shield size={12} />} title="Account" />
          <AccountTab />
        </section>
      )}
    </div>
  );
}

// Keeps a heavy picker (e.g. the skill category browser) collapsed to a chip
// summary until the user taps Add/Edit — so the editor isn't a wall of chips.
function CollapsiblePicker({ value, addLabel, children }: { value: string[]; addLabel: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <div className="space-y-2">
        {children}
        <button type="button" onClick={() => setOpen(false)} className="text-[11px] font-bold text-primary hover:underline">
          Done
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((s) => (
            <span key={s} className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-container-low stitch-text-primary text-xs font-semibold">{s}</span>
          ))}
        </div>
      ) : (
        <p className="text-xs stitch-text-secondary italic opacity-70">Nothing added yet.</p>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl ring-1 ring-dashed ring-surface-container-high stitch-text-secondary hover:stitch-text-primary hover:bg-surface-container-low text-xs font-bold transition-all"
      >
        <Plus size={13} /> {value.length ? 'Edit' : addLabel}
      </button>
    </div>
  );
}

// Small section heading used to break the long scroll into scannable blocks.
function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 px-1">
      <span className="stitch-text-secondary">{icon}</span>
      <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
        {title}
      </p>
    </div>
  );
}

// ── Edit tab ──────────────────────────────────────────────────────────────

function EditTab() {
  const { user, profile, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [countryCode, setCountryCode] = useState<string | null>(profile?.country_code ?? null);
  const [city, setCity] = useState(profile?.city ?? '');
  const [workTypes, setWorkTypes] = useState<string[]>(profile?.work_types ?? []);
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);
  const [skillLevels, setSkillLevels] = useState<Record<string, number>>(
    (profile?.skill_levels as Record<string, number>) ?? {}
  );
  const [headline, setHeadline] = useState(profile?.headline ?? '');
  const [currentFocus, setCurrentFocus] = useState(profile?.current_focus ?? '');
  const [openTo, setOpenTo] = useState<string[]>(profile?.open_to ?? []);
  const [offering, setOffering] = useState<string[]>(profile?.offering ?? []);
  const [seeking, setSeeking] = useState<string[]>(profile?.seeking ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setBio(profile.bio ?? '');
      setCountryCode(profile.country_code ?? null);
      setCity(profile.city ?? '');
      const types = profile.work_types?.length
        ? profile.work_types
        : profile.work_type ? [profile.work_type] : [];
      setWorkTypes(types);
      setSkills(profile.skills ?? []);
      setSkillLevels((profile.skill_levels as Record<string, number>) ?? {});
      setHeadline(profile.headline ?? '');
      setCurrentFocus(profile.current_focus ?? '');
      setOpenTo(profile.open_to ?? []);
      setOffering(profile.offering ?? []);
      setSeeking(profile.seeking ?? []);
    }
  }, [profile]);

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
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

  function toggleWorkType(id: string) {
    setWorkTypes((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
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
          work_type: workTypes[0] ?? null,
          skills,
          // Drop any orphan ratings (skill removed but level still in map).
          skill_levels: Object.fromEntries(
            Object.entries(skillLevels).filter(([k]) => skills.includes(k))
          ),
          headline: headline.trim() || null,
          current_focus: currentFocus.trim() || null,
          open_to: openTo,
          offering,
          seeking,
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

  const initialWorkTypes = profile?.work_types?.length
    ? profile.work_types
    : profile?.work_type ? [profile.work_type] : [];

  const hasChanges =
    displayName !== (profile?.display_name ?? '') ||
    bio !== (profile?.bio ?? '') ||
    countryCode !== (profile?.country_code ?? null) ||
    city !== (profile?.city ?? '') ||
    !arraysEqual(workTypes, initialWorkTypes) ||
    !arraysEqual(skills, profile?.skills ?? []) ||
    JSON.stringify(skillLevels) !== JSON.stringify((profile?.skill_levels as Record<string, number>) ?? {}) ||
    headline !== (profile?.headline ?? '') ||
    currentFocus !== (profile?.current_focus ?? '') ||
    !arraysEqual(openTo, profile?.open_to ?? []) ||
    !arraysEqual(offering, profile?.offering ?? []) ||
    !arraysEqual(seeking, profile?.seeking ?? []);

  return (
    <div className="space-y-5">
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
                <Camera size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={2.25} />
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

          <div>
            <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1.5 flex items-center gap-1.5">
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

          <div>
            <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1.5 flex items-center gap-1.5">
              <Zap size={10} /> Headline <span className="font-normal opacity-60 normal-case tracking-normal">— the one-liner under your name</span>
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value.slice(0, HEADLINE_MAX))}
              placeholder="e.g. Founder building tools for focused work"
              maxLength={HEADLINE_MAX}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-medium placeholder:stitch-text-secondary border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
            <p className="text-[10px] stitch-text-secondary text-right mt-1">{headline.length}/{HEADLINE_MAX}</p>
          </div>

          <div>
            <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1.5 flex items-center gap-1.5">
              <Sparkles size={10} /> Right now <span className="font-normal opacity-60 normal-case tracking-normal">— what you're working on / looking for</span>
            </label>
            <input
              type="text"
              value={currentFocus}
              onChange={(e) => setCurrentFocus(e.target.value.slice(0, CURRENT_FOCUS_MAX))}
              placeholder="e.g. Building GrowDo — looking for a designer to partner with"
              maxLength={CURRENT_FOCUS_MAX}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-medium placeholder:stitch-text-secondary border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
            <p className="text-[10px] stitch-text-secondary text-right mt-1">{currentFocus.length}/{CURRENT_FOCUS_MAX}</p>
          </div>

          <div>
            <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1.5 flex items-center gap-1.5">
              <MapPin size={10} /> Country
            </label>
            <CountryPicker
              value={countryCode}
              onChange={(code) => {
                setCountryCode(code);
                if (code !== countryCode) setCity('');
              }}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1.5 flex items-center gap-1.5">
              <Building2 size={10} /> City <span className="font-normal opacity-60 normal-case tracking-normal">— optional</span>
            </label>
            <CityAutocomplete value={city} onChange={setCity} countryCode={countryCode} />
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
          Pick up to {MAX_WORK_TYPES} that describe you. People can filter by these on /people.
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
          Tools, crafts, languages — anything you bring to the work. Filterable on /people.
        </p>
        <CollapsiblePicker value={skills} addLabel="Add skills">
          <SkillsEditor
            value={skills}
            onChange={setSkills}
            levels={skillLevels as Record<string, 1 | 2 | 3 | 4 | 5>}
            onLevelsChange={(next) => setSkillLevels(next)}
          />
        </CollapsiblePicker>
      </SurfaceCard>

      {/* ── Open to (opportunity signals) ─────────────────── */}
      <SurfaceCard>
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1">
          <span className="flex items-center gap-1.5"><Zap size={10} /> Open to</span>
        </p>
        <p className="text-xs stitch-text-secondary mb-4">
          What are you open to right now? Helps the right people reach out — pick “Just here to focus” to keep it quiet.
        </p>
        <div className="flex flex-wrap gap-2">
          {OPEN_TO_OPTIONS.map((o) => {
            const active = openTo.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setOpenTo((cur) => cur.includes(o.id) ? cur.filter((x) => x !== o.id) : [...cur, o.id])}
                title={o.hint}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.97] ${
                  active ? 'stitch-btn--primary text-white shadow-sm shadow-primary/20' : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                }`}
              >
                <span>{o.emoji}</span>
                {o.label}
              </button>
            );
          })}
        </div>
      </SurfaceCard>

      {/* ── Looking for / Can help with ───────────────────── */}
      <SurfaceCard>
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1">
          <span className="flex items-center gap-1.5"><Sparkles size={10} /> Looking for</span>
        </p>
        <p className="text-xs stitch-text-secondary mb-3">Skills or help you'd love to find in others.</p>
        <CollapsiblePicker value={seeking} addLabel="Add what you're looking for">
          <SkillsEditor value={seeking} onChange={setSeeking} />
        </CollapsiblePicker>

        <div className="h-px bg-surface-container my-5" />

        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1">
          <span className="flex items-center gap-1.5"><Check size={10} /> Can help with</span>
        </p>
        <p className="text-xs stitch-text-secondary mb-3">What you're happy to help others with.</p>
        <CollapsiblePicker value={offering} addLabel="Add what you can help with">
          <SkillsEditor value={offering} onChange={setOffering} />
        </CollapsiblePicker>
      </SurfaceCard>

      {/* ── Work / credits (own body of work) ─────────────── */}
      <SurfaceCard>
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1">
          <span className="flex items-center gap-1.5"><Briefcase size={10} /> Work</span>
        </p>
        <p className="text-xs stitch-text-secondary mb-4">
          Your body of work — past projects and the role you played. Saves on its own as you add each one.
        </p>
        <WorkCreditsEditor />
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
        {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? 'Saved!' : 'Save changes'}
      </button>
    </div>
  );
}

// ── Account tab (privacy + email + sign out) ──────────────────────────────

function AccountTab() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { config, updatePreferences } = useUIPreferences();
  const { state: { projects } } = useCoreData();
  const [signingOut, setSigningOut] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);

  const plannerActiveProjects = projects
    .filter((p) => p.status === 'active')
    .map((p) => ({ id: p.id, name: p.name }));
  const plannerStart = Math.max(0, Math.min(22, profile?.planner_start_hour ?? 7));
  const plannerEnd   = Math.max(plannerStart + 1, Math.min(23, profile?.planner_end_hour ?? 22));

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    navigate('/');
  }

  const THEMES = [
    { id: 'light' as const,    label: 'Light',     Icon: Sun,  disabled: false },
    { id: 'dark' as const,     label: 'Dark',      Icon: Moon, disabled: false },
    { id: 'neon-dark' as const,label: 'Neon Dark', Icon: Zap,  disabled: true  },
  ];

  return (
    <div className="space-y-5">
      {/* ── Appearance ───────────────────────────────────── */}
      <SurfaceCard>
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-3">Appearance</p>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(({ id, label, Icon, disabled }) => {
            const isActive = config.appTheme === id;
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && updatePreferences({ appTheme: id })}
                title={disabled ? 'Coming soon' : label}
                className={`relative flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-xs font-semibold transition-all ${
                  disabled
                    ? 'opacity-40 cursor-not-allowed bg-surface-container-low stitch-text-secondary'
                    : isActive
                    ? 'bg-primary text-white shadow-sm shadow-primary/25'
                    : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container active:scale-[0.97]'
                }`}
              >
                <Icon size={16} />
                {label}
                {isActive && !disabled && (
                  <span className="absolute top-1.5 right-1.5">
                    <Check size={10} strokeWidth={3} />
                  </span>
                )}
                {disabled && (
                  <span className="absolute top-1 right-1 text-[8px] font-bold opacity-60 tracking-tight">soon</span>
                )}
              </button>
            );
          })}
        </div>
      </SurfaceCard>

      {/* ── Planner & calendar ───────────────────────────── */}
      <SurfaceCard>
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-3">Planner & calendar</p>
        <button
          type="button"
          onClick={() => setShowPlanner(true)}
          className="w-full flex items-center justify-between gap-3 rounded-xl bg-surface-container-low ring-1 ring-surface-container px-3 py-3 text-left hover:bg-surface-container active:scale-[0.99] transition-all"
        >
          <div className="min-w-0">
            <p className="text-sm font-bold stitch-text-primary">Day window & templates</p>
            <p className="text-[11px] stitch-text-secondary mt-0.5">
              Showing <span className="font-semibold tabular-nums">{fmtHour(plannerStart)}–{fmtHour(plannerEnd)}</span> on every calendar · manage weekly templates
            </p>
          </div>
          <SettingsIcon size={16} className="shrink-0 text-violet-600" />
        </button>
      </SurfaceCard>

      <SurfaceCard>
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-3">Directory privacy</p>
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
        <p className="text-[11px] stitch-text-secondary mt-3 leading-relaxed">
          To change who can <span className="font-semibold">DM you</span> (Everyone / Connections / Off), use the toggle in the avatar menu.
        </p>
      </SurfaceCard>

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

      {/* ── Your data (GDPR) ─────────────────────────────── */}
      <DataRightsCard />

      {showPlanner && (
        <PlannerSettingsSheet
          projects={plannerActiveProjects}
          onApplied={() => {}}
          onClose={() => setShowPlanner(false)}
        />
      )}
    </div>
  );
}

// ── Your data: export (Art. 20) + delete account (Art. 17) ────────────────

function DataRightsCard() {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    setExportMsg(null);
    try {
      const { skipped } = await exportMyData();
      setExportMsg(
        skipped.length > 0
          ? `Download started. (${skipped.length} section${skipped.length === 1 ? '' : 's'} unavailable — email privacy@sharedminds.app for the rest.)`
          : 'Download started — check your downloads folder.',
      );
    } catch (e: any) {
      setExportMsg(e?.message ?? 'Export failed. Please email privacy@sharedminds.app.');
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (deleting || deleteText !== 'DELETE') return;
    setDeleting(true);
    setDeleteError(null);
    const res = await deleteMyAccount();
    if (res.ok) {
      // Account + session are gone — bounce to the marketing/home root.
      navigate('/');
    } else {
      setDeleteError(res.error ?? 'Deletion failed. Please email privacy@sharedminds.app.');
      setDeleting(false);
    }
  }

  return (
    <SurfaceCard>
      <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-3">Your data</p>

      {/* Export */}
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container-low hover:bg-surface-container stitch-text-primary text-sm font-semibold transition-all active:scale-[0.98]"
      >
        {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        {exporting ? 'Preparing your data…' : 'Download my data'}
      </button>
      <p className="text-[11px] stitch-text-secondary mt-2 leading-relaxed">
        Exports your profile, sessions, tasks, projects, messages and more as a JSON file (GDPR data portability).
      </p>
      {exportMsg && (
        <p className="text-[11px] font-semibold text-primary mt-2">{exportMsg}</p>
      )}

      {/* Delete account */}
      <div className="mt-5 pt-4 border-t border-red-200/60">
        <p className="text-[10px] font-bold text-red-600 tracking-widest uppercase mb-2">Danger zone</p>
        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => { setConfirmingDelete(true); setDeleteError(null); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-sm font-semibold transition-all active:scale-[0.98]"
          >
            <Trash2 size={15} />
            Delete my account
          </button>
        ) : (
          <div className="rounded-xl bg-red-50 ring-1 ring-red-200 p-4">
            <p className="text-sm font-bold text-red-700 mb-1">This is permanent.</p>
            <p className="text-[12px] text-red-700/90 leading-relaxed mb-3">
              Your profile, sessions, tasks, projects, messages and connections will be permanently deleted. This cannot be undone. Type <span className="font-mono font-bold">DELETE</span> to confirm.
            </p>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              disabled={deleting}
              className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-mono text-red-900 placeholder:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-400 mb-3"
            />
            {deleteError && (
              <p className="text-[12px] font-semibold text-red-700 mb-3">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setConfirmingDelete(false); setDeleteText(''); setDeleteError(null); }}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-white ring-1 ring-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || deleteText !== 'DELETE'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all active:scale-[0.98] disabled:bg-red-300 disabled:cursor-not-allowed"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}

// ── PrivacyToggle (lifted from old SettingsPage) ──────────────────────────

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
    setLocal(next);
    setSaving(true);
    try {
      await onChange(next);
    } catch {
      setLocal(!next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
        local ? 'bg-amber-50 ring-1 ring-amber-200/60' : 'bg-surface-container-low hover:bg-surface-container'
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
      <div className={`w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 ${local ? 'bg-amber-500' : 'bg-surface-container'}`}>
        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${local ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
    </button>
  );
}

// ── ChannelToggle ──────────────────────────────────────────────────────────
//
// Single pill button that represents one channel (in-app or email) for a
// notification category. Off-state shows the channel label in muted text;
// on-state fills with the channel's accent colour. Disabled (channel
// not applicable to this category) renders as a dim placeholder so the
// layout column stays aligned across rows.

function ChannelToggle({
  channel, value, onClick, ariaLabel,
}: {
  channel: 'inapp' | 'email';
  value: boolean | null;
  onClick: () => void;
  ariaLabel: string;
}) {
  // Channel not applicable → render an empty placeholder slot of the
  // same width so the In-app/Email columns line up across rows.
  if (value === null) {
    return <div className="w-[58px] h-7 shrink-0" aria-hidden />;
  }
  const label = channel === 'inapp' ? 'App' : 'Email';
  const onColor = channel === 'inapp'
    ? 'bg-primary text-white ring-primary/30'
    : 'bg-blue-500 text-white ring-blue-300/40';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={value}
      className={`shrink-0 w-[58px] h-7 inline-flex items-center justify-center gap-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ring-1 transition-all active:scale-95 ${
        value
          ? `${onColor} shadow-sm`
          : 'bg-surface-container-low stitch-text-secondary ring-surface-container/60 hover:bg-surface-container'
      }`}
    >
      {value && <Check size={10} strokeWidth={3} />}
      {label}
    </button>
  );
}

// ── TimePicker ─────────────────────────────────────────────────────────────
//
// Thin wrapper around <input type="time"> with a label. Used for quiet
// hours. The browser shows a native picker on mobile (iOS scroll wheel,
// Android dialog) and a typeable HH:MM field on desktop.
//
// Postgres `time` columns serialize as "HH:MM:SS"; the input wants
// "HH:MM" — we slice/pad in the value props below.

function TimePicker({
  label, value, onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const hhmm = (value || '00:00:00').slice(0, 5);
  return (
    <label className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white ring-1 ring-amber-200/60">
      <span className="text-[10px] font-bold text-amber-900/70 uppercase tracking-wider">{label}</span>
      <input
        type="time"
        value={hhmm}
        onChange={(e) => onChange(e.target.value + ':00')}
        className="flex-1 text-sm font-bold text-amber-900 bg-transparent outline-none tabular-nums"
      />
    </label>
  );
}

// ── SessionSfxRow ──────────────────────────────────────────────────────────
//
// Toggle for the session sound effects (join chime, leave, phase
// transition, knock) introduced with the open-to-match flow. The state
// lives in localStorage via sessionSounds.ts because audio prefs are
// inherently per-device — what the user wants on their phone might
// differ from desktop. A "Preview" button auditions the four sounds in
// sequence so users can decide before disabling.

function SessionSfxRow() {
  const [enabled, setEnabledLocal] = useState<boolean>(() => getSessionSfxEnabled());

  function handleToggle() {
    const next = !enabled;
    setEnabledLocal(next);
    setSessionSfxEnabled(next);
  }

  function handlePreview(e: React.MouseEvent) {
    e.stopPropagation();
    previewAllSounds();
  }

  return (
    <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container-low transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold stitch-text-primary leading-tight">
          Session sound effects
        </p>
        <p className="text-[11px] stitch-text-secondary leading-snug mt-0.5">
          Subtle chimes for join, leave, and phase transitions in matched sessions.
        </p>
      </div>
      <button
        type="button"
        onClick={handlePreview}
        disabled={!enabled}
        title="Preview all four sounds"
        className="shrink-0 text-[10px] font-bold uppercase tracking-wider stitch-text-secondary hover:stitch-text-primary px-2 py-1 rounded-md hover:bg-surface-container transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
      >
        Preview
      </button>
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={enabled}
        aria-label="Toggle session sound effects"
        className={`shrink-0 w-10 h-6 rounded-full p-0.5 transition-colors ${enabled ? 'bg-primary' : 'bg-surface-container'}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

// ── PushNotificationRow ────────────────────────────────────────────────────

function PushNotificationRow() {
  const supported = isPushSupported();
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    supported ? getPushPermission() : 'denied',
  );
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    isSubscribed().then(setSubscribed);
  }, [supported]);

  async function handleEnable() {
    setBusy(true);
    const ok = await subscribeToPush();
    setSubscribed(ok);
    setPermission(getPushPermission());
    setBusy(false);
  }

  async function handleDisable() {
    setBusy(true);
    await unsubscribeFromPush();
    setSubscribed(false);
    setBusy(false);
  }

  if (!supported) return null;

  return (
    <div className="px-3 py-2.5 flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
        <Smartphone size={15} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold stitch-text-primary leading-tight">Push notifications</p>
        <p className="text-[11px] stitch-text-secondary leading-snug mt-0.5">
          {permission === 'denied'
            ? 'Blocked in browser settings — enable in your browser to use push'
            : subscribed
            ? 'You\'ll get push alerts on this device even when the app isn\'t open'
            : 'Get alerts on this device even when the app isn\'t open'}
        </p>
      </div>
      {permission !== 'denied' && (
        <button
          type="button"
          disabled={busy}
          onClick={subscribed ? handleDisable : handleEnable}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${
            subscribed
              ? 'bg-surface-container stitch-text-secondary hover:bg-surface-container-high'
              : 'stitch-btn--primary text-white'
          }`}
        >
          {busy ? '…' : subscribed ? 'Disable' : 'Enable'}
        </button>
      )}
    </div>
  );
}

// ── NotificationPreferencesPanel (lifted from old SettingsPage) ───────────

function NotificationPreferencesPanel() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  function load() {
    setLoading(true);
    setLoadError(false);
    getPreferences().then((p) => {
      setPrefs(p);
      setLoading(false);
      if (!p) setLoadError(true);
    }).catch(() => {
      setLoading(false);
      setLoadError(true);
    });
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // One-tap opt-out of every non-essential email category. Essential
  // mail (password reset, email confirmation, account/security) is
  // transactional and isn't governed by these flags, so it keeps
  // sending regardless — that's by design and legally fine.
  const ALL_EMAIL_KEYS: (keyof NotificationPreferences)[] = [
    'email_session_reminders', 'email_messages', 'email_post_replies',
    'email_connection_requests', 'email_weekly_review', 'email_onboarding',
    'email_community_sessions', 'email_marketing',
  ];
  async function turnOffAllOptionalEmail() {
    if (!prefs) return;
    const patch = Object.fromEntries(ALL_EMAIL_KEYS.map((k) => [k, false])) as Partial<NotificationPreferences>;
    const prev = prefs;
    setPrefs({ ...prefs, ...patch });
    try {
      await updatePreferences(patch);
    } catch {
      setPrefs(prev);
    }
  }
  const anyOptionalEmailOn = !!prefs && ALL_EMAIL_KEYS.some((k) => !!prefs[k]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={16} className="animate-spin stitch-text-secondary" />
      </div>
    );
  }

  if (loadError || (!loading && !prefs)) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="text-xs stitch-text-secondary">Couldn't load notification preferences.</p>
        <button
          type="button"
          onClick={load}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  /** Each row groups one notification CATEGORY (not one type — types
   *  are too granular for a settings UI). Each category may surface
   *  an in-app toggle, an email toggle, or both. `optIn=true` marks
   *  categories that default to OFF — the row gets a "opt-in" pill so
   *  users understand why their default is off.
   *
   *  In-app keys map 1:1 to the `inapp_*` columns added in migration
   *  20260527000018. Email keys reuse the legacy `email_*` columns;
   *  categories whose notifications don't make sense as email (drop-in
   *  pings, habit nudges, partner-joined moments) have no email key. */
  const rows: {
    label: string;
    help: string;
    inappKey: keyof typeof prefs | null;
    emailKey: keyof typeof prefs | null;
    optIn?: boolean;
  }[] = [
    {
      label: 'Session reminders',
      help: 'Before booked sessions: 24h, 5 min, and "starts now"',
      inappKey: 'inapp_session_reminders',
      emailKey: 'email_session_reminders',
    },
    {
      label: 'Session activity',
      help: 'When a partner joins, leaves, or a session ends',
      inappKey: 'inapp_session_activity',
      emailKey: null,
    },
    {
      label: 'Drop-in opportunities',
      help: 'Ping me when someone opens a session for drop-ins',
      inappKey: 'inapp_drop_in_opportunities',
      emailKey: null,
      optIn: true,
    },
    {
      label: 'Habit nudges',
      help: 'Streak-at-risk, first session of day, stuck-task pings',
      inappKey: 'inapp_habit_nudges',
      emailKey: null,
      optIn: true,
    },
    {
      label: 'Direct messages',
      help: 'When someone sends you a DM',
      inappKey: 'inapp_messages',
      emailKey: 'email_messages',
    },
    {
      label: 'Community activity',
      help: 'Replies + reactions on your community posts',
      inappKey: 'inapp_community',
      emailKey: 'email_post_replies',
    },
    {
      label: 'Social',
      help: 'Connection requests, project invites, offers of help',
      inappKey: 'inapp_social',
      emailKey: 'email_connection_requests',
    },
    {
      label: 'Weekly review prompt',
      help: 'Sunday evening nudge to reflect on your week',
      inappKey: 'inapp_weekly_review',
      emailKey: 'email_weekly_review',
    },
    {
      label: 'Onboarding tips',
      help: 'First-week guidance — auto-stops after 7 days',
      inappKey: 'inapp_onboarding',
      emailKey: 'email_onboarding',
    },
    {
      label: 'Product updates',
      help: 'New features + occasional tips',
      inappKey: 'inapp_marketing',
      emailKey: 'email_marketing',
      optIn: true,
    },
  ];

  return (
    <div className="space-y-1">
      {/* Per-device settings — push notifications + session SFX. Both
          live in localStorage / browser-specific state rather than the
          notification_preferences row, so they're explicitly labelled
          "This device" to avoid the "I turned this on in Chrome but my
          phone is still silent" confusion. */}
      <div className="mb-3 pb-3 border-b border-surface-container/50 space-y-1">
        <p className="text-[11px] stitch-text-secondary mb-1 px-3 leading-relaxed">This device:</p>
        <PushNotificationRow />
        <SessionSfxRow />
      </div>

      {/* ── Per-category matrix ──
          Each row: label + help on the left, two pill-style toggles
          (In-app / Email) on the right. Rows for categories without an
          email channel show the In-app pill only. */}
      <div className="flex items-center justify-between mb-2 px-3">
        <p className="text-[11px] font-semibold stitch-text-secondary uppercase tracking-wider">
          Notify me about
        </p>
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-[10px] font-bold stitch-text-secondary uppercase tracking-wider w-[58px] text-center">In-app</span>
          <span className="text-[10px] font-bold stitch-text-secondary uppercase tracking-wider w-[58px] text-center">Email</span>
        </div>
      </div>
      {rows.map((row) => {
        const inappValue = row.inappKey ? !!prefs[row.inappKey] : null;
        const emailValue = row.emailKey ? !!prefs[row.emailKey] : null;
        return (
          <div
            key={row.label}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container-low transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold stitch-text-primary leading-tight flex items-center gap-1.5">
                {row.label}
                {row.optIn && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    Opt-in
                  </span>
                )}
              </p>
              <p className="text-[11px] stitch-text-secondary leading-snug mt-0.5">{row.help}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <ChannelToggle
                ariaLabel={`In-app notifications for ${row.label}`}
                channel="inapp"
                value={inappValue}
                onClick={() => row.inappKey && toggle(row.inappKey as any)}
              />
              <ChannelToggle
                ariaLabel={`Email notifications for ${row.label}`}
                channel="email"
                value={emailValue}
                onClick={() => row.emailKey && toggle(row.emailKey as any)}
              />
            </div>
          </div>
        );
      })}

      {/* ── Quiet hours — only relevant for habit nudges. Shown when
            inapp_habit_nudges is on (otherwise irrelevant). UTC clock
            stored server-side; UI converts to the browser's local
            timezone via the time input element. */}
      {prefs.inapp_habit_nudges && (
        <div className="mt-3 ml-3 mr-3 px-3.5 py-3 rounded-xl bg-amber-50/60 ring-1 ring-amber-100/80">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-900 leading-tight">Quiet hours for habit nudges</p>
              <p className="text-[11px] text-amber-700/80 leading-snug mt-0.5">
                Suppress streak / pattern pings during this window. Other notifications still fire.
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggle('quiet_hours_enabled' as any)}
              aria-label="Toggle quiet hours"
              className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                prefs.quiet_hours_enabled ? 'bg-amber-500' : 'bg-amber-200'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                prefs.quiet_hours_enabled ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>
          {prefs.quiet_hours_enabled && (
            <div className="mt-3 flex items-center gap-2">
              <TimePicker
                label="From"
                value={prefs.quiet_hours_start}
                onChange={async (v) => {
                  setPrefs({ ...prefs, quiet_hours_start: v });
                  await updatePreferences({ quiet_hours_start: v }).catch(() => load());
                }}
              />
              <TimePicker
                label="To"
                value={prefs.quiet_hours_end}
                onChange={async (v) => {
                  setPrefs({ ...prefs, quiet_hours_end: v });
                  await updatePreferences({ quiet_hours_end: v }).catch(() => load());
                }}
              />
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-surface-container/50">
        <p className="text-[11px] stitch-text-secondary mb-2 leading-relaxed">Email delivery:</p>
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

      {/* ── One-tap opt-out + essential-email explainer ── */}
      <div className="mt-4 pt-4 border-t border-surface-container/50 px-3">
        <button
          type="button"
          onClick={turnOffAllOptionalEmail}
          disabled={!anyOptionalEmailOn}
          className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container stitch-text-primary text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {anyOptionalEmailOn ? 'Turn off all optional emails' : 'All optional emails are off'}
        </button>
        <p className="text-[11px] stitch-text-secondary mt-2.5 leading-relaxed">
          You'll still receive <span className="font-semibold stitch-text-primary">essential account emails</span> — sign-in
          confirmation, password resets, security alerts and account-deletion confirmations. These are required to run
          your account and can't be turned off. Every other email also has a one-click unsubscribe link in its footer.
        </p>
      </div>
    </div>
  );
}
