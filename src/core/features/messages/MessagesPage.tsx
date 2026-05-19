/**
 * MessagesPage — /messages
 *
 * Conversation list view. Tap a conversation to open the thread.
 * Empty state nudges to /people to find someone to message.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MessageCircle, ArrowRight, UserPlus, Search } from 'lucide-react';
import { fetchConversations, type DmConversation } from '../../services/MessageService';
import { useAuth } from '../../auth/AuthProvider';
import { SurfaceCard, PageGreeting, GradientButton } from '../../ui/CorePage';

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

export function MessagesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchConversations()
      .then((rows) => { if (!cancelled) setConversations(rows); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = conversations.filter((c) =>
    !search || c.other_user.display_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <PageGreeting
        greeting="Messages"
        subtitle="Direct conversations with people you've connected with."
        actions={
          <GradientButton size="sm" variant="secondary" onClick={() => navigate('/people')}>
            <span className="inline-flex items-center gap-1.5">
              <UserPlus size={13} /> Find people
            </span>
          </GradientButton>
        }
      />

      {/* Search */}
      {conversations.length > 3 && (
        <div className="relative">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 stitch-text-secondary pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-surface-container-low stitch-text-primary text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:stitch-text-secondary"
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin stitch-text-secondary" />
        </div>
      ) : conversations.length === 0 ? (
        <SurfaceCard>
          <div className="text-center py-12 px-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-3">
              <MessageCircle size={24} className="text-primary/60" />
            </div>
            <p className="text-base font-bold stitch-text-primary mb-1.5">No messages yet</p>
            <p className="text-sm stitch-text-secondary leading-relaxed mb-5 max-w-[300px] mx-auto">
              Find someone to chat with — DM a connection or anyone in the community.
            </p>
            <GradientButton onClick={() => navigate('/people')}>
              <span className="inline-flex items-center gap-1.5">
                Browse people <ArrowRight size={12} />
              </span>
            </GradientButton>
          </div>
        </SurfaceCard>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((c) => (
            <ConversationRow
              key={c.id}
              conv={c}
              currentUserId={user?.id ?? null}
              onClick={() => navigate(`/messages/${c.id}`)}
            />
          ))}
          {filtered.length === 0 && (
            <SurfaceCard>
              <div className="text-center py-6 stitch-text-secondary text-sm">
                No conversations match "{search}"
              </div>
            </SurfaceCard>
          )}
        </div>
      )}
    </div>
  );
}

function ConversationRow({
  conv, currentUserId, onClick,
}: {
  conv: DmConversation;
  currentUserId: string | null;
  onClick: () => void;
}) {
  const lastByMe = conv.last_message?.sender_id === currentUserId;
  const preview = conv.last_message?.content ?? 'No messages yet';
  const truncated = preview.length > 60 ? preview.slice(0, 60) + '…' : preview;
  const isUnread = conv.unread_count > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 p-3 rounded-2xl transition-all hover:bg-surface-container active:scale-[0.99] ${
        isUnread ? 'bg-primary/5 ring-1 ring-primary/15' : 'bg-surface-container-low'
      }`}
    >
      {conv.other_user.avatar_url ? (
        <img src={conv.other_user.avatar_url} alt="" className="w-11 h-11 rounded-2xl object-cover shrink-0" />
      ) : (
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradFor(conv.other_user.display_name)} flex items-center justify-center text-white font-extrabold shrink-0 shadow-sm`}>
          {conv.other_user.display_name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className={`text-sm truncate ${isUnread ? 'font-extrabold stitch-text-primary' : 'font-bold stitch-text-primary'}`}>
            {conv.other_user.display_name}
          </p>
          {conv.last_message && (
            <span className="text-[10px] stitch-text-secondary shrink-0 tabular-nums">
              {formatTimeAgo(conv.last_message.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs truncate ${isUnread ? 'stitch-text-primary font-semibold' : 'stitch-text-secondary'}`}>
            {lastByMe && 'You: '}{truncated}
          </p>
          {isUnread && (
            <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-primary text-white text-[10px] font-extrabold tabular-nums">
              {conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
