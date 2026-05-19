/**
 * WeeklyReviewPromptCard — Sunday 18:00 → Monday 23:59
 *
 * Surfaces a prominent prompt to do the weekly review during the natural
 * end-of-week / start-of-week window. Hides itself once last week's
 * reflection is marked complete.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import {
  ReflectionService, mondayPlusWeeks,
  type ReflectionWithIntentions,
} from '../../services/ReflectionService';

/** True if now() is between Sunday 18:00 and Monday 23:59 inclusive. */
function isInReviewWindow(now: Date = new Date()): boolean {
  const dow = now.getDay(); // 0 Sun, 1 Mon
  const hour = now.getHours();
  if (dow === 0 && hour >= 18) return true;
  if (dow === 1) return true;
  return false;
}

export function WeeklyReviewPromptCard() {
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

  return (
    <button
      type="button"
      onClick={() => navigate('/reflection')}
      className="w-full text-left rounded-2xl p-5 bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 text-white shadow-lg shadow-violet-500/25 relative overflow-hidden active:scale-[0.99] hover:shadow-xl hover:shadow-violet-500/35 transition-all"
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
          {hasLastWeekIntentions
            ? `Look back at last week — you finished ${doneCount}/${totalLast}.`
            : `Set the tone for this week.`}
        </h3>
        <p className="text-sm text-white/85 leading-relaxed mb-4">
          {hasLastWeekIntentions
            ? 'Tick off what got done, rate each, write a short reflection, then set this week\'s three.'
            : 'Three intentions, no more. The cap is the point — pick what actually matters.'}
        </p>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-violet-700 text-xs font-extrabold">
          Open weekly review
          <ArrowRight size={11} />
        </span>
      </div>
    </button>
  );
}
