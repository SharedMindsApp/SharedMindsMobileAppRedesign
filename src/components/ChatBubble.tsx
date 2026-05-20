/**
 * ChatBubble — desktop-only floating communal chat widget
 *
 * Sits fixed in the bottom-right corner (above z-index of most content).
 * Collapsed: shows a circular button with the online count.
 * Expanded: slides up a 360×500px panel with the CommunalChatPanel inside.
 *
 * Hidden on mobile (< lg) — users access chat via the /messages tab instead.
 *
 * This intentionally does NOT appear on the /messages page itself (Layout
 * conditionally suppresses it when pathname starts with /messages) to avoid
 * a duplicate chat experience.
 */

import { useEffect, useRef, useState } from 'react';
import { MessageSquare, X, ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CommunalChatPanel } from '../core/features/chat/CommunalChatPanel';
import { useAuth } from '../core/auth/AuthProvider';

// ── Online count polling ──────────────────────────────────────────────────────

function useOnlineCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.rpc('fetch_online_user_count');
      if (typeof data === 'number') setCount(data);
    };
    fetch();
    const timer = setInterval(fetch, 60_000);
    return () => clearInterval(timer);
  }, []);

  return count;
}

// ── Unread message tracking ───────────────────────────────────────────────────
// Tracks messages that arrived while the bubble was closed.

function useUnreadChatCount(isOpen: boolean) {
  const [unread, setUnread] = useState(0);
  const lastSeenRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    if (isOpen) {
      // Clear unread count when opened + update last-seen timestamp
      setUnread(0);
      lastSeenRef.current = new Date().toISOString();
      return;
    }

    const channel = supabase
      .channel('chat_bubble_unread')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'global_chat_messages' },
        (payload) => {
          const msgTime = (payload.new as { created_at: string }).created_at;
          if (msgTime > lastSeenRef.current) {
            setUnread((n) => n + 1);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isOpen]);

  return unread;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatBubble() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const onlineCount = useOnlineCount();
  const unread = useUnreadChatCount(open);
  const panelRef = useRef<HTMLDivElement>(null);

  // Don't render on the Messages page (user has full chat there already)
  const isMessagesPage = location.pathname.startsWith('/messages');
  if (!user || isMessagesPage) return null;

  return (
    // Hidden on mobile (< lg). On desktop: fixed bottom-right.
    <div className="hidden lg:block fixed bottom-6 right-6 z-40">

      {/* Expanded panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute bottom-14 right-0 w-[360px] h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden
                     animate-in slide-in-from-bottom-4 fade-in duration-200"
        >
          {/* Panel header with close button */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-2">
              <MessageSquare size={15} className="text-cyan-500" />
              <span className="text-sm font-semibold text-gray-800">Community Chat</span>
              {onlineCount !== null && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  {onlineCount} online
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
              aria-label="Close chat"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Chat panel (compact mode, fixed height) */}
          <div className="flex-1 min-h-0 flex flex-col">
            <CommunalChatPanel compact listHeight="358px" />
          </div>
        </div>
      )}

      {/* Bubble button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`
          relative flex items-center gap-2 pl-4 pr-3 py-3 rounded-full shadow-lg
          transition-all duration-200 active:scale-95 font-semibold text-sm
          ${open
            ? 'bg-cyan-600 text-white hover:bg-cyan-700'
            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
          }
        `}
        aria-label={open ? 'Close community chat' : 'Open community chat'}
      >
        <MessageSquare size={16} className={open ? 'text-white' : 'text-cyan-500'} />
        <span>Community</span>

        {/* Online count pill */}
        {onlineCount !== null && !open && (
          <span className="flex items-center gap-1 bg-gray-100 text-gray-500 text-[11px] font-medium px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            {onlineCount}
          </span>
        )}

        {/* Unread badge (only when closed) */}
        {!open && unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1.5 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}

        {/* Close icon when open */}
        {open && <X size={14} className="text-white/80 ml-0.5" />}
      </button>
    </div>
  );
}
