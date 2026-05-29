/**
 * AcceptSessionInvitePage — landing for /session-invite/:token links.
 *
 * The host shares an email-invite link to a scheduled 1-on-1. This page
 * calls accept_session_invite(token), which claims the partner seat for the
 * signed-in user, then routes them into the session. Unauthenticated users
 * are sent to sign in first (the token is stashed so they bounce back).
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Users, ArrowRight, AlertTriangle } from 'lucide-react';
import { acceptSessionInvite } from '../../services/SessionService';
import { useAuth } from '../../auth/AuthProvider';

export function AcceptSessionInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    if (!token) return;
    if (!user) {
      try { sessionStorage.setItem('pending-session-invite-token', token); } catch { /* ignore */ }
      navigate('/auth/login');
      return;
    }
    setAccepting(true);
    setError(null);
    try {
      const sessionId = await acceptSessionInvite(token);
      navigate(`/session/${sessionId}`);
    } catch (e: any) {
      setError(e?.message ?? 'Could not accept this invite.');
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center stitch-text-secondary">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pt-12 px-5">
      <div className="text-center mb-7">
        <span className="inline-flex w-12 h-12 rounded-2xl bg-primary/15 items-center justify-center mb-4">
          <Users size={22} className="text-primary" />
        </span>
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">
          You've been invited to a
        </p>
        <h1 className="stitch-headline text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
          1-on-1 focus session
        </h1>
        <p className="text-sm stitch-text-secondary leading-relaxed">
          Accept to claim your spot. You'll both work side-by-side on video for the session.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-3 py-2.5">
          <AlertTriangle size={15} className="text-rose-500 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700 leading-snug">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleAccept}
        disabled={accepting}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl stitch-btn--primary text-white text-base font-bold shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-60"
      >
        {accepting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <>
            {user ? 'Accept & join' : 'Sign in & join'}
            <ArrowRight size={16} />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => navigate('/sessions')}
        className="w-full mt-3 py-2.5 text-xs stitch-text-secondary hover:stitch-text-primary"
      >
        Not now
      </button>
    </div>
  );
}
