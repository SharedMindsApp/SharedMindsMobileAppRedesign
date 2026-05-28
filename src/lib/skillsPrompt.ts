/**
 * Skills-prompt arming flag.
 *
 * We don't ask for skills in the onboarding wizard (it's kept lean). Skills
 * only become socially relevant once a user commits to a session WITH OTHER
 * PEOPLE at a set time — i.e. schedules a session or books into someone
 * else's. At that moment we "arm" a one-time prompt; the dashboard shows the
 * skills self-rating modal on its next mount (if the user has no skills yet
 * and hasn't dismissed it).
 *
 * Quick-timer and solo sessions deliberately do NOT arm this — they're
 * private/immediate and skills are irrelevant there.
 *
 * Two localStorage flags:
 *   armed     — set when the trigger fires, cleared once the modal is shown
 *   dismissed — set permanently once the user dismisses/saves, so it never
 *               re-appears even if they schedule again later
 */

const LS_ARMED = 'sm.skillsPrompt.armed';
const LS_DISMISSED = 'sm.skillsPrompt.dismissed';

export function armSkillsPrompt(): void {
  if (typeof window === 'undefined') return;
  try {
    // Don't bother arming if the user already dealt with it.
    if (window.localStorage.getItem(LS_DISMISSED) === 'true') return;
    window.localStorage.setItem(LS_ARMED, 'true');
  } catch { /* private mode */ }
}

export function isSkillsPromptArmed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(LS_ARMED) === 'true'
      && window.localStorage.getItem(LS_DISMISSED) !== 'true';
  } catch {
    return false;
  }
}

/** Consume the armed flag (call when the modal is shown so it doesn't re-arm). */
export function consumeSkillsPromptArm(): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(LS_ARMED); } catch { /* noop */ }
}

/** Permanently dismiss — the prompt never shows again. */
export function dismissSkillsPrompt(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_DISMISSED, 'true');
    window.localStorage.removeItem(LS_ARMED);
  } catch { /* noop */ }
}
