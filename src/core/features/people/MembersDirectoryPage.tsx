/**
 * MembersDirectoryPage — /people
 *
 * Browse all SharedMinds members with live presence and session signals.
 *
 * What lights up here:
 *   • Online dot on every avatar (10-min last_seen_at heartbeat)
 *   • "Working now" pulsing pill for anyone in an active public/shared session
 *   • Smart sort: in-session first, then online, then by recency
 *   • Accept-in-place if the person already requested *you*
 *   • Country flags + "🟢 Online now" filter chip
 *
 * Product principle: "human presence is the product." This is the page
 * that makes the community feel alive instead of a static directory.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Users, Sparkles, MessageCircle, UserPlus, Loader2,
  Globe, Briefcase, Check, Activity,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { listMembers, type PublicProfile } from '../../services/ProfileService';
import {
  fetchConnections,
  sendConnectionRequest,
  acceptConnectionRequest,
  fetchConnectionStatus,
  type ConnectionStatus,
} from '../../services/ConnectionService';
import { getOrCreateDm, DmPrivacyError } from '../../services/MessageService';
import { useMessagingDock } from '../messages/MessagingDockContext';
import { SurfaceCard, PageGreeting } from '../../ui/CorePage';
import { Avatar } from '../../ui/Avatar';
import { supabase } from '../../../lib/supabase';
import { findCountry } from '../../../lib/countries';

const WORK_TYPE_LABELS: Record<string, string> = {
  designer: 'Designer', developer: 'Developer', writer: 'Writer / Creator',
  founder: 'Founder', filmmaker: 'Filmmaker / Producer', marketer: 'Marketer',
  consultant: 'Consultant', researcher: 'Researcher', other: 'Creative',
};

const ONLINE_WINDOW_MS = 10 * 60 * 1000;

interface ActiveSessionInfo {
  goal: string | null;
  mode: string | null;
}

/** A profile enriched with the connection state + a snapshot of the user's
 *  current session (if any). Computed locally — never persisted. */
interface EnrichedMember extends PublicProfile {
  status: ConnectionStatus;
  connectionId: string | null;
  activeSession: ActiveSessionInfo | null;
  isOnline: boolean;
}

