import { useState, useEffect } from 'react';
import { UserPlus, Clock, Check, Loader2, X, Send } from 'lucide-react';
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
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchConnectionStatus(user.id, otherUserId).then(({ status, connectionId }) => {
      setStatus(status);
      setConnectionId(connectionId);
      setLoading(false);
    });
  }, [user, otherUserId]);

  async function handleConnect(withNote: string | null) {
    if (!user || acting) return;
    setActing(true);
    try {
      const conn = await sendConnectionRequest(otherUserId, withNote ?? undefined);
      setStatus('pending_sent');
      setConnectionId(conn.id);
      setNoteOpen(false);
      setNote('');
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

  // ── Note modal (only shown for outgoing requests) ─────────────────
  // Renders as a sibling to the button so both can mount together. We
  // portal-via-fixed inside the modal rather than React.createPortal so
  // the component stays plug-and-play wherever it's used.
  const noteModal = noteOpen && (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50"
      onClick={() => !acting && setNoteOpen(false)}
    >
      <div
        className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold stitch-text-primary">Send a connection request</p>
          <button
            type="button"
            onClick={() => !acting && setNoteOpen(false)}
            className="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center"
            aria-label="Close"
          >
            <X size={14} className="stitch-text-secondary" />
          </button>
        </div>
        <p className="text-xs stitch-text-secondary mb-3 leading-relaxed">
          A short note dramatically improves your accept rate. Mention what you
          have in common or what you'd like to chat about.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 280))}
          placeholder="Hi! Saw we both work on… would love to swap notes."
          rows={3}
          maxLength={280}
          className="w-full px-3 py-2.5 bg-surface-container-low rounded-xl text-sm stitch-text-primary placeholder:stitch-text-secondary outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] stitch-text-secondary">Optional · {note.length}/280</span>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => handleConnect(null)}
            disabled={acting}
            className="flex-1 py-2.5 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-bold hover:bg-surface-container transition-colors disabled:opacity-60"
          >
            Skip note
          </button>
          <button
            type="button"
            onClick={() => handleConnect(note.trim() || null)}
            disabled={acting}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl stitch-btn--primary text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-60"
          >
            {acting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            Send
          </button>
        </div>
      </div>
    </div>
  );

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
      <>
        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          disabled={acting}
          className="flex items-center gap-1 text-[10px] font-bold bg-white/15 hover:bg-white/25 text-white px-2 py-0.5 rounded-full transition-all active:scale-95 disabled:opacity-50"
        >
          {acting ? <Loader2 size={9} className="animate-spin" /> : <UserPlus size={9} />}
          Connect
        </button>
        {noteModal}
      </>
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
    <>
      <button
        type="button"
        onClick={() => setNoteOpen(true)}
        disabled={acting}
        className="flex items-center gap-1 text-[10px] font-bold stitch-btn--primary text-white px-2.5 py-1 rounded-full transition-all active:scale-95 disabled:opacity-50"
      >
        {acting ? <Loader2 size={10} className="animate-spin" /> : <UserPlus size={10} />}
        Connect
      </button>
      {noteModal}
    </>
  );
}
