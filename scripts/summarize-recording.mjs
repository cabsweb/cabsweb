#!/usr/bin/env node
// summarize-recording.mjs
//
// Post-event step of the workflow: reads a talk's transcript, produces a
// concise AI summary + key takeaways, and writes it back onto the session
// record in data/sessions.json. This is what populates the archive's
// "Summary" section so members can learn from past talks without watching
// the full recording.
//
// Usage:
//   node scripts/summarize-recording.mjs <slug> [path/to/transcript.txt]
//
// If a transcript path is given it is used directly; otherwise the script
// reads the public file referenced by the session's media.transcript field.
// Requires ANTHROPIC_API_KEY for the AI summary; without it the script writes
// a clear placeholder so the pipeline still completes deterministically.

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DB_PATH = resolve(ROOT, 'data/sessions.json');
const MODEL = 'claude-opus-4-8';

async function summarizeWithClaude(session, transcript) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.warn('  ANTHROPIC_API_KEY not set — writing placeholder summary.');
    return `Summary pending. Transcript captured (${transcript.length} chars). Run with ANTHROPIC_API_KEY set to generate an AI summary.`;
  }
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: key });

  const prompt = [
    'Summarize this conference talk transcript for an archive of an AI & digital productivity series.',
    'Write 4–6 sentences capturing the core argument and the most actionable takeaways.',
    'Be concrete and faithful to the transcript; do not add information that is not present.',
    'Return only the summary prose — no preamble, no headings.',
    '',
    `TITLE: ${session.title}`,
    `SPEAKER: ${session.speaker.name}`,
    '',
    '--- TRANSCRIPT ---',
    transcript.slice(0, 120_000), // keep well within context for a single talk
  ].join('\n');

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });
  return res.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
}

async function main() {
  const slug = process.argv[2];
  const explicitPath = process.argv[3];
  if (!slug) {
    console.error('Usage: node scripts/summarize-recording.mjs <slug> [transcript.txt]');
    process.exit(1);
  }

  const sessions = JSON.parse(await readFile(DB_PATH, 'utf8'));
  const session = sessions.find((s) => s.slug === slug);
  if (!session) {
    console.error(`No session found with slug "${slug}".`);
    process.exit(1);
  }

  // Resolve the transcript source: explicit path > public file from the record.
  const transcriptPath = explicitPath
    ? resolve(explicitPath)
    : session.media.transcript
      ? resolve(ROOT, 'public', session.media.transcript.replace(/^\//, ''))
      : null;

  if (!transcriptPath) {
    console.error(`No transcript available for "${slug}". Set media.transcript or pass a file path.`);
    process.exit(1);
  }

  let transcript;
  try {
    transcript = await readFile(transcriptPath, 'utf8');
  } catch {
    console.error(`Could not read transcript at ${transcriptPath}.`);
    process.exit(1);
  }

  const summary = await summarizeWithClaude(session, transcript);

  session.media.summary = summary;
  if (session.status !== 'archived') session.status = 'archived';
  await writeFile(DB_PATH, JSON.stringify(sessions, null, 2) + '\n', 'utf8');

  console.log(`✓ Summary written for "${slug}" and status set to archived.`);
  console.log(`\n${summary}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
