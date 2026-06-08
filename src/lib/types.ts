// Shared domain types for CABS Web.
//
// A "Session" is one talk in the AI & Digital Productivity Series. It moves
// through a lifecycle as the organizing workflow progresses:
//
//   submitted  -> speaker filled out the portal form; awaiting review
//   scheduled  -> accepted and given a date; not yet shown publicly
//   published  -> live on the public site as an upcoming talk
//   archived   -> event happened; recording/slides/summary attached
//
// The status field is what every page filters on, so it is the single source
// of truth for "where is this talk in the pipeline".

export type SessionStatus = 'submitted' | 'scheduled' | 'published' | 'archived';

export interface SpeakerLinks {
  linkedin?: string;
  website?: string;
}

export interface Speaker {
  name: string;
  title: string;
  org: string;
  bio: string;
  /** Public path or URL to the speaker headshot. */
  photo: string;
  links: SpeakerLinks;
}

export interface SessionMedia {
  /** URL to the event recording (post-event). */
  recording: string;
  /** Public path or URL to the slide deck (post-event). */
  slides: string;
  /** Public path or URL to the raw transcript (post-event). */
  transcript: string;
  /** AI-generated summary of the talk (post-event). */
  summary: string;
}

export interface Session {
  /** Stable, immutable identifier (date-prefixed). */
  id: string;
  /** URL-safe slug used to build /events/<slug>. */
  slug: string;
  title: string;
  abstract: string;
  speaker: Speaker;
  /** ISO 8601 datetime of the talk. */
  date: string;
  durationMinutes: number;
  location: string;
  tags: string[];
  status: SessionStatus;
  media: SessionMedia;
  /** ISO 8601 datetime the submission was received. */
  submittedAt: string;
}

/** Shape accepted by the public speaker submission form / API. */
export interface SubmissionInput {
  speakerName: string;
  speakerTitle: string;
  speakerOrg: string;
  speakerBio: string;
  speakerEmail: string;
  photoUrl?: string;
  linkedin?: string;
  website?: string;
  title: string;
  abstract: string;
  preferredDate: string;
  tags?: string;
}
