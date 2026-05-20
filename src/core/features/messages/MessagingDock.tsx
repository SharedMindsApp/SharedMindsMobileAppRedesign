/**
 * MessagingDock — unified floating chat widget (LinkedIn-style).
 *
 * One pill in the bottom-right corner. One panel when expanded.
 * Two tabs inside: Community Chat (global room) + Direct (DMs).
 *
 * Replaces the previous separate MessagingDock + ChatBubble setup.
 *
 * Portalled to document.body so it floats above Jitsi and all page content.
 * Hidden on mobile — /messages page handles phone screens.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageCircle, X, ChevronDown, Send, Loader2, Search, Maximize2,
  ArrowLeft, Users,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/AuthProvider';
import {
  fetchConversations, fetchMessages, sendMessage, subscribeToMessages,
  markConversationRead, fetchTotalUnreadDms, subscribeToAnyIncomingDm,
  type DmConversation, type DmMessage,
} from '../../services/MessageService';
import { useMessagingDock } from './MessagingDockContext';
import { CommunalChatPanel } from '../chat/CommunalChatPanel';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function formatTimeAgoShort(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ── Online count (for the pill and panel header) ──────────────────────────────

function useOnlineCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.rpc('fetch_online_user_count');
      if (typeof data === 'number') setCount(data);
    };
    fetch();
    const t = setInterval(fetch, 60_000);
    return () => clearInterval(t);
  }, []);
  return count;
}

// ── Tab type ──────────────────────────────────────────────────────────────────

type Tab = 'community' | 'direct';

// ── Main export ───────────────────────────────────────────────────────────────

export function MessagingDock() {
  const { user } = useAuth();
  const location = useLocation();
  const {
    dockOpen, setDockOpen, toggleDock,
    activeConversationId, openConversation, closeConversation, isMobile,
  } = useMessagingDock();

  const [tab, setTab] = useState<Tab>('community');
  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [unreadDms, setUnreadDms] = useState(0);
  const onlineCount = useOnlineCount();

  // Unread chat messages while dock is closed
  const [unreadChat, setUnreadChat] = useState(0);
  const chatLastSeenRef = useRef<string>(new Date().toISOString());
  useEffect(() => {
    if (dockOpen && tab === 'community') {
      setUnreadChat(0);
      chatLastSeenRef.current = new Date().toISOString();
    }
  }, [dockOpen, tab]);
  useEffect(() => {
    if (dockOpen && tab === 'community') return;
    const ch = supabase
      .channel('dock_chat_unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_chat_messages' }, (p) => {
        if ((p.new as { created_at: string }).created_at > chatLastSeenRef.current) {
          setUnreadChat((n) => n + 1);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [dockOpen, tab]);

  // Fetch DM conversations when dock opens
  useEffect(() => {
    if (!user || !dockOpen) return;
    setLoadingConvs(true);
    fetchConversations()
      .then((c) => setConversations(c))
      .finally(() => setLoadingConvs(false));
  }, [dockOpen, user]);

  // Global unread DM count
  useEffect(() => {
    if (!user) return;
    const refresh = () => fetchTotalUnreadDms().then(setUnreadDms).catch(() => {});
    refresh();
    const unsub = subscribeToAnyIncomingDm(() => {
      refresh();
      if (dockOpen) fetchConversations().then(setConversations).catch(() => {});
    });
    return () => unsub();
  }, [user, dockOpen]);

  // Don't show on mobile or on the /messages page (user already has full chat there)
  if (!user) return null;
  if (isMobile) return null;
  if (location.pathname.startsWith('/messages')) return null;

  const totalUnread = unreadDms + unreadChat;

  return createPortal(
    <>
      {/* Main dock */}
      <div
        className="fixed z-[60] flex flex-col items-end gap-3"
        style={{ right: '1.25rem', bottom: '1.25rem' }}
      >
        {dockOpen ? (
          <DockPanel
            tab={tab}
            onTabChange={setTab}
            conversations={conversations}
            loading={loadingConvs}
            unreadDms={unreadDms}
            onlineCount={onlineCount}
            currentUserId={user.id}
            onClose={() => setDockOpen(false)}
            onPickConversation={openConversation}
            activeConversationId={activeConversationId}
          />
        ) : (
          <CollapsedPill
            unread={totalUnread}
            onlineCount={onlineCount}
            onClick={toggleDock}
          />
        )}
      </div>

      {/* Individual DM popover — opens to the left of the dock */}
      {activeConversationId && (
        <ChatPopover
          key={activeConversationId}
          conversationId={activeConversationId}
          onClose={closeConversation}
        />
      )}
    </>,
    document.body,
  );
}

