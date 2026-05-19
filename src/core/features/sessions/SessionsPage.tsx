/**
 * SessionsPage — Focusmate-style 3-day calendar grid.
 *
 * The old list-style view has been replaced by CalendarView, which doubles as
 * the in-app /sessions and /calendar surfaces. Solo sessions live in the
 * sidebar (separate flow, never shown on the grid).
 */

import { CalendarView } from './CalendarView';

export function SessionsPage() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h1 className="stitch-headline text-xl font-extrabold tracking-tight">Sessions</h1>
          <p className="text-xs stitch-text-secondary mt-0.5">
            Book a slot, join someone live, or work solo.
          </p>
        </div>
      </div>
      <CalendarView />
    </div>
  );
}
