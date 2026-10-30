# Design Lab: the Studio redesign

> **Studio is the site's design.** Every live URL (English and Arabic) renders
> its Studio page; the previous BaseLayout pages are gone from `src/pages`.
> The quote configurator is at `/quote/`. Old preview links under
> `/design-lab/studio/` redirect (301) to the live page
> (`src/pages/design-lab/studio/[...page].ts`); only the header candidates and
> the car viewer still render under the lab. The notes below describe how the
> redesign was reviewed and where its code lives.

**Studio** is the chosen direction for the new wrpdetailing.ae (October 2026): a
conventional detailing-studio site, modelled on the structure of Apex Detail
Studio (Dubai). It uses the real content: prices from `src/content/services`,
live Google reviews (5.0, 120+ reviews) and real customer and studio photos.
Services lead; the WRP Lounge has one section further down, replacing the old
"Signature Fleet" logo wall.

The other directions (Mezzanine and The Menu in round 3; Gloss, Paddock, Layers
and Diagnosis before that) were dropped and their code removed. They remain in
the git history of this branch.

## Where to look

Every build has a review hub at `/design-lab/`:

| Page | Path |
| --- | --- |
| Homepage | `/` |
| Quote, one page beside a 3D car (the step-by-step version was removed) | `/quote/` |
| 3D car viewer (test page) | `/design-lab/studio/car-viewer/` |
| Header candidates | `/design-lab/studio/headers/` (each at `headers/a/`, `d/` … `h/`, Arabic at `…/ar/`) |

Design Lab pages are `noindex`, excluded from the sitemap, and their forms
never send leads. The quote page is `noindex` too (a tool, English only) and
left out of the sitemap, but it is a live page: its submissions are real.

Cloudflare **Worker Previews** of the branch:

| Preview | Serves |
| --- | --- |
| `design-studio` | the same site as the branch Preview (it used to serve Studio at `/` before Studio was the site) |
| the branch's own Preview | the site, with the Design Lab under `/design-lab/` |

URLs follow `https://<preview>-wrp-astro.<subdomain>.workers.dev`. They update on
every push to the branch they track.

## How it works

- `src/designs/studio/Home.astro`: the Studio homepage, self-contained (own styles and
  fonts, no Tailwind or global.css); its quote flows live in `src/designs/studio/quote/`. Shared content in `src/designs/data.ts`, shell in
  `src/designs/shared/`.
- The route files in `src/pages` render `src/designs/studio/site/SitePage.astro`
  (homepages, Wrap/Reinforce/Protect, about, contact, reviews, portfolio, blog,
  legal), `site/ServicePage.astro` (services) or `quote/one-page/QuoteOne.astro`
  (`/quote/`). `PUBLIC_WRP_DESIGN` no longer changes anything.
- `wrangler.jsonc` has a `previews` block. It deliberately omits the production
  D1 database and email binding, so a Preview cannot create a real lead.

## Deploying Previews

**Workers Builds (automatic).** The Worker uses Worker Previews for every
non-`main` branch (deploy command `npx wrangler preview`). The Design Lab
branch's Preview overrides its deploy command to
`node scripts/preview-designs.mjs --ci`, which publishes the branch build as the
branch Preview, then rebuilds with `PUBLIC_WRP_DESIGN=studio` and publishes
`design-studio`. Every push to the branch refreshes both.

**By hand.** With `wrangler login` (Wrangler ≥ 4.135):

```sh
bun run preview:designs                 # design-studio + the lab
bun run preview:designs -- --dry-run    # print the commands
```

Delete a Preview with `npx wrangler preview delete --name design-<id>`.

## Header candidates

`src/designs/studio/headers/` holds the headers to choose from, listed in
`headers/variants.ts`: A Showroom (kept from round 1), D Arrivals board,
E Storefront and F Filmstrip (round 2: logo centred, square corners, a
secondary bar on top, every service visible without a hover). G and H are E
on wide screens with a different phone layout (`HeaderStorefront`'s `phone`
prop): G uses A's phone bar and photo-card menu (`parts/ShowroomSheet.astro`),
H runs F's photo frames as an endless carousel (`parts/FilmCarousel.astro`,
whose looping copies are spans, not links). All of them
render the live navigation's link set from `headers/nav.ts` (six service
pages, Portfolio, Reviews, About, Blog, Contact) as plain `<a href>` links in
the HTML, in English or Arabic (RTL). Shereef picked G, so it is the Studio homepage's
header (`Home.astro` defaults its `header` prop to `g`), and every page has it,
the quote page included; the other candidates stay in the lab.

## Studio inner pages

Every page was rebuilt in Studio keeping its copy word for word, reviewed at
its live path under `/design-lab/studio/`, then moved to the live path itself.
The pages read the same content entries and translations as before, so the
copy cannot drift.

- `src/designs/studio/site/StudioPage.astro`: the document shell. Its `<head>`
  is the live BaseLayout's (title, description, canonical, OG/Twitter,
  hreflang, LocalBusiness and SiteNavigationElement JSON-LD, RSS, analytics),
  around Studio's header G, footer and floating contact. On a Design Lab page
  it is `noindex, nofollow` without analytics. `app` is for the quote
  configurator: the page brings its own `<main>`, with no floating contact or
  Tally popup.
- `src/designs/studio/site/routes.ts`: the quote URL, and the lab prefix with
  `toLab`, which keeps the header candidates' links inside the lab.
- `src/designs/studio/site/ServicePage.astro` + `sections/`: the service page
  template and the sections it shares with later pages.
- `src/designs/studio/theme.css`: Studio's tokens, layout helpers, headings and
  buttons, shared by the homepage and the inner pages.

- `src/designs/studio/site/sections/LeadForm.astro`: the hero quote form,
  layout A "Card" from tablet width up and layout C "Callback" (mobile number
  only, call or WhatsApp) on phones, from one set of fields. With a form in the hero, the
  hero drops its quote button, every quote button on the page leads to the
  form, and the header's quote buttons hide while the form is on screen. It
  sends to the `quote` Astro Action (`src/actions/index.ts`), which validates
  the fields, checks a hidden honeypot, and saves to the `quote_form_leads` D1
  table and a notification job together, then attempts to email the team.
  Missing D1 or the outbox migration on a live site is an error; missing email
  does not prevent the D1 save. A filled honeypot (`form_check`) is discarded
  without a lead conversion and logged without customer details. Worker
  previews and Design Lab pages only run the checks: nothing is saved or sent
  (`quoteLeadMode` in `src/lib/quote-form-lead.ts`). The homepage form and the
  configurator send to the same action.

  Email recovery: the Cron Trigger (`src/worker.ts`, every 5 minutes) retries
  failed notifications and sends a backlog alert. The alert uses the same
  email service and therefore cannot independently report an outage of that
  service. See `docs/quote-notification-recovery.md` for monitoring, retry
  limits and operator recovery.

  Migrations 0006, 0007 and `0008_add_quote_notification_outbox.sql` were
  applied in order to production D1 on 2026-10-30. Go-live needs a real
  submission checked through D1, the inbox and GA4. The honeypot is a lightweight spam filter;
  watch the honeypot log line and revisit Turnstile if spam gets through.

- `StudioPage.astro` includes the existing Tally scroll popup on live pages,
  excluding contact pages as on the current site. Design Lab pages do not load
  the live popup or send test submissions to Tally.

## Left over from the review period

The previous design's layouts and components (`src/layouts/BaseLayout.astro`,
`src/components/Navigation.astro`, …) are no longer used by any page and can be
deleted, along with the header candidates, `toLab`, `DesignShell` and the
design Previews, once nobody needs to compare against them.
