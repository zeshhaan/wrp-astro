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
| Three header candidates | `/design-lab/studio/headers/` (each at `headers/a/`, `b/`, `c/`, Arabic at `…/ar/`) |

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

`src/designs/studio/headers/` holds three headers to choose from: A Showroom
(clear over the hero, photo mega menu), B Pit Lane (floating capsule with a live
open-now light, phone dock at the bottom) and C Pillars (paper masthead, full-screen
W·R·P index). All three render the live navigation's link set from
`headers/nav.ts` (six service pages, Portfolio, Reviews, About, Blog, Contact),
as plain `<a href>` links in the HTML, in English or Arabic (RTL). `Home.astro`
takes a `header` prop to swap one in; the homepage itself still uses `Header.astro`.
Once one is picked it replaces `Header.astro` and the other two are deleted.

## Next: going live

Roll Studio out to every page (services, blog, portfolio, reviews, contact, and
the Arabic site) and make it the homepage, then delete `src/designs/`,
`src/pages/design-lab/` and the design Previews. Choose between the two quote
flows before then, or keep both.
