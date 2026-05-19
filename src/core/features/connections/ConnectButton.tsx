import { useState, useEffect } from 'react';
import { UserPlus, Clock, Check, Loader2 } from 'lucide-react';
import {
  fetchConnectionStatus,
  sendConnectionRequest,
  acceptConnectionRequest,
  type ConnectionStatus,
} from '../../services/ConnectionService';
import { useAuth } from '../../auth/AuthProvider';

interface Props {
  otherUserId: string;
  variant?: 'light' | 'dark'; // light = normal surface, dark = on dark bg (session room)
}

export function ConnectButton({ otherUserId, variant = 'light' }: Props) {
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>('none');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchConnectionStatus(user.id, otherUserId).then(({ status, connectionId }) => {
      setStatus(status);
      setConnectionId(connectionId);
      setLoading(false);
    });
  }, [user, otherUserId]);

  async function handleConnect() {
    if (!user || acting) return;
    setActing(true);
    try {
      const conn = await sendConnectionRequest(otherUserId);
      setStatus('pending_sent');
      setConnectionId(conn.id);
    } catch {
      // ignore — already sent etc.
    } finally {
      setActing(false);
    }
  }

  async function handleAccept() {
    if (!connectionId || acting) return;
    setActing(true);
    try {
      await acceptConnectionRequest(connectionId);
      setStatus('connected');
    } catch {
      // ignore
    } finally {
      setActing(false);
    }
  }

  if (loading || !user || user.id === otherUserId) return null;

  if (variant === 'dark') {
    if (status === 'connected') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
          <Check size={10} strokeWidth={3} /> Connected
        </span>
      );
    }
    if (status === 'pending_sent') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-white/40">
          <Clock size={10} /> Pending
        </span>
      );
    }
    if (status === 'pending_received') {
      return (
        <button
          type="button"
          onClick={handleAccept}
          disabled={acting}
          className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full transition-all active:scale-95 disabled:opacity-50"
        >
          {acting ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} strokeWidth={3} />}
          Accept
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={handleConnect}
        disabled={acting}
        className="flex items-center gap-1 text-[10px] font-bold bg-white/15 hover:bg-white/25 text-white px-2 py-0.5 rounded-full transition-all active:scale-95 disabled:opacity-50"
      >
        {acting ? <Loader2 size={9} className="animate-spin" /> : <UserPlus size={9} />}
        Connect
      </button>
    );
  }

  // Light variant
  if (status === 'connected') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
        <Check size={10} strokeWidth={3} /> Connected
      </span>
    );
  }
  if (status === 'pending_sent') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold stitch-text-secondary bg-surface-container px-2 py-0.5 rounded-full">
        <Clock size={10} /> Pending
      </span>
    );
  }
  if (status === 'pending_received') {
    return (
      <button
        type="button"
        onClick={handleAccept}
        disabled={acting}
        className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500 text-white px-2.5 py-1 rounded-full transition-all active:scale-95 disabled:opacity-50"
      >
        {acting ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} strokeWidth={3} />}
        Accept
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={acting}
      className="flex items-center gap-1 text-[10px] font-bold stitch-btn--primary text-white px-2.5 py-1 rounded-full transition-all active:scale-95 disabled:opacity-50"
    >
      {acting ? <Loader2 size={10} className="animate-spin" /> : <UserPlus size={10} />}
      Connect
    </button>
  );
}
