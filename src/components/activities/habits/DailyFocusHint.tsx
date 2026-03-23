/**
 * Daily Focus Hint Component
 * 
 * A gentle, supportive daily focus line that appears at the top of the Habits view.
 * Provides context-aware encouragement without pressure.
 * 
 * Examples:
 * - "Today looks light — this could be a good day for something small."
 * - "You've been consistent lately. Keep it simple."
 * - "Energy seems low. One habit is enough."
 * 
 * Rules:
 * - One sentence max
 * - No commands
 * - Dismissible
 * - Changes daily
 */

import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

interface DailyFocusHintProps {
  userId: string;
  habitsCount: number;
  compact?: boolean;
}

export function DailyFocusHint({
  userId,
  habitsCount,
  compact = false,
}: DailyFocusHintProps) {
  const [dismissed, setDismissed] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection - must be called before any early returns
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (dismissed) return;
    generateHint();
  }, [userId, habitsCount, dismissed]);

  const generateHint = async () => {
    try {
      // Get recent completion data
      const { listHabits, getHabitSummary } = await import('../../../lib/habits/habitsService');
      const habits = await listHabits(userId);
      
      if (habits.length === 0) {
        setHint(null);
        return;
      }

      // Calculate recent completion rate
      let totalCompletions = 0;
      let totalDays = 0;
      
      for (const habit of habits.slice(0, 5)) {
        try {
          const summary = await getHabitSummary(userId, habit.id);
          if (summary.completionRate7d !== undefined) {
            totalCompletions += summary.completionRate7d;
            totalDays += 1;
          }
        } catch {
          // Skip if summary fails
        }
      }

      const avgCompletion = totalDays > 0 ? totalCompletions / totalDays : 0;
      const hour = new Date().getHours();

      // Generate hint based on context
      if (habitsCount === 0) {
        setHint("Start with one small ritual. You can always change it.");
      } else if (avgCompletion >= 80) {
        setHint("You've been consistent lately. Keep it simple.");
      } else if (avgCompletion >= 50) {
        setHint("Today looks manageable. One habit at a time.");
      } else if (hour < 12) {
        setHint("Today looks light — this could be a good day for something small.");
      } else if (hour < 17) {
        setHint("Afternoon energy can vary. One habit is enough.");
      } else {
        setHint("Evening is a good time for reflection. Keep it simple.");
      }
    } catch (error) {
      console.error('[DailyFocusHint] Error generating hint:', error);
      setHint(null);
    }
  };

  if (dismissed || !hint) {
    return null;
  }

  return (
    <div className={`
      ${isMobile ? 'mb-3 px-3 py-2' : 'mb-4 px-4 py-3'}
      bg-gradient-to-r from-amber-50/50 to-orange-50/30
      border border-amber-100
      rounded-xl
      flex items-start gap-2 sm:gap-3
      animate-in fade-in slide-in-from-top-2 duration-300
    `}>
      <Sparkles size={isMobile ? 14 : 16} className="text-amber-500 flex-shrink-0 mt-0.5" />
      <p className={`
        flex-1
        text-gray-700
        leading-relaxed
        ${isMobile ? 'text-xs' : compact ? 'text-xs' : 'text-sm'}
      `}>
        {hint}
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 p-1 rounded-lg hover:bg-white/50"
        aria-label="Dismiss hint"
      >
        <X size={isMobile ? 12 : 14} />
      </button>
    </div>
  );
}
