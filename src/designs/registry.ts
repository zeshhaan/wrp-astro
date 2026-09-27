/**
 * Design Lab registry: the homepage concepts the team is choosing between.
 *
 * Each concept is a full homepage in src/designs/<id>/Home.astro. They are
 * reachable at /design-lab/<id>/ on any build, and a build with
 * PUBLIC_WRP_DESIGN=<id> also serves that concept at `/`, which is how each
 * concept gets its own Worker Preview URL (see docs/design-lab.md).
 */
export type Concept = {
  id: 'mezzanine' | 'gloss' | 'menu' | 'paddock';
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
    idea: 'The page is the building: your car on the ground floor, you upstairs in the lounge.',
    signature: 'A glass line splits the screen into two floors, with a lift-style floor indicator as you scroll.',
    bestFor: 'Leading with hospitality and the lounge, which no competitor can copy.',
    risk: 'Services sit one level down in the story, so price shoppers scroll further.',
    palette: ['#e9ebe8', '#b9c7c2', '#1f6b4f', '#15171a', '#c9a45c'],
    fonts: 'Bricolage Grotesque + Geist',
  },
  {
    id: 'gloss',
    name: 'Gloss',
    idea: 'Light moving across paint. The page changes colour like a car under studio lights.',
    signature: 'Scroll-driven paint colours sampled from real WRP cars, and a specular highlight that follows the cursor.',
    bestFor: 'Enthusiasts and supercar owners who buy on emotion and finish.',
    risk: 'The most visually intense; relies on strong photography going forward.',
    palette: ['#2f5d3a', '#5e1622', '#1d3f8a', '#8a8d90', '#f2f2ef'],
    fonts: 'Syne + Inter',
  },
  {
    id: 'menu',
    name: 'The Menu',
    idea: 'WRP as a house of hospitality: services ordered like courses, the lounge as the dining room.',
    signature: 'Build your visit: pick services, see the total and time, and get lounge suggestions, then send it on WhatsApp.',
    bestFor: 'Converting enquiries: every visitor leaves with a priced plan and a message ready to send.',
    risk: 'The most unconventional metaphor for a detailing studio; copy must stay tight.',
    palette: ['#f6f6f3', '#2b1b2e', '#6d4a7a', '#b08d57', '#d9d4cc'],
    fonts: 'Instrument Serif + Instrument Sans',
  },
  {
    id: 'paddock',
    name: 'Paddock',
    idea: 'Motorsport paddock: your car goes into the pit, you go to the Paddock Club.',
    signature: 'Tap panels on a car diagram to build PPF coverage and see which package covers it.',
    bestFor: 'Explaining PPF coverage and pricing, the highest-value service, at a glance.',
    risk: 'Sportier than the current luxury tone; may feel less "premium" to some owners.',
    palette: ['#f4f4f2', '#141414', '#ffd23f', '#e2e2de', '#6b6b6b'],
    fonts: 'Barlow Condensed + Barlow',
  },
];

export const conceptIds = concepts.map((c) => c.id);

export function getConcept(id: string | undefined): Concept | undefined {
  return concepts.find((c) => c.id === id);
}
