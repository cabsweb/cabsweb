import type { APIRoute } from 'astro';
import { getSessions } from '../../lib/db.ts';
import { icsForSession } from '../../lib/calendar.ts';
import type { Session } from '../../lib/types.ts';

// Prerender one /events/<slug>.ics file per upcoming talk (static build).
export async function getStaticPaths() {
  const sessions = await getSessions({ status: ['scheduled', 'published'] });
  return sessions.map((s) => ({ params: { slug: s.slug }, props: { session: s } }));
}

export const GET: APIRoute = ({ props }) => {
  const { session } = props as { session: Session };
  return new Response(icsForSession(session), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${session.slug}.ics"`,
    },
  });
};
