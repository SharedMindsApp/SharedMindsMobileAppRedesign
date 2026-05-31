/**
 * SessionChat — Zoom-style in-session chat panel.
 *
 * Ephemeral, per-session chat for everyone currently on the session (lobby
 * AND in the live call). Messages ride a Supabase Realtime *broadcast*
 * channel keyed by the session id — no table, no persistence, gone when the
 * session ends (exactly like a Zoom in-meeting chat).
 *
 * Stays mounted (subscribed) even while collapsed so it can track unread
 * count; renders the panel only when `open`.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Send, X, MessageSquare } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface ChatMessage {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  text: string;
  at: number;
}

interface SessionChatProps {
  sessionId: string;
  currentUserId: string;
  displayName: string;
  avatarUrl?: string | null;
  open: boolean;
  onClose: () => void;
  /** Bumped with the unread count while the panel is closed (drives a badge). */
  onUnreadChange?: (count: number) => void;
}

export function SessionChat({
  sessionId, currentUserId, displayName, avatarUrl = null, open, onClose, onUnreadChange,
}: SessionChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const openRef = useRef(open); openRef.current = open;
  const unreadRef = useRef(0);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const onUnreadRef = useRef(onUnreadChange); onUnreadRef.current = onUnreadChange;

  // ── Subscribe to the session's broadcast channel (stays up while closed) ──
  useEffect(() => {
    const channel = supabase.channel(`session-chat:${sessionId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;
    channel
      .on('broadcast', { event: 'msg' }, ({ payload }) => {
        const m = payload as ChatMessage;
        setMessages((prev) => [...prev, m]);
        if (!openRef.current) {
          unreadRef.current += 1;
          onUnreadRef.current?.(unreadRef.current);
        }
      })
      .subscribe();
    return () => { channelRef.current = null; supabase.removeChannel(channel); };
  }, [sessionId]);

  // Clear unread + scroll to bottom whenever the panel is open.
  useEffect(() => {
    if (open) {
      unreadRef.current = 0;
      onUnreadRef.current?.(0);
      listEndRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [open, messages.length]);

  function send() {
    const text = draft.trim();
    if (!text) return;
    const msg: ChatMessage = {
      id: `${currentUserId}-${messages.length}-${text.length}`,
      userId: currentUserId,
      name: displayName,
      avatarUrl,
      text: text.slice(0, 1000),
      at: 0, // stamped on display from arrival order; avoid Date.now() determinism concerns
    };
    setMessages((prev) => [...prev, msg]);     // optimistic (self: false won't echo)
    channelRef.current?.send({ type: 'broadcast', event: 'msg', payload: msg });
    setDraft('');
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[105] flex items-end sm:items-stretch sm:justify-end bg-black/40 sm:bg-transparent sm:pointer-events-none" onClick={onClose}>
      <div
        className="w-full sm:w-[360px] sm:h-full max-h-[70vh] sm:max-h-none bg-[#15152a] sm:border-l border-white/10 rounded-t-3xl sm:rounded-none shadow-2xl flex flex-col pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-white">
            <MessageSquare size={16} className="text-violet-300" />
            <span className="text-sm font-bold">Session chat</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close chat" className="w-8 h-8 grid place-items-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2.5">
          {messages.length === 0 ? (
            <p className="text-center text-xs text-white/40 mt-6 leading-relaxed px-4">
              Messages are visible to everyone in this session and disappear when it ends.
            </p>
          ) : (
            messages.map((m, i) => {
              const mine = m.userId === currentUserId;
              return (
                <div key={`${m.id}-${i}`} className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                  {!mine && (
                    m.avatarUrl
                      ? <img src={m.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                      : <div className="w-6 h-6 rounded-full bg-violet-500/40 grid place-items-center text-[10px] font-bold text-white shrink-0">{(m.name || '?').charAt(0).toUpperCase()}</div>
                  )}
                  <div className={`max-w-[78%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!mine && <span className="text-[10px] text-white/40 mb-0.5 px-1">{m.name}</span>}
                    <div className={`px-3 py-2 rounded-2xl text-sm leading-snug break-words ${mine ? 'bg-violet-500 text-white rounded-br-md' : 'bg-white/10 text-white/90 rounded-bl-md'}`}>
                      {m.text}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={listEndRef} />
        </div>

        {/* Composer */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-3 border-t border-white/10">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message everyone…"
            maxLength={1000}
            className="flex-1 px-3.5 py-2.5 rounded-full bg-white/5 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-400/40 ring-1 ring-white/10"
          />
          <button
            type="button"
            onClick={send}
            disabled={!draft.trim()}
            aria-label="Send"
            className="w-10 h-10 shrink-0 grid place-items-center rounded-full bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-40 transition-colors active:scale-95"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
