/**
 * Minimal RFC-5545 .ics generator + download trigger for a single session.
 *
 * The generated file imports cleanly into Apple Calendar, Google Calendar,
 * Outlook, Fantastical, etc. Times are written in UTC ("Z" suffix) so timezone
 * conversion happens at import on the client side.
 */

export interface IcsEventInput {
  /** Stable unique id — the focus_session id. */
  id: string;
  /** Visible event title. */
  title: string;
  /** Event description (host name, goal text, join link, etc.). Optional. */
  description?: string | null;
  /** Start time. */
  startsAt: Date;
  /** Duration in minutes. */
  durationMins: number;
  /** Optional URL — opens the session room in-app. */
  url?: string | null;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatIcsDate(d: Date): string {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

/**
 * Escape \, ; , and newlines per RFC-5545.
 * https://tools.ietf.org/html/rfc5545#section-3.3.11
 */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function buildIcs(event: IcsEventInput): string {
  const end = new Date(event.startsAt.getTime() + event.durationMins * 60_000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SharedMinds//Session//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@sharedminds.app`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(event.startsAt)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
  ];
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  }
  if (event.url) {
    lines.push(`URL:${event.url}`);
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Generate an .ics file for the given event and trigger a browser download.
 * Works in all modern browsers (Blob + object URL).
 */
export function downloadIcs(event: IcsEventInput): void {
  const ics = buildIcs(event);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const safeTitle = event.title.replace(/[^a-z0-9-_ ]/gi, '').trim().slice(0, 50) || 'session';
  const filename = `${safeTitle.replace(/\s+/g, '-')}.ics`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Revoke after a tick so the click handler completes.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
