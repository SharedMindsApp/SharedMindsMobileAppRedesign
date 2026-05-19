/**
 * MessagingDock — persistent floating chat dock (LinkedIn-style).
 *
 * Sits at the bottom-right of the viewport on desktop. Two parts:
 *   1. The dock pill / panel — collapsed shows "Messages · N",
 *      expanded shows a 340px conversation list.
 *   2. A chat popover — opens beside the dock when you tap a conversation.
 *
 * Both are portal'd to document.body with z-index above session overlays
 * so the dock keeps working DURING a Jitsi call. Hidden entirely on
 * mobile — the full-page /messages routes handle phone screens.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageCircle, X, ChevronDown, Send, Loader2, Search, Maximize2, ArrowLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import {
  fetchConversations, fetchMessages, sendMessage, subscribeToMessages,
  markConversationRead, fetchTotalUnreadDms, subscribeToAnyIncomingDm,
  type DmConversation, type DmMessage,
} from '../../services/MessageService';
import { useMessagingDock } from './MessagingDockContext';

// ── Helpers ─────────────────────────────────────────────────────

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

// ── Main dock ───────────────────────────────────────────────────

export function MessagingDock() {
  const { user } = useAuth();
  const { dockOpen, setDockOpen, toggleDock, activeConversationId, openConversation, isMobile } = useMessagingDock();

  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);

  // Fetch conversations whenever the dock opens — keeps the list fresh
  useEffect(() => {
    if (!user || !dockOpen) return;
    setLoading(true);
    fetchConversations().then((c) => { setConversations(c); setLoading(false); }).catch(() => setLoading(false));
  }, [dockOpen, user]);

  // Global unread count for the collapsed pill — refreshes on any incoming DM
  useEffect(() => {
    if (!user) return;
    const refresh = () => fetchTotalUnreadDms().then(setUnread).catch(() => {});
    refresh();
    const unsub = subscribeToAnyIncomingDm(() => {
      refresh();
      // If the dock is open, also refresh the list so previews update
      if (dockOpen) {
        fetchConversations().then(setConversations).catch(() => {});
      }
    });
    return () => unsub();
  }, [user, dockOpen]);

  if (!user) return null;
  if (isMobile) return null; // Mobile uses /messages routes

  return createPortal(
    <>
      {/* Dock pill / expanded panel — bottom-right */}
      <div
        className="fixed z-[60] flex flex-col items-end gap-3"
        style={{ right: '1rem', bottom: '1rem' }}
      >
        {dockOpen ? (
          <DockExpanded
            conversations={conversations}
            loading={loading}
            unread={unread}
            currentUserId={user.id}
            onClose={() => setDockOpen(false)}
            onPick={openConversation}
            activeConversationId={activeConversationId}
          />
        ) : (
          <DockCollapsedPill unread={unread} onClick={toggleDock} />
        )}
      </div>

      {/* Active chat popover — sits to the left of the dock */}
      {activeConversationId && (
        <ChatPopover key={activeConversationId} conversationId={activeConversationId} />
      )}
    </>,
    document.body,
  );
}

// ── Collapsed pill ──────────────────────────────────────────────

