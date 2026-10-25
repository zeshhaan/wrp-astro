/**
 * The Studio header candidates, for review side by side at
 * /design-lab/studio/headers/. Once one is picked it replaces
 * src/designs/studio/Header.astro and the others are deleted.
 *
 * Round 1 (25 Oct 2026) had A, B and C; Shereef kept A and dropped B (too
 * rounded) and C. Round 2 (D, E, F) follows his notes: the logo centred, square
 * corners, a secondary bar on top, and every service visible without a hover
 * or a click.
 */
export type HeaderVariantId = 'a' | 'd' | 'e' | 'f';

export const headerVariants: { id: HeaderVariantId; name: string; idea: string }[] = [
  {
    id: 'a',
    name: 'Showroom',
    idea: 'Kept from round 1. Clear over the hero, solid once you scroll. Services opens a full-width panel: the price list beside a big photo of the one you point at.',
  },
  {
    id: 'd',
    name: 'Arrivals board',
    idea: 'A centred masthead over a rail of all six services with their starting prices, like a departures board. The rail stays on screen as you scroll, and a cell lights up with a photo when you point at it.',
  },
  {
    id: 'e',
    name: 'Storefront',
    idea: 'The bar reads like the sign over the studio door: the logo in the middle, three services on each side with prices underneath, the pages in the bar above, and the quote button hanging from the corner like a tag.',
  },
  {
    id: 'f',
    name: 'Filmstrip',
    idea: 'A centred masthead over six photo frames, one per service. Point at one and it opens wider to say what it does. As you scroll the frames fold into a slim row of names, so the services never leave the screen.',
  },
];
