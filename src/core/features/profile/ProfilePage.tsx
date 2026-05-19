import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Flame, Check, Clock, Link2, Edit2, X, MapPin, Sparkles, Camera, MessageCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { ConnectButton } from '../connections/ConnectButton';
import { getOrCreateDm } from '../../services/MessageService';
import { useMessagingDock } from '../messages/MessagingDockContext';
import { SurfaceCard } from '../../ui/CorePage';
import { findCountry, formatLocation } from '../../../lib/countries';
import { findSkillCategory } from '../../../lib/skills';

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
  updateProfileBio,
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

function StatPill({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center py-3 px-2">
      <p className="text-xl font-extrabold stitch-text-primary tabular-nums">{value}</p>
      <p className="text-[10px] font-semibold stitch-text-secondary text-center leading-tight mt-0.5">{label}</p>
    </div>
  );
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

export function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const targetId = userId ?? user?.id ?? '';
  const isOwn = !userId || userId === user?.id;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [ships, setShips] = useState<RecentShip[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState('');
  const [savingBio, setSavingBio] = useState(false);

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
    ]).then(([p, s, sh]) => {
      setProfile(p);
      setStats(s);
      setShips(sh);
      setBioValue(p?.bio ?? '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [targetId]);

  async function handleSaveBio() {
    if (savingBio) return;
    setSavingBio(true);
    try {
      await updateProfileBio(bioValue);
      setProfile((p) => p ? { ...p, bio: bioValue } : p);
      setEditingBio(false);
    } catch {
      // ignore
    } finally {
      setSavingBio(false);
    }
  }

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

  return (
    <div className="space-y-5">

      {/* ── Profile header ─────────────────────────────────── */}
      <div className="flex items-start gap-4">
        {isOwn ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="relative w-16 h-16 rounded-2xl shrink-0 overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            aria-label="Change profile photo"
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full ${avatarBg} flex items-center justify-center text-2xl font-extrabold`}>
                {profile.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Hover overlay */}
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
        ) : profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="w-16 h-16 rounded-2xl object-cover shrink-0"
          />
        ) : (
          <div className={`w-16 h-16 rounded-2xl ${avatarBg} flex items-center justify-center shrink-0 text-2xl font-extrabold`}>
            {profile.display_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0 pt-1">
          <h1 className="stitch-headline text-xl font-extrabold tracking-tight leading-tight">
            {profile.display_name}
          </h1>
          {(() => {
            const country = findCountry(profile.country_code);
            const locationLabel =
              formatLocation(profile.country_code, profile.city) || profile.location;
            if (!locationLabel) return null;
            return (
              <p className="text-xs stitch-text-secondary mt-1 flex items-center gap-1.5 truncate">
                {country ? (
                  <span className="text-sm leading-none">{country.flag}</span>
                ) : (
                  <MapPin size={10} />
                )}
                <span className="truncate">{locationLabel}</span>
              </p>
            );
          })()}
          {(() => {
            const types = getWorkTypes(profile);
            if (types.length === 0) return null;
            return (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {types.map((t) => {
                  const meta = WORK_TYPE_META[t] ?? { label: t, emoji: '✨' };
                  return (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold"
                    >
                      <span className="text-xs leading-none">{meta.emoji}</span>
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            );
          })()}
          <p className="text-[10px] stitch-text-secondary mt-2 opacity-70">
            Member since {formatMemberSince(profile.created_at)}
          </p>
          {!isOwn && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <ConnectButton otherUserId={profile.id} />
              <MessageButton otherUserId={profile.id} />
            </div>
          )}
        </div>
      </div>

      {/* ── Avatar upload feedback ─────────────────────────── */}
      {avatarError && (
        <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3.5 py-2.5 leading-relaxed">
          {avatarError}
        </p>
      )}

      {/* ── Bio ────────────────────────────────────────────── */}
      {isOwn ? (
        editingBio ? (
          <div className="space-y-2">
            <textarea
              value={bioValue}
              onChange={(e) => setBioValue(e.target.value)}
              placeholder="Tell the community what you're working on..."
              maxLength={200}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-medium placeholder:stitch-text-secondary border-0 outline-none focus:ring-2 focus:ring-primary/30 resize-none transition-all"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveBio}
                disabled={savingBio}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl stitch-btn--primary text-white text-xs font-bold disabled:opacity-50"
              >
                {savingBio ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} strokeWidth={3} />}
                Save
              </button>
              <button
                type="button"
                onClick={() => { setEditingBio(false); setBioValue(profile.bio ?? ''); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container-low stitch-text-secondary text-xs font-bold"
              >
                <X size={11} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingBio(true)}
            className="w-full text-left group"
          >
            {profile.bio ? (
              <p className="text-sm stitch-text-secondary leading-relaxed group-hover:stitch-text-primary transition-colors">
                {profile.bio}
                <Edit2 size={11} className="inline ml-1.5 opacity-40 group-hover:opacity-70 transition-opacity" />
              </p>
            ) : (
              <p className="text-sm stitch-text-secondary italic opacity-60 flex items-center gap-1.5 hover:opacity-100 transition-opacity">
                <Edit2 size={12} /> Add a bio
              </p>
            )}
          </button>
        )
      ) : profile.bio ? (
        <p className="text-sm stitch-text-secondary leading-relaxed">{profile.bio}</p>
      ) : null}

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
              return (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low stitch-text-primary text-xs font-semibold"
                >
                  {cat && <span className="text-[11px] leading-none">{cat.emoji}</span>}
                  {skill}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Stats ──────────────────────────────────────────── */}
      {stats && (
        <SurfaceCard>
          <div className="flex divide-x divide-surface-container">
            <StatPill value={stats.totalSessions} label="Sessions" />
            <StatPill value={`${stats.completionRate}%`} label="Finished" />
            <StatPill
              value={stats.currentStreak > 0 ? `${stats.currentStreak}🔥` : '—'}
              label="Day streak"
            />
            <StatPill value={stats.connectionCount} label="Connections" />
          </div>
        </SurfaceCard>
      )}

      {/* ── Recently finished ──────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Flame size={13} className="stitch-text-secondary" />
          <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
            Recently finished
          </p>
        </div>
        {ships.length > 0 ? (
          <SurfaceCard>
            <div className="divide-y divide-surface-container">
              {ships.map((s) => <ShipCard key={s.id} ship={s} />)}
            </div>
          </SurfaceCard>
        ) : (
          <SurfaceCard>
            <p className="text-sm stitch-text-secondary text-center py-6">
              No sessions completed yet.
            </p>
          </SurfaceCard>
        )}
      </section>
    </div>
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
      console.error('[MessageButton] open DM failed:', err);
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
