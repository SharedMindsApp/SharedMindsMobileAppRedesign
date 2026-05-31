/**
 * SessionChat — Zoom-style in-session chat.
 *
 * Self-contained: renders a floating chat button (bottom-right, with an
 * unread badge) and, when opened, a messenger panel scoped to the session.
 *
 * Ephemeral — messages ride a Supabase Realtime *broadcast* channel keyed by
 * the session id (no table, no persistence; gone when the session ends, like
 * a Zoom in-meeting chat). Works for everyone on the session page (lobby AND
 * in the live call). The channel stays subscribed while the panel is closed
 * so the unread badge keeps counting.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Send, X, MessageSquare } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { SessionProfileSheet } from './SessionProfileSheet';

interface ChatMessage {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  text: string;
}

interface SessionChatProps {
  sessionId: string;
  currentUserId: string;
  displayName: string;
  avatarUrl?: string | null;
  /** Fires whenever the panel opens/closes, so the page can reflow the video
   *  (on desktop the panel is a right drawer that would otherwise cover a
   *  centred participant). */
  onOpenChange?: (open: boolean) => void;
}

export function SessionChat({ sessionId, currentUserId, displayName, avatarUrl = null, onOpenChange }: SessionChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [draft, setDraft] = useState('');
  // Tap a sender (avatar/name) to peek their public profile + projects.
  const [peek, setPeek] = useState<{ userId: string; name: string; avatarUrl: string | null } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const openRef = useRef(open); openRef.current = open;
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const seqRef = useRef(0);

  // Tell the parent when we open/close so it can reflow the video layout.
  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);

  // Subscribe once; stays up while the panel is closed so unread keeps counting.
  useEffect(() => {
    const channel = supabase.channel(`session-chat:${sessionId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;
    channel
      .on('broadcast', { event: 'msg' }, ({ payload }) => {
        setMessages((prev) => [...prev, payload as ChatMessage]);
        if (!openRef.current) setUnread((n) => n + 1);
      })
      .subscribe();
    return () => { channelRef.current = null; supabase.removeChannel(channel); };
  }, [sessionId]);

  useEffect(() => {
    if (open) { setUnread(0); listEndRef.current?.scrollIntoView({ block: 'end' }); }
  }, [open, messages.length]);

  function send() {
    const text = draft.trim();
    if (!text) return;
    seqRef.current += 1;
    const msg: ChatMessage = {
      id: `${currentUserId}-${seqRef.current}`,
      userId: currentUserId,
      name: displayName,
      avatarUrl,
      text: text.slice(0, 1000),
    };
    setMessages((prev) => [...prev, msg]);
    channelRef.current?.send({ type: 'broadcast', event: 'msg', payload: msg });
    setDraft('');
  }

  return createPortal(
    <>
      {/* Floating toggle — bottom-right, above the music pill */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open session chat"
          title="Session chat"
          className="fixed right-4 bottom-24 z-[95] w-12 h-12 rounded-full bg-violet-500 hover:bg-violet-600 text-white shadow-xl grid place-items-center active:scale-95 transition-all"
        >
          <MessageSquare size={20} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 ring-2 ring-[#1a1a2e] text-white text-[10px] font-extrabold grid place-items-center leading-none">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed inset-0 z-[105] flex items-end sm:items-stretch sm:justify-end bg-black/40 sm:bg-transparent sm:pointer-events-none" onClick={() => setOpen(false)}>
          <div
            className="w-full sm:w-[360px] sm:h-full max-h-[70vh] sm:max-h-none bg-[#15152a] sm:border-l border-white/10 rounded-t-3xl sm:rounded-none shadow-2xl flex flex-col pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-white">
                <MessageSquare size={16} className="text-violet-300" />
                <span className="text-sm font-bold">Session chat</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="w-8 h-8 grid place-items-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2.5">
              {messages.length === 0 ? (
                <p className="text-center text-xs text-white/40 mt-6 leading-relaxed px-4">
                  Messages are visible to everyone in this session and disappear when it ends.
                </p>
              ) : (
                messages.map((m, i) => {
                  const mine = m.userId === currentUserId;
                  const peekable = !mine && !!m.userId;
                  const openPeek = peekable ? () => setPeek({ userId: m.userId, name: m.name, avatarUrl: m.avatarUrl }) : undefined;
                  return (
                    <div key={`${m.id}-${i}`} className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                      {!mine && (
                        <button
                          type="button"
                          onClick={openPeek}
                          disabled={!peekable}
                          className={`shrink-0 ${peekable ? 'cursor-pointer active:scale-90 transition' : ''}`}
                          aria-label={peekable ? `View ${m.name}'s profile` : undefined}
                        >
                          {m.avatarUrl
                            ? <img src={m.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                            : <div className="w-6 h-6 rounded-full bg-violet-500/40 grid place-items-center text-[10px] font-bold text-white">{(m.name || '?').charAt(0).toUpperCase()}</div>}
                        </button>
                      )}
                      <div className={`max-w-[78%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                        {!mine && (
                          <button
                            type="button"
                            onClick={openPeek}
                            disabled={!peekable}
                            className={`text-[10px] text-white/40 mb-0.5 px-1 ${peekable ? 'hover:text-white/70 hover:underline cursor-pointer' : ''}`}
                          >
                            {m.name}
                          </button>
                        )}
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
        </div>
      )}

      {peek && (
        <SessionProfileSheet
          userId={peek.userId}
          fallbackName={peek.name}
          fallbackAvatar={peek.avatarUrl}
          onClose={() => setPeek(null)}
        />
      )}
    </>,
    document.body,
  );
}
