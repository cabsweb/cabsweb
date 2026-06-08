# Deploying cabsweb (static) to cabsweb.net

cabsweb builds to a **static site** (`npm run build` → `dist/`), so it can be
hosted for free on GitHub Pages, Netlify, or GoDaddy static hosting. Pick one
host below, then point `cabsweb.net` at it via GoDaddy DNS.

> **Before you deploy:** wire up the speaker form. A static site has no backend,
> so the form in [src/pages/submit.astro](src/pages/submit.astro) posts to
> **Formspree**. Create a free form at <https://formspree.io>, copy its endpoint,
> and replace `FORM_ENDPOINT` (`https://formspree.io/f/your-form-id`) in that
> file. Without this the form won't deliver submissions. (On Netlify you can use
> Netlify Forms instead — see the note in `submit.astro`.)

---

## Option A — Netlify (easiest, recommended)

1. Push the repo to GitHub.
2. <https://app.netlify.com> → **Add new site → Import from Git** → pick the repo.
3. Build settings (Netlify auto-detects Astro):
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Deploy. You get a URL like `cabsweb.netlify.app`.
5. **Domains → Add custom domain** → `cabsweb.net`. Netlify shows the DNS to set.

**GoDaddy DNS** (GoDaddy → your domain → DNS → Manage DNS):

| Type    | Name  | Value                     |
|---------|-------|---------------------------|
| `CNAME` | `www` | `cabsweb.netlify.app`     |
| `A`     | `@`   | `75.2.60.5` (Netlify's load balancer IP — confirm the current value in Netlify's domain panel) |

Netlify issues HTTPS automatically once DNS resolves.

---

## Option B — GitHub Pages

GitHub Pages doesn't build Astro for you, so add a workflow. Create
`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push: { branches: [main] }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci && npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages }
    steps:
      - uses: actions/deploy-pages@v4
```

Then in the repo: **Settings → Pages → Source: GitHub Actions**, and add your
custom domain `cabsweb.net` there (it writes a `CNAME` file).

**GoDaddy DNS** for a GitHub Pages apex domain:

| Type    | Name  | Value                    |
|---------|-------|--------------------------|
| `A`     | `@`   | `185.199.108.153`        |
| `A`     | `@`   | `185.199.109.153`        |
| `A`     | `@`   | `185.199.110.153`        |
| `A`     | `@`   | `185.199.111.153`        |
| `CNAME` | `www` | `<your-username>.github.io` |

---

## Option C — GoDaddy static hosting (cPanel)

If you have GoDaddy's web hosting (cPanel/Plesk), no separate host or DNS change
is needed — the domain already points at it.

1. `npm run build` locally.
2. Upload the **contents of `dist/`** (not the folder itself) into `public_html`
   via cPanel File Manager or SFTP.
3. Re-upload after each rebuild.

(There's no CI here — every content change means rebuild + re-upload. Netlify or
Pages automate this from a git push, which is why Option A/B is nicer.)

---

## After it's live

Confirm `https://cabsweb.net` loads the home page, an event page
(`/events/prompt-to-product`), and the archive. Submit a test proposal and check
it arrives in your Formspree dashboard. `site` in
[astro.config.mjs](astro.config.mjs) is already `https://cabsweb.net`, so
canonical links and announcement drafts point at the right place.

## Adding a new talk (the static workflow)

1. A speaker submits the form → you receive it (Formspree email/dashboard).
2. Add the talk to [data/sessions.json](data/sessions.json) — `status: "scheduled"`
   or `"published"` to make it public.
3. (Optional) `npm run generate -- <slug>` for LinkedIn/newsletter drafts.
4. After the event, `npm run summarize -- <slug> transcript.txt` writes the AI
   summary and flips the talk to `archived`.
5. Rebuild/redeploy (automatic on Netlify/Pages when you push; manual upload on
   GoDaddy hosting).

> Want submissions to land in the database automatically instead of by email?
> That needs a server. The codebase keeps the data layer behind a small async
> interface ([src/lib/db.ts](src/lib/db.ts)) so you can later switch to
> `output: 'server'` (Node adapter) or a hosted DB without rewriting the pages.
