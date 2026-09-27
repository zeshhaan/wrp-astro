/**
 * Design Lab registry: the homepage concepts the team is choosing between.
 *
 * Each concept is a full homepage in src/designs/<id>/Home.astro. They are
 * reachable at /design-lab/<id>/ on any build, and a build with
 * PUBLIC_WRP_DESIGN=<id> also serves that concept at `/`, which is how each
 * concept gets its own Worker Preview URL (see docs/design-lab.md).
 */
export type Concept = {
  id: 'mezzanine' | 'menu' | 'layers' | 'diagnosis';
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
    id: 'layers',
    name: 'Layers',
    idea: 'A cross-section through a car\'s paint: scroll down through each layer WRP works on.',
    signature: 'The page is a magnified paint cross-section; every layer (coating, film, clear coat, colour) is a service, drawn to its real thickness in microns.',
    bestFor: 'Explaining PPF, ceramic and correction with real material science, which builds trust with owners who research.',
    risk: 'Technical; the scale drawing must stay readable on a phone.',
    palette: ['#0f1115', '#e8e6e1', '#9fb7c9', '#d4a24c', '#5a6470'],
    fonts: 'Archivo + Fraunces',
  },
  {
    id: 'diagnosis',
    name: 'Diagnosis',
    idea: 'Start from what is wrong with the car, not from a service list.',
    signature: 'Pick a problem (stone chips, swirls, faded paint, a hot cabin, stained seats) and the page builds the fix: service, price, time, proof and a review from someone with the same problem.',
    bestFor: 'Owners who know the problem but not the product name; leads arrive pre-qualified.',
    risk: 'Needs good photos for each problem to feel as premium as the other directions.',
    palette: ['#eef0f3', '#15181d', '#1f45c4', '#f0561d', '#1c6b47'],
    fonts: 'Fraunces + Archivo',
  },
];

export const conceptIds = concepts.map((c) => c.id);

export function getConcept(id: string | undefined): Concept | undefined {
  return concepts.find((c) => c.id === id);
}
