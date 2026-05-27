/**
 * MessagesPage — /messages  (Chat hub)
 *
 * Desktop: two-column layout (LinkedIn-style)
 *   Left sidebar  — tabs + online members list / DM conversation list
 *   Right panel   — CommunalChatPanel or "pick a conversation" prompt
 *
 * Mobile: stacked — tabs → full-width content
 *
 * The page auto-selects the Community tab so new users land on the live room.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, MessageCircle, ArrowRight, UserPlus, Search,
  Users, MessageSquare, Zap, ChevronLeft, ChevronRight, Plus,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { fetchConversations, type DmConversation } from '../../services/MessageService';
import { listVisibleOnlineUsers } from '../../services/PresenceService';
import { useAuth } from '../../auth/AuthProvider';
import { GradientButton } from '../../ui/CorePage';
import { CommunalChatPanel } from '../chat/CommunalChatPanel';
import { Avatar } from '../../ui/Avatar';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnlineMember {
  id: string;
  display_name: string;
  avatar_url: string | null;
  last_seen_at: string;
  work_type: string | null;
  /** Effective presence reported by the DB RPC ('online' | 'busy' | 'in_session'). */
  status?: 'online' | 'busy' | 'in_session';
}

interface ActiveSession {
  id: string;
  user_id: string;
  goal: string | null;
  display_name: string;
  avatar_url: string | null;
}

type Tab = 'community' | 'direct';

// ── Gradient helper (for DM avatars that don't have a photo) ─────────────────

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

function formatTimeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ── Data hooks ────────────────────────────────────────────────────────────────

function useOnlineMembers() {
  const [members, setMembers] = useState<OnlineMember[]>([]);
  const fetch = useCallback(async () => {
    // Privacy-respecting: list_visible_online_users returns only users
    // the caller is allowed to see (presence_privacy + connections gate
    // applied server-side). Then we join profiles for display data.
    const rows = await listVisibleOnlineUsers(20);
    if (rows.length === 0) { setMembers([]); return; }

    const ids = rows.map((r) => r.id);
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, last_seen_at, work_type')
      .in('id', ids);
    if (!data) { setMembers([]); return; }

    // Attach the server-derived status to each profile row
    const statusById = new Map(rows.map((r) => [r.id, r.status]));
    const merged: OnlineMember[] = (data as OnlineMember[])
      .map((p) => ({ ...p, status: statusById.get(p.id) }))
      // Sort: in_session first, then online, then busy
      .sort((a, b) => {
        const rank = (s?: string) => s === 'in_session' ? 0 : s === 'online' ? 1 : 2;
        return rank(a.status) - rank(b.status);
      });
    setMembers(merged);
  }, []);

  useEffect(() => {
    fetch();
    const t = setInterval(fetch, 60_000);
    return () => clearInterval(t);
  }, [fetch]);

  return members;
}

function useActiveSessions() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  useEffect(() => {
    supabase
      .from('focus_sessions')
      .select('id, user_id, goal, profiles!inner(display_name, avatar_url)')
      .eq('status', 'active')
      .in('session_type', ['shared', 'public'])
      .order('started_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (!data) return;
        setSessions(
          (data as any[]).map((r) => ({
            id: r.id,
            user_id: r.user_id,
            goal: r.goal,
            display_name: r.profiles?.display_name ?? 'Someone',
            avatar_url: r.profiles?.avatar_url ?? null,
          }))
        );
      });
  }, []);
  return sessions;
}

// ── Main component ────────────────────────────────────────────────────────────

