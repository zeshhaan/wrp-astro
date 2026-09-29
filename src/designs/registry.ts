/**
 * Design Lab registry: the homepage concepts the team is choosing between.
 *
 * Each concept is a full homepage in src/designs/<id>/Home.astro. They are
 * reachable at /design-lab/<id>/ on any build, and a build with
 * PUBLIC_WRP_DESIGN=<id> also serves that concept at `/`, which is how each
 * concept gets its own Worker Preview URL (see docs/design-lab.md).
 */
export type Concept = {
  id: 'mezzanine' | 'menu' | 'studio';
  name: string;
  /** One line a teammate can repeat in a meeting. */
  idea: string;
  /** The single memorable interaction or device. */
  signature: string;
  /** Who it will resonate with, and the trade-off. */
  bestFor: string;
  risk: string;
  palette: string[];
  fonts: string;
};

export const concepts: Concept[] = [
  {
    id: 'mezzanine',
    name: 'Mezzanine',
    idea: 'The page is the building: the studio floor where the work happens, the glass mezzanine above it.',
    signature: 'A glass line splits the hero into two floors, with a lift-style floor indicator as you scroll.',
    bestFor: 'A premium, architectural feel that shows the real studio and leads straight into the services.',
    risk: 'The building metaphor has to stay light so it never gets in the way of prices and booking.',
    palette: ['#e9ebe8', '#b9c7c2', '#1f6b4f', '#15171a', '#c9a45c'],
    fonts: 'Bricolage Grotesque + Geist',
  },
  {
    id: 'menu',
    name: 'The Menu',
    idea: 'Services laid out like a fine-dining menu, with honest starting prices and a visit planner.',
    signature: 'Plan your visit: pick services, see the starting total and how long the car stays, then send it on WhatsApp.',
    bestFor: 'Converting enquiries: every visitor leaves with a priced plan and a message ready to send.',
    risk: 'The most unconventional metaphor for a detailing studio; copy must stay tight.',
    palette: ['#f6f6f3', '#2b1b2e', '#6d4a7a', '#b08d57', '#d9d4cc'],
    fonts: 'Instrument Serif + Instrument Sans',
  },
  {
    id: 'studio',
    name: 'Studio',
    idea: 'A familiar, conventional detailing-studio site: dark studio hero, services grid, why-us, reviews, gallery, quote form.',
    signature: 'Nothing unusual on purpose. Visitors who have seen other Dubai studio sites know exactly where everything is.',
    bestFor: 'Feeling instantly familiar and trustworthy; the quickest route from landing to a quote.',
    risk: 'Looks like the category; WRP stands out through its photos, prices and reviews rather than the layout.',
    palette: ['#0c0d0f', '#17191c', '#f4f4f2', '#c9a45c', '#8a8f96'],
    fonts: 'Oswald + Inter',
  },
];

export const conceptIds = concepts.map((c) => c.id);

export function getConcept(id: string | undefined): Concept | undefined {
  return concepts.find((c) => c.id === id);
}
