// Draft announcement generation for CABS Web.
//
// These are pure, deterministic template functions — no network, no API key
// required — so event pages and the organizer dashboard can always render a
// usable LinkedIn post and newsletter blurb instantly. The optional AI rewrite
// pass (scripts/generate-content.mjs) layers polish on top of these drafts;
// the templates here are the dependable floor.

import type { Session } from './types.ts';

// Public base URL used to build absolute links in announcement copy.
// Keep in sync with `site` in astro.config.mjs.
const SITE = 'https://cabsweb.net';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
}

function hashtags(tags: string[]): string {
  const base = ['#CABS', '#AI', '#DigitalProductivity'];
  const fromTags = tags.map((t) => '#' + t.replace(/[^a-zA-Z0-9]/g, ''));
  return [...base, ...fromTags].join(' ');
}

/** A LinkedIn announcement draft for an upcoming talk. */
export function linkedInDraft(s: Session): string {
  const when = `${formatDate(s.date)} · ${formatTime(s.date)}`;
  return [
    `🎙️ Next up in the CABS AI & Digital Productivity Series:`,
    ``,
    `"${s.title}"`,
    ``,
    `with ${s.speaker.name}${s.speaker.title ? `, ${s.speaker.title}` : ''}${
      s.speaker.org ? ` @ ${s.speaker.org}` : ''
    }`,
    ``,
    `🗓️ ${when}`,
    `📍 ${s.location}`,
    ``,
    s.abstract.length > 280 ? s.abstract.slice(0, 277) + '…' : s.abstract,
    ``,
    `Register / join: ${SITE}/events/${s.slug}`,
    ``,
    hashtags(s.tags),
  ].join('\n');
}

/** A short newsletter blurb (HTML-light, paste-ready) for an upcoming talk. */
export function newsletterDraft(s: Session): string {
  const when = `${formatDate(s.date)}, ${formatTime(s.date)}`;
  return [
    `## ${s.title}`,
    ``,
    `**${s.speaker.name}**${s.speaker.title ? `, ${s.speaker.title}` : ''}${
      s.speaker.org ? ` (${s.speaker.org})` : ''
    }`,
    `**When:** ${when}  `,
    `**Where:** ${s.location}`,
    ``,
    s.abstract,
    ``,
    `[Details and registration →](${SITE}/events/${s.slug})`,
  ].join('\n');
}

/** A recap blurb for after the event, used in the archive + follow-up email. */
export function recapDraft(s: Session): string {
  const summary = s.media.summary?.trim();
  const lines = [
    `## Recap: ${s.title}`,
    ``,
    `${s.speaker.name} joined the CABS AI & Digital Productivity Series on ${formatDate(
      s.date,
    )}.`,
    ``,
  ];
  if (summary) lines.push(summary, ``);
  if (s.media.recording) lines.push(`▶️ [Watch the recording](${s.media.recording})`);
  if (s.media.slides) lines.push(`📑 [Download the slides](${s.media.slides})`);
  lines.push(``, `Explore the full archive: ${SITE}/archive`);
  return lines.join('\n');
}

/** All draft variants for one session, keyed by channel. */
export function allDrafts(s: Session): Record<string, string> {
  return {
    linkedin: linkedInDraft(s),
    newsletter: newsletterDraft(s),
    recap: recapDraft(s),
  };
}
