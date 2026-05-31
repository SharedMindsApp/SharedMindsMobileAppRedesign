/**
 * UpgradePage (/upgrade) — premium interest capture.
 *
 * Billing isn't live yet. Instead of a checkout, the "Upgrade to Premium"
 * CTAs land here, where an interested user joins a waitlist (and optionally
 * tells us what they'd pay). This is pure demand discovery — see who would
 * pay before we build payments.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Video, Timer, Zap, Check, Loader2, ArrowLeft, PartyPopper } from 'lucide-react';
import { SurfaceCard } from '../../ui/CorePage';
import { getMyWaitlistEntry, joinPremiumWaitlist } from '../../services/WaitlistService';

const PRICE_BANDS = ['£5–10', '£10–15', '£15–20', '£20+'] as const;

const BENEFITS = [
  { Icon: Video, title: 'Unlimited video sessions', body: 'No weekly cap — go on camera as often as you like.' },
  { Icon: Timer, title: 'Longer focus blocks',       body: 'Deep work up to 1h 30m and longer chat sessions.' },
  { Icon: Zap,   title: 'Priority matching',          body: 'Get paired faster when you open a door.' },
];

export function UpgradePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [priceBand, setPriceBand] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getMyWaitlistEntry()
      .then((entry) => {
        if (!alive) return;
        if (entry) {
          setJoined(true);
          setPriceBand(entry.price_band ?? null);
          setReason(entry.reason ?? '');
        }
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  async function handleJoin() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await joinPremiumWaitlist({ priceBand, reason });
      setJoined(true);
    } catch (e: any) {
      setError(e?.message ?? 'Could not join the waitlist. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-10">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold stitch-text-secondary hover:stitch-text-primary"
      >
        <ArrowLeft size={14} /> Back
      </button>

      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-blue-500 text-white p-6 shadow-lg shadow-violet-500/20">
        <div className="w-11 h-11 rounded-2xl bg-white/15 grid place-items-center mb-3">
          <Sparkles size={20} />
        </div>
        <h1 className="text-2xl font-extrabold leading-tight">SharedMinds Premium</h1>
        <p className="text-sm text-white/85 mt-1.5 leading-snug">
          Unlimited video, longer sessions, priority matching. We're still building
          it — join the waitlist and you'll be first to know (and help shape the price).
        </p>
      </div>

      {/* Benefits */}
      <SurfaceCard>
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-3">What you'll get</p>
        <div className="space-y-3">
          {BENEFITS.map(({ Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 grid place-items-center shrink-0">
                <Icon size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold stitch-text-primary leading-tight">{title}</p>
                <p className="text-[12px] stitch-text-secondary leading-snug mt-0.5">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>

      {joined ? (
        <SurfaceCard>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
              <PartyPopper size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold stitch-text-primary">You're on the list 🎉</p>
              <p className="text-[12px] stitch-text-secondary leading-snug mt-0.5">
                Thanks — we'll email you the moment Premium goes live. You can update your
                price preference below any time.
              </p>
            </div>
          </div>

          {/* Allow updating the price band after joining */}
          <div className="mt-4">
            <p className="text-[11px] font-semibold stitch-text-secondary mb-2">What feels fair per month?</p>
            <div className="grid grid-cols-4 gap-1.5">
              {PRICE_BANDS.map((band) => (
                <button
                  key={band}
                  type="button"
                  onClick={() => setPriceBand(band)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    priceBand === band ? 'bg-violet-600 text-white shadow-sm' : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                  }`}
                >
                  {band}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleJoin}
              disabled={submitting}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl ring-1 ring-surface-container stitch-text-primary text-sm font-bold hover:bg-surface-container-low disabled:opacity-60"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {submitting ? 'Saving…' : 'Update my preference'}
            </button>
          </div>
        </SurfaceCard>
      ) : (
        <SurfaceCard>
          <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-3">Help shape the price</p>
          <p className="text-[11px] font-semibold stitch-text-secondary mb-2">What feels fair per month? <span className="font-normal stitch-text-secondary/70">(optional)</span></p>
          <div className="grid grid-cols-4 gap-1.5">
            {PRICE_BANDS.map((band) => (
              <button
                key={band}
                type="button"
                onClick={() => setPriceBand(priceBand === band ? null : band)}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  priceBand === band ? 'bg-violet-600 text-white shadow-sm' : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container active:scale-[0.97]'
                }`}
              >
                {band}
              </button>
            ))}
          </div>

          <p className="text-[11px] font-semibold stitch-text-secondary mt-4 mb-1.5">What would you use Premium for? <span className="font-normal stitch-text-secondary/70">(optional)</span></p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. daily deep-work sessions on camera with my accountability partner"
            className="w-full rounded-xl bg-surface-container-low ring-1 ring-surface-container px-3 py-2.5 text-sm stitch-text-primary placeholder:stitch-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
          />

          {error && <p className="text-[11px] font-semibold text-rose-700 bg-rose-50 rounded-lg px-3 py-2 mt-3">{error}</p>}

          <button
            type="button"
            onClick={handleJoin}
            disabled={submitting || loading}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 text-white text-sm font-bold shadow-md shadow-violet-500/25 active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {submitting ? 'Joining…' : 'Join the Premium waitlist'}
          </button>
          <p className="text-[10px] stitch-text-secondary/70 text-center mt-2 leading-snug">
            No payment now. We'll only email you when Premium launches.
          </p>
        </SurfaceCard>
      )}
    </div>
  );
}
