/**
 * WeeklyReviewPromptCard — Sunday 18:00 → Wednesday 23:59
 *
 * Surfaces a prominent prompt to do the weekly review during the natural
 * end-of-week / start-of-week window. The window extends to Wednesday
 * end-of-day so users who miss Monday still get the nudge for a few
 * days — the alternative (Sun 18:00 → Mon 23:59 only) meant missing the
 * Monday window = no nudge until next Sunday, which kills consistency.
 *
 * Hides itself once last week's reflection is marked complete.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import {
  ReflectionService, mondayPlusWeeks,
  type ReflectionWithIntentions,
} from '../../services/ReflectionService';

/** True if we're inside the weekly review catch-up window:
 *  Sunday 18:00 → Wednesday 23:59. */
function isInReviewWindow(now: Date = new Date()): boolean {
  const dow = now.getDay(); // 0 Sun, 1 Mon, 2 Tue, 3 Wed
  const hour = now.getHours();
  if (dow === 0 && hour >= 18) return true; // Sunday evening onwards
  if (dow >= 1 && dow <= 3) return true;     // Mon / Tue / Wed all day
  return false;
}

/** True only on the original "fresh" days (Sun evening + Monday). We
 *  soften the headline copy after Monday so it reads as a catch-up
 *  instead of the primary call-to-action. */
function isFreshWeekStart(now: Date = new Date()): boolean {
  const dow = now.getDay();
  const hour = now.getHours();
  return (dow === 0 && hour >= 18) || dow === 1;
}

export function WeeklyReviewPromptCard({ className = '' }: { className?: string } = {}) {
  const navigate = useNavigate();
  const [lastWeek, setLastWeek] = useState<ReflectionWithIntentions | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    ReflectionService.getReflectionByWeek(mondayPlusWeeks(-1))
      .then((d) => { setLastWeek(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;
  if (!isInReviewWindow()) return null;

  // Already complete? Don't nag.
  if (lastWeek?.reflection.status === 'complete') return null;

  // No intentions last week + still in window — gentle nudge to set THIS week's
  const hasLastWeekIntentions = (lastWeek?.intentions.length ?? 0) > 0;
  const doneCount = lastWeek?.intentions.filter((i) => i.completed_at).length ?? 0;
  const totalLast = lastWeek?.intentions.length ?? 0;
  const fresh = isFreshWeekStart();

  // Headline + body adapts to "fresh" vs "catch-up" — softer wording mid-week
  // so it reads as a friendly reminder rather than yelling about a missed day.
  const headline = hasLastWeekIntentions
    ? (fresh
        ? `Look back at last week — you finished ${doneCount}/${totalLast}.`
        : `Catch up on last week — you finished ${doneCount}/${totalLast}.`)
    : (fresh
        ? `Set the tone for this week.`
        : `Still time to set this week's three.`);

  const body = hasLastWeekIntentions
    ? "Tick off what got done, rate each, write a short reflection, then set this week's three."
    : "Three intentions, no more. The cap is the point — pick what actually matters.";

  return (
    <button
      type="button"
      onClick={() => navigate('/reflection')}
      className={`w-full text-left rounded-2xl p-5 bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 text-white shadow-lg shadow-violet-500/25 relative overflow-hidden active:scale-[0.99] hover:shadow-xl hover:shadow-violet-500/35 transition-all ${className}`}
    >
      {/* Ambient orbs */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-8 w-36 h-36 rounded-full bg-cyan-300/15 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles size={12} className="text-amber-200" />
          <p className="text-[10px] font-bold text-white/80 tracking-widest uppercase">
            Weekly review · time to reflect
          </p>
        </div>
        <h3 className="text-lg sm:text-xl font-extrabold leading-tight mb-1.5">
          {headline}
        </h3>
        <p className="text-sm text-white/85 leading-relaxed mb-4">
          {body}
        </p>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-violet-700 text-xs font-extrabold">
          Open weekly review
          <ArrowRight size={11} />
        </span>
      </div>
    </button>
  );
}
