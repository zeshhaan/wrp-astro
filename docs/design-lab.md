# Design Lab: choosing the new homepage

Four complete homepage directions for the WRP redesign. They all use the same
real content (prices from `src/content/services`, verbatim Google reviews, real
customer photos) and all replace the old "Signature Fleet" logo wall with **The
WRP Lounge**: billiards, board games, coffee, the big screen and the glass wall
over the bays.

| Concept | The idea | Signature moment |
| --- | --- | --- |
| **Mezzanine** | The page is the building: your car downstairs, you upstairs. | A glass line splits the hero into two floors; a lift-style floor indicator; an interactive floor plan of the lounge. |
| **Gloss** | Light moving across paint. | The page changes colour as you scroll, using paint sampled from cars WRP finished; a specular highlight follows the cursor across "WRP." |
| **The Menu** | WRP as a house of hospitality. | "Plan your visit": tick services, see the starting total and time, get lounge suggestions, send the plan on WhatsApp. |
| **Paddock** | Your car goes in the pit; you go to the club. | Tap panels on a car diagram to see which PPF package covers them; a two-lane "you upstairs / your car downstairs" timeline. |

## Where to look

Every build has a review hub at `/design-lab/` and each concept at
`/design-lab/<id>/`, with a floating switcher to hop between them. These pages
are `noindex`, excluded from the sitemap, and their forms never send leads.

Each concept also has its own Cloudflare **Worker Preview** where it is served
at `/`, exactly as it would be on wrpdetailing.ae:

| Preview | Serves |
| --- | --- |
| `design-mezzanine` | Mezzanine at `/` |
| `design-gloss` | Gloss at `/` |
| `design-menu` | The Menu at `/` |
| `design-paddock` | Paddock at `/` |
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
