/**
 * ConnectionsPage — /connections
 *
 * Three tabs:
 *   * Connected — your existing connections (Message + Remove)
 *   * Requests — incoming requests (Accept)
 *   * Discover — link to /people directory
 *
 * The Discover tab now lives at /people (full member browser); this page
 * stays focused on managing your existing relationships.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, Users, Check, Loader2, UserMinus, MessageCircle, Search, ArrowRight,
} from 'lucide-react';
import {
  fetchConnections,
  fetchPendingRequests,
  acceptConnectionRequest,
  removeConnection,
  type ConnectionWithProfile,
} from '../../services/ConnectionService';
import { getOrCreateDm, DmPrivacyError } from '../../services/MessageService';
import { useMessagingDock } from '../messages/MessagingDockContext';
import { SurfaceCard, PageGreeting } from '../../ui/CorePage';

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
];
function avatarClass(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

type Tab = 'connected' | 'requests';

export function ConnectionsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('connected');
  const [requests, setRequests] = useState<ConnectionWithProfile[]>([]);
  const [connections, setConnections] = useState<ConnectionWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchPendingRequests(), fetchConnections()]).then(([reqs, conns]) => {
      setRequests(reqs);
      setConnections(conns);
      // Auto-jump to requests if there are any
      if (reqs.length > 0) setTab('requests');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function handleAccept(id: string) {
    const accepted = requests.find((r) => r.id === id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
    if (accepted) setConnections((prev) => [{ ...accepted, status: 'accepted' }, ...prev]);
  }

  function handleRemove(id: string) {
    setConnections((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-5">
      <PageGreeting
        greeting="Connections"
        subtitle="People you've worked alongside."
        actions={
          <button
            type="button"
            onClick={() => navigate('/people')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-container-low stitch-text-primary text-xs font-bold hover:bg-surface-container transition-colors"
          >
            <Search size={11} /> Find people
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex p-1 bg-surface-container-low rounded-full gap-1">
        <TabBtn active={tab === 'connected'} onClick={() => setTab('connected')}>
          <Users size={11} /> Connected · {connections.length}
        </TabBtn>
        <TabBtn active={tab === 'requests'} onClick={() => setTab('requests')}>
          <UserPlus size={11} /> Requests{requests.length > 0 && ` · ${requests.length}`}
        </TabBtn>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin stitch-text-secondary" />
        </div>
      ) : tab === 'requests' ? (
        requests.length > 0 ? (
          <div className="space-y-2">
            {requests.map((r) => (
              <RequestCard key={r.id} conn={r} onAccept={handleAccept} />
            ))}
          </div>
        ) : (
          <SurfaceCard>
            <div className="text-center py-10 px-6">
              <UserPlus size={24} className="mx-auto mb-3 stitch-text-secondary opacity-50" />
              <p className="text-sm font-bold stitch-text-primary mb-1">No incoming requests</p>
              <p className="text-xs stitch-text-secondary">
                Browse members and send your own.
              </p>
            </div>
          </SurfaceCard>
        )
      ) : connections.length > 0 ? (
        <div className="space-y-2">
          {connections.map((c) => (
            <ConnectionCard key={c.id} conn={c} onRemove={handleRemove} />
          ))}
        </div>
      ) : (
        <EmptyState onBrowse={() => navigate('/people')} />
      )}
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────

function TabBtn({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold transition-all ${
        active ? 'bg-white shadow-sm text-primary' : 'stitch-text-secondary'
      }`}
    >
      {children}
    </button>
  );
}

// ── Cards ────────────────────────────────────────────────────────

function RequestCard({ conn, onAccept }: { conn: ConnectionWithProfile; onAccept: (id: string) => void }) {
  const [acting, setActing] = useState(false);
  const navigate = useNavigate();

  async function handle() {
    setActing(true);
    try {
      await acceptConnectionRequest(conn.id);
      onAccept(conn.id);
    } catch {
      setActing(false);
    }
  }

  return (
    <SurfaceCard>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(`/profile/${conn.other_user_id}`)}
          className="shrink-0 hover:opacity-80 transition-opacity"
        >
          {conn.avatar_url ? (
            <img src={conn.avatar_url} alt={conn.display_name} className="w-10 h-10 rounded-2xl object-cover shrink-0" />
          ) : (
            <div className={`w-10 h-10 rounded-2xl ${avatarClass(conn.display_name)} flex items-center justify-center shrink-0 font-extrabold text-sm`}>
              {conn.display_name.charAt(0).toUpperCase()}
            </div>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold stitch-text-primary truncate">{conn.display_name}</p>
          <p className="text-xs stitch-text-secondary">Wants to connect</p>
        </div>
        <button
          type="button"
          onClick={handle}
          disabled={acting}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl stitch-btn--primary text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
        >
          {acting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={3} />}
          Accept
        </button>
      </div>
    </SurfaceCard>
  );
}

function ConnectionCard({ conn, onRemove }: { conn: ConnectionWithProfile; onRemove: (id: string) => void }) {
  const [removing, setRemoving] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const navigate = useNavigate();
  const { openConversation, isMobile } = useMessagingDock();

  async function handleRemove() {
    if (!confirm(`Remove ${conn.display_name} from your connections?`)) return;
    setRemoving(true);
    try {
      await removeConnection(conn.id);
      onRemove(conn.id);
    } catch {
      setRemoving(false);
    }
  }

  async function handleMessage() {
    setMessaging(true);
    try {
      const conversationId = await getOrCreateDm(conn.other_user_id);
      if (isMobile) navigate(`/messages/${conversationId}`);
      else openConversation(conversationId);
    } catch (err) {
      if (err instanceof DmPrivacyError) {
        alert(err.message);
      } else {
        console.error(err);
      }
    } finally {
      setMessaging(false);
    }
  }

  return (
    <SurfaceCard>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(`/profile/${conn.other_user_id}`)}
          className="shrink-0 hover:opacity-80 transition-opacity"
        >
          {conn.avatar_url ? (
            <img src={conn.avatar_url} alt={conn.display_name} className="w-10 h-10 rounded-2xl object-cover shrink-0" />
          ) : (
            <div className={`w-10 h-10 rounded-2xl ${avatarClass(conn.display_name)} flex items-center justify-center shrink-0 font-extrabold text-sm`}>
              {conn.display_name.charAt(0).toUpperCase()}
            </div>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => navigate(`/profile/${conn.other_user_id}`)}
            className="text-sm font-bold stitch-text-primary truncate hover:text-primary transition-colors text-left"
          >
            {conn.display_name}
          </button>
          <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
            <Check size={10} strokeWidth={3} /> Connected
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleMessage}
            disabled={messaging}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl stitch-btn--primary text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
            title="Send a message"
          >
            {messaging ? <Loader2 size={12} className="animate-spin" /> : <MessageCircle size={12} />}
            Message
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-surface-container-low stitch-text-secondary text-xs font-bold transition-all hover:bg-surface-container hover:text-rose-600 active:scale-95 disabled:opacity-50"
            title="Remove connection"
          >
            {removing ? <Loader2 size={12} className="animate-spin" /> : <UserMinus size={12} />}
          </button>
        </div>
      </div>
    </SurfaceCard>
  );
}

function EmptyState({ onBrowse }: { onBrowse: () => void }) {
  return (
    <SurfaceCard>
      <div className="flex flex-col items-center text-center py-10 px-6">
        <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mb-4">
          <Users size={24} className="text-primary/60" />
        </div>
        <p className="text-base font-bold stitch-text-primary mb-1.5">No connections yet</p>
        <p className="text-sm stitch-text-secondary max-w-[280px] leading-relaxed mb-5">
          Browse the community to find people working in your space, then send a connection request.
        </p>
        <button
          type="button"
          onClick={onBrowse}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full stitch-btn--primary text-white text-sm font-bold active:scale-[0.98] transition-all"
        >
          Browse people <ArrowRight size={13} />
        </button>
      </div>
    </SurfaceCard>
  );
}