export function MembersDirectoryPage() {
  const navigate = useNavigate();
  const { profile: me } = useAuth();
  const { openConversation, isMobile } = useMessagingDock();

  const [members, setMembers] = useState<PublicProfile[]>([]);
  const [statuses, setStatuses] = useState<Record<string, { status: ConnectionStatus; id: string | null }>>({});
  const [activeSessions, setActiveSessions] = useState<Record<string, ActiveSessionInfo>>({});
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [workTypeFilter, setWorkTypeFilter] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [onlineOnly, setOnlineOnly] = useState(false);

  // ── Fetch members + statuses + active sessions ──────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      listMembers(),
      fetchConnections(),
      // Active public/shared sessions. Solo sessions are private — never surface them.
      supabase
        .from('focus_sessions')
        .select('user_id, session_goal, session_mode')
        .eq('status', 'active')
        .in('session_mode', ['public', 'shared', 'one_on_one']),
    ])
      .then(async ([all, connected, sessionsRes]) => {
        if (cancelled) return;
        setMembers(all);

        // Build active-session lookup
        const sessions: Record<string, ActiveSessionInfo> = {};
        for (const row of (sessionsRes.data ?? []) as any[]) {
          sessions[row.user_id] = {
            goal: row.session_goal ?? null,
            mode: row.session_mode ?? null,
          };
        }
        if (!cancelled) setActiveSessions(sessions);

        // Hydrate connection statuses for every fetched profile in parallel.
        if (me?.id) {
          const map: Record<string, { status: ConnectionStatus; id: string | null }> = {};
          for (const c of connected) {
            map[c.other_user_id] = { status: 'connected', id: c.id };
          }
          const need = all.filter((p) => !(p.id in map));
          await Promise.all(
            need.map(async (p) => {
              const { status, connectionId } = await fetchConnectionStatus(me.id, p.id);
              if (!cancelled) map[p.id] = { status, id: connectionId };
            })
          );
          if (!cancelled) setStatuses(map);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [me?.id]);

  // ── Enrich + sort members ───────────────────────────────────────
  const enriched = useMemo<EnrichedMember[]>(() => {
    const now = Date.now();
    return members.map((m) => {
      const lastSeen = m.last_seen_at ? new Date(m.last_seen_at).getTime() : 0;
      const isOnline = lastSeen > 0 && (now - lastSeen) < ONLINE_WINDOW_MS;
      const meta = statuses[m.id] ?? { status: 'none' as ConnectionStatus, id: null };
      return {
        ...m,
        status: meta.status,
        connectionId: meta.id,
        activeSession: activeSessions[m.id] ?? null,
        isOnline,
      };
    });
  }, [members, statuses, activeSessions]);

  // Derived filter options
  const workTypeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of members) {
      if (m.work_type) set.add(m.work_type);
      for (const wt of (m.work_types ?? [])) set.add(wt);
    }
    return Array.from(set).sort();
  }, [members]);

  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of members) if (m.country_code) set.add(m.country_code);
    return Array.from(set).sort();
  }, [members]);

  // Filter + smart sort
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = enriched.filter((m) => {
      if (workTypeFilter) {
        const types = m.work_types?.length ? m.work_types : (m.work_type ? [m.work_type] : []);
        if (!types.includes(workTypeFilter)) return false;
      }
      if (countryFilter && m.country_code !== countryFilter) return false;
      if (onlineOnly && !m.isOnline && !m.activeSession) return false;
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

    // Smart sort: in-session → online → recent last_seen → name
    return out.sort((a, b) => {
      const aRank = a.activeSession ? 0 : a.isOnline ? 1 : 2;
      const bRank = b.activeSession ? 0 : b.isOnline ? 1 : 2;
      if (aRank !== bRank) return aRank - bRank;
      const aSeen = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
      const bSeen = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
      if (aSeen !== bSeen) return bSeen - aSeen;
      return a.display_name.localeCompare(b.display_name);
    });
  }, [enriched, query, workTypeFilter, countryFilter, onlineOnly]);

  // Suggested: same work type or country, not yet connected
  const suggested = useMemo(() => {
    if (!me) return [];
    return enriched
      .filter((m) => m.status !== 'connected' && m.status !== 'pending_sent')
      .filter((m) => {
        const myTypes = (me as any).work_types?.length
          ? (me as any).work_types
          : (me.work_type ? [me.work_type] : []);
        const theirTypes = m.work_types?.length ? m.work_types : (m.work_type ? [m.work_type] : []);
        const sharedType = myTypes.some((t: string) => theirTypes.includes(t));
        return sharedType || (me.country_code && m.country_code === me.country_code);
      })
      // Live people first in suggestions too
      .sort((a, b) => {
        const aRank = a.activeSession ? 0 : a.isOnline ? 1 : 2;
        const bRank = b.activeSession ? 0 : b.isOnline ? 1 : 2;
        return aRank - bRank;
      })
      .slice(0, 5);
  }, [enriched, me]);

  const onlineCount = useMemo(
    () => enriched.filter((m) => m.isOnline || m.activeSession).length,
    [enriched],
  );

  // ── Actions ─────────────────────────────────────────────────────
  async function handleConnect(userId: string) {
    setStatuses((prev) => ({ ...prev, [userId]: { status: 'pending_sent', id: null } }));
    try {
      const conn = await sendConnectionRequest(userId);
      setStatuses((prev) => ({ ...prev, [userId]: { status: 'pending_sent', id: conn.id } }));
    } catch {
      setStatuses((prev) => ({ ...prev, [userId]: { status: 'none', id: null } }));
    }
  }

  async function handleAccept(userId: string, connectionId: string) {
    setStatuses((prev) => ({ ...prev, [userId]: { status: 'connected', id: connectionId } }));
    try {
      await acceptConnectionRequest(connectionId);
    } catch {
      setStatuses((prev) => ({ ...prev, [userId]: { status: 'pending_received', id: connectionId } }));
    }
  }

  async function handleMessage(userId: string) {
    try {
      const conversationId = await getOrCreateDm(userId);
      if (isMobile) navigate(`/messages/${conversationId}`);
      else openConversation(conversationId);
    } catch (e) {
      if (e instanceof DmPrivacyError) {
        alert(e.message);
      } else {
        console.error('handleMessage failed:', e);
      }
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageGreeting
        greeting="People"
        subtitle="Browse the community. Connect, message, or pull someone into a session."
      />

      {/* Search */}
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

        {/* Online filter + Work type chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <FilterChip
            icon={<span className={`w-2 h-2 rounded-full ${onlineCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-gray-300'}`} />}
            label={onlineCount > 0 ? `Online now · ${onlineCount}` : 'Online now'}
            active={onlineOnly}
            onClick={() => setOnlineOnly((v) => !v)}
          />
          {workTypeOptions.length > 0 && (
            <>
              <FilterChip
                icon={<Briefcase size={11} />}
                label="All work"
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
            </>
          )}
        </div>

        {/* Country chips with flags */}
        {countryOptions.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            <FilterChip
              icon={<Globe size={11} />}
              label="Anywhere"
              active={countryFilter === null}
              onClick={() => setCountryFilter(null)}
            />
            {countryOptions.map((cc) => {
              const country = findCountry(cc);
              return (
                <FilterChip
                  key={cc}
                  label={country ? `${country.flag} ${country.name}` : cc}
                  active={countryFilter === cc}
                  onClick={() => setCountryFilter(cc === countryFilter ? null : cc)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <SkeletonGrid />
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
          {suggested.length > 0 && !query && !workTypeFilter && !countryFilter && !onlineOnly && (
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
                    onView={() => navigate(`/profile/${m.id}`)}
                    onConnect={() => handleConnect(m.id)}
                    onAccept={() => m.connectionId && handleAccept(m.id, m.connectionId)}
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
              {onlineCount > 0 && !onlineOnly && (
                <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {onlineCount} online
                </p>
              )}
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
                    onView={() => navigate(`/profile/${m.id}`)}
                    onConnect={() => handleConnect(m.id)}
                    onAccept={() => m.connectionId && handleAccept(m.id, m.connectionId)}
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
  member, onView, onConnect, onAccept, onMessage, accent,
}: {
  member: EnrichedMember;
  onView: () => void;
  onConnect: () => void;
  onAccept: () => void;
  onMessage: () => void;
  accent?: boolean;
}) {
  // Prefer work_types[0] if present, fall back to legacy work_type
  const primaryWorkType = member.work_types?.[0] ?? member.work_type ?? null;
  const workTypeLabel = primaryWorkType ? (WORK_TYPE_LABELS[primaryWorkType] ?? primaryWorkType) : null;
  const country = findCountry(member.country_code);

  const isConnected = member.status === 'connected';
  const isPending = member.status === 'pending_sent';
  const incoming = member.status === 'pending_received';
  const inSession = !!member.activeSession;

  return (
    <div
      className={`relative rounded-2xl p-4 transition-all hover:shadow-md ${
        inSession
          ? 'bg-gradient-to-br from-emerald-50/60 to-white ring-1 ring-emerald-200/60'
          : accent
            ? 'bg-gradient-to-br from-violet-50/60 to-white ring-1 ring-violet-200/40'
            : 'bg-surface-container-low'
      }`}
    >
      <button
        type="button"
        onClick={onView}
        className="w-full text-left flex items-start gap-3 mb-3"
      >
        <Avatar
          displayName={member.display_name}
          avatarUrl={member.avatar_url}
          size="lg"
          showPresence
          lastSeenAt={member.last_seen_at}
          ring={inSession ? 'green' : 'none'}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-bold stitch-text-primary truncate">
              {member.display_name}
            </p>
            {country && <span className="text-xs leading-none" title={country.name}>{country.flag}</span>}
          </div>

          {/* Working-now pill OR work type pill */}
          {inSession ? (
            <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Activity size={9} strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Working now
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              {workTypeLabel && (
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                  {workTypeLabel}
                </span>
              )}
              {member.city && (
                <span className="text-[10px] font-semibold stitch-text-secondary">· {member.city}</span>
              )}
            </div>
          )}

          {/* Session goal — replaces bio when in session */}
          {inSession && member.activeSession?.goal ? (
            <p className="text-[11px] stitch-text-secondary leading-snug line-clamp-2 mt-1.5 italic">
              "{member.activeSession.goal}"
            </p>
          ) : member.bio ? (
            <p className="text-[11px] stitch-text-secondary leading-snug line-clamp-2 mt-1.5">
              {member.bio}
            </p>
          ) : null}

          {/* Skills — max 3 */}
          {member.skills && member.skills.length > 0 && !inSession && (
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
          <span className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
            <Check size={11} strokeWidth={3} /> Connected
          </span>
        ) : incoming ? (
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold active:scale-95 transition-all"
          >
            <Check size={11} strokeWidth={3} />
            Accept request
          </button>
        ) : isPending ? (
          <span className="flex-1 text-center px-3 py-2 rounded-xl bg-surface-container stitch-text-secondary text-[11px] font-bold uppercase tracking-wider">
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

// ── Skeleton loader ─────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Loader2 size={13} className="stitch-text-secondary animate-spin" />
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
          Loading members…
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-4 bg-surface-container-low animate-pulse">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-surface-container shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 rounded bg-surface-container" />
                <div className="h-2 w-1/3 rounded bg-surface-container" />
                <div className="h-2 w-full rounded bg-surface-container" />
                <div className="h-2 w-4/5 rounded bg-surface-container" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 h-8 rounded-xl bg-surface-container" />
              <div className="w-20 h-8 rounded-xl bg-surface-container" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
