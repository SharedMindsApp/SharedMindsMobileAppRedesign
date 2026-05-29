import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2, Flame, Check, Clock, MapPin, Sparkles, Camera,
  MessageCircle, Trophy, Users, Calendar, Timer, ArrowRight, Rocket, Plus,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { ConnectButton } from '../connections/ConnectButton';
import { getOrCreateDm, DmPrivacyError } from '../../services/MessageService';
import { useMessagingDock } from '../messages/MessagingDockContext';
import { SurfaceCard } from '../../ui/CorePage';
import { Avatar } from '../../ui/Avatar';
import { findCountry, formatLocation } from '../../../lib/countries';
import { findSkillCategory } from '../../../lib/skills';
import { openToMeta } from '../../../lib/openTo';
import { WorkCreditsSection } from './WorkCredits';
import { WorkingOnSection } from './BuildingProjects';
import { fetchConnections, type ConnectionWithProfile } from '../../services/ConnectionService';

const WORK_TYPE_META: Record<string, { label: string; emoji: string }> = {
  designer:   { label: 'Designer',            emoji: '🎨' },
  developer:  { label: 'Developer',           emoji: '💻' },
  writer:     { label: 'Writer / Creator',    emoji: '✍️' },
  founder:    { label: 'Founder',             emoji: '🚀' },
  filmmaker:  { label: 'Filmmaker / Producer', emoji: '🎬' },
  marketer:   { label: 'Marketer',            emoji: '📣' },
  consultant: { label: 'Consultant',          emoji: '🎯' },
  researcher: { label: 'Researcher',          emoji: '🔬' },
  other:      { label: 'Something else',      emoji: '✨' },
};

function getWorkTypes(p: { work_types?: string[] | null; work_type?: string | null }): string[] {
  if (p.work_types && p.work_types.length > 0) return p.work_types;
  if (p.work_type) return [p.work_type];
  return [];
}
import {
  fetchPublicProfile,
  fetchProfileStats,
  fetchRecentShips,
  uploadAvatar,
  AvatarRejectedError,
  type PublicProfile,
  type ProfileStats,
  type RecentShip,
} from '../../services/ProfileService';

const AVATAR_COLORS = [
  ['bg-violet-100 text-violet-700', 'bg-violet-500'],
  ['bg-blue-100 text-blue-700', 'bg-blue-500'],
  ['bg-emerald-100 text-emerald-700', 'bg-emerald-500'],
  ['bg-amber-100 text-amber-700', 'bg-amber-500'],
  ['bg-rose-100 text-rose-700', 'bg-rose-500'],
  ['bg-indigo-100 text-indigo-700', 'bg-indigo-500'],
];

