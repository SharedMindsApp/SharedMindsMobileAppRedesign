/**
 * MessagesPage — /messages
 *
 * Unified comms hub with two tabs:
 *   - Community Chat: global real-time room (CommunalChatPanel)
 *   - Direct:         1-to-1 DM conversation list
 *
 * Tab defaults to Community so new visitors land on the live room.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MessageCircle, ArrowRight, UserPlus, Search, Users, MessageSquare } from 'lucide-react';
import { fetchConversations, type DmConversation } from '../../services/MessageService';
import { useAuth } from '../../auth/AuthProvider';
import { SurfaceCard, PageGreeting, GradientButton } from '../../ui/CorePage';
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

// ── Tab switcher ──────────────────────────────────────────────────────────────

type Tab = 'community' | 'direct';

function TabBar({ active, onChange, unreadDms }: { active: Tab; onChange: (t: Tab) => void; unreadDms: number }) {
  const base = 'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-all border-b-2';
  const on   = 'border-cyan-500 text-cyan-600';
  const off  = 'border-transparent text-gray-500 hover:text-gray-700';

  return (
    <div className="flex border-b border-gray-100 bg-white">
      <button className={`${base} ${active === 'community' ? on : off}`} onClick={() => onChange('community')}>
        <Users size={14} />
        Community
      </button>
      <button className={`${base} ${active === 'direct' ? on : off}`} onClick={() => onChange('direct')}>
        <MessageCircle size={14} />
        Direct
        {unreadDms > 0 && (
          <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-cyan-500 text-white text-[10px] font-bold">
            {unreadDms > 99 ? '99+' : unreadDms}
          </span>
        )}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MessagesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('community');
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

  const unreadDms = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  const filtered = conversations.filter((c) =>
    !search || c.other_user.display_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto flex flex-col" style={{ minHeight: 'calc(100vh - 80px)' }}>

      {/* Page heading */}
      <div className="mb-4">
        <PageGreeting
          greeting="Messages"
          subtitle="Community room · direct conversations"
          actions={
            <GradientButton size="sm" variant="secondary" onClick={() => navigate('/people')}>
              <span className="inline-flex items-center gap-1.5">
                <UserPlus size={13} /> Find people
              </span>
            </GradientButton>
          }
        />
      </div>

      {/* Tab bar + content card */}
      <div className="flex-1 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden flex flex-col">
        <TabBar active={tab} onChange={setTab} unreadDms={unreadDms} />

        {/* ── Community Chat tab ── */}
        {tab === 'community' && (
          <div className="flex-1 flex flex-col min-h-0" style={{ height: 'calc(100vh - 220px)' }}>
            <CommunalChatPanel />
          </div>
        )}

        {/* ── Direct Messages tab ── */}
        {tab === 'direct' && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-3">

              {/* Search */}
              {conversations.length > 3 && (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search conversations…"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 placeholder:text-gray-400"
                  />
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-50 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare size={24} className="text-cyan-400" />
                  </div>
                  <p className="text-base font-bold text-gray-800 mb-1.5">No direct messages yet</p>
                  <p className="text-sm text-gray-500 leading-relaxed mb-5 max-w-[280px] mx-auto">
                    Connect with someone in the community to start a 1-to-1 conversation.
                  </p>
                  <GradientButton onClick={() => navigate('/people')}>
                    <span className="inline-flex items-center gap-1.5">
                      Browse people <ArrowRight size={12} />
                    </span>
                  </GradientButton>
                </div>
              ) : (
                <div className="space-y-1">
                  {filtered.map((c) => (
                    <ConversationRow
                      key={c.id}
                      conv={c}
                      currentUserId={user?.id ?? null}
                      onClick={() => navigate(`/messages/${c.id}`)}
                    />
                  ))}
                  {filtered.length === 0 && search && (
                    <div className="text-center py-6 text-sm text-gray-400">
                      No conversations match "{search}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ConversationRow ───────────────────────────────────────────────────────────

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
      className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-gray-50 active:scale-[0.99] ${
        isUnread ? 'bg-cyan-50/60 ring-1 ring-cyan-200' : ''
      }`}
    >
      {conv.other_user.avatar_url ? (
        <img src={conv.other_user.avatar_url} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
      ) : (
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradFor(conv.other_user.display_name)} flex items-center justify-center text-white font-extrabold shrink-0 shadow-sm`}>
          {conv.other_user.display_name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className={`text-sm truncate ${isUnread ? 'font-extrabold text-gray-900' : 'font-semibold text-gray-800'}`}>
            {conv.other_user.display_name}
          </p>
          {conv.last_message && (
            <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
              {formatTimeAgo(conv.last_message.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs truncate ${isUnread ? 'text-gray-700 font-semibold' : 'text-gray-500'}`}>
            {lastByMe && 'You: '}{truncated}
          </p>
          {isUnread && (
            <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-cyan-500 text-white text-[10px] font-extrabold tabular-nums">
              {conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
