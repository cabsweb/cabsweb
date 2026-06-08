// Calendar helpers: build an iCalendar (.ics) file and a Google Calendar link
// for a talk. Pure functions — used by the .ics endpoint and the event page.

import type { Session } from './types.ts';

const SITE = 'https://cabsweb.net'; // keep in sync with astro.config.mjs

/** Format an ISO datetime as the UTC stamp iCalendar/Google expect: YYYYMMDDTHHMMSSZ. */
function toICalUTC(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** End time = start + durationMinutes. */
function endISO(session: Session): string {
  return new Date(new Date(session.date).getTime() + session.durationMinutes * 60_000).toISOString();
}

/** Escape text for an ICS field (commas, semicolons, backslashes, newlines). */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** A full VCALENDAR document for one talk (a single .ics download). */
export function icsForSession(session: Session): string {
  const url = `${SITE}/events/${session.slug}`;
  const description = `${session.abstract}\n\nSpeaker: ${session.speaker.name}${
    session.speaker.org ? ` (${session.speaker.org})` : ''
  }\n${url}`;
  // CRLF line endings per RFC 5545.
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CABS//AI & Digital Productivity Series//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${session.id}@cabsweb.net`,
    `DTSTAMP:${toICalUTC(session.submittedAt || session.date)}`,
    `DTSTART:${toICalUTC(session.date)}`,
    `DTEND:${toICalUTC(endISO(session))}`,
    `SUMMARY:${escapeICS(session.title)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    `LOCATION:${escapeICS(session.location)}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

/** A Google Calendar "add event" URL. */
export function googleCalendarUrl(session: Session): string {
  const url = `${SITE}/events/${session.slug}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: session.title,
    dates: `${toICalUTC(session.date)}/${toICalUTC(endISO(session))}`,
    details: `${session.abstract}\n\n${url}`,
    location: session.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
