/**
 * The three Studio header candidates, for review side by side at
 * /design-lab/studio/headers/. Once one is picked it replaces
 * src/designs/studio/Header.astro and the other two are deleted.
 */
export type HeaderVariantId = 'a' | 'b' | 'c';

export const headerVariants: { id: HeaderVariantId; name: string; idea: string }[] = [
  {
    id: 'a',
    name: 'Showroom',
    idea: 'Clear over the hero, solid once you scroll. Services opens a full-width panel: the six services as a price list beside a big photo of the one you point at. Phones get a full-screen sheet with swipeable photo cards.',
  },
  {
    id: 'b',
    name: 'Pit Lane',
    idea: 'A floating glass capsule with a live “open now” light in Dubai time. It slips away as you scroll down and returns when you scroll up. Services opens a price board. On phones the navigation becomes a dock at the bottom of the screen, in thumb reach.',
  },
  {
    id: 'c',
    name: 'Pillars',
    idea: 'An editorial masthead in paper white: logo centred, a brass reading-progress line and a running head. Services opens the WRP index, a full-screen page under giant W, R and P letters that fill with a car photo as you point at each service.',
  },
];