export function MessagesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('community');
  // Mobile-only navigation: 'list' shows the unified messenger-style
  // list (Community pinned + DMs); 'community' opens the global room
  // as a full-screen view with a back button. The desktop two-column
  // layout still uses `tab` instead. Separating the two states avoids
  // weird "switching tab on mobile then resizing" interactions.
  const [mobileView, setMobileView] = useState<'list' | 'community'>('list');
  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [search, setSearch] = useState('');
  const onlineMembers = useOnlineMembers();
  const activeSessions = useActiveSessions();

  useEffect(() => {
    let cancelled = false;
    fetchConversations()
      .then((rows) => { if (!cancelled) setConversations(rows); })
      .finally(() => { if (!cancelled) setLoadingConvs(false); });
    return () => { cancelled = true; };
  }, []);

  const unreadDms = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  const filtered = conversations.filter((c) =>
    !search || c.other_user.display_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-72px)] flex flex-col max-w-6xl mx-auto px-0 md:px-4">

      {/* ── Mobile sticky header — adapts to current view ───────
          When showing the list: "Chat" title + presence dot.
          When in the community room: back arrow + room name + presence.
          Mirrors iMessage/WhatsApp's compact navigation pattern. */}
      <div className="md:hidden sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100">
        {mobileView === 'list' ? (
          <div className="flex items-center justify-between px-4 pt-3 pb-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Chat</h1>
              {onlineMembers.length > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  {onlineMembers.length} online
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-2 pt-3 pb-3">
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className="w-9 h-9 rounded-full hover:bg-gray-100 active:scale-95 transition-all grid place-items-center text-gray-700"
              aria-label="Back to chat list"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 grid place-items-center text-white shrink-0">
              <Users size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 truncate leading-tight">Community Chat</p>
              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                {onlineMembers.length} online · global room
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Main layout ── */}
      <div className="flex-1 min-h-0 flex md:rounded-2xl md:border md:border-gray-200 md:bg-white md:shadow-sm overflow-hidden">

        {/* ════════════════════════════════════
            LEFT SIDEBAR
            ════════════════════════════════════ */}
        <div className="hidden md:flex flex-col w-72 lg:w-80 shrink-0 border-r border-gray-100">

          {/* Sidebar header */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg font-bold text-gray-900">Chat</h1>
              <button
                onClick={() => navigate('/people')}
                className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 hover:text-cyan-700 transition-colors"
              >
                <UserPlus size={13} /> Find people
              </button>
            </div>

            {/* Tab switcher */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              {(['community', 'direct'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    tab === t
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t === 'community' ? <Users size={12} /> : <MessageCircle size={12} />}
                  {t === 'community' ? 'Community' : 'Direct'}
                  {t === 'direct' && unreadDms > 0 && (
                    <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-cyan-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {unreadDms > 9 ? '9+' : unreadDms}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar content */}
          <div className="flex-1 overflow-y-auto">
            {tab === 'community' ? (
              <CommunitySidebar
                onlineMembers={onlineMembers}
                activeSessions={activeSessions}
              />
            ) : (
              <DirectSidebar
                conversations={filtered}
                loading={loadingConvs}
                search={search}
                onSearch={setSearch}
                currentUserId={user?.id ?? null}
                onPick={(id) => navigate(`/messages/${id}`)}
                onNavigatePeople={() => navigate('/people')}
              />
            )}
          </div>
        </div>

        {/* ════════════════════════════════════
            RIGHT PANEL / MOBILE FULL WIDTH
            ════════════════════════════════════ */}
        <div className="flex-1 min-w-0 flex flex-col">

          {/* ── Desktop body — unchanged. Shows community panel OR
                "pick a conversation" prompt based on the desktop tab. */}
          <div className="hidden md:flex flex-1 min-h-0 flex-col">
            {tab === 'community' ? (
              <div className="flex-1 min-h-0 flex flex-col">
                <CommunalChatPanel />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-8">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-50 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare size={28} className="text-cyan-400" />
                  </div>
                  <p className="text-base font-bold text-gray-800 mb-2">Your direct messages</p>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-[280px] mx-auto mb-5">
                    Select a conversation from the sidebar, or find someone new to message.
                  </p>
                  <GradientButton onClick={() => navigate('/people')}>
                    <span className="flex items-center gap-1.5">Browse people <ArrowRight size={12} /></span>
                  </GradientButton>
                </div>
              </div>
            )}
          </div>

          {/* ── Mobile body — messenger-style unified list OR
                full-screen community room (depending on mobileView).
                The "list" view: search + Community pinned row + DMs +
                floating new-chat FAB. The "community" view: full
                CommunalChatPanel with the back-button header above. */}
          <div className="md:hidden flex-1 min-h-0 flex flex-col relative">
            {mobileView === 'community' ? (
              <CommunalChatPanel />
            ) : (
              <>
                <MobileChatList
                  conversations={filtered}
                  loadingConvs={loadingConvs}
                  search={search}
                  onSearch={setSearch}
                  currentUserId={user?.id ?? null}
                  onlineCount={onlineMembers.length}
                  unreadDms={unreadDms}
                  onPickCommunity={() => setMobileView('community')}
                  onPickDm={(id) => navigate(`/messages/${id}`)}
                  onNavigatePeople={() => navigate('/people')}
                />
                {/* Floating new-chat FAB — sits above the bottom nav.
                    Replaces the old "Find people" header button with a
                    standard messenger affordance. The bottom-24 keeps it
                    clear of the tab bar (h-16) + a comfortable gap. */}
                <button
                  type="button"
                  onClick={() => navigate('/people')}
                  className="fixed right-4 bottom-24 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/30 grid place-items-center active:scale-95 hover:shadow-2xl transition-all"
                  aria-label="Start a new chat"
                  title="Start a new chat — browse people"
                >
                  <Plus size={22} strokeWidth={2.5} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mobile chat list ──────────────────────────────────────────────────────────
//
// Replaces the old mobile tab+sidebar pattern with a single unified
// scrollable list: search bar + Community Chat pinned row + DM rows.
// Each row tap navigates (or, for Community, swaps the parent view to
// the full-screen room). Modelled on iMessage/WhatsApp/Telegram's
// conversation list.

function MobileChatList({
  conversations, loadingConvs, search, onSearch, currentUserId,
  onlineCount, unreadDms,
  onPickCommunity, onPickDm, onNavigatePeople,
}: {
  conversations: DmConversation[];
  loadingConvs: boolean;
  search: string;
  onSearch: (v: string) => void;
  currentUserId: string | null;
  onlineCount: number;
  unreadDms: number;
  onPickCommunity: () => void;
  onPickDm: (id: string) => void;
  onNavigatePeople: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto pb-28">
      {/* Sticky search — sits just below the page header so users can
          filter without leaving the list. Lighter weight than a full
          tabs+filters bar. */}
      <div className="sticky top-0 z-10 bg-white px-4 pt-3 pb-2 border-b border-gray-100">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search messages"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-100 text-sm text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-cyan-200 placeholder:text-gray-400 transition-colors"
          />
        </div>
      </div>

      {/* Community Chat — pinned at the top of the list. Treated as a
          first-class conversation so the user has muscle-memory parity
          with their DMs (same row pattern, same tap-to-open gesture). */}
      <button
        type="button"
        onClick={onPickCommunity}
        className="w-full flex items-center gap-3 px-4 py-3 active:bg-gray-50 transition-colors text-left border-b border-gray-100"
      >
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 grid place-items-center text-white shadow-sm">
            <Users size={20} />
          </div>
          {onlineCount > 0 && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="text-sm font-bold text-gray-900 truncate">Community Chat</p>
            <span className="text-[11px] text-gray-400 shrink-0">
              📌 Pinned
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">
            {onlineCount > 0
              ? `${onlineCount} ${onlineCount === 1 ? 'person' : 'people'} online · say hi`
              : 'Global room · all SharedMinds members'}
          </p>
        </div>
        <ChevronRight size={16} className="text-gray-300 shrink-0" />
      </button>

      {/* DM section header — only shown when there's content below,
          to keep the empty state clean. */}
      {!loadingConvs && conversations.length > 0 && (
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Direct messages
          </p>
          {unreadDms > 0 && (
            <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full">
              {unreadDms} unread
            </span>
          )}
        </div>
      )}

      {loadingConvs ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-gray-300" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center px-6 py-10">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <MessageCircle size={22} className="text-gray-300" />
          </div>
          <p className="text-sm font-bold text-gray-700 mb-1.5">No direct messages yet</p>
          <p className="text-xs text-gray-400 leading-relaxed mb-4 max-w-[240px] mx-auto">
            Tap the + button below to find someone to chat with.
          </p>
          <button
            onClick={onNavigatePeople}
            className="text-xs font-bold text-cyan-600 hover:underline inline-flex items-center gap-1"
          >
            Browse people <ArrowRight size={11} />
          </button>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {conversations.map((c) => (
            <MobileDmRow
              key={c.id}
              conv={c}
              currentUserId={currentUserId}
              onClick={() => onPickDm(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Edge-to-edge DM row for the mobile chat list. Larger avatar
 *  (48px) + denser typography + no rounded card so it reads like a
 *  proper messenger list. Distinct from DmRow which is desktop-sized
 *  inside a padded sidebar. */
function MobileDmRow({
  conv, currentUserId, onClick,
}: {
  conv: DmConversation;
  currentUserId: string | null;
  onClick: () => void;
}) {
  const lastByMe = conv.last_message?.sender_id === currentUserId;
  const preview = conv.last_message?.content ?? 'No messages yet';
  const truncated = preview.length > 48 ? preview.slice(0, 48) + '…' : preview;
  const isUnread = conv.unread_count > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-3 active:bg-gray-50 transition-colors"
    >
      {conv.other_user.avatar_url ? (
        <img
          src={conv.other_user.avatar_url}
          alt=""
          className="w-12 h-12 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradFor(conv.other_user.display_name)} flex items-center justify-center text-white font-bold text-base shrink-0`}>
          {conv.other_user.display_name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className={`text-sm truncate ${isUnread ? 'font-extrabold text-gray-900' : 'font-semibold text-gray-800'}`}>
            {conv.other_user.display_name}
          </p>
          {conv.last_message && (
            <span className={`text-[11px] shrink-0 tabular-nums ${isUnread ? 'text-cyan-600 font-bold' : 'text-gray-400'}`}>
              {formatTimeAgo(conv.last_message.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs truncate ${isUnread ? 'text-gray-700 font-semibold' : 'text-gray-500'}`}>
            {lastByMe && <span className="text-gray-400">You: </span>}{truncated}
          </p>
          {isUnread && (
            <span className="shrink-0 min-w-[20px] h-[20px] px-1.5 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
              {conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Community sidebar ─────────────────────────────────────────────────────────

function CommunitySidebar({
  onlineMembers,
  activeSessions,
}: {
  onlineMembers: OnlineMember[];
  activeSessions: ActiveSession[];
}) {
  const navigate = useNavigate();

  return (
    <div className="p-4 space-y-6">

      {/* Online now */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Online now
          </span>
          {onlineMembers.length > 0 && (
            <span className="text-xs text-gray-400">{onlineMembers.length}</span>
          )}
        </div>

        {onlineMembers.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-400">No one online right now</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Check back soon 👋</p>
          </div>
        ) : (
          <div className="space-y-2">
            {onlineMembers.map((m) => (
              <button
                key={m.id}
                onClick={() => navigate(`/profile/${m.id}`)}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <Avatar
                  displayName={m.display_name}
                  avatarUrl={m.avatar_url}
                  size="sm"
                  showPresence
                  lastSeenAt={m.last_seen_at}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800 truncate">{m.display_name}</p>
                  {m.work_type && (
                    <p className="text-[10px] text-gray-400 truncate capitalize">{m.work_type.replace(/_/g, ' ')}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Working right now */}
      {activeSessions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={12} className="text-amber-500" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Working now
            </span>
          </div>
          <div className="space-y-2">
            {activeSessions.map((s) => (
              <div
                key={s.id}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-100"
              >
                <Avatar
                  displayName={s.display_name}
                  avatarUrl={s.avatar_url}
                  size="sm"
                  ring="cyan"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800 truncate">{s.display_name}</p>
                  {s.goal && (
                    <p className="text-[10px] text-gray-500 truncate mt-0.5 italic">
                      "{s.goal.length > 40 ? s.goal.slice(0, 40) + '…' : s.goal}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Room info card */}
      <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-cyan-50 to-blue-50 p-4">
        <p className="text-xs font-bold text-cyan-700 mb-1">About this room</p>
        <p className="text-[11px] text-cyan-600 leading-relaxed">
          The SharedMinds community chat is one shared room for all members.
          Say hi, share a win, or just check in — it's your virtual common room.
        </p>
      </div>
    </div>
  );
}

// ── Direct messages sidebar ───────────────────────────────────────────────────

function DirectSidebar({
  conversations, loading, search, onSearch, currentUserId, onPick, onNavigatePeople,
}: {
  conversations: DmConversation[];
  loading: boolean;
  search: string;
  onSearch: (v: string) => void;
  currentUserId: string | null;
  onPick: (id: string) => void;
  onNavigatePeople: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-300 placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={18} className="animate-spin text-gray-300" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center px-6 py-12">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <MessageCircle size={22} className="text-gray-300" />
            </div>
            <p className="text-sm font-bold text-gray-700 mb-1.5">No direct messages yet</p>
            <p className="text-xs text-gray-400 leading-relaxed mb-4 max-w-[220px] mx-auto">
              Find someone in the community and send your first message.
            </p>
            <button
              onClick={onNavigatePeople}
              className="text-xs font-bold text-cyan-600 hover:underline flex items-center gap-1 mx-auto"
            >
              Browse people <ArrowRight size={11} />
            </button>
          </div>
        ) : (
          <div className="py-2 px-2 space-y-0.5">
            {conversations.map((c) => (
              <DmRow
                key={c.id}
                conv={c}
                currentUserId={currentUserId}
                onClick={() => onPick(c.id)}
              />
            ))}
            {conversations.length > 0 && search && conversations.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">No results for "{search}"</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DmRow({
  conv, currentUserId, onClick,
}: {
  conv: DmConversation;
  currentUserId: string | null;
  onClick: () => void;
}) {
  const lastByMe = conv.last_message?.sender_id === currentUserId;
  const preview = conv.last_message?.content ?? 'No messages yet';
  const truncated = preview.length > 42 ? preview.slice(0, 42) + '…' : preview;
  const isUnread = conv.unread_count > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-gray-50 active:scale-[0.99] ${
        isUnread ? 'bg-cyan-50/60' : ''
      }`}
    >
      {conv.other_user.avatar_url ? (
        <img
          src={conv.other_user.avatar_url}
          alt=""
          className="w-10 h-10 rounded-xl object-cover shrink-0"
        />
      ) : (
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradFor(conv.other_user.display_name)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
          {conv.other_user.display_name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className={`text-sm truncate ${isUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
            {conv.other_user.display_name}
          </p>
          {conv.last_message && (
            <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
              {formatTimeAgo(conv.last_message.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs truncate ${isUnread ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>
            {lastByMe && <span className="text-gray-400">You: </span>}{truncated}
          </p>
          {isUnread && (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1.5 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
              {conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
