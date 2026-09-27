# Design Lab: choosing the new homepage

Four complete homepage directions for the WRP redesign (round 2). They all use the
same real content: prices from `src/content/services`, live Google reviews (5.0,
120+ reviews, read 27 Sep 2026) and real customer photos. Services lead every
page; the WRP Lounge (billiards, board games, coffee, the glass wall over the
bays) has one section further down, replacing the old "Signature Fleet" logo wall.

| Concept | The idea | Signature moment |
| --- | --- | --- |
| **Mezzanine** | The page is the building: the studio floor where the work happens, the glass mezzanine above. | A glass line splits the hero into two floors, with a lift-style floor indicator. |
| **The Menu** | Services laid out like a fine-dining menu with honest starting prices. | "Plan your visit": pick services and your car, see the starting total and time, send it on WhatsApp. |
| **Layers** | A cross-section through a car's paint. | Scroll down through ceramic, film, clear coat and colour, each drawn to its real thickness in microns. |
| **Diagnosis** | Start from what's wrong with the car. | Pick the problems; the page builds the fix with price, time and a review from someone with the same problem. |

Round 1 also had Gloss and Paddock; the owner dropped them.

## Where to look

Every build has a review hub at `/design-lab/` and each concept at
`/design-lab/<id>/`, with a floating switcher to hop between them. These pages
are `noindex`, excluded from the sitemap, and their forms never send leads.

Each concept also has its own Cloudflare **Worker Preview** where it is served
at `/`, exactly as it would be on wrpdetailing.ae:

| Preview | Serves |
| --- | --- |
| `design-mezzanine` | Mezzanine at `/` |
| `design-menu` | The Menu at `/` |
| `design-layers` | Layers at `/` |
| `design-diagnosis` | Diagnosis at `/` |
| the branch's own Preview | All four under `/design-lab/` |

URLs follow `https://<preview>-wrp-astro.<subdomain>.workers.dev`. They update on
every push to the branch they track.

## How it works

- `src/designs/<id>/Home.astro`: each concept, self-contained (own styles and fonts,
  no Tailwind or global.css). Shared content in `src/designs/data.ts`, shell in
  `src/designs/shared/`.
- `PUBLIC_WRP_DESIGN=<id>` at build time makes `src/pages/index.astro` rewrite `/`
  to that concept. Unset in production, so the live homepage is unchanged.
- `wrangler.jsonc` has a `previews` block. It deliberately omits the production
  D1 database and email binding, so a Preview cannot create a real lead.

## Deploying Previews

**Workers Builds (automatic).** The Worker uses Worker Previews for every
non-`main` branch (deploy command `npx wrangler preview`). The Design Lab
branch's Preview overrides its deploy command to
`node scripts/preview-designs.mjs --ci`, which publishes the branch build as the
branch Preview, then rebuilds with each `PUBLIC_WRP_DESIGN` and publishes
`design-<id>`. Every push to the branch refreshes all five.

**By hand.** With `wrangler login` (Wrangler ≥ 4.135):

```sh
bun run preview:designs                 # every concept + the lab
bun run preview:designs -- --only menu  # one concept
bun run preview:designs -- --dry-run    # print the commands
```

Delete a Preview with `npx wrangler preview delete --name design-<id>`.

## After the team decides

Roll the chosen direction out to every page (services, blog, portfolio, reviews,
contact, and the Arabic site), then delete `src/designs/`, `src/pages/design-lab/`
and the design Previews.
