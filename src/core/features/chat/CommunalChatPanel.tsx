/**
 * CommunalChatPanel
 *
 * The one global chat room shared by all SharedMinds users.
 * Realtime: new messages arrive via Supabase channel subscription.
 * Presence: "● X online" derived from profiles.last_seen_at.
 *
 * Works in two contexts:
 *   1. Full-page panel inside /messages (Community tab)
 *   2. Popover body inside the desktop ChatBubble widget
 *
 * Pass `compact` for the bubble context (smaller header, less padding).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Send, Users, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/AuthProvider';
import { Avatar } from '../../ui/Avatar';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id:           string;
  user_id:      string;
  content:      string;
  created_at:   string;
  display_name: string;
  avatar_url:   string | null;
  last_seen_at: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Group consecutive messages by the same user (max 5-min gap) so we only
// show the avatar + name once at the start of each run.
function shouldShowHeader(messages: ChatMessage[], index: number): boolean {
  if (index === 0) return true;
  const prev = messages[index - 1];
  const curr = messages[index];
  if (prev.user_id !== curr.user_id) return true;
  const gap = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
  return gap > 5 * 60 * 1000; // more than 5 minutes → new group
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CommunalChatPanelProps {
  /** Compact layout for the desktop bubble popover */
  compact?: boolean;
  /** Fixed height for the message list (default: flex-1 / fills parent) */
  listHeight?: string;
}

export function CommunalChatPanel({ compact = false, listHeight }: CommunalChatPanelProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);

  // ── Fetch initial messages ──────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('global_chat_messages')
      .select(`
        id, user_id, content, created_at,
        profiles!inner(display_name, avatar_url, last_seen_at)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('CommunalChat: fetch error', error);
      setLoading(false);
      return;
    }

    const rows: ChatMessage[] = ((data ?? []) as any[])
      .map((r) => ({
        id:           r.id,
        user_id:      r.user_id,
        content:      r.content,
        created_at:   r.created_at,
        display_name: r.profiles?.display_name ?? 'Someone',
        avatar_url:   r.profiles?.avatar_url ?? null,
        last_seen_at: r.profiles?.last_seen_at ?? null,
      }))
      .reverse(); // oldest first for display

    setMessages(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // ── Realtime subscription ───────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('global_chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'global_chat_messages' },
        async (payload) => {
          const newRow = payload.new as { id: string; user_id: string; content: string; created_at: string };

          // Fetch the sender's profile for display
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, last_seen_at')
            .eq('id', newRow.user_id)
            .single();

          const msg: ChatMessage = {
            id:           newRow.id,
            user_id:      newRow.user_id,
            content:      newRow.content,
            created_at:   newRow.created_at,
            display_name: profileData?.display_name ?? 'Someone',
            avatar_url:   profileData?.avatar_url   ?? null,
            last_seen_at: profileData?.last_seen_at ?? null,
          };

          setMessages((prev) => [...prev, msg]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Online count (refreshes every 60s) ─────────────────────────────────────
  useEffect(() => {
    const fetchCount = async () => {
      const { data } = await supabase.rpc('fetch_online_user_count');
      if (typeof data === 'number') setOnlineCount(data);
    };
    fetchCount();
    const timer = setInterval(fetchCount, 60_000);
    return () => clearInterval(timer);
  }, []);

  // ── Auto-scroll to bottom when new messages arrive ─────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send ────────────────────────────────────────────────────────────────────
  const send = useCallback(async () => {
    const content = draft.trim();
    if (!content || !user?.id || sending) return;

    setSending(true);
    setDraft('');

    const { error } = await supabase
      .from('global_chat_messages')
      .insert({ user_id: user.id, content });

    if (error) {
      console.error('CommunalChat: send error', error);
      setDraft(content); // restore on failure
    }

    setSending(false);
    inputRef.current?.focus();
  }, [draft, user?.id, sending]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const listStyle = listHeight ? { height: listHeight } : undefined;
  const listClass = listHeight
    ? 'overflow-y-auto'
    : 'flex-1 overflow-y-auto min-h-0';

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className={`flex-shrink-0 flex items-center justify-between border-b border-gray-100 ${compact ? 'px-4 py-2.5' : 'px-5 py-3'}`}>
        <div className="flex items-center gap-2">
          <span className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
            Community Chat
          </span>
          <span className="text-gray-400 text-xs">· global room</span>
        </div>
        {onlineCount !== null && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>{onlineCount} online</span>
          </div>
        )}
      </div>

      {/* Message list */}
      <div
        ref={listRef}
        className={`${listClass} ${compact ? 'px-3 py-2' : 'px-4 py-3'} space-y-0.5`}
        style={listStyle}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <Users className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500 font-medium">No messages yet</p>
            <p className="text-xs text-gray-400 mt-1">Be the first to say something 👋</p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isOwn     = msg.user_id === user?.id;
              const showHead  = shouldShowHeader(messages, i);

              return (
                <div key={msg.id} className={showHead ? 'mt-3 first:mt-0' : 'mt-0.5'}>
                  {showHead && (
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar
                        displayName={msg.display_name}
                        avatarUrl={msg.avatar_url}
                        size="sm"
                        showPresence
                        lastSeenAt={msg.last_seen_at}
                      />
                      <span className={`text-xs font-semibold ${isOwn ? 'text-cyan-600' : 'text-gray-700'}`}>
                        {isOwn ? 'You' : msg.display_name}
                      </span>
                      <span className="text-[11px] text-gray-400">{formatTime(msg.created_at)}</span>
                    </div>
                  )}
                  <div className={showHead ? 'ml-9' : 'ml-9'}>
                    <p className={`text-sm leading-relaxed text-gray-800 break-words whitespace-pre-wrap`}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Composer */}
      <div className={`flex-shrink-0 border-t border-gray-100 ${compact ? 'p-2' : 'p-3'}`}>
        <div className="flex items-end gap-2 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100 transition-all px-3 py-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 500))}
            onKeyDown={handleKeyDown}
            placeholder="Say something to the room…"
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-800 placeholder-gray-400 leading-5 max-h-24 overflow-y-auto"
            style={{ minHeight: '20px' }}
          />
          <button
            onClick={send}
            disabled={!draft.trim() || sending}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Send className="w-3.5 h-3.5 text-white" />
            )}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1 text-right">
          {draft.length}/500 · Enter to send
        </p>
      </div>
    </div>
  );
}
