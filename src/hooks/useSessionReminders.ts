/**
 * useSessionReminders
 *
 * Schedules browser (Web Notifications API) reminders for upcoming sessions.
 * Fires 15 minutes before each session in the supplied list.
 *
 * - Silently no-ops if the browser doesn't support the API or the user denies
 *   permission — this is an enhancement, never a hard requirement.
 * - Asks for permission the first time the hook sees a schedulable session so
 *   we don't prompt on page load with zero sessions.
 * - Each notification carries the `tag: session-{id}` so a repeat render
 *   doesn't double-fire the same alert.
 */

import { useEffect, useRef } from 'react';
import type { ScheduledSessionWithProfile } from '../core/services/SessionService';

const REMINDER_BEFORE_MS = 15 * 60 * 1000;   // 15 minutes
const MAX_SCHEDULE_AHEAD_MS = 25 * 60 * 60 * 1000; // only schedule within 25 h

export function useSessionReminders(sessions: ScheduledSessionWithProfile[]) {
  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Clear stale timers before rescheduling
    timerIds.current.forEach(clearTimeout);
    timerIds.current = [];

    if (!('Notification' in window)) return;
    if (!sessions.length) return;

    const now = Date.now();

    // Filter to sessions within the schedulable window
    const schedulable = sessions.filter((s) => {
      const start = new Date(s.scheduled_at ?? s.start_time).getTime();
      return start > now - 60_000 && start - now < MAX_SCHEDULE_AHEAD_MS;
    });

    if (!schedulable.length) return;

    // Request permission lazily — only when we actually have something to notify about
    async function scheduleAll() {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission !== 'granted') return;

      for (const session of schedulable) {
        const start = new Date(session.scheduled_at ?? session.start_time);
        const startMs = start.getTime();
        const title = session.session_title ?? session.session_goal ?? 'Session starting soon';
        const timeStr = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        // ── T-15 min reminder ──────────────────────────────────
        const delay15 = startMs - REMINDER_BEFORE_MS - Date.now();
        if (delay15 >= 0) {
          const id = setTimeout(() => {
            try {
              // eslint-disable-next-line no-new
              new Notification(`Starting in 15 min: ${title}`, {
                body: `Hosted by ${session.display_name} · ${timeStr}`,
                icon: '/favicon.ico',
                tag: `session-reminder-15-${session.id}`,
                requireInteraction: false,
              });
            } catch {
              // Notification constructor can throw in some secure contexts — ignore
            }
          }, delay15);
          timerIds.current.push(id);
        }

        // ── T=0 "starting now" notification ───────────────────
        const delayNow = startMs - Date.now();
        if (delayNow >= 0) {
          const id = setTimeout(() => {
            try {
              // eslint-disable-next-line no-new
              new Notification(`Starting now: ${title}`, {
                body: `It's time! Join your session with ${session.display_name}.`,
                icon: '/favicon.ico',
                tag: `session-reminder-now-${session.id}`,
                requireInteraction: true, // stay until dismissed for the "go now" moment
              });
            } catch {
              // ignore
            }
          }, delayNow);
          timerIds.current.push(id);
        }
      }
    }

    scheduleAll();

    return () => {
      timerIds.current.forEach(clearTimeout);
    };
  }, [sessions]);
}
