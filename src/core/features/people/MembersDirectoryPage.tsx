/**
 * MembersDirectoryPage — /people
 *
 * Browse all SharedMinds members. Filter by work type, country, or
 * skill. Tap any card to view their profile, or use the Connect /
 * Message buttons directly.
 *
 * "Suggested connections" section pinned at the top surfaces people in
 * the same work type or country — the only ranking signal we have today
 * at this scale.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Sparkles, MessageCircle, UserPlus, Loader2, Globe, Briefcase } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { listMembers, type PublicProfile } from '../../services/ProfileService';
import { fetchConnections, sendConnectionRequest, fetchConnectionStatus, type ConnectionStatus } from '../../services/ConnectionService';
import { getOrCreateDm } from '../../services/MessageService';
import { SurfaceCard, PageGreeting } from '../../ui/CorePage';

const WORK_TYPE_LABELS: Record<string, string> = {
  designer: 'Designer', developer: 'Developer', writer: 'Writer / Creator',
  founder: 'Founder', filmmaker: 'Filmmaker / Producer', marketer: 'Marketer',
  consultant: 'Consultant', researcher: 'Researcher', other: 'Creative',
};

const AVATAR_GRAD = [
  'from-violet-400 to-fuchsia-500',
  'from-cyan-400 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-indigo-400 to-purple-500',
];
function gradFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRAD[Math.abs(hash) % AVATAR_GRAD.length];
}

export function MembersDirectoryPage() {
  const navigate = useNavigate();
  const { profile: me } = useAuth();
  const [members, setMembers] = useState<PublicProfile[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ConnectionStatus>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [workTypeFilter, setWorkTypeFilter] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listMembers(),
      fetchConnections(),
    ])
      .then(async ([all, connected]) => {
        if (cancelled) return;
        setMembers(all);

        // Hydrate connection statuses for ALL fetched profiles in parallel.
        // At 200-member cap this is fine; we'll batch via RPC later if it grows.
        if (me?.id) {
          const map: Record<string, ConnectionStatus> = {};
          for (const c of connected) map[c.other_user_id] = 'connected';
          const need = all.filter((p) => !(p.id in map));
          await Promise.all(
            need.map(async (p) => {
              const { status } = await fetchConnectionStatus(me.id, p.id);
              if (!cancelled) map[p.id] = status;
            })
          );
          if (!cancelled) setStatuses(map);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [me?.id]);

  // Derived sets for filter chips
  const workTypeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of members) if (m.work_type) set.add(m.work_type);
    return Array.from(set).sort();
  }, [members]);

  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of members) if (m.country_code) set.add(m.country_code);
    return Array.from(set).sort();
  }, [members]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (workTypeFilter && m.work_type !== workTypeFilter) return false;
      if (countryFilter && m.country_code !== countryFilter) return false;
      if (q) {
        const blob = [
          m.display_name,
          m.bio,
          m.city,
          ...(m.skills ?? []),
          ...(m.work_types ?? []),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [members, query, workTypeFilter, countryFilter]);

  // Suggested = same work type OR same country, not yet connected, top 5
  const suggested = useMemo(() => {
    if (!me) return [];
    return members
      .filter((m) => statuses[m.id] !== 'connected' && statuses[m.id] !== 'pending_sent')
      .filter((m) =>
        (me.work_type && m.work_type === me.work_type) ||
        (me.country_code && m.country_code === me.country_code)
      )
      .slice(0, 5);
  }, [members, statuses, me]);

  async function handleConnect(userId: string) {
    setStatuses((prev) => ({ ...prev, [userId]: 'pending_sent' }));
    try {
      await sendConnectionRequest(userId);
    } catch {
      setStatuses((prev) => ({ ...prev, [userId]: 'none' }));
    }
  }

  async function handleMessage(userId: string) {
    try {
      const conversationId = await getOrCreateDm(userId);
      navigate(`/messages/${conversationId}`);
    } catch (e) {
      console.error('handleMessage failed:', e);
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageGreeting
        greeting="People"
        subtitle="Browse the community. Connect, message, or pull someone into a session."
      />

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 stitch-text-secondary pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, skill, city…"
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-surface-container-low stitch-text-primary text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow placeholder:stitch-text-secondary"
          />
        </div>

        {/* Work type chips */}
        {workTypeOptions.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            <FilterChip
              icon={<Briefcase size={11} />}
              label="All work types"
              active={workTypeFilter === null}
              onClick={() => setWorkTypeFilter(null)}
            />
            {workTypeOptions.map((wt) => (
              <FilterChip
                key={wt}
                label={WORK_TYPE_LABELS[wt] ?? wt}
                active={workTypeFilter === wt}
                onClick={() => setWorkTypeFilter(wt === workTypeFilter ? null : wt)}
              />
            ))}
          </div>
        )}

        {/* Country chips */}
        {countryOptions.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            <FilterChip
              icon={<Globe size={11} />}
              label="Any country"
              active={countryFilter === null}
              onClick={() => setCountryFilter(null)}
            />
            {countryOptions.map((cc) => (
              <FilterChip
                key={cc}
                label={cc}
                active={countryFilter === cc}
                onClick={() => setCountryFilter(cc === countryFilter ? null : cc)}
              />
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin stitch-text-secondary" />
        </div>
      ) : members.length === 0 ? (
        <SurfaceCard>
          <div className="text-center py-12 px-6">
            <Users size={28} className="mx-auto mb-3 stitch-text-secondary opacity-50" />
            <p className="text-sm font-bold stitch-text-primary mb-1">No other members yet</p>
            <p className="text-xs stitch-text-secondary leading-relaxed">
              You're early. As more people join SharedMinds they'll show up here.
            </p>
          </div>
        </SurfaceCard>
      ) : (
        <>
          {/* Suggested */}
          {suggested.length > 0 && !query && !workTypeFilter && !countryFilter && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={13} className="text-violet-600" />
                <p className="text-[10px] font-bold text-violet-700 tracking-widest uppercase">
                  Suggested for you
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {suggested.map((m) => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    status={statuses[m.id] ?? 'none'}
                    onView={() => navigate(`/profile/${m.id}`)}
                    onConnect={() => handleConnect(m.id)}
                    onMessage={() => handleMessage(m.id)}
                    accent
                  />
                ))}
              </div>
            </section>
          )}

          {/* All members */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={13} className="stitch-text-secondary" />
                <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
                  {filtered.length === members.length ? 'All members' : 'Results'} · {filtered.length}
                </p>
              </div>
            </div>
            {filtered.length === 0 ? (
              <SurfaceCard>
                <div className="text-center py-8 px-4 stitch-text-secondary text-sm">
                  No one matches that filter.
                </div>
              </SurfaceCard>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map((m) => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    status={statuses[m.id] ?? 'none'}
                    onView={() => navigate(`/profile/${m.id}`)}
                    onConnect={() => handleConnect(m.id)}
                    onMessage={() => handleMessage(m.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// ── Filter chip ─────────────────────────────────────────────────

function FilterChip({
  label, active, onClick, icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
        active ? 'stitch-btn--primary text-white shadow-sm' : 'bg-surface-container-low stitch-text-secondary hover:bg-surface-container'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Member card ─────────────────────────────────────────────────

function MemberCard({
  member, status, onView, onConnect, onMessage, accent,
}: {
  member: PublicProfile;
  status: ConnectionStatus;
  onView: () => void;
  onConnect: () => void;
  onMessage: () => void;
  accent?: boolean;
}) {
  const workTypeLabel = member.work_type ? WORK_TYPE_LABELS[member.work_type] : null;
  const isConnected = status === 'connected';
  const isPending = status === 'pending_sent';

  return (
    <div className={`rounded-2xl p-4 transition-all hover:shadow-md ${
      accent ? 'bg-gradient-to-br from-violet-50/60 to-white ring-1 ring-violet-200/40' : 'bg-surface-container-low'
    }`}>
      <button
        type="button"
        onClick={onView}
        className="w-full text-left flex items-start gap-3 mb-3"
      >
        {member.avatar_url ? (
          <img src={member.avatar_url} alt={member.display_name} className="w-11 h-11 rounded-2xl object-cover shrink-0" />
        ) : (
          <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradFor(member.display_name)} flex items-center justify-center text-white font-extrabold shadow-sm shrink-0`}>
            {member.display_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold stitch-text-primary truncate">{member.display_name}</p>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            {workTypeLabel && (
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{workTypeLabel}</span>
            )}
            {member.country_code && (
              <span className="text-[10px] font-semibold stitch-text-secondary">· {member.country_code}{member.city ? ` · ${member.city}` : ''}</span>
            )}
          </div>
          {member.bio && (
            <p className="text-[11px] stitch-text-secondary leading-snug line-clamp-2 mt-1.5">
              {member.bio}
            </p>
          )}
          {/* Skills chips, max 3 */}
          {member.skills && member.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {member.skills.slice(0, 3).map((s) => (
                <span key={s} className="text-[9px] font-bold uppercase tracking-wider stitch-text-secondary bg-white/70 px-1.5 py-0.5 rounded">
                  {s}
                </span>
              ))}
              {member.skills.length > 3 && (
                <span className="text-[9px] font-bold stitch-text-secondary">+{member.skills.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isConnected ? (
          <span className="flex-1 text-center px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
            ✓ Connected
          </span>
        ) : isPending ? (
          <span className="flex-1 text-center px-3 py-2 rounded-xl bg-surface-container text-stitch-text-secondary text-[11px] font-bold uppercase tracking-wider">
            Requested
          </span>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl stitch-btn--primary text-white text-xs font-bold active:scale-95 transition-all"
          >
            <UserPlus size={11} strokeWidth={3} />
            Connect
          </button>
        )}
        <button
          type="button"
          onClick={onMessage}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white stitch-text-primary text-xs font-bold hover:bg-surface-container active:scale-95 transition-all"
          title="Send a message"
        >
          <MessageCircle size={11} />
          Message
        </button>
      </div>
    </div>
  );
}