// ── Collapsed pill ────────────────────────────────────────────────────────────

function CollapsedPill({
  unread, onlineCount, onClick,
}: {
  unread: number;
  onlineCount: number | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex items-center gap-2 pl-3.5 pr-4 py-2.5 rounded-full bg-white shadow-lg ring-1 ring-gray-200 hover:shadow-xl hover:ring-gray-300 transition-all active:scale-95"
    >
      <MessageCircle size={15} className="text-cyan-500" />
      <span className="text-sm font-bold text-gray-800">Chat</span>

      {/* Online count */}
      {onlineCount !== null && (
        <span className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          {onlineCount}
        </span>
      )}

      {/* Unread badge */}
      {unread > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1.5 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}

// ── Expanded panel ────────────────────────────────────────────────────────────

function DockPanel({
  tab, onTabChange, conversations, loading, unreadDms, onlineCount,
  currentUserId, onClose, onPickConversation, activeConversationId,
}: {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  conversations: DmConversation[];
  loading: boolean;
  unreadDms: number;
  onlineCount: number | null;
  currentUserId: string;
  onClose: () => void;
  onPickConversation: (id: string) => void;
  activeConversationId: string | null;
}) {
  const navigate = useNavigate();

  return (
    <div className="w-[360px] bg-white rounded-2xl shadow-2xl ring-1 ring-gray-200 flex flex-col overflow-hidden"
         style={{ height: '520px' }}>

      {/* ── Panel header ── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <MessageCircle size={14} className="text-cyan-500" />
          <span className="text-sm font-bold text-gray-800">Chat</span>
          {onlineCount !== null && (
            <span className="flex items-center gap-1 text-[11px] text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              {onlineCount} online
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => { onClose(); navigate('/messages'); }}
            className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
            title="Open full Chat page"
          >
            <Maximize2 size={11} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
            aria-label="Minimise"
          >
            <ChevronDown size={13} />
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="shrink-0 flex border-b border-gray-100">
        {(['community', 'direct'] as Tab[]).map((t) => {
          const isActive = tab === t;
          const label = t === 'community' ? 'Community' : 'Direct';
          const Icon  = t === 'community' ? Users : MessageCircle;
          const badge = t === 'direct' && unreadDms > 0 ? unreadDms : 0;
          return (
            <button
              key={t}
              onClick={() => onTabChange(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border-b-2 transition-all ${
                isActive ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={12} />
              {label}
              {badge > 0 && (
                <span className="min-w-[14px] h-[14px] px-1 rounded-full bg-cyan-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 min-h-0 flex flex-col">
        {tab === 'community' ? (
          <CommunalChatPanel compact listHeight="390px" />
        ) : (
          <DirectTab
            conversations={conversations}
            loading={loading}
            currentUserId={currentUserId}
            activeConversationId={activeConversationId}
            onPick={onPickConversation}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

// ── Direct Messages tab content ───────────────────────────────────────────────

function DirectTab({
  conversations, loading, currentUserId, activeConversationId, onPick, onClose,
}: {
  conversations: DmConversation[];
  loading: boolean;
  currentUserId: string;
  activeConversationId: string | null;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = conversations.filter(
    (c) => !search || c.other_user.display_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      {conversations.length > 3 && (
        <div className="shrink-0 px-3 py-2 border-b border-gray-50">
          <div className="relative">
            <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-800 outline-none focus:ring-1 focus:ring-cyan-300 placeholder:text-gray-400"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={16} className="animate-spin text-gray-400" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-10 px-6">
            <MessageCircle size={22} className="mx-auto mb-2 text-gray-300" />
            <p className="text-xs font-bold text-gray-700 mb-1">No direct messages yet</p>
            <button
              type="button"
              onClick={() => { onClose(); navigate('/people'); }}
              className="text-[11px] font-bold text-cyan-600 hover:underline mt-1"
            >
              Find people →
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-400">
            No conversations match "{search}"
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((c) => (
              <ConversationRow
                key={c.id}
                conv={c}
                currentUserId={currentUserId}
                active={c.id === activeConversationId}
                onClick={() => onPick(c.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationRow({
  conv, currentUserId, active, onClick,
}: {
  conv: DmConversation;
  currentUserId: string;
  active: boolean;
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
      className={`w-full text-left flex items-center gap-2.5 px-3 py-2 transition-colors ${
        active ? 'bg-cyan-50' : isUnread ? 'bg-cyan-50/40 hover:bg-cyan-50' : 'hover:bg-gray-50'
      }`}
    >
      {conv.other_user.avatar_url ? (
        <img src={conv.other_user.avatar_url} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
      ) : (
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradFor(conv.other_user.display_name)} flex items-center justify-center text-white font-extrabold text-xs shrink-0`}>
          {conv.other_user.display_name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs truncate ${isUnread ? 'font-extrabold text-gray-900' : 'font-semibold text-gray-700'}`}>
            {conv.other_user.display_name}
          </p>
          {conv.last_message && (
            <span className="text-[9px] text-gray-400 shrink-0 tabular-nums">
              {formatTimeAgoShort(conv.last_message.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-[11px] truncate ${isUnread ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>
            {lastByMe && 'You: '}{truncated}
          </p>
          {isUnread && (
            <span className="shrink-0 min-w-[14px] h-[14px] px-1 rounded-full bg-cyan-500 text-white text-[8px] font-bold flex items-center justify-center">
              {conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Individual DM popover (opens to the left of the dock) ────────────────────

function ChatPopover({
  conversationId, onClose,
}: {
  conversationId: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [conv, setConv] = useState<DmConversation | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchConversations().then((rows) => {
      if (!cancelled) setConv(rows.find((r) => r.id === conversationId) ?? null);
    });
    return () => { cancelled = true; };
  }, [conversationId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMessages(conversationId)
      .then((rows) => { if (!cancelled) setMessages(rows); })
      .finally(() => { if (!cancelled) setLoading(false); });
    markConversationRead(conversationId);

    const unsub = subscribeToMessages(conversationId, (msg) => {
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      if (msg.sender_id !== user?.id) markConversationRead(conversationId);
    });
    return () => { cancelled = true; unsub(); };
  }, [conversationId, user?.id]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  async function handleSend() {
    if (!draft.trim() || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft('');
    try {
      const msg = await sendMessage(conversationId, text);
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
    } catch {
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed z-[61] w-[340px] h-[480px] bg-white rounded-2xl shadow-2xl ring-1 ring-gray-200 flex flex-col overflow-hidden"
      style={{ right: 'calc(1.25rem + 360px + 0.75rem)', bottom: '1.25rem' }}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 border-b border-gray-100">
        {conv ? (
          <button
            type="button"
            onClick={() => navigate(`/profile/${conv.other_user.id}`)}
            className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity"
          >
            {conv.other_user.avatar_url ? (
              <img src={conv.other_user.avatar_url} alt="" className="w-7 h-7 rounded-xl object-cover shrink-0" />
            ) : (
              <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${gradFor(conv.other_user.display_name)} flex items-center justify-center text-white font-extrabold text-[10px] shrink-0`}>
                {conv.other_user.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 text-left">
              <p className="text-xs font-bold text-gray-800 truncate">{conv.other_user.display_name}</p>
              {conv.other_user.work_type && (
                <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold leading-none">
                  {conv.other_user.work_type}
                </p>
              )}
            </div>
          </button>
        ) : <div className="flex-1" />}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => navigate(`/messages/${conversationId}`)}
            className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
            title="Open full chat"
          >
            <Maximize2 size={11} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
            aria-label="Close"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={14} className="animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-xs font-bold text-gray-700 mb-1">Say hi 👋</p>
            <p className="text-[11px] text-gray-400">No messages yet — break the ice.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] rounded-2xl px-3 py-1.5 ${
                  isMine
                    ? 'bg-cyan-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  <p className="text-xs leading-snug whitespace-pre-wrap break-words">{m.content}</p>
                  <p className={`text-[9px] mt-0.5 ${isMine ? 'text-white/60' : 'text-gray-400'} text-right`}>
                    {formatTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 px-2.5 py-2 border-t border-gray-100">
        <div className="flex items-end gap-1.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Message…"
            rows={1}
            maxLength={2000}
            className="flex-1 resize-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 max-h-24 placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="shrink-0 w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-600 text-white flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all"
            aria-label="Send"
          >
            {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          </button>
        </div>
      </div>
    </div>
  );
}
