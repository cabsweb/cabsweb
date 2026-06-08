// @ts-check
import { defineConfig } from 'astro/config';

// CABS Web is built as a fully static site so it can be hosted for free on
// GitHub Pages, Netlify, or GoDaddy static hosting. Every page is prerendered
// to HTML at build time from data/sessions.json.
//
// Because there is no server at runtime, the speaker portal form submits to an
// external form handler (Formspree) rather than an in-app API route. New talks
// are then added to data/sessions.json and the site is rebuilt. To run a live
// in-app portal instead, switch back to `output: 'server'` with the @astrojs/node
// adapter (see git history / DEPLOY.md).
export default defineConfig({
  site: 'https://cabsweb.net',
  output: 'static',
});
