/**
 * /sessions — the calendar.
 *
 * One surface, not "page header + calendar widget". The calendar IS the page.
 * The legacy standalone /calendar route now redirects here.
 */

import { CalendarView } from './CalendarView';

export function SessionsPage() {
  return <CalendarView />;
}
