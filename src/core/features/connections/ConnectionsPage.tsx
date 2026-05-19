import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, Check, Loader2, UserMinus } from 'lucide-react';
import {
  fetchConnections,
  fetchPendingRequests,
  acceptConnectionRequest,
  removeConnection,
  type ConnectionWithProfile,
} from '../../services/ConnectionService';
import { SurfaceCard } from '../../ui/CorePage';

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

function RequestCard({ conn, onAccept }: { conn: ConnectionWithProfile; onAccept: (id: string) => void }) {
  const [acting, setActing] = useState(false);

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
        {conn.avatar_url ? (
          <img src={conn.avatar_url} alt={conn.display_name} className="w-10 h-10 rounded-2xl object-cover shrink-0" />
        ) : (
          <div className={`w-10 h-10 rounded-2xl ${avatarClass(conn.display_name)} flex items-center justify-center shrink-0 font-extrabold text-sm`}>
            {conn.display_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold stitch-text-primary truncate">{conn.display_name}</p>
          <p className="text-xs stitch-text-secondary">Wants to connect</p>
        </div>
        <button
          type="button"
          onClick={handle}
          disabled={acting}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
        >
          {acting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={3} />}
          Accept
        </button>
      </div>
    </SurfaceCard>
  );
}

function ConnectionCard({ conn, onRemove }: { conn: ConnectionWithProfile; onRemove: (id: string) => void }) {
  const [acting, setActing] = useState(false);
  const navigate = useNavigate();

  async function handle() {
    setActing(true);
    try {
      await removeConnection(conn.id);
      onRemove(conn.id);
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
          <button
            type="button"
            onClick={() => navigate(`/profile/${conn.other_user_id}`)}
            className="text-sm font-bold stitch-text-primary truncate hover:text-primary transition-colors text-left"
          >
            {conn.display_name}
          </button>
          <p className="text-xs text-emerald-600 flex items-center gap-1">
            <Check size={10} strokeWidth={3} /> Connected
          </p>
        </div>
        <button
          type="button"
          onClick={handle}
          disabled={acting}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-low stitch-text-secondary text-xs font-bold transition-all hover:bg-surface-container active:scale-95 disabled:opacity-50"
        >
          {acting ? <Loader2 size={12} className="animate-spin" /> : <UserMinus size={12} />}
          Remove
        </button>
      </div>
    </SurfaceCard>
  );
}

export function ConnectionsPage() {
  const [requests, setRequests] = useState<ConnectionWithProfile[]>([]);
  const [connections, setConnections] = useState<ConnectionWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchPendingRequests(), fetchConnections()]).then(([reqs, conns]) => {
      setRequests(reqs);
      setConnections(conns);
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="stitch-headline text-2xl sm:text-3xl font-extrabold tracking-tight">
          Connections
        </h1>
        <p className="text-sm sm:text-base stitch-text-secondary mt-1">
          People you've worked alongside.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin stitch-text-secondary" />
        </div>
      ) : (
        <>
          {/* Pending requests */}
          {requests.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <UserPlus size={13} className="stitch-text-secondary" />
                <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
                  Requests · {requests.length}
                </p>
              </div>
              <div className="space-y-3">
                {requests.map((r) => (
                  <RequestCard key={r.id} conn={r} onAccept={handleAccept} />
                ))}
              </div>
            </section>
          )}

          {/* Connections list */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users size={13} className="stitch-text-secondary" />
              <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
                Connected · {connections.length}
              </p>
            </div>
            {connections.length > 0 ? (
              <div className="space-y-3">
                {connections.map((c) => (
                  <ConnectionCard key={c.id} conn={c} onRemove={handleRemove} />
                ))}
              </div>
            ) : (
              <SurfaceCard>
                <div className="flex flex-col items-center text-center py-8 px-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mb-3">
                    <Users size={24} className="text-primary/50" />
                  </div>
                  <p className="text-sm font-bold stitch-text-primary mb-1">No connections yet</p>
                  <p className="text-xs stitch-text-secondary max-w-[220px] leading-relaxed">
                    Join a session and hit Connect next to someone you've worked alongside.
                  </p>
                </div>
              </SurfaceCard>
            )}
          </section>
        </>
      )}
    </div>
  );
}
