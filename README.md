# cabsweb

AI-Powered Speaker Series Management and Knowledge Hub for CABS.

## 1. Mission
cabsweb streamlines how CABS runs its **AI & Digital Productivity Series**. Today, speaker details, event announcements, website updates, and post-event content are juggled across emails, spreadsheets, and a handful of disconnected tools. cabsweb replaces that with one workflow: speakers self-submit through an online portal, talks flow into a structured database, public event pages and draft announcements are generated automatically, and every past session is recorded, summarized, and archived into a searchable knowledge hub.

## 2. Enterprise Area
- Area: Community / Digital Productivity (CABS AI & Digital Productivity Series)
- Primary users: Series organizers, invited speakers, community members
- Business function: Event operations, content publishing, knowledge management
- AI agent type: Workflow-automation + content-generation assistant on a web platform

## 3. Problem Statement
Running a recurring speaker series is mostly administrative glue work: chasing speaker bios and photos, hand-building event pages, drafting LinkedIn and newsletter copy, and—after each talk—corralling recordings, slides, and notes so members can actually find them later. This is slow, error-prone, and doesn't scale as the series grows. cabsweb automates the repetitive steps and keeps a single source of truth, so organizers spend their time on the program, not the plumbing.

## 4. Target Users
- Primary user: Series organizers (the people scheduling and promoting talks)
- Secondary users: Invited speakers (self-service submission) and community members (discovering and learning from talks)
- Human decision owner: CABS AI & Digital Productivity Series lead

## 5. Core Agent Capabilities
- **Self-service speaker portal** — speakers submit bio, photo, title, abstract, and preferred date through a public form (`/submit`).
- **Structured store** — every talk is a typed `Session` record with a clear lifecycle (`submitted → scheduled → published → archived`) that drives every page.
- **Automatic event pages** — each public talk gets its own page at `/events/<slug>` with no manual HTML.
- **Draft announcements** — LinkedIn posts and newsletter blurbs are generated for every upcoming talk; an optional Claude pass polishes the copy.
- **Knowledge hub archive** — past sessions collect recording, slides, transcript, and an AI-generated summary, browsable and tag-filtered at `/archive`.

## 6. Example Use Cases
1. An invited speaker fills out the portal; the organizer receives the proposal, adds it to the store, and sets its status to publish it.
2. An organizer runs `npm run generate` to produce review-ready LinkedIn and newsletter drafts for every upcoming talk.
3. After an event, `npm run summarize <slug>` turns the transcript into a concise summary and moves the talk into the public archive.

## 7. System Architecture
A **static** Astro site (every page prerendered to HTML from a file-based session store) plus two Node automation scripts run by organizers. The public site has no runtime server, so the speaker portal submits to an external form handler (Formspree); organizers add accepted talks to the store and rebuild. The AI scripts (powered by the Anthropic SDK) generate promotion copy and post-event summaries.

```text
User Interface  (static Astro pages: home, /submit, /events/[slug], /archive)
   ↓
Agent Orchestrator  (Formspree form intake · scripts/generate-content · scripts/summarize-recording)
   ↓
Tools / APIs / Databases  (data/sessions.json store · Anthropic SDK)
   ↓
Memory / RAG Layer  (structured Session records + tag index → knowledge hub)
   ↓
Evaluation & Logging  (human review of drafts/summaries before publishing)
```

---

## Project structure
```
cabsweb/
├─ data/sessions.json          # the structured "database" (seeded with 3 demo talks)
├─ src/
│  ├─ lib/
│  │  ├─ types.ts              # Session / Speaker / Submission domain types
│  │  ├─ db.ts                 # async data-access layer (get/add/update sessions)
│  │  ├─ announcements.ts      # deterministic LinkedIn / newsletter / recap drafts
│  │  └─ format.ts             # date display helpers
│  ├─ layouts/Base.astro       # shared shell, nav, styles
│  ├─ components/SessionCard.astro
│  ├─ pages/
│  │  ├─ index.astro           # home: next-up + upcoming + recently archived
│  │  ├─ submit.astro          # speaker self-service portal
│  │  ├─ archive.astro         # knowledge hub (tag-filterable)
│  │  ├─ events/[slug].astro   # prerendered event page (one per public talk)
│  │  ├─ submit.astro          # speaker portal (posts to Formspree)
│  │  └─ 404.astro
│  └─ styles/global.css
└─ scripts/
   ├─ generate-content.mjs     # draft announcements (optional Claude polish)
   └─ summarize-recording.mjs  # transcript → AI summary → archive
```

## Running locally
Requires Node 22+ (Astro 5).

```bash
npm install
npm run dev          # http://localhost:4321
npm run build        # → static site in dist/
npm run preview      # serve the built dist/ locally
```

## Deploying
The site is fully static — host it free on Netlify, GitHub Pages, or GoDaddy
static hosting, pointed at `cabsweb.net`. See **[DEPLOY.md](DEPLOY.md)** for
step-by-step instructions and the GoDaddy DNS records.

> **Speaker form:** because the site is static (no backend), the portal posts to
> **Formspree**. Create a free form at <https://formspree.io> and set its endpoint
> in [src/pages/submit.astro](src/pages/submit.astro) (`FORM_ENDPOINT`). Accepted
> talks are then added to `data/sessions.json` and the site is rebuilt.

## AI automation scripts
Both scripts work without an API key (templates / placeholders) and add a Claude pass when `ANTHROPIC_API_KEY` is set.

```bash
# Draft LinkedIn + newsletter copy for upcoming talks → src/generated/<slug>.md
npm run generate                       # all upcoming talks
npm run generate -- prompt-to-product  # one talk by slug

# Summarize a recorded talk's transcript and archive it
npm run summarize -- <slug> [path/to/transcript.txt]
export ANTHROPIC_API_KEY=sk-ant-...    # enables the real AI summary/polish
```

## Data model
A `Session` is one talk. Its `status` drives every view:

| status | meaning | visible where |
| --- | --- | --- |
| `submitted` | added to the store, awaiting organizer review | nowhere (no page generated) |
| `scheduled` | accepted, date set | home + event page |
| `published` | promoted publicly | home + event page |
| `archived` | event happened; media + summary attached | archive + event page |

Only `scheduled`/`published`/`archived` talks get a prerendered page, so a `submitted` proposal never goes public until an organizer changes its status and rebuilds.
