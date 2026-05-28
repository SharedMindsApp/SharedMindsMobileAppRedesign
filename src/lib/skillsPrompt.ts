/**
 * Skills-prompt scheduling.
 *
 * Skills aren't asked for in the lean onboarding wizard. We prompt for
 * them in two ways, both capped to AT MOST ONCE PER WEEK so we never nag:
 *
 *   1. Armed trigger — when the user schedules a session or books into
 *      someone else's 1-on-1 (the moment skills become socially relevant).
 *      Quick-timer and solo sessions don't arm it.
 *
 *   2. Periodic reminder — if the user still has no skills, we re-surface
 *      the prompt about once a week (gated on having completed ≥1 session,
 *      so brand-new users aren't pestered before they've felt the app).
 *
 * Both paths share a single `lastShownAt` timestamp, so the weekly cap
 * applies globally — a user never sees the skills prompt more than once
 * in any 7-day window regardless of which trigger fires. Once the user
 * actually adds skills, the caller's empty-check stops it entirely.
 */

const LS_ARMED = 'sm.skillsPrompt.armed';
const LS_LAST_SHOWN = 'sm.skillsPrompt.lastShownAt';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function readNum(key: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const v = window.localStorage.getItem(key);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch { return 0; }
}

/** Arm the prompt — called when the user commits to a session with others. */
export function armSkillsPrompt(): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(LS_ARMED, 'true'); } catch { /* private mode */ }
}

function isArmed(): boolean {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage.getItem(LS_ARMED) === 'true'; } catch { return false; }
}

/** True once at least a week has passed since we last showed the prompt
 *  (or it's never been shown). The shared weekly cap. */
function weeklyCapPassed(): boolean {
  return Date.now() - readNum(LS_LAST_SHOWN) >= WEEK_MS;
}

/**
 * Should we show the skills prompt right now?
 *
 * @param hasSkills        whether the user already has skills (if so, never)
 * @param sessionsDone     completed-session count (gate for the periodic path)
 *
 * Shows when the user has no skills, the weekly cap has passed, AND either
 * the prompt was armed by a scheduling action OR they've done ≥1 session
 * (the periodic reminder).
 */
export function shouldShowSkillsPrompt(hasSkills: boolean, sessionsDone: number): boolean {
  if (hasSkills) return false;
  if (!weeklyCapPassed()) return false;
  return isArmed() || sessionsDone >= 1;
}

/** Record that the prompt was just shown — starts the 7-day cooldown and
 *  consumes the armed flag. Call when the modal opens. */
export function markSkillsPromptShown(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_LAST_SHOWN, String(Date.now()));
    window.localStorage.removeItem(LS_ARMED);
  } catch { /* private mode */ }
}