function avatarClasses(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function formatTimeAgo(iso: string | null): string {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const OUTCOME_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  finished: { label: 'Finished', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  partially: { label: 'Partial', bg: 'bg-amber-100', text: 'text-amber-700' },
  something_came_up: { label: 'Interrupted', bg: 'bg-slate-100', text: 'text-slate-500' },
};

function StatPill({ value, label, emoji }: { value: string | number; label: string; emoji?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center py-3 px-2">
      <div className="flex items-baseline gap-1">
        {emoji && <span className="text-sm leading-none">{emoji}</span>}
        <p className="text-xl font-extrabold stitch-text-primary tabular-nums">{value}</p>
      </div>
      <p className="text-[10px] font-semibold stitch-text-secondary text-center leading-tight mt-0.5">{label}</p>
    </div>
  );
}

function MiniStat({ icon: Icon, value, label }: { icon: React.ComponentType<{ size?: number; className?: string }>; value: string | number; label: string }) {
  return (
    <div className="flex-1 flex items-center gap-2 px-2 py-2">
      <Icon size={14} className="stitch-text-secondary shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-bold stitch-text-primary tabular-nums leading-tight truncate">{value}</p>
        <p className="text-[10px] font-semibold stitch-text-secondary leading-tight truncate">{label}</p>
      </div>
    </div>
  );
}

function formatHours(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatWeekStart(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function ShipCard({ ship }: { ship: RecentShip }) {
  const outcome = ship.session_outcome ? OUTCOME_CONFIG[ship.session_outcome] : null;
  const endedAt = ship.ended_at ?? ship.end_time;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-surface-container last:border-0">
      <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
        <Check size={13} className="text-emerald-600" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold stitch-text-primary leading-snug line-clamp-2">
          {ship.session_goal ?? ship.session_title ?? 'Worked on something'}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {outcome && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${outcome.bg} ${outcome.text}`}>
              {outcome.label}
            </span>
          )}
          {ship.intended_duration_minutes && (
            <span className="text-[10px] stitch-text-secondary flex items-center gap-0.5">
              <Clock size={9} /> {ship.intended_duration_minutes}m
            </span>
          )}
          {endedAt && (
            <span className="text-[10px] stitch-text-secondary ml-auto">{formatTimeAgo(endedAt)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProfilePage({ onEdit, onSetup }: { onEdit?: () => void; onSetup?: () => void } = {}) {
  const { userId } = useParams<{ userId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const targetId = userId ?? user?.id ?? '';
  const isOwn = !userId || userId === user?.id;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [ships, setShips] = useState<RecentShip[]>([]);
  const [connections, setConnections] = useState<ConnectionWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so same file can be re-picked after error
    if (!file) return;
    setAvatarError(null);
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file);
      setProfile((p) => (p ? { ...p, avatar_url: url } : p));
    } catch (err) {
      if (err instanceof AvatarRejectedError) {
        setAvatarError('Image was rejected by moderation. Please pick a different photo.');
      } else if (err instanceof Error) {
        setAvatarError(err.message);
      } else {
        setAvatarError('Upload failed.');
      }
      // Auto-clear error after 6s
      setTimeout(() => setAvatarError(null), 6000);
    } finally {
      setUploadingAvatar(false);
    }
  }

  useEffect(() => {
    if (!targetId) return;
    Promise.all([
      fetchPublicProfile(targetId),
      fetchProfileStats(targetId),
      fetchRecentShips(targetId),
      // Connections preview is own-view-only — the service uses auth.getUser()
      // so it'd just return [] for a public-view caller anyway.
      isOwn ? fetchConnections() : Promise.resolve([] as ConnectionWithProfile[]),
    ]).then(([p, s, sh, conns]) => {
      setProfile(p);
      setStats(s);
      setShips(sh);
      setConnections(conns);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [targetId, isOwn]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin stitch-text-secondary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center text-center py-16 px-6">
        <p className="text-base font-bold stitch-text-primary mb-2">Profile not found</p>
        <button type="button" onClick={() => navigate(-1)} className="text-sm stitch-text-secondary">
          ← Go back
        </button>
      </div>
    );
  }

  const [avatarBg] = avatarClasses(profile.display_name);

  const locationLabel = formatLocation(profile.country_code, profile.city) || profile.location;
  const country = findCountry(profile.country_code);
  const workTypes = getWorkTypes(profile);

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* ── Hero ───────────────────────────────────────────── */}
      <div className="rounded-3xl overflow-hidden ring-1 ring-surface-container bg-surface">
        {/* Cover */}
        <div className="h-24 bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500" />
        <div className="px-5 pb-5">
          <div className="-mt-12 flex items-end justify-between gap-3">
            {/* Avatar (overlaps the cover) */}
            {isOwn ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="relative w-24 h-24 rounded-3xl shrink-0 overflow-hidden group ring-4 ring-surface focus:outline-none transition-all"
                aria-label="Change profile photo"
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full ${avatarBg} flex items-center justify-center text-3xl font-extrabold`}>
                    {profile.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  {uploadingAvatar
                    ? <Loader2 size={22} className="animate-spin text-white" />
                    : <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={2.25} />}
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarFile} className="hidden" />
              </button>
            ) : profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name} className="w-24 h-24 rounded-3xl object-cover shrink-0 ring-4 ring-surface" />
            ) : (
              <div className={`w-24 h-24 rounded-3xl ring-4 ring-surface ${avatarBg} flex items-center justify-center shrink-0 text-3xl font-extrabold`}>
                {profile.display_name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* CTAs (public view), aligned to the avatar's baseline */}
            {!isOwn && (
              <div className="flex items-center gap-2 pb-1">
                <ConnectButton otherUserId={profile.id} />
                <MessageButton otherUserId={profile.id} />
              </div>
            )}
          </div>

          {/* Identity */}
          <div className="mt-3">
            <h1 className="stitch-headline text-2xl font-extrabold tracking-tight leading-tight">{profile.display_name}</h1>
            {profile.headline ? (
              <p className="text-sm font-semibold stitch-text-primary/90 leading-snug mt-1">{profile.headline}</p>
            ) : isOwn && onEdit ? (
              <button onClick={onEdit} className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-primary/80 hover:text-primary transition-colors">
                <Plus size={12} /> Add a headline — one line that makes people curious
              </button>
            ) : null}

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs stitch-text-secondary">
              {locationLabel && (
                <span className="inline-flex items-center gap-1">
                  {country ? <span className="text-sm leading-none">{country.flag}</span> : <MapPin size={11} />}
                  {locationLabel}
                </span>
              )}
              <span className="opacity-70">Member since {formatMemberSince(profile.created_at)}</span>
            </div>

            {workTypes.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {workTypes.map((t) => {
                  const meta = WORK_TYPE_META[t] ?? { label: t, emoji: '✨' };
                  return (
                    <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                      <span className="text-xs leading-none">{meta.emoji}</span>{meta.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Avatar upload feedback ─────────────────────────── */}
      {avatarError && (
        <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3.5 py-2.5 leading-relaxed">
          {avatarError}
        </p>
      )}

      {/* ── Complete-your-profile prompt (own, sparse) ─────── */}
      {isOwn && onSetup && (() => {
        const missing = !profile.headline || !profile.current_focus || (profile.open_to?.length ?? 0) === 0 || (profile.skills?.length ?? 0) === 0;
        if (!missing) return null;
        return (
          <button
            type="button"
            onClick={onSetup}
            className="w-full text-left rounded-2xl bg-gradient-to-r from-violet-600 to-blue-500 text-white px-4 py-3 flex items-center gap-3 active:scale-[0.99] transition-transform"
          >
            <Sparkles size={18} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight">Finish your profile</p>
              <p className="text-[11px] text-white/80 leading-snug">A complete profile is how people find you and reach out.</p>
            </div>
            <ArrowRight size={16} className="shrink-0" />
          </button>
        );
      })()}

      {/* ── Bio ────────────────────────────────────────────── */}
      {profile.bio ? (
        <p className="text-sm stitch-text-secondary leading-relaxed px-1">{profile.bio}</p>
      ) : isOwn && onEdit ? (
        <button onClick={onEdit} className="inline-flex items-center gap-1.5 px-1 text-xs font-semibold stitch-text-secondary hover:text-primary transition-colors">
          <Plus size={12} /> Add a short bio
        </button>
      ) : null}

      {/* ── Right now (current focus) ──────────────────────── */}
      {profile.current_focus ? (
        <div className="rounded-2xl bg-gradient-to-r from-violet-50 to-blue-50 ring-1 ring-violet-200/50 px-4 py-3">
          <p className="text-[10px] font-bold tracking-widest uppercase text-violet-700 mb-1 flex items-center gap-1.5">
            <Rocket size={11} /> Right now
          </p>
          <p className="text-sm font-semibold stitch-text-primary leading-snug">{profile.current_focus}</p>
        </div>
      ) : isOwn && onEdit ? (
        <button onClick={onEdit} className="w-full text-left rounded-2xl border border-dashed border-violet-200 px-4 py-3 hover:bg-violet-50/50 transition-colors">
          <p className="text-[10px] font-bold tracking-widest uppercase text-violet-700/70 mb-1 flex items-center gap-1.5"><Rocket size={11} /> Right now</p>
          <p className="text-xs stitch-text-secondary">+ Say what you're working on — people reach out about what you're building.</p>
        </button>
      ) : null}

      {/* ── Open to (opportunity signals) ──────────────────── */}
      {profile.open_to && profile.open_to.length > 0 ? (
        <section>
          <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">Open to</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.open_to.map((id) => {
              const o = openToMeta(id);
              return (
                <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 text-xs font-bold">
                  <span className="text-[11px] leading-none">{o.emoji}</span>
                  {o.label}
                </span>
              );
            })}
          </div>
        </section>
      ) : isOwn && onEdit ? (
        <button onClick={onEdit} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700/80 hover:text-emerald-700 transition-colors">
          <Plus size={12} /> Add what you're open to — let the right people know they can reach out
        </button>
      ) : null}

      {/* ── Looking for / Can help with (the get & the give) ── */}
      {((profile.seeking?.length ?? 0) > 0 || (profile.offering?.length ?? 0) > 0) && (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(profile.seeking?.length ?? 0) > 0 && (
            <div>
              <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">🔍 Looking for</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.seeking!.map((s) => (
                  <span key={s} className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-container-low stitch-text-primary text-xs font-semibold">{s}</span>
                ))}
              </div>
            </div>
          )}
          {(profile.offering?.length ?? 0) > 0 && (
            <div>
              <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">🤝 Can help with</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.offering!.map((s) => (
                  <span key={s} className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-container-low stitch-text-primary text-xs font-semibold">{s}</span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Working on (featured projects, typed) ──────────── */}
      <WorkingOnSection userId={targetId} isOwn={isOwn} />

      {/* ── Skills ─────────────────────────────────────────── */}
      {profile.skills && profile.skills.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            <Sparkles size={13} className="stitch-text-secondary" />
            <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
              Skills
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => {
              const cat = findSkillCategory(skill);
              const level = profile.skill_levels?.[skill];
              return (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low stitch-text-primary text-xs font-semibold"
                >
                  {cat && <span className="text-[11px] leading-none">{cat.emoji}</span>}
                  {skill}
                  {typeof level === 'number' && level > 0 && (
                    <span className="ml-1 inline-flex gap-0.5" aria-label={`Level ${level} of 5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className={`w-1 h-1 rounded-full ${n <= level ? 'bg-primary' : 'bg-surface-container-high'}`} />
                      ))}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Work (credits / body of work) ──────────────────── */}
      <WorkCreditsSection userId={targetId} />

      {/* Profile = identity only. Stats, streaks, activity, and the
          "Start a session" empty state previously lived here — they've
          moved to Home → Stats and the dashboard surfaces. The Profile
          page is now a single-purpose identity card: who you are, what
          you do, what you're looking for. Activity belongs to Home. */}

      {/* ── Connections preview (own view only, hides at 0) ─ */}
      {isOwn && connections.length > 0 && (
        <ConnectionsPreview
          connections={connections}
          onAllClick={() => navigate('/connections')}
        />
      )}
    </div>
  );
}

// ── Profile completion card ─────────────────────────────────────────────

const COMPLETION_FIELDS: { key: string; label: string; test: (p: PublicProfile, n: number) => boolean }[] = [
  { key: 'avatar',     label: 'Add a profile photo',  test: (p) => !!p.avatar_url },
  { key: 'bio',        label: 'Write a short bio',    test: (p) => !!p.bio && p.bio.length >= 10 },
  { key: 'location',   label: 'Set your location',    test: (p) => !!p.country_code },
  { key: 'work_types', label: 'Pick what you do',     test: (p) => (p.work_types?.length ?? 0) > 0 || !!p.work_type },
  { key: 'skills',     label: 'Add a few skills',     test: (p) => (p.skills?.length ?? 0) >= 3 },
  { key: 'session',    label: 'Finish one session',   test: (_p, n) => n > 0 },
];

function ProfileCompletionCard({
  profile, totalSessions, onJump,
}: {
  profile: PublicProfile;
  totalSessions: number;
  onJump: () => void;
}) {
  const items = COMPLETION_FIELDS.map((f) => ({ ...f, done: f.test(profile, totalSessions) }));
  const completed = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = Math.round((completed / total) * 100);

  // Hide once everything is checked — no nag.
  if (completed === total) return null;

  return (
    <SurfaceCard>
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <p className="text-[11px] font-bold stitch-text-primary leading-tight">
            Profile {pct}% complete
          </p>
          <p className="text-[10px] stitch-text-secondary mt-0.5">
            A finished profile helps people find their match.
          </p>
        </div>
        <button
          type="button"
          onClick={onJump}
          className="text-[10px] font-bold text-primary hover:underline shrink-0"
        >
          Edit →
        </button>
      </div>
      {/* Soft progress bar */}
      <div className="h-1.5 w-full rounded-full bg-surface-container overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-violet-400 to-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Inline checklist */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={onJump}
            disabled={item.done}
            className={`flex items-center gap-2 text-left text-[11px] ${
              item.done ? 'stitch-text-secondary opacity-60 cursor-default' : 'stitch-text-primary hover:text-primary'
            } transition-colors`}
          >
            <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
              item.done ? 'bg-emerald-500 border-emerald-500' : 'border-surface-container-high'
            }`}>
              {item.done && <Check size={9} className="text-white" strokeWidth={3} />}
            </span>
            <span className={item.done ? 'line-through' : ''}>{item.label}</span>
          </button>
        ))}
      </div>
    </SurfaceCard>
  );
}

// ── Connections preview ─────────────────────────────────────────────────

function ConnectionsPreview({
  connections, onAllClick,
}: {
  connections: ConnectionWithProfile[];
  onAllClick: () => void;
}) {
  const navigate = useNavigate();
  const visible = connections.slice(0, 6);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users size={13} className="stitch-text-secondary" />
          <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
            Connections · {connections.length}
          </p>
        </div>
        <button
          type="button"
          onClick={onAllClick}
          className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
        >
          See all <ArrowRight size={9} />
        </button>
      </div>
      <SurfaceCard>
        <div className="flex flex-wrap gap-3">
          {visible.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => navigate(`/profile/${c.other_user_id}`)}
              className="flex flex-col items-center gap-1.5 w-14 hover:opacity-80 transition-opacity"
              title={c.display_name}
            >
              <Avatar
                displayName={c.display_name}
                avatarUrl={c.avatar_url}
                size="md"
              />
              <p className="text-[10px] font-semibold stitch-text-primary truncate max-w-full text-center">
                {c.display_name.split(' ')[0]}
              </p>
            </button>
          ))}
          {connections.length > visible.length && (
            <button
              type="button"
              onClick={onAllClick}
              className="flex flex-col items-center justify-center gap-1.5 w-14 h-[60px] rounded-2xl bg-surface-container-low stitch-text-secondary hover:bg-surface-container transition-colors"
            >
              <span className="text-xs font-bold">+{connections.length - visible.length}</span>
              <p className="text-[10px] font-semibold">more</p>
            </button>
          )}
        </div>
      </SurfaceCard>
    </section>
  );
}

// ── Activity highlights ─────────────────────────────────────────────────

function ActivityHighlights({ stats }: { stats: ProfileStats }) {
  const cells: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string }[] = [];

  if (stats.bestDayOfWeek) {
    cells.push({ icon: Calendar, label: 'Best day', value: stats.bestDayOfWeek });
  }
  if (stats.bestWeekCount >= 2) {
    cells.push({
      icon: Trophy,
      label: 'Best week',
      value: `${stats.bestWeekCount} sessions · ${formatWeekStart(stats.bestWeekStart)}`,
    });
  }
  if (stats.peopleAlongsideThisMonth > 0) {
    cells.push({
      icon: Users,
      label: 'Alongside this month',
      value: `${stats.peopleAlongsideThisMonth} ${stats.peopleAlongsideThisMonth === 1 ? 'person' : 'people'}`,
    });
  }
  if (stats.avgSessionMinutes > 0) {
    cells.push({ icon: Timer, label: 'Favourite length', value: `${stats.avgSessionMinutes} min` });
  }

  if (cells.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={13} className="stitch-text-secondary" />
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
          Highlights
        </p>
      </div>
      <SurfaceCard>
        <div className="grid grid-cols-2 gap-3">
          {cells.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                  <Icon size={13} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold stitch-text-secondary uppercase tracking-wider">
                    {c.label}
                  </p>
                  <p className="text-xs font-bold stitch-text-primary leading-snug mt-0.5 truncate">
                    {c.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </SurfaceCard>
    </section>
  );
}

/* ── MessageButton ──────────────────────────────────────────────
   Small inline component that opens (or creates) a DM with the
   profile owner and jumps to the thread page. */
function MessageButton({ otherUserId }: { otherUserId: string }) {
  const navigate = useNavigate();
  const { openConversation, isMobile } = useMessagingDock();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const conversationId = await getOrCreateDm(otherUserId);
      // Desktop: pop the dock chat. Mobile: navigate to the full page.
      if (isMobile) navigate(`/messages/${conversationId}`);
      else openConversation(conversationId);
    } catch (err) {
      if (err instanceof DmPrivacyError) {
        alert(err.message);
      } else {
        console.error('[MessageButton] open DM failed:', err);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-container-low stitch-text-primary text-xs font-bold hover:bg-surface-container transition-colors active:scale-95 disabled:opacity-50"
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : <MessageCircle size={12} />}
      Message
    </button>
  );
}
