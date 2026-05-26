/**
 * FirstWeekIntentionsCard — partial-week onboarding nudge.
 *
 * Scenario: a user picks Monday (or any other day) as their weekly
 * intentions day in the onboarding wizard, but signs up mid-week. The
 * regular WeeklyReviewPromptCard only fires Sunday→Wednesday — so a
 * Tuesday signup with a Monday intentions-day would mean 5 silent days
 * before their first weekly prompt, and we'd lose the momentum window.
 *
 * This card bridges that gap. It appears between wizard completion and
 * the user's first intentions day, asks one clear question, and gives
 * the user explicit agency:
 *
 *   • "Set lighter intentions for the rest of this week" → keeps momentum
 *   • "Wait until [their day]" → respects the cadence they chose
 *
 * After they choose either option (or set ≥1 intention for this week)
 * the card permanently disappears. The regular WeeklyReviewPromptCard
 * takes over from their first intentions day onward.
 *
 * Visibility (ALL must be true):
 *   • profile.wizard_v2_completed_at is set
 *   • profile.intentions_reminder_day is set (0–6)
 *   • today's day-of-week ≠ intentions_reminder_day
 *   • today is BEFORE the first intentions day after wizard completion
 *   • no intentions stored for the current week
 *   • localStorage hasn't recorded a dismiss for this user
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Clock, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { ReflectionService, mondayOf } from '../../services/ReflectionService';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Next occurrence of `targetDow` strictly AFTER the given `from` date.
 *  If `from` is on the target day, returns the day exactly 7 days later
 *  (we want the *next* occurrence, not today). */
function nextDayOfWeekAfter(from: Date, targetDow: number): Date {
  const result = new Date(from);
  const currentDow = result.getDay();
  let daysUntil = (targetDow - currentDow + 7) % 7;
  if (daysUntil === 0) daysUntil = 7;
  result.setDate(result.getDate() + daysUntil);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function FirstWeekIntentionsCard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [intentionsThisWeek, setIntentionsThisWeek] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const dismissKey = user?.id ? `sharedminds:first_week_dismissed:${user.id}` : null;

  // ── Eligibility (cheap synchronous check) ──────────────────────
  const eligible = useMemo(() => {
    if (!profile?.wizard_v2_completed_at) return false;
    if (profile.intentions_reminder_day == null) return false;

    const wizardCompletedAt = new Date(profile.wizard_v2_completed_at);
    const now = new Date();
    const todayDow = now.getDay();
    const targetDow = profile.intentions_reminder_day;

    // If today already IS their intentions day, the regular weekly card
    // handles it — we step aside.
    if (todayDow === targetDow) return false;

    // Only show until their first intentions day arrives.
    const firstIntentionsDay = nextDayOfWeekAfter(wizardCompletedAt, targetDow);
    if (now.getTime() >= firstIntentionsDay.getTime()) return false;

    return true;
  }, [profile?.wizard_v2_completed_at, profile?.intentions_reminder_day]);

  // ── Load dismissed state from localStorage ─────────────────────
  useEffect(() => {
    if (!dismissKey) return;
    if (typeof window === 'undefined') return;
    setDismissed(window.localStorage.getItem(dismissKey) === '1');
  }, [dismissKey]);

  // ── Check if any intentions exist for this week ───────────────
  // Lazy load — only fetch if we'd otherwise show the card.
  useEffect(() => {
    if (!eligible || dismissed) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await ReflectionService.getReflectionByWeek(mondayOf());
        if (cancelled) return;
        setIntentionsThisWeek(data?.intentions?.length ?? 0);
      } catch {
        if (!cancelled) setIntentionsThisWeek(0);
      }
    })();
    return () => { cancelled = true; };
  }, [eligible, dismissed]);

  if (!eligible || dismissed) return null;
  // Still loading the intention count — render nothing rather than flash
  // a card we might immediately hide.
  if (intentionsThisWeek === null) return null;
  // If the user has already set any intentions this week, the goal of
  // this card is already met. Stay silent.
  if (intentionsThisWeek > 0) return null;

  const targetDayLabel = DAY_NAMES[profile!.intentions_reminder_day!];

  // Days remaining this week (until next Monday). Used in the headline
  // to acknowledge it's a partial week without being preachy.
  const now = new Date();
  const daysToMonday = (8 - now.getDay()) % 7 || 7;

  function handleDismiss() {
    if (dismissKey && typeof window !== 'undefined') {
      window.localStorage.setItem(dismissKey, '1');
    }
    setDismissed(true);
  }

  return (
    <div
      className="rounded-2xl bg-gradient-to-br from-cyan-50 to-violet-50 ring-1 ring-cyan-200 p-4 relative"
      style={{ animation: 'wizFadeUp 400ms cubic-bezier(0.16, 1, 0.3, 1) both' }}
    >
      {/* Dismiss × — top-right. Stops the "wait" CTA below being the only escape. */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss first-week prompt"
        className="absolute top-2 right-2 w-7 h-7 rounded-full hover:bg-white/70 flex items-center justify-center transition-colors"
      >
        <X size={12} className="text-cyan-700" />
      </button>

      <div className="flex items-center gap-1.5 mb-2 text-cyan-700">
        <Sparkles size={11} />
        <span className="text-[10px] font-bold uppercase tracking-widest">
          First week · {daysToMonday} day{daysToMonday !== 1 ? 's' : ''} left
        </span>
      </div>

      <h2 className="stitch-headline text-lg font-extrabold tracking-tight mb-1 stitch-text-primary">
        Want lighter intentions for this week?
      </h2>
      <p className="text-sm stitch-text-secondary leading-snug mb-4">
        You picked {targetDayLabel} for weekly intentions, but you signed up
        mid-week. Set 1–2 lighter intentions to keep momentum — or wait until{' '}
        <strong className="stitch-text-primary">{targetDayLabel}</strong> for a
        full week.
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => navigate('/reflection?focus=intentions')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-sm shadow-primary/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
        >
          Set lighter intentions <ArrowRight size={14} />
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/70 stitch-text-primary text-sm font-semibold hover:bg-white active:scale-[0.98] transition-all"
        >
          <Clock size={12} /> Wait until {targetDayLabel}
        </button>
      </div>
    </div>
  );
}
