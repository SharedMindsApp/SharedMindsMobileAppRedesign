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
  Users, MessageSquare, Zap,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { fetchConversations, type DmConversation } from '../../services/MessageService';
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
    const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, last_seen_at, work_type')
      .gt('last_seen_at', cutoff)
      .order('last_seen_at', { ascending: false })
      .limit(20);
    if (data) setMembers(data as OnlineMember[]);
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

      {/* ── Page header (mobile only — desktop uses sidebar) ── */}
      <div className="md:hidden flex items-center justify-between px-4 pt-4 pb-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Chat</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {onlineMembers.length > 0 ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                {onlineMembers.length} online
              </span>
            ) : 'Community room · direct messages'}
          </p>
        </div>
        <GradientButton size="sm" variant="secondary" onClick={() => navigate('/people')}>
          <span className="flex items-center gap-1.5"><UserPlus size={13} /> Find people</span>
        </GradientButton>
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

          {/* Mobile tab bar */}
          <div className="md:hidden flex border-b border-gray-100 bg-white">
            {(['community', 'direct'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold border-b-2 transition-all ${
                  tab === t ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-400'
                }`}
              >
                {t === 'community' ? <Users size={14} /> : <MessageCircle size={14} />}
                {t === 'community' ? 'Community' : 'Direct'}
                {t === 'direct' && unreadDms > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadDms}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Panel content */}
          {tab === 'community' ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <CommunalChatPanel />
            </div>
          ) : (
            <>
              {/* Desktop: "pick a conversation" prompt */}
              <div className="hidden md:flex flex-1 items-center justify-center">
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

              {/* Mobile: full DM list */}
              <div className="md:hidden flex-1 overflow-y-auto">
                <DirectSidebar
                  conversations={filtered}
                  loading={loadingConvs}
                  search={search}
                  onSearch={setSearch}
                  currentUserId={user?.id ?? null}
                  onPick={(id) => navigate(`/messages/${id}`)}
                  onNavigatePeople={() => navigate('/people')}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
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
