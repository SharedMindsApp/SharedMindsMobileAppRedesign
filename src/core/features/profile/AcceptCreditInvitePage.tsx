/**
 * AcceptCreditInvitePage — landing for /credit-invite/:token links.
 *
 * Someone credited you on a piece of work before you joined SharedMinds. This
 * claims the stub against your account; it then appears in your "confirm your
 * credits" inbox on the profile editor. Unauthenticated users sign in first.
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, BadgeCheck, ArrowRight, AlertTriangle } from 'lucide-react';
import { claimCreditInvite } from '../../services/WorkCreditService';
import { useAuth } from '../../auth/AuthProvider';

export function AcceptCreditInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<{ owner_name?: string; credit_title?: string; credit_role?: string | null } | null>(null);

  async function handleClaim() {
    if (!token) return;
    if (!user) {
      try { sessionStorage.setItem('pending-credit-invite-token', token); } catch { /* ignore */ }
      navigate('/auth/login');
      return;
    }
    setClaiming(true);
    setError(null);
    try {
      const res = await claimCreditInvite(token);
      if (!res.ok) {
        setError(
          res.reason === 'own_credit' ? "That's your own credit."
          : res.reason === 'already_claimed' ? 'This invite has already been claimed by someone else.'
          : res.reason === 'not_found' ? 'This invite link is invalid or expired.'
          : 'Could not claim this invite.',
        );
        setClaiming(false);
        return;
      }
      setClaimed(res);
    } catch (e: any) {
      setError(e?.message ?? 'Could not claim this invite.');
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center stitch-text-secondary"><Loader2 size={20} className="animate-spin" /></div>;
  }

  return (
    <div className="max-w-md mx-auto pt-12 px-5">
      <div className="text-center mb-7">
        <span className="inline-flex w-12 h-12 rounded-2xl bg-emerald-500/15 items-center justify-center mb-4">
          <BadgeCheck size={22} className="text-emerald-600" />
        </span>
        {claimed ? (
          <>
            <h1 className="stitch-headline text-2xl font-extrabold tracking-tight mb-2">Credit claimed</h1>
            <p className="text-sm stitch-text-secondary leading-relaxed">
              <span className="font-bold stitch-text-primary">{claimed.owner_name}</span> credited you
              {claimed.credit_role ? ` as ${claimed.credit_role}` : ''} on{' '}
              <span className="font-bold stitch-text-primary">{claimed.credit_title}</span>. Confirm it on your profile and it shows as verified.
            </p>
          </>
        ) : (
          <>
            <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">You've been credited on</p>
            <h1 className="stitch-headline text-2xl font-extrabold tracking-tight mb-2">a piece of work</h1>
            <p className="text-sm stitch-text-secondary leading-relaxed">
              Someone you worked with added you to their credits. Claim it to add it to your own profile.
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-3 py-2.5">
          <AlertTriangle size={15} className="text-rose-500 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700 leading-snug">{error}</p>
        </div>
      )}

      {claimed ? (
        <button type="button" onClick={() => navigate('/profile?tab=profile')}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl stitch-btn--primary text-white text-base font-bold shadow-lg shadow-primary/20 active:scale-[0.98]">
          Confirm on my profile <ArrowRight size={16} />
        </button>
      ) : (
        <button type="button" onClick={handleClaim} disabled={claiming}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl stitch-btn--primary text-white text-base font-bold shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-60">
          {claiming ? <Loader2 size={16} className="animate-spin" /> : <>{user ? 'Claim this credit' : 'Sign in & claim'} <ArrowRight size={16} /></>}
        </button>
      )}

      <button type="button" onClick={() => navigate('/')} className="w-full mt-3 py-2.5 text-xs stitch-text-secondary hover:stitch-text-primary">
        Not now
      </button>
    </div>
  );
}
