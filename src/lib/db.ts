// Tiny file-backed data store for CABS Web.
//
// The prototype deliberately uses a single JSON file (data/sessions.json) as
// the "structured database" rather than a real DBMS. That keeps the project
// dependency-free and the data inspectable in a PR, while exposing a narrow
// async interface (getSessions / addSession / updateSession) that a future
// Postgres/Supabase implementation can drop in behind without touching callers.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { Session, SessionStatus, SubmissionInput } from './types.ts';

// Resolve the store from the project root (process.cwd()), NOT from this
// module's path. The dev server and the bundled production server live at
// different depths under dist/, so an import.meta.url-relative path would break
// in production. Both are launched from the project root, so cwd is stable.
// CABS_DATA_PATH lets deployments point at a mounted volume.
const DB_PATH = process.env.CABS_DATA_PATH
  ? resolve(process.env.CABS_DATA_PATH)
  : resolve(process.cwd(), 'data/sessions.json');

async function readAll(): Promise<Session[]> {
  try {
    const raw = await readFile(DB_PATH, 'utf8');
    return JSON.parse(raw) as Session[];
  } catch (err: any) {
    // First run before any submission — treat a missing file as empty.
    if (err?.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeAll(sessions: Session[]): Promise<void> {
  await mkdir(dirname(DB_PATH), { recursive: true });
  await writeFile(DB_PATH, JSON.stringify(sessions, null, 2) + '\n', 'utf8');
}

/** All sessions, optionally filtered by one or more lifecycle statuses. */
export async function getSessions(
  filter?: { status?: SessionStatus | SessionStatus[] },
): Promise<Session[]> {
  const all = await readAll();
  if (!filter?.status) return all;
  const wanted = Array.isArray(filter.status) ? filter.status : [filter.status];
  return all.filter((s) => wanted.includes(s.status));
}

export async function getSessionBySlug(slug: string): Promise<Session | undefined> {
  const all = await readAll();
  return all.find((s) => s.slug === slug);
}

/** Talks visible on the public site, soonest first. */
export async function getUpcoming(): Promise<Session[]> {
  const now = Date.now();
  return (await getSessions({ status: ['published', 'scheduled'] }))
    .filter((s) => new Date(s.date).getTime() >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/** Past talks with media attached, most recent first. */
export async function getArchive(): Promise<Session[]> {
  return (await getSessions({ status: 'archived' }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

/**
 * Turn a raw portal submission into a stored Session.
 *
 * New submissions always enter as `submitted` so an organizer reviews them
 * before anything is published. Returns the created Session.
 */
export async function addSession(input: SubmissionInput): Promise<Session> {
  const all = await readAll();
  const date = input.preferredDate;
  const datePrefix = (date || new Date().toISOString()).slice(0, 10);
  const baseSlug = slugify(input.title) || 'untitled-talk';

  // Guarantee slug + id uniqueness against what is already stored.
  let slug = baseSlug;
  let n = 2;
  while (all.some((s) => s.slug === slug)) slug = `${baseSlug}-${n++}`;

  const session: Session = {
    id: `${datePrefix}-${slug}`,
    slug,
    title: input.title.trim(),
    abstract: input.abstract.trim(),
    speaker: {
      name: input.speakerName.trim(),
      title: input.speakerTitle?.trim() ?? '',
      org: input.speakerOrg?.trim() ?? '',
      bio: input.speakerBio?.trim() ?? '',
      photo: input.photoUrl?.trim() || '/speakers/placeholder.svg',
      links: {
        linkedin: input.linkedin?.trim() || '',
        website: input.website?.trim() || '',
      },
    },
    date,
    durationMinutes: 60,
    location: 'TBD',
    tags: (input.tags ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    status: 'submitted',
    media: { recording: '', slides: '', transcript: '', summary: '' },
    submittedAt: new Date().toISOString(),
  };

  all.push(session);
  await writeAll(all);
  return session;
}

/** Patch a session in place by id. Returns the updated record, or undefined. */
export async function updateSession(
  id: string,
  patch: Partial<Session>,
): Promise<Session | undefined> {
  const all = await readAll();
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return undefined;
  all[idx] = { ...all[idx], ...patch };
  await writeAll(all);
  return all[idx];
}
