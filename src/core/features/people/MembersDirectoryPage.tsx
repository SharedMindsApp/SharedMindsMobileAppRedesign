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
  Globe, Briefcase, Check, Activity, ChevronDown, X,
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

export function MembersDirectoryPage({ embedded = false }: { embedded?: boolean } = {}) {
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
  const [skillFilter, setSkillFilter] = useState<string | null>(null);
  const [onlineOnly, setOnlineOnly] = useState(false);
  /** Which filter picker is currently expanded below the bar.
   *  Only one open at a time — tapping the same pill toggles it,
   *  tapping a different pill swaps, tapping outside (or Escape)
   *  closes. Replaces the old 3-rows-of-scrolling-chips layout. */
  const [openPicker, setOpenPicker] = useState<'role' | 'skill' | 'where' | null>(null);
  /** Search-within for the skill + country pickers — useful once
   *  the directory has more than a screen of options. */
  const [pickerQuery, setPickerQuery] = useState('');
  // Reset the picker search whenever a different picker opens so
  // a stale query doesn't pre-filter the new list.
  useEffect(() => { setPickerQuery(''); }, [openPicker]);
  // Escape closes the active picker — keyboard parity with the rest
  // of the modal-y sheets in the app.
  useEffect(() => {
    if (!openPicker) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenPicker(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openPicker]);

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

  // Skill options ranked by how many members have them.
  // Surfaces the most "filterable" skills first instead of a flat alpha list.
  const skillOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of members) {
      for (const s of (m.skills ?? [])) {
        counts.set(s, (counts.get(s) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([skill, count]) => ({ skill, count }));
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
      if (skillFilter && !(m.skills ?? []).includes(skillFilter)) return false;
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
  }, [enriched, query, workTypeFilter, countryFilter, skillFilter, onlineOnly]);

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
      {/* PageGreeting is hidden when this component is embedded inside
          another page (e.g. ConnectionsPage's Discover tab) so we don't
          render two headers. */}
      {!embedded && (
        <PageGreeting
          greeting="People"
          subtitle="Browse the community. Connect, message, or pull someone into a session."
        />
      )}

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

        {/* ── Compact filter bar ─────────────────────────────────
            Replaces the previous three-rows-of-chips layout. Four
            pills wrap onto two short rows on mobile + sit in one on
            desktop. Active filters show their value inline ("Role:
            Designer ✕") so the bar doubles as a status summary —
            no separate active-filter strip needed.

            Tapping a select pill expands the picker below; tapping
            it again (or the X) collapses. Escape closes too. */}
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            icon={<span className={`w-2 h-2 rounded-full ${onlineCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-gray-300'}`} />}
            label={onlineCount > 0 ? `Online now · ${onlineCount}` : 'Online now'}
            active={onlineOnly}
            onClick={() => setOnlineOnly((v) => !v)}
          />
          {workTypeOptions.length > 0 && (
            <SelectPill
              icon={<Briefcase size={11} />}
              placeholder="Role"
              value={workTypeFilter ? (WORK_TYPE_LABELS[workTypeFilter] ?? workTypeFilter) : null}
              open={openPicker === 'role'}
              onToggle={() => setOpenPicker((p) => (p === 'role' ? null : 'role'))}
              onClear={() => setWorkTypeFilter(null)}
            />
          )}
          {skillOptions.length > 0 && (
            <SelectPill
              icon={<Sparkles size={11} />}
              placeholder="Skill"
              value={skillFilter}
              open={openPicker === 'skill'}
              onToggle={() => setOpenPicker((p) => (p === 'skill' ? null : 'skill'))}
              onClear={() => setSkillFilter(null)}
            />
          )}
          {countryOptions.length > 1 && (
            <SelectPill
              icon={<Globe size={11} />}
              placeholder="Where"
              value={(() => {
                if (!countryFilter) return null;
                const c = findCountry(countryFilter);
                return c ? `${c.flag} ${c.name}` : countryFilter;
              })()}
              open={openPicker === 'where'}
              onToggle={() => setOpenPicker((p) => (p === 'where' ? null : 'where'))}
              onClear={() => setCountryFilter(null)}
            />
          )}
          {/* Clear-all — only shown when ≥2 filters are active. Single
              active filters can be removed via the inline pill ×. */}
          {[onlineOnly, workTypeFilter, skillFilter, countryFilter].filter(Boolean).length >= 2 && (
            <button
              type="button"
              onClick={() => {
                setOnlineOnly(false);
                setWorkTypeFilter(null);
                setSkillFilter(null);
                setCountryFilter(null);
              }}
              className="shrink-0 inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold stitch-text-secondary hover:stitch-text-primary underline-offset-2 hover:underline transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* ── Expandable picker panel ───────────────────────────
            Single panel that swaps content based on which pill is
            open. Max-height + scroll so a long skill/country list
            doesn't shove the results below the fold. Click-outside
            + Escape handled by the page-level effect below. */}
        {openPicker && (
          <div className="rounded-2xl bg-surface-container-low ring-1 ring-surface-container/60 p-3 animate-in fade-in slide-in-from-top-1 duration-150">
            {openPicker === 'role' && (
              <PickerOptionGrid
                ariaLabel="Filter by role"
                options={[
                  { id: '__any', label: 'Any role', selected: workTypeFilter === null },
                  ...workTypeOptions.map((wt) => ({
                    id: wt,
                    label: WORK_TYPE_LABELS[wt] ?? wt,
                    selected: workTypeFilter === wt,
                  })),
                ]}
                onPick={(id) => {
                  setWorkTypeFilter(id === '__any' ? null : id);
                  setOpenPicker(null);
                }}
              />
            )}
            {openPicker === 'skill' && (
              <PickerWithSearch
                placeholder="Search skills…"
                query={pickerQuery}
                onQueryChange={setPickerQuery}
                anyLabel="Any skill"
                anySelected={skillFilter === null}
                onPickAny={() => { setSkillFilter(null); setOpenPicker(null); }}
                options={skillOptions
                  .filter(({ skill }) => skill.toLowerCase().includes(pickerQuery.toLowerCase()))
                  .map(({ skill, count }) => ({
                    id: skill,
                    label: skill,
                    badge: count > 1 ? String(count) : undefined,
                    selected: skillFilter === skill,
                  }))}
                onPick={(id) => { setSkillFilter(id); setOpenPicker(null); }}
              />
            )}
            {openPicker === 'where' && (
              <PickerWithSearch
                placeholder="Search countries…"
                query={pickerQuery}
                onQueryChange={setPickerQuery}
                anyLabel="Anywhere"
                anySelected={countryFilter === null}
                onPickAny={() => { setCountryFilter(null); setOpenPicker(null); }}
                options={countryOptions
                  .map((cc) => ({ cc, country: findCountry(cc) }))
                  .filter(({ country, cc }) => {
                    const q = pickerQuery.toLowerCase();
                    if (!q) return true;
                    return (country?.name.toLowerCase().includes(q) ?? false) || cc.toLowerCase().includes(q);
                  })
                  .map(({ cc, country }) => ({
                    id: cc,
                    label: country ? `${country.flag} ${country.name}` : cc,
                    selected: countryFilter === cc,
                  }))}
                onPick={(id) => { setCountryFilter(id); setOpenPicker(null); }}
              />
            )}
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

/** Select-style filter pill — shows "Role" placeholder when no filter
 *  is active, or "Designer ✕" when one is. The chevron flips when the
 *  picker is open. The X is a separate hit target so it doesn't fight
 *  the main toggle area. Used for Role, Skill, Where. */
function SelectPill({
  icon, placeholder, value, open, onToggle, onClear,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string | null;
  open: boolean;
  onToggle: () => void;
  onClear: () => void;
}) {
  const isActive = !!value;
  return (
    <div
      className={`shrink-0 inline-flex items-center gap-1 rounded-full text-xs font-bold transition-all overflow-hidden ${
        isActive
          ? 'bg-primary text-white shadow-sm shadow-primary/25 ring-1 ring-primary/30'
          : open
            ? 'bg-surface-container ring-1 ring-primary/30 stitch-text-primary'
            : 'bg-surface-container-low stitch-text-secondary hover:bg-surface-container ring-1 ring-transparent'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 active:scale-95 transition-transform"
      >
        <span className={isActive ? 'text-white/90' : ''}>{icon}</span>
        <span className="max-w-[160px] truncate">{value ?? placeholder}</span>
        <ChevronDown
          size={11}
          className={`transition-transform ${open ? 'rotate-180' : ''} ${isActive ? 'text-white/70' : 'opacity-60'}`}
        />
      </button>
      {/* Inline clear — only when a filter is active. Separate from the
          toggle so the user can dismiss without opening the picker. */}
      {isActive && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          title={`Clear ${placeholder.toLowerCase()} filter`}
          className="pr-2 pl-0.5 py-1.5 hover:bg-white/15 transition-colors"
        >
          <X size={11} className="text-white/80" />
        </button>
      )}
    </div>
  );
}

/** Compact picker for the Role filter — 9 options fit in a 2-column
 *  grid without scroll. No search needed (small list, all stable). */
function PickerOptionGrid({
  options, onPick, ariaLabel,
}: {
  options: { id: string; label: string; selected: boolean }[];
  onPick: (id: string) => void;
  ariaLabel: string;
}) {
  return (
    <div role="listbox" aria-label={ariaLabel} className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="option"
          aria-selected={o.selected}
          onClick={() => onPick(o.id)}
          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 text-left ${
            o.selected
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white stitch-text-primary hover:bg-surface-container ring-1 ring-surface-container/60'
          }`}
        >
          <span className="truncate">{o.label}</span>
          {o.selected && <Check size={12} className="shrink-0 text-white" />}
        </button>
      ))}
    </div>
  );
}

/** Picker with a search-within input + a sticky "Any/All" row at the
 *  top + a scrollable option list capped at ~12 rows visible. Used
 *  for Skill (potentially long list) and Where (lots of countries). */
function PickerWithSearch({
  placeholder, query, onQueryChange,
  anyLabel, anySelected, onPickAny,
  options, onPick,
}: {
  placeholder: string;
  query: string;
  onQueryChange: (q: string) => void;
  anyLabel: string;
  anySelected: boolean;
  onPickAny: () => void;
  options: { id: string; label: string; selected: boolean; badge?: string }[];
  onPick: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 stitch-text-secondary pointer-events-none" />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2 rounded-xl bg-white ring-1 ring-surface-container/60 stitch-text-primary text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
        />
      </div>
      <div className="max-h-60 overflow-y-auto -mx-1 px-1 space-y-1" role="listbox">
        <button
          type="button"
          role="option"
          aria-selected={anySelected}
          onClick={onPickAny}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors text-left ${
            anySelected
              ? 'bg-primary text-white'
              : 'stitch-text-secondary hover:bg-surface-container'
          }`}
        >
          <span>{anyLabel}</span>
          {anySelected && <Check size={12} className="shrink-0" />}
        </button>
        {options.length === 0 && query && (
          <p className="text-center text-[11px] stitch-text-secondary py-4">
            No matches for "{query}"
          </p>
        )}
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="option"
            aria-selected={o.selected}
            onClick={() => onPick(o.id)}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left ${
              o.selected
                ? 'bg-primary text-white'
                : 'stitch-text-primary hover:bg-surface-container'
            }`}
          >
            <span className="truncate">{o.label}</span>
            <span className="flex items-center gap-1.5 shrink-0">
              {o.badge && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  o.selected ? 'bg-white/20 text-white' : 'bg-surface-container stitch-text-secondary'
                }`}>
                  {o.badge}
                </span>
              )}
              {o.selected && <Check size={12} />}
            </span>
          </button>
        ))}
      </div>
    </div>
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
