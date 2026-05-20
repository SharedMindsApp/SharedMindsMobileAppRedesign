/**
 * MessageThreadPage — /messages/:conversationId
 *
 * Live 1:1 chat view. Subscribes to dm_messages inserts for realtime.
 * Marks the conversation read on mount + on every incoming message.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, Flag } from 'lucide-react';
import {
  fetchMessages, sendMessage, subscribeToMessages, markConversationRead,
  fetchConversations, type DmMessage, type DmConversation,
} from '../../services/MessageService';
import { useAuth } from '../../auth/AuthProvider';
import { ReportModal } from '../moderation/ReportModal';

interface ReportTarget { id: string; userId: string; content: string; }

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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function shouldShowDateSeparator(prev: DmMessage | undefined, curr: DmMessage): boolean {
  if (!prev) return true;
  const a = new Date(prev.created_at);
  const b = new Date(curr.created_at);
  return a.toDateString() !== b.toDateString();
}

function formatDateHeader(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

export function MessageThreadPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [conv, setConv] = useState<DmConversation | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Resolve the conversation metadata (we already have the list cached server-side)
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    fetchConversations().then((rows) => {
      if (cancelled) return;
      setConv(rows.find((r) => r.id === conversationId) ?? null);
    });
    return () => { cancelled = true; };
  }, [conversationId]);

  // Load + mark read + subscribe
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    setLoading(true);

    fetchMessages(conversationId)
      .then((rows) => { if (!cancelled) setMessages(rows); })
      .catch(() => { /* ignore */ })
      .finally(() => { if (!cancelled) setLoading(false); });

    markConversationRead(conversationId);

    const unsub = subscribeToMessages(conversationId, (msg) => {
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      // Mark read if it's incoming
      if (msg.sender_id !== user?.id) markConversationRead(conversationId);
    });

    return () => { cancelled = true; unsub(); };
  }, [conversationId, user?.id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  async function handleSend() {
    if (!conversationId || !draft.trim() || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft('');
    try {
      const msg = await sendMessage(conversationId, text);
      // Optimistic add (in case realtime is delayed)
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
    } catch (e) {
      console.error(e);
      setDraft(text); // restore
    } finally {
      setSending(false);
    }
  }

  if (!conversationId) {
    return <div className="p-6 stitch-text-secondary">No conversation selected.</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-3xl mx-auto -mt-2">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-1 pb-3 border-b border-surface-container/50">
        <button
          type="button"
          onClick={() => navigate('/messages')}
          className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center stitch-text-secondary"
          aria-label="Back to messages"
        >
          <ArrowLeft size={14} />
        </button>
        {conv ? (
          <button
            type="button"
            onClick={() => navigate(`/profile/${conv.other_user.id}`)}
            className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity"
          >
            {conv.other_user.avatar_url ? (
              <img src={conv.other_user.avatar_url} alt="" className="w-9 h-9 rounded-2xl object-cover shrink-0" />
            ) : (
              <div className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${gradFor(conv.other_user.display_name)} flex items-center justify-center text-white font-extrabold shrink-0`}>
                {conv.other_user.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-bold stitch-text-primary truncate">{conv.other_user.display_name}</p>
              {conv.other_user.work_type && (
                <p className="text-[10px] stitch-text-secondary uppercase tracking-wider font-bold">
                  {conv.other_user.work_type}
                </p>
              )}
            </div>
          </button>
        ) : (
          <div className="flex-1" />
        )}
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-4 space-y-1"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={18} className="animate-spin stitch-text-secondary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <p className="text-sm font-bold stitch-text-primary mb-1">Say hi 👋</p>
            <p className="text-xs stitch-text-secondary max-w-[260px] leading-relaxed">
              No messages yet — break the ice with what you're working on this week.
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const isMine = m.sender_id === user?.id;
            const showDate = shouldShowDateSeparator(messages[i - 1], m);
            return (
              <div key={m.id}>
                {showDate && (
                  <div className="flex items-center justify-center my-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary bg-surface-container-low px-3 py-1 rounded-full">
                      {formatDateHeader(m.created_at)}
                    </span>
                  </div>
                )}
                <div className={`group flex items-end gap-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                  {/* Flag button — only on others' messages, revealed on hover */}
                  {!isMine && (
                    <button
                      type="button"
                      title="Report message"
                      onClick={() => setReportTarget({ id: m.id, userId: m.sender_id, content: m.content })}
                      className="opacity-0 group-hover:opacity-100 transition-opacity mb-1 w-6 h-6 rounded-full bg-surface-container hover:bg-red-50 flex items-center justify-center shrink-0"
                    >
                      <Flag size={10} className="stitch-text-secondary hover:text-red-500" />
                    </button>
                  )}
                  <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${
                    isMine
                      ? 'stitch-btn--primary text-white rounded-br-sm'
                      : 'bg-surface-container-low stitch-text-primary rounded-bl-sm'
                  }`}>
                    <p className="text-sm leading-snug whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={`text-[10px] mt-0.5 ${isMine ? 'text-white/60' : 'stitch-text-secondary'} text-right`}>
                      {formatTime(m.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 pt-3 pb-2 border-t border-surface-container/50">
        <div className="flex items-end gap-2">
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
            className="flex-1 resize-none bg-surface-container-low rounded-2xl px-4 py-2.5 text-sm stitch-text-primary outline-none focus:ring-2 focus:ring-primary/30 max-h-32 placeholder:stitch-text-secondary"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="shrink-0 w-10 h-10 rounded-full stitch-btn--primary text-white flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all"
            aria-label="Send"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <p className="text-[10px] stitch-text-secondary mt-1.5 px-1">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>

      {/* Report modal */}
      {reportTarget && (
        <ReportModal
          contentType="dm"
          contentId={reportTarget.id}
          flaggedUserId={reportTarget.userId}
          contentSnapshot={reportTarget.content}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}