function DockCollapsedPill({ unread, onClick }: { unread: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full bg-surface shadow-lg ring-1 ring-surface-container/60 hover:shadow-xl transition-all active:scale-95"
    >
      <MessageCircle size={15} className="text-primary" />
      <span className="text-sm font-bold stitch-text-primary">Messages</span>
      {unread > 0 && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold tabular-nums">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}

// ── Expanded panel — conversation list ──────────────────────────

function DockExpanded({
  conversations, loading, unread, currentUserId, onClose, onPick, activeConversationId,
}: {
  conversations: DmConversation[];
  loading: boolean;
  unread: number;
  currentUserId: string;
  onClose: () => void;
  onPick: (id: string) => void;
  activeConversationId: string | null;
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = conversations.filter(
    (c) => !search || c.other_user.display_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-[340px] max-h-[70vh] bg-surface rounded-2xl shadow-2xl ring-1 ring-surface-container/60 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2.5 border-b border-surface-container/60">
        <div className="flex items-center gap-2">
          <MessageCircle size={14} className="text-primary" />
          <p className="text-sm font-extrabold stitch-text-primary">Messages</p>
          {unread > 0 && (
            <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold tabular-nums">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => { onClose(); navigate('/messages'); }}
            className="w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center stitch-text-secondary"
            title="Open full messages page"
          >
            <Maximize2 size={11} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center stitch-text-secondary"
            aria-label="Minimise messages"
          >
            <ChevronDown size={13} />
          </button>
        </div>
      </div>

      {/* Search */}
      {conversations.length > 3 && (
        <div className="shrink-0 px-3 py-2 border-b border-surface-container/40">
          <div className="relative">
            <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 stitch-text-secondary pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages…"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-container-low text-xs stitch-text-primary outline-none focus:ring-1 focus:ring-primary/40 placeholder:stitch-text-secondary"
            />
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={16} className="animate-spin stitch-text-secondary" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-10 px-6">
            <MessageCircle size={22} className="mx-auto mb-2 stitch-text-secondary opacity-50" />
            <p className="text-xs font-bold stitch-text-primary mb-1">No conversations yet</p>
            <button
              type="button"
              onClick={() => { onClose(); navigate('/people'); }}
              className="text-[11px] font-bold text-primary hover:underline mt-1"
            >
              Find people →
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-6 text-xs stitch-text-secondary">
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
        active ? 'bg-primary/8' : isUnread ? 'bg-primary/3 hover:bg-primary/5' : 'hover:bg-surface-container-low'
      }`}
    >
      {conv.other_user.avatar_url ? (
        <img src={conv.other_user.avatar_url} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
      ) : (
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradFor(conv.other_user.display_name)} flex items-center justify-center text-white font-extrabold text-xs shrink-0 shadow-sm`}>
          {conv.other_user.display_name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs truncate ${isUnread ? 'font-extrabold stitch-text-primary' : 'font-bold stitch-text-primary'}`}>
            {conv.other_user.display_name}
          </p>
          {conv.last_message && (
            <span className="text-[9px] stitch-text-secondary shrink-0 tabular-nums">
              {formatTimeAgoShort(conv.last_message.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-[11px] truncate ${isUnread ? 'stitch-text-primary font-semibold' : 'stitch-text-secondary'}`}>
            {lastByMe && 'You: '}{truncated}
          </p>
          {isUnread && (
            <span className="shrink-0 inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full bg-primary text-white text-[8px] font-extrabold tabular-nums">
              {conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Chat popover — single conversation ──────────────────────────

function ChatPopover({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const { closeConversation } = useMessagingDock();
  const navigate = useNavigate();

  const [conv, setConv] = useState<DmConversation | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Resolve conversation metadata
  useEffect(() => {
    let cancelled = false;
    fetchConversations().then((rows) => {
      if (cancelled) return;
      setConv(rows.find((r) => r.id === conversationId) ?? null);
    });
    return () => { cancelled = true; };
  }, [conversationId]);

  // Load + subscribe
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

  // Auto-scroll on new messages
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
      className="fixed z-[61] w-[340px] h-[480px] bg-surface rounded-2xl shadow-2xl ring-1 ring-surface-container/60 flex flex-col overflow-hidden"
      style={{ right: 'calc(1rem + 340px + 0.75rem)', bottom: '1rem' }}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-surface-container/60">
        <button
          type="button"
          onClick={closeConversation}
          className="w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center stitch-text-secondary lg:hidden"
          aria-label="Close chat"
        >
          <ArrowLeft size={13} />
        </button>
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
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-extrabold stitch-text-primary truncate">{conv.other_user.display_name}</p>
              {conv.other_user.work_type && (
                <p className="text-[9px] stitch-text-secondary uppercase tracking-wider font-bold leading-none">
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
            className="w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center stitch-text-secondary"
            title="Open full chat page"
          >
            <Maximize2 size={11} />
          </button>
          <button
            type="button"
            onClick={closeConversation}
            className="w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center stitch-text-secondary"
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
            <Loader2 size={14} className="animate-spin stitch-text-secondary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-xs font-bold stitch-text-primary mb-1">Say hi 👋</p>
            <p className="text-[11px] stitch-text-secondary leading-relaxed">
              No messages yet — break the ice.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] rounded-2xl px-3 py-1.5 ${
                  isMine
                    ? 'stitch-btn--primary text-white rounded-br-sm'
                    : 'bg-surface-container-low stitch-text-primary rounded-bl-sm'
                }`}>
                  <p className="text-xs leading-snug whitespace-pre-wrap break-words">{m.content}</p>
                  <p className={`text-[9px] mt-0.5 ${isMine ? 'text-white/60' : 'stitch-text-secondary'} text-right`}>
                    {formatTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 px-2.5 py-2 border-t border-surface-container/60">
        <div className="flex items-end gap-1.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message…"
            rows={1}
            maxLength={2000}
            className="flex-1 resize-none bg-surface-container-low rounded-2xl px-3 py-1.5 text-xs stitch-text-primary outline-none focus:ring-1 focus:ring-primary/40 max-h-24 placeholder:stitch-text-secondary"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="shrink-0 w-8 h-8 rounded-full stitch-btn--primary text-white flex items-center justify-center disabled:opacity-50 active:scale-90 transition-all"
            aria-label="Send"
          >
            {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          </button>
        </div>
      </div>
    </div>
  );
}
