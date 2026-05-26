/**
 * Minimal .ics (iCalendar) generator — RFC 5545.
 *
 * No external dependency; just enough fields to add a session to
 * Google / Apple / Outlook calendars via "Add to calendar". Generates a
 * UTF-8 .ics file and triggers a browser download.
 *
 * Not intended to handle recurring events, attachments, or attendees —
 * if we ever need that, swap in `ics` or `ical-generator`.
 */

export interface IcsEvent {
  uid:         string;
  title:       string;
  description?: string;
  location?:   string;          // URL or human-readable location
  startUtc:    Date;
  endUtc:      Date;
  url?:        string;          // SharedMinds session deep-link
}

/** Generate the .ics string. */
export function buildIcs(events: IcsEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SharedMinds//Sessions//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}@sharedminds.app`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(e.startUtc)}`,
      `DTEND:${fmt(e.endUtc)}`,
      `SUMMARY:${esc(e.title)}`,
    );
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    if (e.location)    lines.push(`LOCATION:${esc(e.location)}`);
    if (e.url)         lines.push(`URL:${esc(e.url)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  // RFC 5545 requires CRLF line endings.
  return lines.join('\r\n');
}

/** Trigger a browser download for the given events. */
export function downloadIcs(events: IcsEvent[], filename = 'sharedminds-session.ics'): void {
  if (typeof window === 'undefined') return;
  const ics = buildIcs(events);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** RFC 5545 datetime format: YYYYMMDDTHHMMSSZ (UTC). */
function fmt(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

/** Escape per RFC 5545 §3.3.11. */
function esc(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}
