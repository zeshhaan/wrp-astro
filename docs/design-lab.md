# Design Lab: the Studio redesign

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

Every build has a review hub at `/design-lab/` linking to each Studio page:

| Page | Path |
| --- | --- |
| Homepage | `/design-lab/studio/` |
| Quote, step by step | `/design-lab/studio/quote/` |
| Quote, one page (beside a 3D car) | `/design-lab/studio/quote/one-page/` |
| 3D car viewer (test page) | `/design-lab/studio/car-viewer/` |
| Header candidates | `/design-lab/studio/headers/` (each at `headers/a/`, `d/` … `h/`, Arabic at `…/ar/`) |

A floating bar links between them. These pages are `noindex`, excluded from the
sitemap, and their forms never send leads.

Studio also has its own Cloudflare **Worker Preview** where it is served at `/`,
exactly as it would be on wrpdetailing.ae:

| Preview | Serves |
| --- | --- |
| `design-studio` | Studio at `/` |
| the branch's own Preview | the Design Lab under `/design-lab/` |

URLs follow `https://<preview>-wrp-astro.<subdomain>.workers.dev`. They update on
every push to the branch they track.

## How it works

- `src/designs/studio/Home.astro`: the Studio homepage, self-contained (own styles and
  fonts, no Tailwind or global.css); its quote flows live in `src/designs/studio/quote/`. Shared content in `src/designs/data.ts`, shell in
  `src/designs/shared/`.
- `PUBLIC_WRP_DESIGN=<id>` at build time makes `src/pages/index.astro` rewrite `/`
  to that design. Unset in production, so the live homepage is unchanged.
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
header (`Home.astro` defaults its `header` prop to `g`); the other candidates
stay in the lab for now. The quote pages still use the older `Header.astro`.

## Studio inner pages

The rest of the site is being rebuilt in Studio one group at a time, each page
keeping its live copy word for word. A Studio page renders at its live path
under `/design-lab/studio/` (for example `/design-lab/studio/services/polish/`
for `/services/polish/`) and reads the same content entries and translations
as the live page, so the copy cannot drift.

- `src/designs/studio/site/StudioPage.astro`: the document shell. Its `<head>`
  is the live BaseLayout's (title, description, canonical, OG/Twitter,
  hreflang, LocalBusiness and SiteNavigationElement JSON-LD, RSS, analytics),
  around Studio's header G, footer and floating contact. Under the lab prefix it
  is `noindex, nofollow` without analytics, and its canonical and hreflang
  already point at the live URL, so the head can be diffed against the live
  page. At go-live the live route renders the Studio page instead of
  BaseLayout and nothing in the shell changes.
- `src/designs/studio/site/routes.ts`: the lab prefix, the temporary quote URL,
  and which live paths have a Studio version (links to those stay inside the
  preview).
- `src/designs/studio/site/ServicePage.astro` + `sections/`: the service page
  template and the sections it shares with later pages.
- `src/designs/studio/theme.css`: Studio's tokens, layout helpers, headings and
  buttons, shared by the homepage and the inner pages.

Rollout order: service pages (done in English), Wrap/Reinforce/Protect, About,
Contact and Reviews, Portfolio and Blog, the legal pages, then the homepage.
Each group gets its Arabic RTL version once the English look is approved.

## Next: going live

Roll Studio out to every page (services, blog, portfolio, reviews, contact, and
the Arabic site) and make it the homepage, then delete `src/designs/`,
`src/pages/design-lab/` and the design Previews. Choose between the two quote
flows before then, or keep both.
